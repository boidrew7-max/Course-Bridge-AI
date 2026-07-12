"""
User database — supports PostgreSQL (via DATABASE_URL) or SQLite fallback.
Handles users, profiles, chat sessions/messages, password reset, and feedback.
"""
import os
import random
import secrets
from contextlib import contextmanager
from datetime import datetime, timedelta

from werkzeug.security import check_password_hash, generate_password_hash

_DATABASE_URL = os.environ.get("DATABASE_URL", "")
_USE_PG = bool(_DATABASE_URL)

# Railway sets DATABASE_URL as postgres://... but psycopg2 needs postgresql://
if _USE_PG and _DATABASE_URL.startswith("postgres://"):
    _DATABASE_URL = "postgresql://" + _DATABASE_URL[len("postgres://"):]

DB_PATH = os.environ.get("DB_PATH") or os.path.join(os.path.dirname(__file__), "data", "users.db")

_ADJS  = ["Swift","Bright","Bold","Calm","Sharp","Ready","Keen","Smart","Sage","Brisk"]
_NOUNS = ["Hawk","Scout","Spark","Path","Aim","Trek","Plan","Rise","Step","Goal"]


@contextmanager
def _connect():
    if _USE_PG:
        import psycopg2
        import psycopg2.extras
        conn = psycopg2.connect(_DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        import sqlite3
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys = ON")
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def _p(n=1):
    """Return n parameter placeholders: %s for PG, ? for SQLite."""
    ph = "%s" if _USE_PG else "?"
    return ", ".join([ph] * n)


def _row(r):
    if r is None:
        return None
    return dict(r)


def init_db():
    with _connect() as conn:
        cur = conn.cursor()
        if _USE_PG:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id            SERIAL PRIMARY KEY,
                    email         TEXT    UNIQUE NOT NULL,
                    password_hash TEXT,
                    username      TEXT    NOT NULL,
                    college       TEXT    NOT NULL DEFAULT '',
                    major         TEXT    NOT NULL DEFAULT '',
                    target_schools TEXT   NOT NULL DEFAULT '',
                    onboarded     INTEGER NOT NULL DEFAULT 0,
                    google_id     TEXT    UNIQUE,
                    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            # Idempotent — safe to run every startup even if already applied.
            # (try/except is unsafe here: a failed statement aborts the whole
            # PG transaction and would break every statement after it.)
            cur.execute("ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL")
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE")
            cur.execute("""
                CREATE TABLE IF NOT EXISTS session_tokens (
                    id         SERIAL PRIMARY KEY,
                    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    token      TEXT    NOT NULL UNIQUE,
                    expires_at TEXT    NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS saved_plans (
                    id           SERIAL PRIMARY KEY,
                    user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    college      TEXT    NOT NULL,
                    uc           TEXT    NOT NULL,
                    major        TEXT    NOT NULL,
                    plan_text    TEXT    NOT NULL DEFAULT '',
                    completed_courses TEXT NOT NULL DEFAULT '',
                    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE (user_id, college, uc, major)
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS chat_sessions (
                    id         SERIAL PRIMARY KEY,
                    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    title      TEXT    NOT NULL DEFAULT 'New chat',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id         SERIAL PRIMARY KEY,
                    session_id INTEGER NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
                    role       TEXT    NOT NULL,
                    content    TEXT    NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS reset_tokens (
                    id         SERIAL PRIMARY KEY,
                    user_id    INTEGER NOT NULL,
                    token      TEXT    NOT NULL UNIQUE,
                    expires_at TEXT    NOT NULL,
                    used       INTEGER NOT NULL DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS message_feedback (
                    id         SERIAL PRIMARY KEY,
                    user_id    INTEGER,
                    session_id INTEGER,
                    rating     INTEGER NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
        else:
            cur.execute("""CREATE TABLE IF NOT EXISTS users (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                email         TEXT    UNIQUE NOT NULL,
                password_hash TEXT    NOT NULL,
                username      TEXT    NOT NULL,
                created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""")
            for col, typedef in [
                ("college",        "TEXT NOT NULL DEFAULT ''"),
                ("major",          "TEXT NOT NULL DEFAULT ''"),
                ("target_schools", "TEXT NOT NULL DEFAULT ''"),
                ("onboarded",      "INTEGER NOT NULL DEFAULT 0"),
                # Not UNIQUE here — SQLite's ALTER TABLE ADD COLUMN rejects a
                # UNIQUE constraint. Uniqueness is enforced in
                # get_or_create_google_user() (checked before insert).
                ("google_id",      "TEXT"),
            ]:
                try:
                    cur.execute(f"ALTER TABLE users ADD COLUMN {col} {typedef}")
                except Exception:
                    pass
            cur.execute("""CREATE TABLE IF NOT EXISTS session_tokens (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                token      TEXT    NOT NULL UNIQUE,
                expires_at TEXT    NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )""")
            cur.execute("""CREATE TABLE IF NOT EXISTS saved_plans (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                college      TEXT    NOT NULL,
                uc           TEXT    NOT NULL,
                major        TEXT    NOT NULL,
                plan_text    TEXT    NOT NULL DEFAULT '',
                completed_courses TEXT NOT NULL DEFAULT '',
                created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE (user_id, college, uc, major)
            )""")
            cur.execute("""CREATE TABLE IF NOT EXISTS chat_sessions (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                title      TEXT    NOT NULL DEFAULT 'New chat',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )""")
            cur.execute("""CREATE TABLE IF NOT EXISTS chat_messages (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id INTEGER NOT NULL,
                role       TEXT    NOT NULL,
                content    TEXT    NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            )""")
            cur.execute("""CREATE TABLE IF NOT EXISTS reset_tokens (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER NOT NULL,
                token      TEXT    NOT NULL UNIQUE,
                expires_at TEXT    NOT NULL,
                used       INTEGER NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""")
            cur.execute("""CREATE TABLE IF NOT EXISTS message_feedback (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id    INTEGER,
                session_id INTEGER,
                rating     INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )""")


def _gen_username():
    return random.choice(_ADJS) + random.choice(_NOUNS) + str(random.randint(10, 999))


# ── Users ─────────────────────────────────────────────────────────

def create_user(email, password, username=None):
    username = (username or "").strip() or _gen_username()
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO users (email, password_hash, username) VALUES ({_p(3)})",
            (email.lower().strip(), generate_password_hash(password), username),
        )
    return get_user_by_email(email)


def get_user_by_email(email):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,email,password_hash,username,college,major,target_schools,onboarded,google_id FROM users WHERE email={_p()}",
            (email.lower().strip(),),
        )
        return _row(cur.fetchone())


def get_user_by_id(uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,email,username,college,major,target_schools,onboarded,google_id FROM users WHERE id={_p()}",
            (uid,),
        )
        return _row(cur.fetchone())


def verify_password(user, password):
    if not user.get("password_hash"):
        return False
    return check_password_hash(user["password_hash"], password)


# ── Google OAuth ─────────────────────────────────────────────────

def get_user_by_google_id(google_id):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,email,username,college,major,target_schools,onboarded,google_id FROM users WHERE google_id={_p()}",
            (google_id,),
        )
        return _row(cur.fetchone())


def get_or_create_google_user(google_id, email, name=None):
    """Link a Google account to an existing email-matched user, or create a new one."""
    existing = get_user_by_google_id(google_id)
    if existing:
        return existing

    by_email = get_user_by_email(email)
    if by_email:
        with _connect() as conn:
            cur = conn.cursor()
            cur.execute(
                f"UPDATE users SET google_id={_p()} WHERE id={_p()}",
                (google_id, by_email["id"]),
            )
        return get_user_by_id(by_email["id"])

    username = (name or "").strip() or _gen_username()
    # Unusable placeholder hash — this account can only sign in via Google
    # until/unless the user later sets a real password.
    placeholder_hash = generate_password_hash(secrets.token_urlsafe(32))
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO users (email, password_hash, username, google_id) VALUES ({_p(4)})",
            (email.lower().strip(), placeholder_hash, username, google_id),
        )
    return get_user_by_email(email)


def email_exists(email):
    return get_user_by_email(email) is not None


def update_profile(uid, **fields):
    allowed = {"username", "college", "major", "target_schools", "onboarded"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return
    ph = "%s" if _USE_PG else "?"
    cols = ", ".join(f"{k}={ph}" for k in updates)
    vals = list(updates.values()) + [uid]
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE users SET {cols} WHERE id={ph}", vals)


def update_password(uid, new_password):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE users SET password_hash={_p()} WHERE id={_p()}",
            (generate_password_hash(new_password), uid),
        )


# ── Password reset ────────────────────────────────────────────────

def create_reset_token(email):
    user = get_user_by_email(email)
    if not user:
        return None, None
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(hours=1)).isoformat()
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(f"UPDATE reset_tokens SET used=1 WHERE user_id={_p()}", (user["id"],))
        cur.execute(
            f"INSERT INTO reset_tokens (user_id, token, expires_at) VALUES ({_p(3)})",
            (user["id"], token, expires),
        )
    return token, user


def redeem_reset_token(token, new_password):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT user_id, expires_at, used FROM reset_tokens WHERE token={_p()}",
            (token,),
        )
        row = _row(cur.fetchone())
        if not row or row["used"]:
            return False
        if datetime.utcnow().isoformat() > row["expires_at"]:
            return False
        cur.execute(f"UPDATE reset_tokens SET used=1 WHERE token={_p()}", (token,))
        cur.execute(
            f"UPDATE users SET password_hash={_p()} WHERE id={_p()}",
            (generate_password_hash(new_password), row["user_id"]),
        )
    return True


# ── Chat sessions ─────────────────────────────────────────────────

def create_session(uid, title="New chat"):
    with _connect() as conn:
        cur = conn.cursor()
        if _USE_PG:
            cur.execute(
                f"INSERT INTO chat_sessions (user_id,title) VALUES ({_p(2)}) RETURNING id",
                (uid, title),
            )
            sid = cur.fetchone()["id"]
        else:
            cur.execute(
                f"INSERT INTO chat_sessions (user_id,title) VALUES ({_p(2)})",
                (uid, title),
            )
            sid = cur.lastrowid
    return get_session(sid, uid)


def get_session(sid, uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,title,created_at,updated_at FROM chat_sessions WHERE id={_p()} AND user_id={_p()}",
            (sid, uid),
        )
        return _row(cur.fetchone())


def get_user_sessions(uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT id,title,created_at,updated_at FROM chat_sessions WHERE user_id={_p()} ORDER BY updated_at DESC",
            (uid,),
        )
        return [_row(r) for r in cur.fetchall()]


def update_session_title(sid, uid, title):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"UPDATE chat_sessions SET title={_p()}, updated_at=CURRENT_TIMESTAMP WHERE id={_p()} AND user_id={_p()}",
            (title, sid, uid),
        )


def delete_session(sid, uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"DELETE FROM chat_sessions WHERE id={_p()} AND user_id={_p()}",
            (sid, uid),
        )


# ── Chat messages ─────────────────────────────────────────────────

def add_messages(sid, uid, message_list):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT 1 FROM chat_sessions WHERE id={_p()} AND user_id={_p()}",
            (sid, uid),
        )
        if not cur.fetchone():
            return False
        for m in message_list:
            cur.execute(
                f"INSERT INTO chat_messages (session_id,role,content) VALUES ({_p(3)})",
                (sid, m["role"], m["content"]),
            )
        cur.execute(
            f"UPDATE chat_sessions SET updated_at=CURRENT_TIMESTAMP WHERE id={_p()} AND user_id={_p()}",
            (sid, uid),
        )
    return True


def get_session_messages(sid, uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT 1 FROM chat_sessions WHERE id={_p()} AND user_id={_p()}",
            (sid, uid),
        )
        if not cur.fetchone():
            return None
        cur.execute(
            f"SELECT role, content FROM chat_messages WHERE session_id={_p()} ORDER BY id ASC",
            (sid,),
        )
        return [_row(r) for r in cur.fetchall()]


# ── Feedback ──────────────────────────────────────────────────────

def save_feedback(uid, session_id, rating):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO message_feedback (user_id,session_id,rating) VALUES ({_p(3)})",
            (uid, session_id, rating),
        )


# ── Session tokens (cross-origin auth: frontend and backend are on ────────────
#    different Railway domains, so a normal Flask session cookie can't be
#    relied on — the frontend proxies auth calls and stores this opaque
#    token itself, sending it back as an Authorization: Bearer header.) ───────

def create_session_token(uid, days=30):
    token = secrets.token_urlsafe(32)
    expires = (datetime.utcnow() + timedelta(days=days)).isoformat()
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"INSERT INTO session_tokens (user_id, token, expires_at) VALUES ({_p(3)})",
            (uid, token, expires),
        )
    return token


def get_user_by_token(token):
    if not token:
        return None
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"SELECT user_id, expires_at FROM session_tokens WHERE token={_p()}",
            (token,),
        )
        row = _row(cur.fetchone())
    if not row or datetime.utcnow().isoformat() > row["expires_at"]:
        return None
    return get_user_by_id(row["user_id"])


def delete_session_token(token):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(f"DELETE FROM session_tokens WHERE token={_p()}", (token,))


# ── Saved plans ───────────────────────────────────────────────────

def save_plan(uid, college, uc, major, plan_text, completed_courses=""):
    with _connect() as conn:
        cur = conn.cursor()
        if _USE_PG:
            cur.execute(
                f"""INSERT INTO saved_plans (user_id, college, uc, major, plan_text, completed_courses)
                    VALUES ({_p(6)})
                    ON CONFLICT (user_id, college, uc, major)
                    DO UPDATE SET plan_text={_p()}, completed_courses={_p()}, updated_at=CURRENT_TIMESTAMP""",
                (uid, college, uc, major, plan_text, completed_courses, plan_text, completed_courses),
            )
        else:
            cur.execute(
                f"""INSERT INTO saved_plans (user_id, college, uc, major, plan_text, completed_courses)
                    VALUES ({_p(6)})
                    ON CONFLICT (user_id, college, uc, major)
                    DO UPDATE SET plan_text=excluded.plan_text,
                                  completed_courses=excluded.completed_courses,
                                  updated_at=CURRENT_TIMESTAMP""",
                (uid, college, uc, major, plan_text, completed_courses),
            )


def get_user_plans(uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, college, uc, major, plan_text, completed_courses, created_at, updated_at
                FROM saved_plans WHERE user_id={_p()} ORDER BY updated_at DESC""",
            (uid,),
        )
        return [_row(r) for r in cur.fetchall()]


def get_plan(pid, uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"""SELECT id, college, uc, major, plan_text, completed_courses, created_at, updated_at
                FROM saved_plans WHERE id={_p()} AND user_id={_p()}""",
            (pid, uid),
        )
        return _row(cur.fetchone())


def delete_plan(pid, uid):
    with _connect() as conn:
        cur = conn.cursor()
        cur.execute(
            f"DELETE FROM saved_plans WHERE id={_p()} AND user_id={_p()}",
            (pid, uid),
        )
