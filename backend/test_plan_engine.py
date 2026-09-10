"""
Test plan_engine.py against all known failing cases + breadth cases.

Usage:
  python test_plan_engine.py            # run all cases
  python test_plan_engine.py 1          # run case 1 only
  python test_plan_engine.py 1 2 5      # run specific cases

All cases must PASS before plan_engine replaces /plan.

Fail criteria (hard errors):
  - Ghost course: course in ge_completion but not in any scheduled term
  - Prereq violation: same-prefix letter-sequence course in wrong term order
  - AND-group incomplete: multiple CC courses required but not all scheduled
  - Match failure: no articulation data found (empty schedule)
  - Crash: any exception during build_plan()
  - Completed course re-scheduled (when completedCourses provided)
  - Missing UNIT SHORTFALL warning (for cases marked expect_shortfall=True)

Soft observations (printed but don't fail the test):
  - EXTENDED PLAN: program needs >4 semesters (expected for heavy programs)
  - Under-loaded term: a term has <9u
  - UNIT SHORTFALL: informational only; hard-checked only for cases with
    {"expect_shortfall": True} in their extra dict
  - min_total_units: float — FAIL if plan total < this value (verifies elective filling)

Case tuple formats:
  (id, desc, college, uc, major, accept_honors)
  (id, desc, college, uc, major, accept_honors, extra_dict)

  extra_dict keys (all optional):
    completed        set[str]  -- courses already done; must NOT appear in plan
    ap_credits       str       -- AP exam string passed to build_plan
    expect_shortfall bool      -- if True, plan MUST emit UNIT SHORTFALL warning
    must_include     set[str]        -- course codes (e.g. "MATH 1A") that MUST appear
    must_not_include set[str]        -- course codes that must NOT appear (regression guard)
    min_courses      int             -- plan must have at least this many courses
    max_courses      int             -- plan must have at most this many courses
    must_not_all     list[set[str]]  -- each set: having ALL courses in it is an error
    expect_overreq   bool            -- if True, must_not_all violations are KNOWN_ISSUE
                                        (prints clearly, doesn't FAIL the suite; clears
                                        automatically once Conjunction=Or section-awareness
                                        is implemented)
"""

import sys
import os
import re

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from plan_engine import (
    build_plan,
    repair_term_headers,
    PlanResult,
    _MAX_UNITS_PER_TERM,
    _MAX_QUARTER_UNITS_PER_TERM,
)
from course_sequence import infer_sequence_order, same_sequence_base

# ── Test case definitions ─────────────────────────────────────────────────────
# See module docstring for tuple format.

CASES = [
    # ── Original 9 cases (unchanged) ─────────────────────────────────────────
    (1, "De Anza -> Berkeley -> CS [calc-chain prereq ordering]",
        "De Anza College", "Berkeley", "Computer Science B.S.", False,
        {"min_total_units": 90.0}),
    (2, "Foothill -> Berkeley -> CS [ENGL 8 ghost-course]",
        "Foothill College", "Berkeley", "Computer Science B.S.", False,
        {"min_total_units": 90.0}),
    (3, "Foothill -> UCSD -> CS [4 ghost courses]",
        "Foothill College", "UCSD", "Computer Science B.S.", False),
    (4, "De Anza -> Berkeley -> CS [honors consistency]",
        "De Anza College", "Berkeley", "Computer Science B.S.", False,
        {"min_total_units": 90.0}),
    (5, "De Anza -> Merced -> Applied Math CS [was 413-trigger]",
        "De Anza College", "Merced",
        "Applied Mathematical Sciences -- Computer Science Emphasis B.S.", False),
    (6, "Foothill -> Merced -> CS Engineering [was 413-trigger]",
        "Foothill College", "Merced", "Computer Science and Engineering B.S.", False),
    (7, "De Anza -> UCSD -> CS [was 413-trigger]",
        "De Anza College", "UCSD", "Computer Science B.S.", False),
    (8, "De Anza -> UC Davis -> Psychology B.A. [non-CS/Math]",
        "De Anza College", "Davis", "Psychology B.A.", False,
        {"must_include": {"PSYC C1000", "ANTH 1", "PSYC 2"},
         "min_courses": 10,
         "min_total_units": 90.0}),
    (9, "Foothill -> Merced -> Electrical Engineering [high AND-group]",
        "Foothill College", "Merced", "Electrical Engineering B.S.", False,
        {"min_total_units": 90.0}),

    # ── UCLA coverage (previously zero) ──────────────────────────────────────
    (10, "De Anza -> UCLA -> Psychology B.A. [UCLA non-STEM]",
         "De Anza College", "Los Angeles", "Psychology B.A.", False,
         {"must_include": {"PSYC C1000"},
          "must_not_include": {"MATH 1BH"},        # regression: wrong major ghost
          "max_courses": 35,
          # KNOWN ISSUE — Conjunction=Or group c2af6f45 is section-based (pick one track)
          # but conservative k=0 requires all entries.  Until section-awareness is added,
          # these alternative science tracks are co-scheduled when only one should appear.
          # Investigate: sectionAdvisements / group position in raw ASSIST templateAssets.
          "must_not_all": [
              {"PHYS 10", "PHYS 4A"},    # conceptual vs calc-based physics are alternative tracks
              {"CHEM 10", "CHEM 1A"},    # intro vs general chemistry are alternative tracks
          ],
          "expect_overreq": True}),
    (11, "CCSF -> UCLA -> History B.A. [new CC: CCSF; elective fill to 60 SU]",
         "City College of San Francisco", "Los Angeles", "History B.A.", False,
         {"must_include": {"HIST 4A"},           # Western Civ must appear
          "min_total_units": 60.0}),

    # ── UCI coverage ──────────────────────────────────────────────────────────
    (12, "ARC -> UCI -> Psychology B.S. [new CC: ARC; elective fill to 60 SU]",
         "American River College", "Irvine", "Psychology B.S.", False,
         {"min_total_units": 60.0}),
    (13, "De Anza -> UCI -> Economics B.A. [UCI non-STEM, heavy major]",
         "De Anza College", "Irvine", "Economics B.A.", False,
         {"must_include": {"MATH 1A", "ECON 1", "ECON 2", "MATH 1B"},
          "must_not_include": {"PHTG 1", "PHTG 4", "ARTS 4A"},  # regression: Art major ghost
          "max_courses": 25,  # raised from 20 — elective filling adds ~10 courses
          "min_total_units": 90.0}),

    # ── UCSB coverage (previously zero) ──────────────────────────────────────
    (14, "ARC -> UCSB -> Political Science B.A. [UCSB; elective fill to 60 SU]",
         "American River College", "Santa Barbara", "Political Science B.A.", False,
         {"min_total_units": 60.0}),
    (15, "De Anza -> UCSB -> Sociology B.A. [UCSB non-STEM; elective fill to 90 QU]",
         "De Anza College", "Santa Barbara", "Sociology B.A.", False,
         {"min_total_units": 90.0}),

    # ── UCSC coverage (previously zero) ──────────────────────────────────────
    (16, "ARC -> UCSC -> Psychology B.A. [UCSC; elective fill to 60 SU]",
         "American River College", "Santa Cruz", "Psychology B.A.", False,
         {"min_total_units": 60.0}),
    (17, "DVC -> UCSC -> History B.A. [new CC: Diablo Valley]",
         "Diablo Valley College", "Santa Cruz", "History B.A.", False,
         {"must_include": {"HIST 136"}}),  # GE Area 3B course; calgetc_map sorts HIST 136 first

    # ── Berkeley non-CS/Eng ───────────────────────────────────────────────────
    (18, "ARC -> Berkeley -> Economics B.A. [Berkeley non-STEM; elective fill to 60 SU]",
         "American River College", "Berkeley", "Economics B.A.", False,
         {"min_total_units": 60.0}),

    # ── UCSD non-CS ───────────────────────────────────────────────────────────
    (19, "ARC -> UCSD -> Psychology B.S. [UCSD non-CS, heavy]",
         "American River College", "San Diego", "Psychology B.S.", False),
    (20, "De Anza -> UCSD -> Economics B.A. [UCSD non-STEM; elective fill to 90 QU]",
         "De Anza College", "San Diego", "Economics B.A.", False,
         {"min_total_units": 90.0}),

    # ── Merced non-CS ─────────────────────────────────────────────────────────
    (21, "ARC -> Merced -> Sociology B.A. [Merced non-STEM; elective fill to 60 SU]",
         "American River College", "Merced", "Sociology B.A.", False,
         {"min_total_units": 60.0}),

    # ── Unit-shortfall regression (permanent 60u check tests) ─────────────────
    (22, "Foothill -> Riverside -> English B.A. [elective fill to 90 QU]",
         "Foothill College", "Riverside", "English B.A.", False,
         {"min_total_units": 90.0}),
    (23, "De Anza -> Riverside -> Philosophy B.A. [elective fill to 90 QU]",
         "De Anza College", "Riverside", "Philosophy B.A.", False,
         {"min_total_units": 90.0}),

    # ── New CC: Pasadena City College ─────────────────────────────────────────
    (24, "PCC -> UCI -> Sociology B.A. [new CC: Pasadena City College]",
         "Pasadena City College", "Irvine", "Sociology B.A.", False),

    # ── completedCourses parameter tests ─────────────────────────────────────
    (25, "De Anza -> Berkeley -> CS [completedCourses=MATH 1A,ENGL C1000]",
         "De Anza College", "Berkeley", "Computer Science B.S.", False,
         {"completed": {"MATH 1A", "ENGL C1000"},
          "min_total_units": 90.0}),
    (26, "De Anza -> Davis -> Psychology B.A. [completedCourses=PSYC 2]",
         "De Anza College", "Davis", "Psychology B.A.", False,
         {"completed": {"PSYC 2"},
          "min_total_units": 90.0}),

    # ── apCredits parameter test ───────────────────────────────────────────────
    (27, "De Anza -> Berkeley -> CS [apCredits=AP Calculus BC]",
         "De Anza College", "Berkeley", "Computer Science B.S.", False,
         {"ap_credits": "AP Calculus BC",
          "min_total_units": 90.0}),

    # ── Davis additional non-STEM coverage ───────────────────────────────────
    (28, "De Anza -> Davis -> Sociology B.A. [Davis non-STEM breadth; elective fill to 90 QU]",
         "De Anza College", "Davis", "Sociology B.A.", False,
         {"min_total_units": 90.0}),

    # ── Cal-GETC content assertions (from calgetc-mode branch) ───────────────
    # Verify re-scraped calgetc_map produces real Area 1C (Oral Communication)
    # and Area 6 (Ethnic Studies) — not proxy/NOT ASSIGNED.
    (29, "De Anza -> Berkeley -> CS [Cal-GETC: Area 1C and Area 6 must be real courses]",
         "De Anza College", "Berkeley", "Computer Science B.S.", False,
         {"must_include_ge_areas": {"1C", "6"},
          "must_not_include_ge_strings": {"NOT ASSIGNED", "via Area 4C"}}),
    (30, "Foothill -> UCLA -> Psychology [Cal-GETC: Area 1C and Area 6]",
         "Foothill College", "Los Angeles", "Psychology B.A.", False,
         {"must_include_ge_areas": {"1C", "6"},
          "must_not_include_ge_strings": {"NOT ASSIGNED", "via Area 4C"}}),

    # ── Integration: calgetc × term-system × elective-filling ─────────────────
    # (a) quarter + calgetc: verify 6-term quarter logic and Cal-GETC GE co-exist
    #     and elective filling reaches 90 QU
    (31, "Foothill -> UC Davis -> Psychology B.A. [INTEGRATION: quarter + calgetc]",
         "Foothill College", "Davis", "Psychology B.A.", False,
         {"min_total_units": 90.0,
          "must_include_ge_areas": {"1C", "6"},
          "must_not_include_ge_strings": {"NOT ASSIGNED"}}),

    # (b) semester + calgetc: verify Cal-GETC GE works for semester school and
    #     elective filling reaches 60 SU
    (32, "ARC -> UCLA -> History B.A. [INTEGRATION: semester + calgetc]",
         "American River College", "Los Angeles", "History B.A.", False,
         {"min_total_units": 60.0,
          "must_include_ge_areas": {"1C", "6"},
          "must_not_include_ge_strings": {"NOT ASSIGNED"}}),
]

# ── Checkers ─────────────────────────────────────────────────────────────────

def check_ghost_courses(result: PlanResult) -> list:
    placed = {s.code for s in result.all_courses()}
    errors = []
    for area, course_code in result.ge_completion.items():
        for code in course_code.split(", "):
            code = code.strip()
            if not code or "via" in code or "satisfied" in code or "already completed" in code or "NOT ASSIGNED" in code:
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
            # Same-lettered courses that jointly satisfy the identical UC
            # requirement (e.g. Alameda's MATH 3E + 3F both articulating to
            # "MATH 54 - Linear Algebra and Differential Equations") are a
            # bundled pair, not a prerequisite chain of each other — the
            # letter order doesn't imply which must come first. Flagging
            # these was a false positive, not a real scheduling bug.
            if a.uc_reqs and a.uc_reqs == b.uc_reqs:
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
        if cc_code.startswith("satisfied via"):  # OR-group: winner handles this requirement
            continue
        required = [c.strip() for c in cc_code.split(" + ") if c.strip()]
        missing  = [c for c in required if c not in placed and "already completed" not in c]
        if missing:
            errors.append(f"AND-group incomplete for {uc_req!r}: missing {missing}")
    return errors


def check_unit_overload(result: PlanResult) -> list:
    cap = _MAX_QUARTER_UNITS_PER_TERM if result.is_quarter else _MAX_UNITS_PER_TERM
    errors = []
    for t in range(1, result.active_terms + 1):
        units = sum(s.units for s in result.terms.get(t, []))
        if units > cap + 0.5:  # 0.5 tolerance for rounding
            errors.append(
                f"Term {t} has {units:.1f}u -- exceeds {cap}u hard cap"
            )
    return errors


def check_completed_excluded(result: PlanResult, completed: set) -> list:
    """Completed courses must not appear anywhere in the scheduled plan."""
    if not completed:
        return []
    placed = {s.code for s in result.all_courses()}
    errors = []
    for raw in completed:
        code = raw.strip().upper()
        if code in placed:
            errors.append(
                f"Completed course {code} was re-scheduled (should have been excluded)"
            )
    return errors


def check_no_duplicates(result: PlanResult) -> list:
    """No course should appear in more than one term."""
    seen: dict = {}
    errors = []
    for s in result.all_courses():
        if s.code in seen:
            errors.append(
                f"Duplicate: {s.code} scheduled in term {seen[s.code]} AND term {s.term}"
            )
        else:
            seen[s.code] = s.term
    return errors


def check_content(
    result: PlanResult,
    must_include: set,
    must_not_include: set,
    min_courses: int | None,
    max_courses: int | None,
) -> list:
    """Validate course-content expectations from the extra_dict."""
    all_codes = {s.code for s in result.all_courses()}
    errors = []
    for code in sorted(must_include or set()):
        if code not in all_codes:
            errors.append(f"Required course missing from plan: {code}")
    for code in sorted(must_not_include or set()):
        if code in all_codes:
            errors.append(f"Forbidden course present in plan: {code}")
    total = len(result.all_courses())
    if min_courses is not None and total < min_courses:
        errors.append(f"Plan has {total} courses but needs at least {min_courses}")
    if max_courses is not None and total > max_courses:
        errors.append(f"Plan has {total} courses but max allowed is {max_courses}")
    return errors


def check_must_not_all(result: PlanResult, must_not_all: list) -> list:
    """Each set in must_not_all: if ALL courses in that set are present, it's an error.
    Used to flag Conjunction=Or over-requirement where alternative tracks are co-scheduled."""
    all_codes = {s.code for s in result.all_courses()}
    errors = []
    for course_set in (must_not_all or []):
        present = sorted(c for c in course_set if c in all_codes)
        if len(present) == len(course_set):
            errors.append(
                f"Alternative tracks co-scheduled (Conjunction=Or over-requirement): "
                f"{present} — student should pick only one track"
            )
    return errors


def check_ge_areas(result: PlanResult, must_include_ge_areas: set, must_not_include_ge_strings: set) -> list:
    """Verify specific GE area codes have real course assignments (not placeholder strings)."""
    errors = []
    for area in sorted(must_include_ge_areas or set()):
        val = result.ge_completion.get(area)
        if not val:
            errors.append(f"GE area {area} not in ge_completion — no assignment made")
            continue
        for bad in (must_not_include_ge_strings or set()):
            if bad.lower() in str(val).lower():
                errors.append(f"GE area {area} has placeholder assignment: {val!r}")
    return errors


def check_shortfall_fires(result: PlanResult) -> list:
    """UNIT SHORTFALL warning must be present (hard check for known sub-60u cases)."""
    if not any("UNIT SHORTFALL" in w for w in result.warnings):
        return [
            f"Expected UNIT SHORTFALL warning but none fired "
            f"(plan has {result.total_units:.1f}u)"
        ]
    return []


def check_min_units(result: PlanResult, min_total_units: float) -> list:
    """Plan must reach min_total_units — verifies elective filling succeeded."""
    if result.total_units < min_total_units:
        return [
            f"Plan has {result.total_units:.1f}u but min_total_units={min_total_units:.1f} "
            f"(elective filling may have failed)"
        ]
    return []


# ── Runner ────────────────────────────────────────────────────────────────────

def run_case(case_id, desc, college, uc, major, accept_honors, extra=None) -> dict:
    extra = extra or {}
    completed   = extra.get("completed", set())
    ap_credits  = extra.get("ap_credits", "")
    exp_short   = extra.get("expect_shortfall", False)

    print(f"\n{'-'*70}")
    print(f"CASE {case_id}: {desc}")
    extra_note = ""
    if completed:   extra_note += f"  completed={sorted(completed)}"
    if ap_credits:  extra_note += f"  apCredits={ap_credits!r}"
    print(f"  {college} -> {uc} | {major}{extra_note}")

    try:
        result = build_plan(college, uc, major, accept_honors=accept_honors,
                            completed=completed, ap_credits=ap_credits)
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
    errors += check_completed_excluded(result, completed)
    errors += check_no_duplicates(result)
    errors += check_content(
        result,
        must_include=extra.get("must_include", set()),
        must_not_include=extra.get("must_not_include", set()),
        min_courses=extra.get("min_courses"),
        max_courses=extra.get("max_courses"),
    )
    errors += check_ge_areas(
        result,
        must_include_ge_areas=extra.get("must_include_ge_areas", set()),
        must_not_include_ge_strings=extra.get("must_not_include_ge_strings", set()),
    )

    # Known-issue check: Conjunction=Or over-requirement (alternative tracks co-scheduled)
    overreq_errors = check_must_not_all(result, extra.get("must_not_all", []))
    if overreq_errors and extra.get("expect_overreq"):
        for e in overreq_errors:
            print(f"  KNOWN ISSUE (Conjunction=Or): {e[:120]}")
        known_issue_flag = True
    else:
        errors += overreq_errors
        known_issue_flag = False

    if exp_short:
        errors += check_shortfall_fires(result)

    min_total = extra.get("min_total_units")
    if min_total is not None:
        errors += check_min_units(result, min_total)

    # Print schedule summary
    ext_flag = " [EXTENDED]" if result.extended_plan else ""
    print(f"  {result.active_terms} terms{ext_flag}, {len(result.all_courses())} courses, {result.total_units:.0f}u total")
    for t in range(1, result.active_terms + 1):
        t_units = sum(s.units for s in result.terms.get(t, []))
        names   = ", ".join(s.code for s in result.terms.get(t, []))
        print(f"    Term {t}: {t_units:.0f}u  [{names}]")
    print(f"  Cal-GETC: {sorted(result.ge_completion.keys())}")
    print(f"  Post-transfer: {len(result.post_transfer)}")

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
    elif known_issue_flag:
        print(f"  KNOWN_ISSUE")
        return {"id": case_id, "desc": desc, "status": "KNOWN_ISSUE", "errors": [],
                "result": result}
    else:
        print(f"  PASS")
        return {"id": case_id, "desc": desc, "status": "PASS", "errors": [],
                "result": result}


# ── Term header repair test ────────────────────────────────────────────────────

def test_term_header_repair():
    """Simulate the live scramble (Fall/Spring/Fall/Winter/Spring/Fall) for Case 1
    (De Anza -> Berkeley -> CS, a quarter school) and assert repair restores the
    correct Fall Q1/Winter Q1/Spring Q1/Fall Q2/Winter Q2/Spring Q2 sequence."""
    print(f"\n{'-'*70}")
    print("TERM HEADER REPAIR TEST: De Anza -> Berkeley -> CS (quarter school)")

    try:
        result = build_plan("De Anza College", "Berkeley", "Computer Science B.S.",
                            accept_honors=False)
    except Exception as e:
        import traceback
        print(f"  ERROR building plan: {e}")
        print(traceback.format_exc()[:500])
        return {"id": "THR", "desc": "Term header repair", "status": "ERROR",
                "errors": [str(e)]}

    if not result.is_quarter:
        errors = ["De Anza College was not detected as a quarter school (is_quarter=False)"]
        print(f"  FAIL: {errors[0]}")
        return {"id": "THR", "desc": "Term header repair", "status": "FAIL", "errors": errors}

    # Reproduce the exact scramble observed in the live response:
    # Correct:  Fall Q1, Winter Q1, Spring Q1, Fall Q2, Winter Q2, Spring Q2
    # Observed: Fall,    Spring,    Fall,      Winter,  Spring,    Fall
    wrong_seasons = ["Fall", "Spring", "Fall", "Winter", "Spring", "Fall"]
    lines = []
    for t in range(1, result.active_terms + 1):
        wrong = wrong_seasons[t - 1] if t <= len(wrong_seasons) else f"Term {t}"
        lines.append(f"## Term {t} ({wrong})")
        for slot in result.terms.get(t, []):
            lines.append(f"- {slot.code} -- {slot.title}")
        lines.append("")
    lines.append("## Key Notes")
    lines.append("- Some note")
    scrambled = "\n".join(lines)

    repaired, n_repairs = repair_term_headers(scrambled, result)

    expected = ["Fall Q1", "Winter Q1", "Spring Q1", "Fall Q2", "Winter Q2", "Spring Q2"]
    errors = []

    if n_repairs == 0:
        errors.append("No repairs applied — expected scrambled headers to be corrected")

    # Each expected label must appear in order
    last_pos = -1
    for label in expected[:result.active_terms]:
        pos = repaired.find(f"({label})")
        if pos == -1:
            errors.append(f"Expected label '({label})' not found after repair")
        elif pos <= last_pos:
            errors.append(f"Label '({label})' appears out of order (pos {pos} <= prev {last_pos})")
        else:
            last_pos = pos

    # None of the wrong labels should survive as a standalone header
    for t, wrong in enumerate(wrong_seasons[:result.active_terms], start=1):
        if re.search(rf"## Term {t} \({re.escape(wrong)}\)", repaired):
            errors.append(f"Scrambled label still present: '## Term {t} ({wrong})'")

    if errors:
        print(f"  FAIL ({len(errors)} errors):")
        for e in errors:
            print(f"    * {e}")
        return {"id": "THR", "desc": "Term header repair", "status": "FAIL", "errors": errors}

    print(f"  Repaired {n_repairs} of {result.active_terms} headers")
    print(f"  Confirmed: {' -> '.join(expected[:result.active_terms])}")
    print(f"  PASS")
    return {"id": "THR", "desc": "Term header repair", "status": "PASS", "errors": []}


# ── De Anza -> Berkeley Civil Engineering: series-shape + NOT_APPLICABLE ──────

def test_berkeley_ce_chemistry_and_breadth():
    """Regression test for the bug where UC-side "Series" requirements
    (e.g. Berkeley Civil Engineering's Chemistry: CHEM 1A + 1AL + 1B required
    together) were silently dropped by the scraper, and for the separate bug
    where Cal-GETC areas beyond Reading & Composition got scheduled for a
    College of Engineering major even though that college doesn't accept
    Cal-GETC certification at all."""
    print(f"\n{'-'*70}")
    print("BERKELEY CE TEST: De Anza -> Berkeley -> Civil Engineering "
          "[Series requirement + non-Cal-GETC breadth framework]")

    try:
        result = build_plan("De Anza College", "Berkeley", "Civil Engineering B.S.",
                             accept_honors=False)
    except Exception as e:
        import traceback
        print(f"  ERROR building plan: {e}")
        print(traceback.format_exc()[:500])
        return {"id": "CE", "desc": "Berkeley CE chemistry+breadth", "status": "ERROR", "errors": [str(e)]}

    errors = []

    # A chemistry requirement must be present in the audit somewhere (MET,
    # NOT MET, or genuinely unarticulated) - never simply absent.
    all_uc_codes = (
        [uc_req for uc_req, _cc, _status in result.requirement_audit]
        + result.post_transfer + result.not_articulated + result.recommended_optional
    )
    if not any("CHEM" in code.upper() for code in all_uc_codes):
        errors.append("No Chemistry requirement found anywhere in the plan's tracking "
                       "(audit/post-transfer/not-articulated/recommended) - the Series "
                       "requirement silently vanished")
    else:
        chem_rows = [(u, c, s) for u, c, s in result.requirement_audit if "CHEM" in u.upper()]
        if chem_rows and not any(s in ("MET", "MET (CONDITIONAL)") for _, _, s in chem_rows):
            errors.append(f"Chemistry requirement present but never MET: {chem_rows}")

    # No Cal-GETC area beyond Reading & Composition (1A/1B) should be
    # selected - Berkeley's College of Engineering doesn't accept Cal-GETC.
    if result.ge_strategy != "NOT_APPLICABLE":
        errors.append(f"Expected ge_strategy='NOT_APPLICABLE' for Berkeley CE, got {result.ge_strategy!r}")
    non_reading_comp_areas = set(result.ge_completion) - {"1A", "1B"}
    if non_reading_comp_areas:
        errors.append(f"Cal-GETC areas beyond 1A/1B were selected for a non-Cal-GETC "
                       f"college: {sorted(non_reading_comp_areas)}")
    for slot in result.all_courses():
        ge_tags = [t for t in slot.tags if t.startswith("Cal-GETC Area") and t not in
                   ("Cal-GETC Area 1A", "Cal-GETC Area 1B")]
        if ge_tags:
            errors.append(f"{slot.code} is tagged with a non-1A/1B Cal-GETC area: {ge_tags}")

    if errors:
        print(f"  FAIL ({len(errors)} errors):")
        for e in errors:
            print(f"    * {e}")
        return {"id": "CE", "desc": "Berkeley CE chemistry+breadth", "status": "FAIL", "errors": errors}

    print(f"  Chemistry requirement: present and resolved")
    print(f"  ge_strategy: {result.ge_strategy} (only 1A/1B selected)")
    print(f"  PASS")
    return {"id": "CE", "desc": "Berkeley CE chemistry+breadth", "status": "PASS", "errors": []}


def test_post_transfer_section_consistency():
    """A plan with real not_articulated requirements (Berkeley CE always has
    some — e.g. Engineering programming/thermo not offered at De Anza) must
    never claim 'all UC requirements have CC articulation'. Tests the actual
    rendered text, not just the underlying data, since that's where the
    contradiction was found."""
    print(f"\n{'-'*70}")
    print("POST-TRANSFER CONSISTENCY TEST: De Anza -> Berkeley -> Civil Engineering")

    from plan_engine import render_plan_text
    try:
        result = build_plan("De Anza College", "Berkeley", "Civil Engineering B.S.",
                             accept_honors=False)
        text = render_plan_text(result, "", "3.5+", "", "competitive")
    except Exception as e:
        import traceback
        print(f"  ERROR: {e}")
        print(traceback.format_exc()[:500])
        return {"id": "PTC", "desc": "Post-transfer consistency", "status": "ERROR", "errors": [str(e)]}

    errors = []
    if not result.not_articulated:
        errors.append("Test fixture assumption broken: expected Berkeley CE to have real "
                       "not_articulated entries (e.g. Engineering programming/thermo) - "
                       "update this test if that's no longer true")
    if "None — all UC requirements have CC articulation." in text and result.not_articulated:
        errors.append("render_plan_text claims 'None - all UC requirements have CC "
                       "articulation' while not_articulated is non-empty - contradictory")
    section = text.split("## Post-Transfer Requirements", 1)[-1].split("## Term", 1)[0]
    for na in result.not_articulated:
        if na not in section:
            errors.append(f"not_articulated entry {na!r} missing from the rendered "
                           f"Post-Transfer Requirements section")

    if errors:
        print(f"  FAIL ({len(errors)} errors):")
        for e in errors:
            print(f"    * {e}")
        return {"id": "PTC", "desc": "Post-transfer consistency", "status": "FAIL", "errors": errors}

    print(f"  not_articulated entries: {len(result.not_articulated)}, all reflected in rendered text")
    print(f"  PASS")
    return {"id": "PTC", "desc": "Post-transfer consistency", "status": "PASS", "errors": []}


def test_no_chem1b_without_chem1a_data():
    """Data integrity: no Berkeley shard agreement should require CHEM 1B
    (or reference it as a CC-side course) without a CHEM 1A requirement
    also present somewhere in the same agreement - the two are always
    paired in a real general-chemistry sequence. Regression guard for the
    Series-shape parser bug that dropped 1A+1AL series entirely, which
    would have left exactly this kind of 1B-without-1A gap."""
    print(f"\n{'-'*70}")
    print("DATA TEST: no Berkeley agreement has CHEM 1B without CHEM 1A")

    import gzip
    import orjson
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "articulations_Berkeley.json.gz")
    if not os.path.exists(path):
        print("  SKIP: articulations_Berkeley.json.gz not found")
        return {"id": "DATA1", "desc": "CHEM 1B requires CHEM 1A", "status": "SKIP", "errors": []}

    with gzip.open(path, "rb") as f:
        shard = orjson.loads(f.read())

    bad = []
    for key, entry in shard.items():
        if key.startswith("_") or not isinstance(entry, list):
            continue
        prefixes_numbers = set()
        for row in entry:
            uc = row.get("uc") or {}
            if uc.get("p", "").upper() == "CHEM":
                for n in uc.get("n", "").split("+"):
                    prefixes_numbers.add(n.strip().upper())
            for grp in row.get("cc", []) or []:
                for c in grp:
                    if c.get("p", "").upper() == "CHEM":
                        prefixes_numbers.add(c.get("n", "").strip().upper())
        if "1B" in prefixes_numbers and "1A" not in prefixes_numbers:
            bad.append(key)

    if bad:
        print(f"  FAIL: {len(bad)} agreement(s) have CHEM 1B with no CHEM 1A:")
        for k in bad[:10]:
            print(f"    * {k}")
        return {"id": "DATA1", "desc": "CHEM 1B requires CHEM 1A", "status": "FAIL", "errors": bad}

    print(f"  Checked {len(shard)} Berkeley agreements, 0 CHEM 1B-without-1A gaps")
    print(f"  PASS")
    return {"id": "DATA1", "desc": "CHEM 1B requires CHEM 1A", "status": "PASS", "errors": []}


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    if len(sys.argv) > 1:
        ids   = set(int(x) for x in sys.argv[1:])
        cases = [c for c in CASES if c[0] in ids]
    else:
        cases = CASES

    results = []
    for case in cases:
        # Pad to 7 elements so run_case always receives extra dict (or None)
        r = run_case(*case) if len(case) == 7 else run_case(*case, None)
        results.append(r)

    # Always run term header repair test regardless of case filter
    results.append(test_term_header_repair())
    results.append(test_berkeley_ce_chemistry_and_breadth())
    results.append(test_post_transfer_section_consistency())
    results.append(test_no_chem1b_without_chem1a_data())

    print(f"\n{'='*70}")
    print("SUMMARY")
    print("="*70)
    passed       = [r for r in results if r["status"] == "PASS"]
    known_issues = [r for r in results if r["status"] == "KNOWN_ISSUE"]
    failed       = [r for r in results if r["status"] == "FAIL"]
    errored      = [r for r in results if r["status"] == "ERROR"]
    print(f"  PASS:         {len(passed)}")
    if known_issues:
        print(f"  KNOWN_ISSUE:  {len(known_issues)}  (tracked bugs — not regressions)")
    print(f"  FAIL:         {len(failed)}")
    print(f"  ERROR:        {len(errored)}")

    if known_issues:
        print("\nKnown issues (tracked, non-blocking):")
        for r in known_issues:
            print(f"  Case {r['id']}: {r['desc']}")

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
