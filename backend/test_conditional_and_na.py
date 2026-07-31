"""
Unit tests for two specific plan_engine._resolve_major_prep behaviors:

1. CONDITIONAL ARTICULATION: a CC course carrying "cond": True must never
   render as plain "MET" — it must be "MET (CONDITIONAL)", and a bridge-course
   note must appear in post_transfer.
2. NOT ARTICULATED: a shard row with "na": True (required by the major, zero
   CC equivalent per ASSIST) must always produce an entry in not_articulated —
   never silently dropped, never merged into post_transfer.

Run: python test_conditional_and_na.py
"""
import sys
from plan_engine import _resolve_major_prep


def test_conditional_articulation_never_plain_met():
    arts = [
        {
            "uc": {"p": "COMPSCI", "n": "61B", "t": "Data Structures"},
            "cc": [[{"p": "CIS", "n": "26B", "t": "Advanced C Programming",
                     "u": 4.5, "j": "And", "cond": True}]],
            "g": "", "k": 0,
        },
    ]
    major_courses, audit_rows, post_transfer, *_ = _resolve_major_prep(
        arts, accept_honors=False, completed=set(),
        uc_normalized="berkeley", major="Computer Science B.A.",
    )

    matches = [row for row in audit_rows if row[0].startswith("COMPSCI 61B")]
    assert matches, f"COMPSCI 61B row missing from audit_rows: {audit_rows}"
    status = matches[0][2]
    assert status == "MET (CONDITIONAL)", (
        f"Conditional articulation must never render as plain MET — got {status!r}"
    )
    assert status != "MET", "Conditional articulation silently upgraded to unconditional MET"

    assert any("CONDITIONAL" in pt for pt in post_transfer), (
        f"Expected a CONDITIONAL bridge-course note in post_transfer, got: {post_transfer}"
    )
    print("PASS: test_conditional_articulation_never_plain_met")


def test_conditional_bridge_course_named_when_known():
    arts = [
        {
            "uc": {"p": "COMPSCI", "n": "61B", "t": "Data Structures"},
            "cc": [[{"p": "CIS", "n": "22C", "t": "Data Abstraction and Structures",
                     "u": 4.5, "j": "And", "cond": True}]],
            "g": "", "k": 0,
        },
    ]
    _, _, post_transfer, *_ = _resolve_major_prep(
        arts, accept_honors=False, completed=set(),
        uc_normalized="berkeley", major="Computer Science B.A.",
    )
    assert any("COMPSCI 47B" in pt for pt in post_transfer), (
        f"Expected bridge course COMPSCI 47B named for 61B, got: {post_transfer}"
    )
    print("PASS: test_conditional_bridge_course_named_when_known")


def test_na_row_always_produces_entry():
    arts = [
        {
            "uc": {"p": "COMPSCI", "n": "61A", "t": "The Structure and Interpretation of Computer Programs"},
            "cc": [[]],
            "g": "", "k": 0,
            "na": True,
        },
    ]
    _, audit_rows, post_transfer, _, _, not_articulated, _, _ = _resolve_major_prep(
        arts, accept_honors=False, completed=set(),
        uc_normalized="berkeley", major="Computer Science B.A.",
    )

    assert not_articulated, "NOT ARTICULATED course silently dropped — not_articulated is empty"
    assert any("COMPSCI 61A" in na for na in not_articulated), (
        f"COMPSCI 61A missing from not_articulated: {not_articulated}"
    )
    # Must not be conflated with genuine POST-TRANSFER (noArticulationReason) rows.
    assert not any("COMPSCI 61A" in pt for pt in post_transfer), (
        "NOT ARTICULATED course leaked into post_transfer — must stay distinct"
    )
    assert not any(row[0].startswith("COMPSCI 61A") for row in audit_rows), (
        "NOT ARTICULATED course must not appear in requirement_audit rows "
        "(it's rendered from not_articulated instead)"
    )
    print("PASS: test_na_row_always_produces_entry")


def test_na_row_mixed_with_normal_rows():
    """A na row alongside normal rows must not disappear or get merged."""
    arts = [
        {
            "uc": {"p": "MATH", "n": "51", "t": "Calculus I"},
            "cc": [[{"p": "MATH", "n": "1A", "t": "Calculus I", "u": 5.0, "j": "And"},
                    {"p": "MATH", "n": "1B", "t": "Calculus II", "u": 5.0, "j": "And"}]],
            "g": "", "k": 0,
        },
        {
            "uc": {"p": "MATH", "n": "56", "t": "Linear Algebra"},
            "cc": [[]],
            "g": "", "k": 0,
            "na": True,
        },
    ]
    major_courses, audit_rows, post_transfer, _, _, not_articulated, _, _ = _resolve_major_prep(
        arts, accept_honors=False, completed=set(),
        uc_normalized="berkeley", major="Computer Science B.A.",
    )
    assert any(row[0].startswith("MATH 51") and row[2] == "MET" for row in audit_rows), (
        f"Normal MATH 51 row broken by presence of na row: {audit_rows}"
    )
    assert any("MATH 56" in na for na in not_articulated), (
        f"MATH 56 na row lost when mixed with normal rows: {not_articulated}"
    )
    print("PASS: test_na_row_mixed_with_normal_rows")


if __name__ == "__main__":
    tests = [
        test_conditional_articulation_never_plain_met,
        test_conditional_bridge_course_named_when_known,
        test_na_row_always_produces_entry,
        test_na_row_mixed_with_normal_rows,
    ]
    failures = 0
    for t in tests:
        try:
            t()
        except AssertionError as e:
            failures += 1
            print(f"FAIL: {t.__name__}\n  {e}")
        except Exception as e:
            failures += 1
            print(f"ERROR: {t.__name__}\n  {e}")

    print(f"\n{len(tests) - failures}/{len(tests)} passed")
    sys.exit(0 if failures == 0 else 1)
