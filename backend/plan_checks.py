"""
Answer-free consistency checks for a built PlanResult — plan_checks.py

These five checks need no expected answer: they verify a plan against its own
internal logic (no ghost courses, no out-of-order sequences, complete
AND-groups, term caps respected, no duplicates). They were born in
test_plan_engine.py and were only ever run offline — by the golden test
suite and by backtest_matrix.py through invariants.py.

Extracted here so the LIVE request path can run them too: app.py's /plan_v2
calls validate_plan() on every plan it serves, so a plan that violates the
engine's own rules is logged (and flagged to the student as a NOTE) instead
of shipping silently. test_plan_engine.py and invariants.py now import these
from here — one implementation, three consumers (tests, backtest, serving).

Import discipline: this module may import from plan_engine and
course_sequence only (both are dependency-free), never from app.py or the
test files — that keeps it importable from all three consumers without
cycles.
"""

from __future__ import annotations

from plan_engine import (
    PlanResult,
    _MAX_UNITS_PER_TERM,
    _MAX_QUARTER_UNITS_PER_TERM,
)
from course_sequence import infer_sequence_order, same_sequence_base


def check_ghost_courses(result: PlanResult) -> list:
    """Every course named in a Cal-GETC area assignment must actually be
    scheduled in some term (or explicitly marked completed/via/NOT ASSIGNED)."""
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
    """Same-prefix courses in one lettered sequence must be scheduled in
    sequence order (1A before 1B before 1C)."""
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
    """A MET requirement whose CC answer is 'X + Y' must have every listed
    course actually scheduled (or already completed)."""
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
    """No term may exceed the per-term unit cap (18 QU quarter / 20 SU semester)."""
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
    placed = {s.code.upper() for s in result.all_courses()}
    errors = []
    for raw in completed:
        if isinstance(raw, (list, tuple)):
            code = " ".join(str(p) for p in raw).strip().upper()
        else:
            code = " ".join(str(raw).split()).upper()
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


def validate_plan(result: PlanResult, completed: set | None = None) -> list:
    """The request-time battery: every check above, one flat violation list.

    Deliberately excludes the matrix-scale invariants (course-exists-at-CCC,
    Cal-GETC double-count, …) — those need multi-MB data indexes that are
    fine to build in an offline backtest but have no place on the request
    path. These checks run in microseconds on a ~20-course plan.
    """
    errors = []
    errors += check_ghost_courses(result)
    errors += check_prereq_violations(result)
    errors += check_and_groups(result)
    errors += check_unit_overload(result)
    errors += check_no_duplicates(result)
    if completed:
        errors += check_completed_excluded(result, completed)
    return errors
