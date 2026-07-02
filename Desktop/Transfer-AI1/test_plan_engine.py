"""
Test plan_engine.py against all known failing cases + new breadth cases.

Usage:
  python test_plan_engine.py            # run all cases
  python test_plan_engine.py 1          # run case 1 only
  python test_plan_engine.py 1 2 5      # run specific cases

All cases must PASS before plan_engine replaces /plan.

Fail criteria (hard errors):
  - Ghost course: course in igetc_completion but not in any scheduled term
  - Prereq violation: same-prefix letter-sequence course in wrong term order
  - AND-group incomplete: multiple CC courses required but not all scheduled
  - Match failure: no articulation data found (empty schedule)
  - Crash: any exception during build_plan()

Soft observations (printed but don't fail the test):
  - EXTENDED PLAN: program needs >4 semesters (expected for heavy programs)
  - Under-loaded term: a term has <9u
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from plan_engine import (
    build_plan,
    build_render_prompt,
    PlanResult,
    _MAX_UNITS_PER_TERM,
)
from course_sequence import infer_sequence_order, same_sequence_base

# ── Test case definitions ─────────────────────────────────────────────────────
# (id, description, college, uc, major, accept_honors)

CASES = [
    # Original 7 required cases
    (1, "De Anza -> Berkeley -> CS [calc-chain prereq ordering]",
        "De Anza College", "Berkeley", "Computer Science B.S.", False),
    (2, "Foothill -> Berkeley -> CS [ENGL 8 ghost-course]",
        "Foothill College", "Berkeley", "Computer Science B.S.", False),
    (3, "Foothill -> UCSD -> CS [4 ghost courses]",
        "Foothill College", "UCSD", "Computer Science B.S.", False),
    (4, "De Anza -> Berkeley -> CS [honors consistency]",
        "De Anza College", "Berkeley", "Computer Science B.S.", False),
    (5, "De Anza -> Merced -> Applied Math CS [was 413-trigger]",
        "De Anza College", "Merced",
        "Applied Mathematical Sciences -- Computer Science Emphasis B.S.", False),
    (6, "Foothill -> Merced -> CS Engineering [was 413-trigger]",
        "Foothill College", "Merced", "Computer Science and Engineering B.S.", False),
    (7, "De Anza -> UCSD -> CS [was 413-trigger]",
        "De Anza College", "UCSD", "Computer Science B.S.", False),

    # New breadth cases
    (8, "De Anza -> UC Davis -> Psychology B.A. [non-CS/Math]",
        "De Anza College", "Davis", "Psychology B.A.", False),
    (9, "Foothill -> Merced -> Electrical Engineering [high AND-group]",
        "Foothill College", "Merced", "Electrical Engineering B.S.", False),
]

TAG_NOTES = {
    "berkeley":     "UC Berkeley does NOT offer TAG.",
    "san diego":    "UC San Diego does NOT offer TAG.",
    "merced":       "UC Merced DOES offer TAG (min 3.0 GPA for most STEM majors).",
    "davis":        "UC Davis DOES offer TAG (min 3.2 GPA for Psych).",
    "los angeles":  "UC Los Angeles does NOT offer TAG.",
    "irvine":       "UC Irvine DOES offer TAG (min 3.4 GPA for some majors).",
    "santa barbara":"UC Santa Barbara DOES offer TAG (min 3.2 GPA).",
    "santa cruz":   "UC Santa Cruz DOES offer TAG (min 3.0 GPA).",
    "riverside":    "UC Riverside DOES offer TAG (min 3.0 GPA).",
}
GPA_NOTES = {
    "berkeley":     ("3.7-3.9", "UC Berkeley CS is extremely competitive. Aim for 3.9."),
    "san diego":    ("3.7-3.9", "UCSD CS is highly competitive. Aim for 3.7+."),
    "merced":       ("3.2-3.4", "UC Merced is accessible. Target 3.2+ for CS."),
    "davis":        ("3.5-3.7", "UC Davis Psychology is moderately competitive."),
    "los angeles":  ("3.7-4.0", "UCLA is extremely competitive across all majors."),
    "irvine":       ("3.5-3.7", "UCI is moderately competitive."),
    "santa barbara":("3.5-3.7", "UCSB is moderately competitive."),
    "santa cruz":   ("3.3-3.5", "UCSC is accessible."),
    "riverside":    ("3.0-3.5", "UCR is accessible."),
}

# ── Checkers ─────────────────────────────────────────────────────────────────

def check_ghost_courses(result: PlanResult) -> list:
    placed = {s.code for s in result.all_courses()}
    errors = []
    for area, course_code in result.igetc_completion.items():
        for code in course_code.split(", "):
            code = code.strip()
            if not code or "via" in code or "satisfied" in code:
                continue
            if code not in placed:
                errors.append(f"Ghost in area {area}: {code!r} not placed in any term")
    return errors


def check_prereq_violations(result: PlanResult) -> list:
    all_courses = result.all_courses()
    errors = []
    checked = set()
    for a in all_courses:
        for b in all_courses:
            if a.code == b.code or (a.code, b.code) in checked:
                continue
            checked.add((a.code, b.code))
            if a.prefix != b.prefix:
                continue
            if not same_sequence_base(a.number, b.number):
                continue
            ord_a = infer_sequence_order(a.number)[1]
            ord_b = infer_sequence_order(b.number)[1]
            # a should precede b (ord_a < ord_b) meaning a.term <= b.term
            if ord_a < ord_b and a.term > b.term:
                errors.append(
                    f"Prereq violation: {a.code} (ord {ord_a}, term {a.term}) "
                    f"placed AFTER {b.code} (ord {ord_b}, term {b.term})"
                )
    return errors


def check_and_groups(result: PlanResult) -> list:
    placed = {s.code for s in result.all_courses()}
    errors = []
    for uc_req, cc_code, status in result.requirement_audit:
        if status != "MET":
            continue
        required = [c.strip() for c in cc_code.split(" + ") if c.strip()]
        missing  = [c for c in required if c not in placed and "already completed" not in c]
        if missing:
            errors.append(f"AND-group incomplete for {uc_req!r}: missing {missing}")
    return errors


def check_unit_overload(result: PlanResult) -> list:
    errors = []
    for t in range(1, result.active_terms + 1):
        units = sum(s.units for s in result.terms.get(t, []))
        if units > _MAX_UNITS_PER_TERM + 0.5:  # 0.5 tolerance for rounding
            errors.append(
                f"Term {t} has {units:.1f}u -- exceeds {_MAX_UNITS_PER_TERM}u hard cap"
            )
    return errors


def check_token_size(prompt: str, threshold: int = 3000) -> list:
    est = len(prompt) // 4
    if est > threshold:
        return [f"Render prompt is ~{est} tokens (threshold {threshold})"]
    return []


# ── Runner ────────────────────────────────────────────────────────────────────

def run_case(case_id, desc, college, uc, major, accept_honors) -> dict:
    print(f"\n{'-'*70}")
    print(f"CASE {case_id}: {desc}")
    print(f"  {college} -> {uc} | {major}")

    try:
        result = build_plan(college, uc, major, accept_honors=accept_honors)
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"  ERROR: {type(e).__name__}: {e}")
        print(tb)
        return {"id": case_id, "desc": desc, "status": "ERROR",
                "errors": [f"{type(e).__name__}: {e}"], "traceback": tb}

    errors = []

    if not result.all_courses():
        errors.append("No courses scheduled (match failure or empty shard)")
        print(f"  FAIL: {errors[0]}")
        return {"id": case_id, "desc": desc, "status": "FAIL", "errors": errors}

    errors += check_ghost_courses(result)
    errors += check_prereq_violations(result)
    errors += check_and_groups(result)
    errors += check_unit_overload(result)

    uc_l    = _UC_NAME_MAP_LOCAL.get(uc.lower().strip(), uc.lower())
    tag     = TAG_NOTES.get(uc_l, "Check UC TAG page for eligibility.")
    gpa_r, gpa_n = GPA_NOTES.get(uc_l, ("3.0-4.0", "See UC admissions stats."))
    prompt  = build_render_prompt(result, tag, gpa_r, gpa_n)
    errors += check_token_size(prompt)

    # Print schedule summary
    ext_flag = " [EXTENDED]" if result.extended_plan else ""
    print(f"  {result.active_terms} terms{ext_flag}, {len(result.all_courses())} courses, {result.total_units:.0f}u total")
    for t in range(1, result.active_terms + 1):
        t_units = sum(s.units for s in result.terms.get(t, []))
        names   = ", ".join(s.code for s in result.terms.get(t, []))
        print(f"    Term {t}: {t_units:.0f}u  [{names}]")
    print(f"  IGETC: {sorted(result.igetc_completion.keys())}")
    print(f"  Post-transfer: {len(result.post_transfer)}")
    print(f"  Render prompt: ~{len(prompt) // 4} tokens")

    # Print soft observations (not failures)
    soft = [w for w in result.warnings if not w.startswith("Ghost:")]
    for w in soft:
        print(f"  NOTE: {w[:120]}")

    if errors:
        print(f"  FAIL ({len(errors)} errors):")
        for e in errors:
            print(f"    * {e}")
        return {"id": case_id, "desc": desc, "status": "FAIL", "errors": errors,
                "result": result}
    else:
        print(f"  PASS")
        return {"id": case_id, "desc": desc, "status": "PASS", "errors": [],
                "result": result, "prompt": prompt}


# Needed locally in test (not importing from plan_engine to avoid pollution)
from plan_engine import _UC_NAME_MAP as _UC_NAME_MAP_LOCAL


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1:
        ids   = set(int(x) for x in sys.argv[1:])
        cases = [c for c in CASES if c[0] in ids]
    else:
        cases = CASES

    results = []
    for case in cases:
        r = run_case(*case)
        results.append(r)

    print(f"\n{'='*70}")
    print("SUMMARY")
    print("="*70)
    passed  = [r for r in results if r["status"] == "PASS"]
    failed  = [r for r in results if r["status"] == "FAIL"]
    errored = [r for r in results if r["status"] == "ERROR"]
    print(f"  PASS:  {len(passed)}")
    print(f"  FAIL:  {len(failed)}")
    print(f"  ERROR: {len(errored)}")

    if failed or errored:
        print("\nFailed cases:")
        for r in failed + errored:
            print(f"  Case {r['id']}: {r['desc']}")
            for e in r["errors"][:5]:
                print(f"    -> {e}")
            if "traceback" in r:
                print(r["traceback"][:1000])

    sys.exit(0 if not failed and not errored else 1)


if __name__ == "__main__":
    main()
