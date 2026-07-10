"""
Layer 1: Course-number sequence ordering.

Parses CC course numbers into sortable keys so that sequences like
1A < 1B < 1C, 100A < 100B, 101 < 102 are correctly ordered.

Key constraint the caller must enforce:
  Two courses are only treated as sequential when they share the same
  subject prefix (MATH, ENGL, …) AND the same numeric base (e.g. "1"
  in 1A/1B/1C).  Different bases — MATH 1A vs MATH 2A — are unrelated
  by this heuristic alone; cross-series ordering requires Layer 2 or 3.
"""

import re
from typing import List, Tuple


# ---------------------------------------------------------------------------
# Core sort-key function
# ---------------------------------------------------------------------------

def infer_sequence_order(course_number: str) -> tuple:
    """
    Return a sortable key (numeric_part, letter_ordinal, letter_prefix) for
    a course number string.

    Handles:
      "1A"    -> (1,  0, "")    letter A = ordinal 0
      "1B"    -> (1,  1, "")
      "1C"    -> (1,  2, "")
      "1AH"   -> (1,  0, "")    honors H stripped; same slot as 1A
      "100A"  -> (100, 0, "")
      "100B"  -> (100, 1, "")
      "101"   -> (101, -1, "")  no letter suffix; -1 sorts before any letter
      "102"   -> (102, -1, "")
      "C1000" -> (1000, -1, "C") letter prefix kept as tiebreaker
      "E1A"   -> (1,   0, "E")
      "10"    -> (10,  -1, "")
    """
    cn = course_number.strip().upper()
    # Strip trailing H (honors marker: "1AH" -> "1A", "10H" -> "10")
    cn = re.sub(r"H$", "", cn)

    # Optional letter prefix + required digits + optional single letter suffix
    m = re.match(r"^([A-Z]?)(\d+)([A-Z]?)$", cn)
    if not m:
        # Unrecognised pattern — sort to end, preserve string for debugging
        return (9999, -1, cn)

    letter_prefix = m.group(1)   # "C" in "C1000", "" in "1A"
    numeric_part  = int(m.group(2))
    letter_suffix = m.group(3)   # "A" in "1A", "" in "101"

    letter_ordinal = ord(letter_suffix) - ord("A") if letter_suffix else -1

    return (numeric_part, letter_ordinal, letter_prefix)


# ---------------------------------------------------------------------------
# Sequence-membership helper
# ---------------------------------------------------------------------------

def same_sequence_base(num_a: str, num_b: str) -> bool:
    """
    True iff two course numbers appear to belong to the same lettered sequence,
    meaning they share the same numeric part and letter prefix but differ only
    in their letter suffix.

    Examples:
      "1A", "1B"    -> True   (both base 1, no letter prefix)
      "1A", "2A"    -> False  (different numeric bases)
      "100A","100B" -> True
      "101", "102"  -> False  (pure-numeric courses don't form letter-sequences)
      "C1A","C1B"   -> True
    """
    ka = infer_sequence_order(num_a)
    kb = infer_sequence_order(num_b)
    # Both must have a real letter suffix (ordinal >= 0) and share base + prefix
    return (
        ka[0] == kb[0]     # same numeric part
        and ka[2] == kb[2] # same letter prefix
        and ka[1] >= 0     # num_a has a letter suffix
        and kb[1] >= 0     # num_b has a letter suffix
    )


# ---------------------------------------------------------------------------
# Convenience: sort a list of (subject_prefix, course_number) pairs
# ---------------------------------------------------------------------------

def sort_sequence(
    courses: List[Tuple[str, str]],
) -> List[Tuple[str, str]]:
    """
    Sort (subject_prefix, course_number) pairs by inferred sequence order.

    Intended for a set of courses already known (by the caller) to belong to
    a single sequence, e.g.:
      [("MATH","1C"), ("MATH","1A"), ("MATH","1B")]
      -> [("MATH","1A"), ("MATH","1B"), ("MATH","1C")]
    """
    return sorted(courses, key=lambda c: infer_sequence_order(c[1]))


# ---------------------------------------------------------------------------
# Utility: detect sequences inside a mixed course list
# ---------------------------------------------------------------------------

def find_sequences(
    courses: List[Tuple[str, str]],
) -> List[List[Tuple[str, str]]]:
    """
    Given a mixed list of (subject_prefix, course_number) pairs, group them
    into probable sequences and return each group sorted.

    Two courses go in the same group iff they share:
      - the same subject_prefix (e.g. "MATH")
      - the same numeric base
      - the same course-number letter prefix (e.g. "C" in "C1A")
      - both have a letter suffix (non-empty)

    Courses with pure-numeric numbers (e.g. "101") are each their own group.

    Example:
      [("MATH","1A"),("MATH","1B"),("MATH","10"),("ENGL","1A"),("ENGL","1B")]
      -> [
           [("MATH","1A"),("MATH","1B")],
           [("MATH","10")],
           [("ENGL","1A"),("ENGL","1B")],
         ]
    """
    from collections import defaultdict

    # Group key: (subject_prefix, letter_prefix_in_number, numeric_base)
    # Pure-numeric courses get a unique key so they form singleton groups.
    groups: dict = defaultdict(list)
    for subj, num in courses:
        key = infer_sequence_order(num)
        numeric, letter_ord, lprefix = key
        if letter_ord == -1:
            # Pure numeric — unique group per (subj, num)
            group_key = (subj, lprefix, numeric, num)
        else:
            group_key = (subj, lprefix, numeric)
        groups[group_key].append((subj, num))

    return [sort_sequence(group) for group in groups.values()]


# ---------------------------------------------------------------------------
# Self-test (run directly)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    cases = [
        # (input, expected_key)
        ("1A",   (1,  0,  "")),
        ("1B",   (1,  1,  "")),
        ("1C",   (1,  2,  "")),
        ("1AH",  (1,  0,  "")),
        ("1BH",  (1,  1,  "")),
        ("100A", (100, 0, "")),
        ("100B", (100, 1, "")),
        ("101",  (101, -1, "")),
        ("102",  (102, -1, "")),
        ("10",   (10, -1, "")),
        ("C1000",(1000, -1, "C")),
        ("E1A",  (1, 0, "E")),
        ("E1B",  (1, 1, "E")),
        ("2A",   (2, 0, "")),
        ("22",   (22, -1, "")),
    ]
    all_pass = True
    for num, expected in cases:
        got = infer_sequence_order(num)
        status = "PASS" if got == expected else "FAIL"
        if status == "FAIL":
            all_pass = False
        print(f"  {status}  infer_sequence_order({num!r:8s}) -> {got}  (expected {expected})")

    print()
    # Sequence detection
    seq_cases = [
        (("1A", "1B"), True),
        (("1A", "2A"), False),
        (("100A", "100B"), True),
        (("101", "102"), False),
        (("C1A", "C1B"), True),
        (("C1A", "C2A"), False),
    ]
    for (a, b), expected in seq_cases:
        got = same_sequence_base(a, b)
        status = "PASS" if got == expected else "FAIL"
        if status == "FAIL":
            all_pass = False
        print(f"  {status}  same_sequence_base({a!r}, {b!r}) -> {got}")

    print()
    courses = [
        ("MATH","1C"),("MATH","1A"),("MATH","1B"),
        ("MATH","10"),
        ("ENGL","1A"),("ENGL","1B"),
    ]
    groups = find_sequences(courses)
    print("find_sequences groups:")
    for g in groups:
        print(f"  {g}")

    print(f"\n{'ALL TESTS PASSED' if all_pass else 'SOME TESTS FAILED'}")
