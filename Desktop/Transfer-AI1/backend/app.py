import json
import os
import time
from collections import defaultdict
from flask import Flask, request, Response, stream_with_context, session, jsonify
from advisor import (
    ask_advisor_stream, ask_advisor_stream_fallback, ask_advisor_onboarding_stream,
)
from plan_engine import (build_plan as _engine_build_plan,
                         render_plan_stream as _engine_render_stream,
                         repair_term_headers as _engine_repair_term_headers,
                         _UC_SHARD_MAP)
from db import (
    init_db, create_user, get_user_by_email, get_user_by_id,
    verify_password, email_exists, update_profile,
    create_session, get_session, get_user_sessions,
    update_session_title, delete_session,
    add_messages, get_session_messages,
    create_reset_token, redeem_reset_token,
    save_feedback,
)
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder="static")
_flask_secret = os.getenv("FLASK_SECRET")
if not _flask_secret:
    raise RuntimeError(
        "FLASK_SECRET environment variable is not set — "
        "refusing to start with an insecure default."
    )
app.secret_key = _flask_secret
app.config.update(
    SESSION_COOKIE_SECURE=os.getenv("FLASK_ENV") == "production",
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
)

init_db()

# ── Rate limiting ──────────────────────────────────────────────
# 100 requests per IP per hour
RATE_LIMIT   = 100
RATE_WINDOW  = 3600  # seconds
MAX_MSG_LEN  = 4000  # characters — enough for full course lists, essay drafts, transcripts

_rate_log = defaultdict(list)  # ip -> [timestamps]


def _get_ip():
    # Respect proxy headers if behind nginx/reverse proxy
    return request.headers.get("X-Forwarded-For", request.remote_addr or "unknown").split(",")[0].strip()


def _check_rate(ip):
    now    = time.time()
    cutoff = now - RATE_WINDOW
    _rate_log[ip] = [t for t in _rate_log[ip] if t > cutoff]
    if len(_rate_log[ip]) >= RATE_LIMIT:
        return False
    _rate_log[ip].append(now)
    return True


# ── Quick off-topic guard (no LLM tokens spent) ───────────────
# Only blocks clear-cut exploitation: math homework, recipes, code
# debugging, etc. Greetings and ambiguous messages pass through to
# the LLM which handles them gracefully.
_HARD_BLOCK_PATTERNS = [
    "solve for x", "solve for y", "solve this equation",
    "find the derivative", "find the integral", "differentiate ",
    "do my homework", "finish my homework", "math homework",
    "write a story about", "write me a story",
    "recipe for ", "how to cook ", "how to bake ",
    "debug this code", "fix my code", "write this code for me",
    "what is the capital of", "who invented the ",
]


_REFUSAL = "That's a bit outside my lane — I'm best at UC transfer stuff! Is there anything about transferring I can help you with?"


def _is_obvious_offtopic(msg):
    q = msg.lower()
    return any(p in q for p in _HARD_BLOCK_PATTERNS)


# ── Routes ─────────────────────────────────────────────────────

@app.route("/health")
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/")
def home():
    return app.send_static_file("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    ip = _get_ip()

    # Rate limit check
    if not _check_rate(ip):
        remaining = RATE_WINDOW - (time.time() - _rate_log[ip][0])
        minutes   = int(remaining // 60) + 1

        def rate_msg():
            msg = f"You've sent {RATE_LIMIT} messages this hour. Please wait about {minutes} minute{'s' if minutes != 1 else ''} and then continue."
            yield f"data: {json.dumps(msg)}\n\n"
            yield "data: [DONE]\n\n"

        return Response(stream_with_context(rate_msg()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache"})

    data         = request.json or {}
    user_message = data.get("message", "").strip()
    history      = list(data.get("history", []))

    # Support history-only mode: last history item is the user message
    if not user_message and history and history[-1].get("role") == "user":
        user_message = history[-1]["content"].strip()
        history = history[:-1]

    # Message length guard
    if len(user_message) > MAX_MSG_LEN:
        def too_long():
            yield f"data: {json.dumps(f'Please keep messages under {MAX_MSG_LEN} characters.')}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(too_long()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache"})

    if not user_message:
        return Response("data: [DONE]\n\n", mimetype="text/event-stream")

    # Instant off-topic rejection (no Groq tokens used)
    if _is_obvious_offtopic(user_message):
        def offtopic():
            yield f"data: {json.dumps(_REFUSAL)}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(offtopic()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache"})

    # Ensure history ends with the current user message
    if not history or history[-1].get("content") != user_message:
        history.append({"role": "user", "content": user_message})

    if len(history) > 20:
        history = history[-20:]

    uid = session.get("user_id")
    user_profile = get_user_by_id(uid) if uid else None

    def generate():
        try:
            for chunk in ask_advisor_stream(history, user_profile=user_profile):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            err_str = str(e).lower()
            # If the primary model is rate-limited, fall back to the faster/smaller model
            if any(kw in err_str for kw in ["rate_limit", "rate limit", "429", "quota", "tokens per"]):
                try:
                    app.logger.info("chat_fallback_model_used reason=%.150s", err_str)
                    for chunk in ask_advisor_stream_fallback(history, user_profile=user_profile):
                        yield f"data: {json.dumps(chunk)}\n\n"
                except Exception:
                    yield f"data: {json.dumps('Something went wrong. Please try again in a moment.')}\n\n"
            elif "configuration" in err_str or "api_key" in err_str:
                yield f"data: {json.dumps(f'Configuration error: {e}')}\n\n"
            else:
                yield f"data: {json.dumps('Something went wrong. Please try again.')}\n\n"
        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/reset", methods=["POST"])
def reset():
    return ("", 204)


# ── College/UC/Major options (built once from articulations index) ─────────

_OPTIONS_CACHE = None
_OPTIONS_CACHE_AT = 0.0
_OPTIONS_CACHE_TTL = 6 * 3600  # rebuild periodically so a data-only redeploy
                                # (shards updated without a process restart)
                                # doesn't leave stale college/major lists forever.

def _build_options():
    global _OPTIONS_CACHE, _OPTIONS_CACHE_AT
    if _OPTIONS_CACHE is not None and (time.time() - _OPTIONS_CACHE_AT) < _OPTIONS_CACHE_TTL:
        return _OPTIONS_CACHE
    import gzip as _gz
    from collections import defaultdict
    targets = defaultdict(set)
    majors  = defaultdict(lambda: defaultdict(set))
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
    for shard_name in _UC_SHARD_MAP.values():
        base = os.path.join(data_dir, f"articulations_{shard_name}.json")
        for path in (base + ".gz", base):
            if not os.path.exists(path):
                continue
            try:
                opener = _gz.open if path.endswith(".gz") else open
                with opener(path, "rt", encoding="utf-8") as f:
                    index = json.load(f)
                for key in index.keys():
                    if key == "_meta":
                        continue
                    parts = key.split("__")
                    if len(parts) < 3:
                        continue
                    college = parts[0].replace("_", " ")
                    uc      = parts[1].replace("_", " ")
                    major   = "__".join(parts[2:]).replace("_", " ")
                    targets[college].add(uc)
                    majors[college][uc].add(major)
            except Exception:
                pass
            break
    _OPTIONS_CACHE = {
        "colleges": sorted(targets.keys()),
        "targetsByCollege": {c: sorted(v) for c, v in targets.items()},
        "majorsByCollegeAndTarget": {c: {u: sorted(v) for u, v in ucs.items()} for c, ucs in majors.items()},
    }
    _OPTIONS_CACHE_AT = time.time()
    return _OPTIONS_CACHE


@app.route("/api/options/colleges")
def api_options_colleges():
    opts = _build_options()
    return jsonify({"colleges": opts["colleges"]})


@app.route("/api/options/ucs")
def api_options_ucs():
    college = request.args.get("college", "").strip()
    opts = _build_options()
    return jsonify({"ucs": opts["targetsByCollege"].get(college, [])})


@app.route("/api/options/majors")
def api_options_majors():
    college = request.args.get("college", "").strip()
    uc      = request.args.get("uc", "").strip()
    opts = _build_options()
    return jsonify({"majors": opts["majorsByCollegeAndTarget"].get(college, {}).get(uc, [])})


@app.route("/options")
def api_options():
    """Combined options payload — colleges, UCs per college, majors per college+UC."""
    return jsonify(_build_options())


# ── /plan_v2 — deterministic Python scheduler + compact LLM render ────────────

_UC_NAME_MAP = {
    "ucla":          "los angeles",
    "uc la":         "los angeles",
    "los angeles":   "los angeles",
    "ucb":           "berkeley",
    "uc berkeley":   "berkeley",
    "cal":           "berkeley",
    "berkeley":      "berkeley",
    "ucsd":          "san diego",
    "uc san diego":  "san diego",
    "san diego":     "san diego",
    "uci":           "irvine",
    "uc irvine":     "irvine",
    "irvine":        "irvine",
    "ucsb":          "santa barbara",
    "uc santa barbara": "santa barbara",
    "santa barbara": "santa barbara",
    "ucd":           "davis",
    "uc davis":      "davis",
    "davis":         "davis",
    "ucsc":          "santa cruz",
    "uc santa cruz": "santa cruz",
    "santa cruz":    "santa cruz",
    "ucr":           "riverside",
    "uc riverside":  "riverside",
    "riverside":     "riverside",
    "ucm":           "merced",
    "uc merced":     "merced",
    "merced":        "merced",
}

# Real average transfer GPA ranges per UC (Fall 2025 official data)
_UC_GPA_TARGETS = {
    "los angeles":   ("3.7–3.9", "UCLA avg admitted transfer GPA is 3.5–3.9. Economics is highly competitive — target 3.7 minimum, aim for 3.9."),
    "berkeley":      ("3.7–3.9", "UC Berkeley avg admitted transfer GPA is 3.5–3.9 — target 3.7 minimum, aim for 3.9 for competitive majors."),
    "san diego":     ("3.7–3.9", "UCSD avg admitted transfer GPA is 3.55–3.94 — target 3.7+."),
    "irvine":        ("3.6–3.7", "UCI avg admitted transfer GPA is 3.4–3.7 — target 3.6+."),
    "santa barbara": ("3.6–3.7", "UCSB avg admitted transfer GPA is 3.4–3.7 — target 3.6+."),
    "davis":         ("3.6–3.7", "UC Davis avg admitted transfer GPA is 3.4–3.7 — target 3.6+."),
    "santa cruz":    ("3.5–3.6", "UCSC avg admitted transfer GPA is 3.3–3.6 — target 3.5+."),
    "riverside":     ("3.3–3.5", "UCR avg admitted transfer GPA is 3.0–3.5 — target 3.3+."),
    "merced":        ("3.2–3.4", "UC Merced avg admitted transfer GPA is 3.0–3.4 — target 3.2+."),
}


@app.route("/plan_v2", methods=["POST"])
def plan_v2():
    ip = _get_ip()
    if not _check_rate(ip):
        def _rate():
            yield f"data: {json.dumps('Rate limit reached. Please wait a moment.')}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(_rate()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache"})

    data          = request.json or {}
    college       = data.get("college", "").strip()
    school        = data.get("school", "").strip()
    major         = data.get("major", "").strip()
    accept_honors = data.get("acceptHonors", False)
    ap_credits    = data.get("apCredits", "").strip()
    mode          = data.get("mode", "competitive").lower().strip()
    if mode not in ("competitive", "efficiency"):
        mode = "competitive"

    # completed courses: may be a string ("MATH 1A, ENGL C1000") or list
    completed_raw = data.get("completedCourses", "")
    if isinstance(completed_raw, list):
        completed_set = set(completed_raw)
    elif isinstance(completed_raw, str) and completed_raw.strip():
        completed_set = set(completed_raw.split(","))
    else:
        completed_set = set()

    if not college or not school or not major:
        def _err():
            yield f"data: {json.dumps('Missing college, school, or major.')}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(_err()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache"})

    # ── Deterministic plan build ──────────────────────────────────────────────
    try:
        result = _engine_build_plan(
            college=college, uc=school, major=major,
            accept_honors=accept_honors,
            completed=completed_set,
            ap_credits=ap_credits,
        )
    except Exception as e:
        app.logger.error("plan_v2_build_fail college=%r school=%r major=%r err=%.200s",
                         college, school, major, str(e))
        def _berr():
            yield f"data: {json.dumps('Error building plan. Please try again.')}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(_berr()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache"})

    if not result.all_courses():
        msg = (f"No articulation data found for **{college} → {school} | {major}**.\n\n"
               "This combination may not be in the local dataset yet.\n"
               "Please check [ASSIST.org](https://assist.org) directly, "
               "or try a slightly different college or major name spelling.")
        def _nodata():
            yield f"data: {json.dumps(msg)}\n\n"
            yield "data: [DONE]\n\n"
        return Response(stream_with_context(_nodata()), mimetype="text/event-stream",
                        headers={"Cache-Control": "no-cache"})

    # ── TAG / GPA metadata ────────────────────────────────────────────────────
    uc_l_for_meta = _UC_NAME_MAP.get(school.lower().strip(), school.lower())
    gpa_range, gpa_note = _UC_GPA_TARGETS.get(uc_l_for_meta, ("3.5+", f"Target 3.5+ for {school}."))

    _TAG_NON  = {"los angeles", "berkeley", "san diego"}
    _TAG_YES  = {"davis", "irvine", "merced", "riverside", "santa barbara", "santa cruz"}
    if uc_l_for_meta in _TAG_NON:
        tag_note = (f"{school} does NOT participate in TAG. "
                    "TAG is offered only by UC Davis, UC Irvine, UC Merced, UC Riverside, "
                    "UC Santa Barbara, and UC Santa Cruz.")
    elif uc_l_for_meta in _TAG_YES:
        tag_note = (f"{school} offers TAG — file Sept 1–30. "
                    "Requirements: 60 transferable units by end of spring, minimum GPA (varies by "
                    "major), no more than 2 attempts at a required course.")
    else:
        tag_note = "Check if your target campus offers TAG — 6 UCs participate."

    est_tokens = len(result.__repr__()) // 2   # rough size proxy for logging

    # ── Stream LLM render ─────────────────────────────────────────────────────
    def generate():
        buf = []
        try:
            for chunk in _engine_render_stream(result, tag_note, gpa_range, gpa_note, mode):
                buf.append(chunk)
            # Collect full text before yielding — repair must run first
        except Exception as e:
            app.logger.error(
                "plan_v2_render_fail college=%r school=%r major=%r err=%.200s",
                college, school, major, str(e),
            )
            yield f"data: {json.dumps('Something went wrong rendering your plan. Please try again.')}\n\n"
            yield "data: [DONE]\n\n"
            return

        full_text = "".join(buf)

        # Deterministic term-header repair: fix any LLM-scrambled season labels
        full_text, n_repairs = _engine_repair_term_headers(full_text, result)
        if n_repairs:
            app.logger.warning(
                "term_header_repair college=%r school=%r major=%r repairs=%d",
                college, school, major, n_repairs,
            )

        # Truncation / ghost-course checks
        if "## Key Notes" not in full_text:
            full_text += "\n\n⚠️ **Plan appears cut off** — Key Notes section missing. Please regenerate."
        elif result.warnings:
            ghost_warns = [w for w in result.warnings if w.startswith("Ghost:")]
            if ghost_warns:
                full_text += ("\n\n---\n⚠️ **Completeness Warning:**\n"
                              + "\n".join(f"• {w}" for w in ghost_warns))

        app.logger.info(
            "plan_v2_ok college=%r school=%r major=%r terms=%d courses=%d est_tokens=%d",
            college, school, major, result.active_terms, len(result.all_courses()), est_tokens,
        )
        yield f"data: {json.dumps(full_text)}\n\n"
        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/onboard", methods=["POST"])
def onboard():
    data    = request.json or {}
    history = list(data.get("history", []))
    if len(history) > 20:
        history = history[-20:]
    # Groq requires conversations to start with a user message.
    # Prepend a synthetic opener to preserve AI context rather than stripping it.
    if not history or history[0].get("role") == "assistant":
        history = [{"role": "user", "content": "Hi, I want to set up my transfer plan."}] + history

    def generate():
        try:
            for chunk in ask_advisor_onboarding_stream(history):
                yield f"data: {json.dumps(chunk)}\n\n"
        except Exception as e:
            app.logger.error("onboard_fail err=%.200s", str(e))
            yield f"data: {json.dumps('Something went wrong. Please try again.')}\n\n"
        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# ── Auth routes ────────────────────────────────────────────────

@app.route("/auth/me")
def auth_me():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "not authenticated"}), 401
    user = get_user_by_id(uid)
    if not user:
        session.clear()
        return jsonify({"error": "not authenticated"}), 401
    return jsonify(_public(user))


def _public(user):
    """Serialize user fields safe to send to the browser."""
    return {
        "id":             user["id"],
        "email":          user["email"],
        "username":       user["username"],
        "college":        user.get("college", ""),
        "major":          user.get("major", ""),
        "target_schools": user.get("target_schools", ""),
        "onboarded":      bool(user.get("onboarded", 0)),
    }


@app.route("/auth/register", methods=["POST"])
def auth_register():
    data     = request.json or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password", "")
    username = (data.get("username") or "").strip()

    if not email or "@" not in email:
        return jsonify({"error": "Enter a valid email address."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if email_exists(email):
        return jsonify({"error": "An account with that email already exists."}), 409

    try:
        user = create_user(email, password, username or None)
        session["user_id"] = user["id"]
        return jsonify(_public(user))
    except Exception:
        return jsonify({"error": "Could not create account. Please try again."}), 500


@app.route("/auth/login", methods=["POST"])
def auth_login():
    data     = request.json or {}
    email    = (data.get("email") or "").strip().lower()
    password = data.get("password", "")

    user = get_user_by_email(email)
    if not user or not verify_password(user, password):
        return jsonify({"error": "Incorrect email or password."}), 401

    session["user_id"] = user["id"]
    return jsonify(_public(user))


@app.route("/auth/logout", methods=["POST"])
def auth_logout():
    session.clear()
    return ("", 204)


@app.route("/auth/forgot-password", methods=["POST"])
def auth_forgot():
    email = ((request.json or {}).get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "Enter your email address."}), 400
    token, user = create_reset_token(email)
    # Always return the same response — don't reveal whether the account exists
    if token and os.getenv("DEBUG_LOG_RESET_TOKENS") == "1":
        # Opt-in only (unset by default, including on Railway): log token for
        # manual delivery since SMTP isn't configured yet. NEVER log this by
        # default — anyone with log access could take over any account. Real
        # email delivery (SMTP) must land before this route can safely relay
        # a token to real users in production.
        app.logger.info("Password reset token for %s: %s", email, token)
    return jsonify({"ok": True, "message": "If an account exists for that email, a reset link has been sent."})


@app.route("/auth/reset-password", methods=["POST"])
def auth_reset():
    data     = request.json or {}
    token    = (data.get("token") or "").strip()
    password = data.get("password", "")
    if not token:
        return jsonify({"error": "Reset token is required."}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters."}), 400
    if not redeem_reset_token(token, password):
        return jsonify({"error": "Invalid or expired reset token."}), 400
    return jsonify({"ok": True})


# ── Profile ────────────────────────────────────────────────────────

@app.route("/api/profile", methods=["GET"])
def api_profile_get():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    user = get_user_by_id(uid)
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(_public(user))


@app.route("/api/profile", methods=["PUT"])
def api_profile_put():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json or {}
    fields = {}
    for k in ("username", "college", "major", "target_schools", "onboarded"):
        if k in data:
            fields[k] = data[k]
    if "username" in fields and not str(fields["username"]).strip():
        return jsonify({"error": "Username cannot be blank."}), 400
    update_profile(uid, **fields)
    return jsonify(_public(get_user_by_id(uid)))


# ── Chat sessions ──────────────────────────────────────────────────

@app.route("/api/sessions", methods=["GET"])
def api_sessions_list():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(get_user_sessions(uid))


@app.route("/api/sessions", methods=["POST"])
def api_sessions_create():
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    title = ((request.json or {}).get("title") or "New chat")[:80]
    sess  = create_session(uid, title)
    return jsonify(sess), 201


@app.route("/api/sessions/<int:sid>", methods=["PATCH"])
def api_sessions_update(sid):
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    title = ((request.json or {}).get("title") or "")[:80].strip()
    if title:
        update_session_title(sid, uid, title)
    return jsonify(get_session(sid, uid) or {})


@app.route("/api/sessions/<int:sid>", methods=["DELETE"])
def api_sessions_delete(sid):
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    delete_session(sid, uid)
    return ("", 204)


# ── Chat messages ──────────────────────────────────────────────────

@app.route("/api/sessions/<int:sid>/messages", methods=["GET"])
def api_messages_get(sid):
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    msgs = get_session_messages(sid, uid)
    if msgs is None:
        return jsonify({"error": "Not found"}), 404
    return jsonify(msgs)


@app.route("/api/sessions/<int:sid>/messages", methods=["POST"])
def api_messages_post(sid):
    uid = session.get("user_id")
    if not uid:
        return jsonify({"error": "Not authenticated"}), 401
    data = request.json or {}
    msgs = data.get("messages", [])
    if not isinstance(msgs, list) or not msgs:
        return jsonify({"error": "messages list required"}), 400
    # Validate shape
    for m in msgs:
        if not isinstance(m, dict) or m.get("role") not in ("user", "assistant") or not m.get("content"):
            return jsonify({"error": "Each message needs role and content"}), 400
    if not add_messages(sid, uid, msgs):
        return jsonify({"error": "Not found"}), 404
    return ("", 204)


# ── Feedback ───────────────────────────────────────────────────────

@app.route("/api/feedback", methods=["POST"])
def api_feedback():
    uid  = session.get("user_id")
    data = request.json or {}
    sid  = data.get("session_id")
    rating = data.get("rating")
    if rating not in (1, -1):
        return jsonify({"error": "rating must be 1 or -1"}), 400
    save_feedback(uid, sid, rating)
    return ("", 204)


@app.route("/tag-check", methods=["POST"])
def tag_check():
    data   = request.get_json() or {}
    try:
        gpa = float(data.get("gpa", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "gpa must be a number"}), 400
    major  = data.get("major", "").strip().lower()

    tag_path = os.path.join(os.path.dirname(__file__), "data", "tag_requirements.json")
    try:
        with open(tag_path, encoding="utf-8") as f:
            tag_data = json.load(f)
    except Exception:
        return jsonify({"error": "TAG data unavailable"}), 500

    shared = tag_data.get("sharedCriteria", {})

    def is_excluded(major_lower, excluded_list):
        for excl in excluded_list:
            el = excl.lower()
            # Bidirectional substring: "economics" in "economics" or "all majors in..." contains keyword
            if major_lower in el or el in major_lower:
                return True
            # Word-level: each significant word in major against the excluded string
            for word in major_lower.split():
                if len(word) > 3 and word in el:
                    return True
        return False

    def get_required_gpa(major_lower, gpa_map):
        best_gpa = gpa_map.get("default", 3.0)
        # Try to find a school/program in the map that matches the major
        for school_name, school_gpa in gpa_map.items():
            if school_name == "default":
                continue
            sn = school_name.lower()
            for word in major_lower.split():
                if len(word) > 3 and word in sn:
                    # Take the higher requirement (more conservative)
                    if school_gpa > best_gpa:
                        best_gpa = school_gpa
                    break
        return best_gpa

    results = []
    for campus in tag_data.get("campuses", []):
        name        = campus.get("shortName", campus.get("name", ""))
        excluded    = campus.get("excludedMajors", [])
        major_excl  = is_excluded(major, excluded) if major else False
        req_gpa     = get_required_gpa(major, campus.get("minGPA", {"default": 3.0}))
        gpa_ok      = gpa >= req_gpa if gpa > 0 else None  # None = GPA not provided
        eligible    = (not major_excl) and (gpa_ok is True)

        results.append({
            "campus":        name,
            "eligible":      eligible,
            "requiredGPA":   req_gpa,
            "majorExcluded": major_excl,
            "gpaOk":         gpa_ok,
            "notes":         campus.get("notes", ""),
            "tagWebsite":    campus.get("tagWebsite", ""),
            "filingPeriod":  campus.get("filingPeriod", "September 1-30"),
        })

    return jsonify({
        "results":            results,
        "sharedRequirements": shared.get("requirements", [])[:5],
        "filingPeriod":       shared.get("tagFilingPeriod", "September 1-30"),
        "nonParticipating":   shared.get("nonParticipatingCampuses", []),
    })


if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
