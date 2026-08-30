"""One-off migration: re-render every saved plan's plan_text with the current
deterministic renderer.

Why this exists: saved_plans.plan_text stores the fully-rendered plan as
text. Rows saved before render_plan_text() replaced the old LLM-based
renderer can still carry the deprecated truncation-fallback text
("Plan appears cut off - Key Notes section missing. Please regenerate."),
or otherwise stale formatting from an earlier version of the renderer. This
script rebuilds plan_text for every row from its stored college/uc/major/
completed_courses, using the exact same build_plan() + render_plan_text()
path plan_v2() uses today, so every saved plan matches what a fresh
generation would produce right now.

Safety: defaults to a dry run that only prints what would change. Pass
--apply to actually write to the database.

Usage:
    DATABASE_PUBLIC_URL=postgresql://... python regenerate_saved_plans.py            # dry run
    DATABASE_PUBLIC_URL=postgresql://... python regenerate_saved_plans.py --apply    # writes
"""
import argparse
import os
import sys

import psycopg2
import psycopg2.extras

from plan_engine import build_plan as _engine_build_plan, render_plan_text as _engine_render_text

# Mirrors app.py's plan_v2() TAG/GPA metadata exactly, so regenerated plans
# read identically to what a fresh request would produce today.
_UC_NAME_MAP = {
    "uc berkeley": "berkeley", "berkeley": "berkeley",
    "uc los angeles": "los angeles", "ucla": "los angeles", "los angeles": "los angeles",
    "uc san diego": "san diego", "ucsd": "san diego", "san diego": "san diego",
    "uc irvine": "irvine", "uci": "irvine", "irvine": "irvine",
    "uc santa barbara": "santa barbara", "ucsb": "santa barbara", "santa barbara": "santa barbara",
    "uc davis": "davis", "davis": "davis",
    "uc santa cruz": "santa cruz", "ucsc": "santa cruz", "santa cruz": "santa cruz",
    "uc riverside": "riverside", "ucr": "riverside", "riverside": "riverside",
    "uc merced": "merced", "merced": "merced",
}

_UC_GPA_TARGETS = {
    "los angeles":   ("3.5–3.9", "UCLA avg admitted transfer GPA is 3.5–3.9 — target 3.7+."),
    "berkeley":      ("3.5–3.9", "UC Berkeley avg admitted transfer GPA is 3.5–3.9 — target 3.7+."),
    "san diego":     ("3.6–3.8", "UCSD avg admitted transfer GPA is 3.55–3.94 — target 3.7+."),
    "irvine":        ("3.6–3.7", "UCI avg admitted transfer GPA is 3.4–3.7 — target 3.6+."),
    "santa barbara": ("3.6–3.7", "UCSB avg admitted transfer GPA is 3.4–3.7 — target 3.6+."),
    "davis":         ("3.6–3.7", "UC Davis avg admitted transfer GPA is 3.4–3.7 — target 3.6+."),
    "santa cruz":    ("3.5–3.6", "UCSC avg admitted transfer GPA is 3.3–3.6 — target 3.5+."),
    "riverside":     ("3.3–3.5", "UCR avg admitted transfer GPA is 3.0–3.5 — target 3.3+."),
    "merced":        ("3.2–3.4", "UC Merced avg admitted transfer GPA is 3.0–3.4 — target 3.2+."),
}
_TAG_NON = {"los angeles", "berkeley", "san diego"}
_TAG_YES = {"davis", "irvine", "merced", "riverside", "santa barbara", "santa cruz"}


def _tag_note(uc_l, school):
    if uc_l in _TAG_NON:
        return (f"{school} does NOT participate in TAG. "
                "TAG is offered only by UC Davis, UC Irvine, UC Merced, UC Riverside, "
                "UC Santa Barbara, and UC Santa Cruz.")
    if uc_l in _TAG_YES:
        return (f"{school} offers TAG — file Sept 1–30. "
                "Requirements: 60 transferable units by end of spring, minimum GPA (varies by "
                "major), no more than 2 attempts at a required course.")
    return "Check if your target campus offers TAG — 6 UCs participate."


def regenerate_one(college, uc, major, completed_courses):
    completed_set = set(c.strip() for c in completed_courses.split(",") if c.strip()) if completed_courses else set()
    result = _engine_build_plan(college=college, uc=uc, major=major, completed=completed_set)
    if not result.all_courses():
        return None, "no articulation data for this college/uc/major combination"

    uc_l = _UC_NAME_MAP.get(uc.lower().strip(), uc.lower())
    gpa_range, gpa_note = _UC_GPA_TARGETS.get(uc_l, ("3.5+", f"Target 3.5+ for {uc}."))
    tag_note = _tag_note(uc_l, uc)
    try:
        text = _engine_render_text(result, tag_note, gpa_range, gpa_note, "competitive")
    except Exception as e:
        return None, f"render failed: {e}"
    return text, None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write changes to the database (default: dry run).")
    parser.add_argument("--only-broken", action="store_true",
                         help="Only touch rows that look stale (contain the old truncation-fallback text).")
    args = parser.parse_args()

    db_url = os.getenv("DATABASE_PUBLIC_URL") or os.getenv("DATABASE_URL")
    if not db_url:
        print("Set DATABASE_PUBLIC_URL (or DATABASE_URL) to the Postgres connection string.", file=sys.stderr)
        sys.exit(1)

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id, user_id, college, uc, major, completed_courses, plan_text FROM saved_plans ORDER BY id")
    rows = cur.fetchall()
    print(f"{len(rows)} saved plan(s) found.\n")

    STALE_MARKER = "Plan appears cut off"
    changed = skipped = failed = 0

    for row in rows:
        if args.only_broken and STALE_MARKER not in (row["plan_text"] or ""):
            continue

        new_text, err = regenerate_one(row["college"], row["uc"], row["major"], row["completed_courses"] or "")
        label = f"#{row['id']} user={row['user_id']} {row['college']!r} -> {row['uc']!r} / {row['major']!r}"

        if err:
            print(f"[FAIL]  {label}: {err}")
            failed += 1
            continue

        if new_text == row["plan_text"]:
            print(f"[SAME]  {label}")
            skipped += 1
            continue

        was_stale = STALE_MARKER in (row["plan_text"] or "")
        print(f"[{'STALE->OK' if was_stale else 'UPDATE'}] {label} ({len(row['plan_text'] or '')} -> {len(new_text)} chars)")
        changed += 1

        if args.apply:
            cur.execute(
                "UPDATE saved_plans SET plan_text = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                (new_text, row["id"]),
            )

    if args.apply:
        conn.commit()
        print(f"\nApplied. {changed} updated, {skipped} unchanged, {failed} failed.")
    else:
        conn.rollback()
        print(f"\nDry run only - no changes written. {changed} would update, {skipped} unchanged, {failed} failed.")
        print("Re-run with --apply to write these changes.")

    cur.close()
    conn.close()


if __name__ == "__main__":
    main()
