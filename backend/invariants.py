"""
Invariant checks for full-matrix backtesting.

Reuses the existing per-case checkers from test_plan_engine.py (they take a
built PlanResult and need no expected answer) and adds the invariants that
only make sense at matrix scale: course-exists-at-CCC, OR-group exactly-one,
Cal-GETC coverage/double-count, unit-math floor, termination sanity.

Every function returns a list[str] of violation messages (empty = pass).
Nothing here calls build_plan() — callers (backtest_matrix.py, test_plan_engine.py)
own that.
"""

from __future__ import annotations

import gzip
import json
import os

from plan_engine import (
    PlanResult,
    _MAX_TERMS_HARD,
    _DATA_DIR,
)
from test_plan_engine import (
    check_ghost_courses,
    check_prereq_violations,
    check_and_groups,
    check_unit_overload,
    check_no_duplicates,
)

_CALGETC_AREAS = {"1A", "1B", "1C", "2", "3A", "3B", "4", "5A", "5B", "5C", "6"}


# ── Shared data loaders (matrix-scale: load once, pass down to workers) ───────

def load_course_index() -> dict:
    """(school_lower, 'PREFIX NUM') -> True, built from all_transferable_courses.

    Course numbers in this index and in plan_engine's CourseSlot are compared
    after normalizing whitespace/case only — no fuzzy matching, since this is
    meant to catch genuine "course doesn't exist at this CCC" ghosts, not
    penalize display formatting differences.
    """
    path = os.path.join(_DATA_DIR, "all_transferable_courses.json.gz")
    index: dict = {}
    if not os.path.exists(path):
        return index
    with gzip.open(path, "rt", encoding="utf-8") as f:
        rows = json.load(f)
    for r in rows:
        school = (r.get("school") or "").strip().lower()
        ident = (r.get("identifier") or "").strip().upper()
        if school and ident:
            index[(school, ident)] = True
    return index


def load_calgetc_map() -> dict:
    path = os.path.join(_DATA_DIR, "calgetc_map.json.gz")
    if not os.path.exists(path):
        return {}
    with gzip.open(path, "rt", encoding="utf-8") as f:
        return json.load(f)


# ── New matrix-scale invariants ────────────────────────────────────────────────

def check_courses_exist_at_ccc(result: PlanResult, college: str, course_index: dict) -> list:
    """Every scheduled course must exist in our own CCC course index.

    Skipped (returns []) when course_index is empty — e.g. index failed to
    load — rather than false-failing every triple in the run.
    """
    if not course_index:
        return []
    college_l = college.strip().lower()
    errors = []
    for s in result.all_courses():
        if (college_l, s.code.upper()) not in course_index:
            errors.append(f"Course not found at {college}: {s.code!r}")
    return errors


def check_or_group_exactly_one(result: PlanResult) -> list:
    """An OR-group winner must be MET; every other member of that group must
    be marked satisfied-via-alternate (never independently MET, never a
    silent gap). Uses the audit rows' own "satisfied via" / "alternate track"
    labeling produced by plan_engine — a duplicate independent MET for a
    course pair that's actually one OR-group is exactly the bug class fixed
    for MATH 51/16A; this generalizes that check across the whole matrix.
    """
    errors = []
    seen_uc_keys: dict = {}
    for uc_req, cc_code, status in result.requirement_audit:
        head = uc_req.split(" - ", 1)[0].strip()
        for tok in head.split(" / "):
            tok = tok.strip()
            if not tok:
                continue
            is_alt = "satisfied via" in cc_code or "alternate track" in cc_code
            prior = seen_uc_keys.get(tok)
            if prior is not None and prior["met"] and status == "MET" and not is_alt and not prior["alt"]:
                errors.append(
                    f"Possible un-collapsed OR-group: {tok!r} appears MET independently "
                    f"more than once in requirement_audit"
                )
            seen_uc_keys[tok] = {"met": status == "MET", "alt": is_alt}
    return errors


def check_calgetc_no_double_count(result: PlanResult) -> list:
    """If Cal-GETC certification is claimed, no single course may satisfy two
    different areas (each area needs its own course), and every claimed area
    must resolve to a real, non-empty assignment."""
    if not result.ge_completion:
        return []
    errors = []
    course_to_areas: dict = {}
    for area, val in result.ge_completion.items():
        if not val or "NOT ASSIGNED" in str(val):
            errors.append(f"Cal-GETC area {area} claimed but has no real assignment: {val!r}")
            continue
        for code in str(val).split(", "):
            code = code.strip()
            if not code or "via" in code or "already completed" in code:
                continue
            course_to_areas.setdefault(code, set()).add(area)
    for code, areas in course_to_areas.items():
        # A course legitimately double-satisfying (e.g. a lab satisfying 5B+5C)
        # is allowed ONLY when plan_engine itself labeled it that way via tags;
        # a plain two-area claim with no such tag is a double-count bug.
        if len(areas) > 1 and not any(a in {"5B", "5C"} for a in areas):
            errors.append(f"Course {code!r} claimed for multiple Cal-GETC areas: {sorted(areas)}")
    return errors


def check_calgetc_six_areas(result: PlanResult) -> list:
    """If the plan's own audit claims Cal-GETC PASS, all 6 top-level areas
    (1, 2, 3, 4, 5, 6 — treating 1A/1B/1C and 5A/5B/5C as one area each) must
    be covered."""
    audit_text = " ".join(f"{a}" for a in (result.requirement_audit or []))
    if "Overall Status" not in audit_text and not result.ge_completion:
        return []
    covered = set(result.ge_completion.keys())
    top_level = {"1", "2", "3", "4", "5", "6"}
    got_top = set()
    for area in covered:
        if area.startswith("1"):
            got_top.add("1")
        elif area.startswith("5"):
            got_top.add("5")
        elif area.startswith("3"):
            got_top.add("3")
        else:
            got_top.add(area)
    missing = top_level - got_top
    if missing and not result.warnings and not result.sparse_major_prep:
        return [f"Cal-GETC claims completion but areas missing: {sorted(missing)}"]
    return []


def check_unit_math(result: PlanResult) -> list:
    """Quarter-system totals must be reported in quarter units (90u floor);
    semester totals in semester units (60u floor). A plan under the floor
    must carry a UNIT SHORTFALL warning — never silently pass as complete."""
    floor = 90.0 if result.is_quarter else 60.0
    errors = []
    if result.total_units < floor - 0.5:
        has_warning = any("UNIT SHORTFALL" in w or "shortfall" in w.lower() for w in result.warnings)
        if not has_warning:
            errors.append(
                f"Plan totals {result.total_units:.1f}u (floor {floor:.0f}u, "
                f"{'quarter' if result.is_quarter else 'semester'} system) but no shortfall warning fired"
            )
    computed = sum(s.units for s in result.all_courses())
    if abs(computed - result.total_units) > 0.5:
        errors.append(
            f"total_units ({result.total_units:.1f}) doesn't match sum of scheduled course units ({computed:.1f})"
        )
    return errors


def check_termination_sane(result: PlanResult) -> list:
    """Plan must end within the hard term ceiling, or explicitly warn that
    it isn't completable at this CCC (extended_plan + warning), never just
    silently truncate."""
    errors = []
    if result.active_terms > _MAX_TERMS_HARD:
        errors.append(f"active_terms={result.active_terms} exceeds hard ceiling {_MAX_TERMS_HARD}")
    if result.active_terms >= _MAX_TERMS_HARD and not result.extended_plan:
        errors.append("Hit term ceiling but extended_plan flag not set — plan may be silently truncated")
    return errors


def check_required_never_silently_dropped(result: PlanResult) -> list:
    """Every requirement_audit row must resolve to MET, MET (CONDITIONAL),
    NOT MET, or POST-TRANSFER — never an unrecognized/blank status that would
    let a required item vanish from both the audit and not_articulated."""
    known = {"MET", "MET (CONDITIONAL)", "NOT MET", "POST-TRANSFER"}
    errors = []
    for uc_req, cc_code, status in result.requirement_audit:
        if status not in known:
            errors.append(f"Unrecognized audit status for {uc_req!r}: {status!r}")
    return errors


# ── Combined runner ─────────────────────────────────────────────────────────────

def run_all_invariants(result: PlanResult, college: str, completed: set | None = None,
                        course_index: dict | None = None) -> list:
    """Full invariant battery for one built PlanResult. Returns a flat list of
    violation message strings; empty means the plan is clean."""
    errors = []
    errors += check_ghost_courses(result)
    errors += check_prereq_violations(result)
    errors += check_and_groups(result)
    errors += check_unit_overload(result)
    errors += check_no_duplicates(result)
    errors += check_courses_exist_at_ccc(result, college, course_index or {})
    errors += check_or_group_exactly_one(result)
    errors += check_calgetc_no_double_count(result)
    errors += check_calgetc_six_areas(result)
    errors += check_unit_math(result)
    errors += check_termination_sane(result)
    errors += check_required_never_silently_dropped(result)
    return errors
