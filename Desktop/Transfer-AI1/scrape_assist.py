"""
Live ASSIST.org scraper using Playwright.

Strategy: launch a real Chromium browser, navigate ASSIST like a user,
and intercept the XHR calls ASSIST's Angular frontend makes. This gives
us the real API data without needing to reverse-engineer private endpoints.

Results are cached in SQLite (data/assist_cache.db) — scraped once, reused forever
(agreements don't change mid-year). Cache key = cc|uc|major (lowercased).
"""

import json
import os
import sqlite3
import time
import re
from typing import Optional

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CACHE_DB  = os.path.join(BASE_DIR, "data", "assist_cache.db")

# ── SQLite cache ─────────────────────────────────────────────────

def _db():
    conn = sqlite3.connect(CACHE_DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS assist_cache (
            cache_key  TEXT PRIMARY KEY,
            data       TEXT NOT NULL,
            fetched_at INTEGER NOT NULL
        )
    """)
    conn.commit()
    return conn


def _cache_get(key: str) -> Optional[list]:
    try:
        row = _db().execute(
            "SELECT data FROM assist_cache WHERE cache_key = ?", (key,)
        ).fetchone()
        return json.loads(row[0]) if row else None
    except Exception:
        return None


def _cache_set(key: str, data: list):
    try:
        conn = _db()
        conn.execute(
            "INSERT OR REPLACE INTO assist_cache (cache_key, data, fetched_at) VALUES (?,?,?)",
            (key, json.dumps(data), int(time.time()))
        )
        conn.commit()
    except Exception:
        pass


# ── Playwright scraper ───────────────────────────────────────────

def _scrape(cc_name: str, uc_name: str, major: str) -> Optional[list]:
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout
    except ImportError:
        return None

    captured: list[dict] = []  # {url, data}

    def _on_response(response):
        url = response.url
        if "assist.org/api" not in url:
            return
        if response.status != 200:
            return
        try:
            captured.append({"url": url, "data": response.json()})
        except Exception:
            pass

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--single-process",
                ],
            )
            ctx  = browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                )
            )
            page = ctx.new_page()
            page.on("response", _on_response)

            # ── Step 1: Load ASSIST and let Angular boot ──────────
            page.goto("https://assist.org", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)

            # ── Step 2: Extract institution IDs from captured calls ──
            inst_map: dict[str, int] = {}   # lower-name → id
            year_id  = 75                   # fallback (2023-24)

            for cap in captured:
                url  = cap["url"]
                data = cap["data"]

                # Institutions list
                if "/institutions" in url and isinstance(data, list):
                    for inst in data:
                        iid   = inst.get("id")
                        names = inst.get("names", [])
                        name  = names[0].get("name", "") if names else ""
                        if iid and name:
                            inst_map[name.lower()] = iid

                # Academic years list
                if "academicYear" in url and isinstance(data, list) and data:
                    year_id = max(y.get("id", 0) for y in data if isinstance(y, dict))

            if not inst_map:
                browser.close()
                return None

            # ── Step 3: Match college and UC names to IDs ─────────
            cc_id = _match_inst(cc_name, inst_map)
            uc_id = _match_inst(uc_name, inst_map)

            if not cc_id or not uc_id:
                browser.close()
                return None

            # ── Step 4: Navigate to CC→UC agreement list ─────────
            captured.clear()
            page.goto(
                f"https://assist.org/transfer/results"
                f"?year={year_id}&institution={uc_id}&agreement={cc_id}"
                f"&agreementType=to&viewBy=dept",
                wait_until="networkidle",
                timeout=30000,
            )
            page.wait_for_timeout(2000)

            # ── Step 5: Find and click the matching major ─────────
            major_l = major.lower()
            major_words = [w for w in major_l.split() if len(w) >= 4]

            clicked = False
            for selector in ["a[href*='viewByKey']", "button[class*='dept']", "li[class*='major']"]:
                links = page.query_selector_all(selector)
                for link in links:
                    text = link.inner_text().lower()
                    hits = sum(1 for w in major_words if w in text)
                    if hits >= max(1, len(major_words) // 2):
                        captured.clear()
                        link.click()
                        page.wait_for_timeout(3000)
                        clicked = True
                        break
                if clicked:
                    break

            # ── Step 6: Parse articulation data from captured XHR ─
            result = None
            for cap in captured:
                parsed = _parse_articulation(cap["data"])
                if parsed:
                    result = parsed
                    break

            browser.close()
            return result

    except Exception:
        return None


# ── Helpers ──────────────────────────────────────────────────────

def _match_inst(name: str, inst_map: dict) -> Optional[int]:
    """Fuzzy-match a human institution name to an ASSIST institution ID."""
    nl = name.lower()
    # Exact
    if nl in inst_map:
        return inst_map[nl]
    # Substring
    for k, v in inst_map.items():
        if nl in k or k in nl:
            return v
    # Word overlap (≥ half the significant words)
    words = [w for w in re.split(r"\W+", nl) if len(w) >= 4]
    best_score, best_id = 0, None
    for k, v in inst_map.items():
        score = sum(1 for w in words if w in k)
        if score > best_score:
            best_score, best_id = score, v
    if best_score >= max(1, len(words) // 2):
        return best_id
    return None


def _parse_articulation(data) -> Optional[list]:
    """
    Convert an ASSIST API articulation payload to our shard format:
    [{"uc": {"p","n","t"}, "cc": [[{"p","n","t","u","j"}]]}]
    """
    entries = []

    def _process(obj):
        if isinstance(obj, list):
            for item in obj:
                _process(item)
        elif isinstance(obj, dict):
            # Look for a UC (receiving) course + CC (sending) courses pairing
            uc_raw = (obj.get("receivingCourse") or obj.get("toSection") or
                      obj.get("uc") or obj.get("to"))
            cc_raw = (obj.get("sendingCourses") or obj.get("fromSection") or
                      obj.get("cc") or obj.get("from"))

            if uc_raw and cc_raw:
                uc = _norm_course(uc_raw)
                cc = _norm_groups(cc_raw)
                if uc and cc:
                    entries.append({"uc": uc, "cc": cc})
                    return  # don't recurse into this node

            # Recurse into all values
            for v in obj.values():
                if isinstance(v, (dict, list)):
                    _process(v)

    _process(data)
    return entries if entries else None


def _norm_course(c) -> Optional[dict]:
    if not isinstance(c, dict):
        return None
    p = c.get("prefix") or c.get("coursePrefix") or c.get("p") or ""
    n = c.get("number") or c.get("courseNumber") or c.get("n") or ""
    t = c.get("title")  or c.get("courseTitle")  or c.get("t") or ""
    return {"p": p, "n": n, "t": t} if (p and n) else None


def _norm_groups(raw) -> list:
    groups = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, list):
                grp = [_norm_course_cc(c) for c in item if isinstance(c, dict)]
                grp = [c for c in grp if c]
                if grp:
                    groups.append(grp)
            elif isinstance(item, dict):
                c = _norm_course_cc(item)
                if c:
                    groups.append([c])
    elif isinstance(raw, dict):
        c = _norm_course_cc(raw)
        if c:
            groups.append([c])
    return groups


def _norm_course_cc(c: dict) -> Optional[dict]:
    if not isinstance(c, dict):
        return None
    p = c.get("prefix") or c.get("coursePrefix") or c.get("p") or ""
    n = c.get("number") or c.get("courseNumber") or c.get("n") or ""
    t = c.get("title")  or c.get("courseTitle")  or c.get("t") or ""
    u = float(c.get("units") or c.get("u") or 0)
    j = c.get("conjunction") or c.get("j") or "And"
    return {"p": p, "n": n, "t": t, "u": u, "j": j} if (p and n) else None


# ── Public API ───────────────────────────────────────────────────

def live_scrape(cc_name: str, uc_name: str, major: str) -> Optional[list]:
    """
    Return live ASSIST articulation data for cc→uc/major.
    Checks SQLite cache first. Falls back to Playwright scraper.
    Returns list in shard format, or None if unavailable.
    """
    key = f"{cc_name.lower().strip()}|{uc_name.lower().strip()}|{major.lower().strip()}"

    cached = _cache_get(key)
    if cached is not None:
        return cached or None  # [] means "no articulation found, don't re-scrape"

    result = _scrape(cc_name, uc_name, major)

    _cache_set(key, result or [])  # cache empty list so we don't retry constantly
    return result
