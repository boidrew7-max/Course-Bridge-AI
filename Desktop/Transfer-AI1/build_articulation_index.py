"""
Build a compact articulation index from all agreement files.
Output: data/articulations_index.json
Format: {"CC__UC__Major": [{"uc":{...}, "cc":[...], "g":"<groupId>", "k":<pick_n>, "sec":<idx>}, ...], ...}

"g" (groupId) and "k" (pick_n) encode the ASSIST RequirementGroup structure:
  k == 0  →  "Following" (complete all — AND)
  k >= 1  →  "NFromArea" / course-level select-N (OR/select-N, flat course pool)
  g == "" →  legacy / no templateAssets match (treated as AND by engine)

"sec" (present only when k >= 1) marks which alternative UNIT a row belongs to
within its RequirementGroup. When present, the engine picks whole units
atomically (all rows sharing a "sec" value are scheduled together) rather than
picking individual courses across the group — this is what "Conjunction" /
"NFromConjunction" (ASSIST's "pick one full track" structure, e.g. Calc
sequence A OR Calc sequence B) require. Rows without "sec" fall back to the
course-level NFromArea pick.

IMPORTANT: ASSIST's "section" boundary is NOT reliable as the atomic unit —
some sections bundle a real multi-course sequence across several rows (e.g.
MATH 1A row + MATH 1B row + MATH 1C row, meant to be taken together), while
others list several independent single-course alternatives as separate rows
within the SAME section (e.g. "ANTH 1" row + "BIOL 10" row, NOT meant
together). The only reliable signal is course-number sequence membership
(same subject prefix + numeric base, differing only by trailing letter, e.g.
1A/1B/1C) — see course_sequence.same_sequence_base. "sec" therefore encodes
"<section_idx>:<sequence_unit_idx>", grouping only rows that are actually
part of one lettered sequence; every other row gets its own unique unit and
is treated as an independent alternative even if ASSIST placed it in the same
section as others.

Only includes agreements where CC courses exist (major prep).
"""
import json
import os
import re
import sys
from collections import Counter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AGREEMENTS_DIR = os.path.join(BASE_DIR, "agreements")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "articulations_index.json")


def _sequence_key(course_number: str):
    """
    Return (numeric_base, letter_prefix) if course_number has a real trailing
    letter suffix (e.g. "19A" -> (19, ""), "C1B" -> (1, "C")), else None.
    Minimal local reimplementation of course_sequence.infer_sequence_order's
    letter-suffix detection to avoid a cross-script import for one check.
    """
    cn = course_number.strip().upper()
    cn = re.sub(r"H$", "", cn)  # strip honors marker
    m = re.match(r"^([A-Z]*)(\d+)([A-Z]?)$", cn)
    if not m:
        return None
    letter_prefix, digits, suffix = m.groups()
    if not suffix:
        return None  # no letter suffix -> not part of a lettered sequence
    return (int(digits), letter_prefix)


def _row_units(rows: list) -> list:
    """
    Assign each row in a section a unit index. Rows whose first course shares
    (subject prefix, numeric_base, letter_prefix) with another row's are
    merged into the same unit (they form one lettered sequence, e.g. MATH
    1A/1B/1C). All other rows get their own standalone unit.
    """
    unit_map: dict = {}
    unit_ids = []
    next_id = 0
    for r in rows:
        if not isinstance(r, dict):
            unit_ids.append(next_id)
            next_id += 1
            continue
        courses = []
        for c in r.get("cells", []):
            if not isinstance(c, dict):
                continue
            crs = c.get("course") or {}
            if crs.get("courseNumber"):
                courses.append((crs.get("prefix", ""), crs.get("courseNumber", "")))
        if not courses:
            unit_ids.append(next_id)
            next_id += 1
            continue
        prefix, number = courses[0]
        seq = _sequence_key(number)
        if seq is None:
            unit_ids.append(next_id)
            next_id += 1
            continue
        key = (prefix.upper(), seq[0], seq[1])
        if key not in unit_map:
            unit_map[key] = next_id
            next_id += 1
        unit_ids.append(unit_map[key])
    return unit_ids

# instruction.type values the parser actively handles
_KNOWN_TYPES = {"Following", "NFromArea"}


_SECTION_UNIT_TYPES = {"Series", "Sequence"}
_UNIT_BASED_TYPES   = {"Unit", "QuarterUnit", "SemesterUnit", "Semester", "Quarter"}


def _parse_template_assets(ta_raw) -> tuple[dict, Counter]:
    """
    Parse templateAssets and return:
      cell_to_group: {courseIdentifierParentId (int) -> (groupId str, pick_n int, sec_idx int|None)}
      unknown_types: Counter of unrecognised instruction.type values

    pick_n semantics:
      0  = "Following" (AND — complete all)
      1+ = select-N (OR). If sec_idx is not None, selection is SECTION-atomic
           (all rows sharing the same (gid, sec_idx) are scheduled together as
           one unit — used for "pick one full track" groups like alternative
           Calculus sequences). If sec_idx is None, selection is course-level
           (flat pool across the whole group — used for NFromArea/NFromFollowing).
    """
    cell_to_group: dict = {}
    unknown_types: Counter = Counter()

    try:
        ta = json.loads(ta_raw) if isinstance(ta_raw, str) else (ta_raw or [])
    except Exception:
        return cell_to_group, unknown_types
    if not isinstance(ta, list):
        return cell_to_group, unknown_types

    for item in ta:
        if not isinstance(item, dict) or item.get("type") != "RequirementGroup":
            continue
        gid = item.get("groupId", "")
        instr = item.get("instruction") or {}
        if isinstance(instr, str):
            try:
                instr = json.loads(instr)
            except Exception:
                instr = {}
        if not isinstance(instr, dict):
            continue

        itype = instr.get("type", "")
        conj  = instr.get("conjunction", "")
        sections = item.get("sections", [])
        use_sections = False

        if itype == "Following":
            # Complete all in this group (AND).
            pick_n = 0

        elif itype == "NFromArea":
            amt  = instr.get("amount", 1)
            unit = instr.get("amountUnitType", "Course")
            if unit in _UNIT_BASED_TYPES:
                # Unit-based: can't map units→courses precisely; pick-1 is conservative.
                pick_n = 1
            else:
                # Course-based (Course, Series, Sequence, OrMoreCourses, CourseOrCombination)
                pick_n = max(1, int(amt)) if amt else 1

        elif itype == "Conjunction":
            # Multiple sections linked by a conjunction. "Or" means "pick 1
            # complete section" — each section may bundle several courses
            # that must all be taken together (e.g. Calc I+II+III OR a
            # different Calc sequence). "And" means every section (and every
            # row within it) is independently required — same as AND.
            if conj == "Or" and len(sections) >= 2:
                pick_n = 1
                use_sections = True
            else:
                pick_n = 0

        elif itype == "NFromConjunction":
            # "Select N from the following conjunctions."
            amt  = instr.get("amount", 1)
            unit = instr.get("amountUnitType", "Course")
            if conj == "Or" and len(sections) >= 2 and unit in _SECTION_UNIT_TYPES:
                # Pick N whole sections (each a multi-course "track").
                pick_n = max(1, int(amt)) if amt else 1
                use_sections = True
            elif unit in _UNIT_BASED_TYPES:
                pick_n = 1
            else:
                # Course-based, or a single section listing independent
                # alternatives — flat course-level pick (NFromArea semantics).
                pick_n = max(1, int(amt)) if amt else 1

        elif itype == "NFromFollowing":
            # Functionally identical to NFromArea — select N from the following list.
            amt    = instr.get("amount", 1)
            pick_n = max(1, int(amt)) if amt else 1

        elif itype == "NToNFromConjunction":
            # Range-based unit selection (pick 16–18 units from N options).
            # Treat conservatively as pick-1 to prevent all-required explosion.
            pick_n = 1

        else:
            if itype:
                unknown_types[itype] += 1
            pick_n = 0  # default to AND for truly unknown types

        for sec_idx, s in enumerate(sections):
            if not isinstance(s, dict):
                continue
            rows = s.get("rows", [])
            row_units = _row_units(rows) if use_sections else None
            for row_idx, r in enumerate(rows):
                if not isinstance(r, dict):
                    continue
                unit_key = f"{sec_idx}:{row_units[row_idx]}" if use_sections else None
                for c in r.get("cells", []):
                    if not isinstance(c, dict):
                        continue
                    course = c.get("course") or {}
                    ciid = course.get("courseIdentifierParentId")
                    if ciid is not None:
                        # If the same course appears in multiple groups, first wins.
                        # (Duplicate across emphasis tracks handled at engine level.)
                        if ciid not in cell_to_group:
                            cell_to_group[ciid] = (gid, pick_n, unit_key)

    return cell_to_group, unknown_types


def parse_one(filepath) -> tuple[list | None, Counter]:
    """
    Returns (rows, unknown_instr_types).
    rows: list of shard entries, or None if no CC articulations found.
    """
    unknown_types: Counter = Counter()
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None, unknown_types

    result = data.get("result") or {}
    arts_raw = result.get("articulations", "[]")
    try:
        arts = json.loads(arts_raw) if isinstance(arts_raw, str) else (arts_raw or [])
    except Exception:
        return None, unknown_types

    cell_to_group, unknown_types = _parse_template_assets(
        result.get("templateAssets", "[]")
    )

    rows = []
    for art in arts:
        if not isinstance(art, dict):
            continue
        inner = art.get("articulation") or {}
        uc_c = inner.get("course") or {}
        if not uc_c:
            continue

        # Link articulation to its RequirementGroup via courseIdentifierParentId
        ciid = uc_c.get("courseIdentifierParentId")
        gid, pick_n, sec_idx = (
            cell_to_group.get(ciid, ("", 0, None)) if ciid is not None else ("", 0, None)
        )

        sa = inner.get("sendingArticulation") or {}
        if sa.get("noArticulationReason"):
            # Post-transfer: no CC equivalent
            row = {
                "uc": {
                    "p": uc_c.get("prefix", ""),
                    "n": uc_c.get("courseNumber", ""),
                    "t": uc_c.get("courseTitle", ""),
                },
                "cc": [[]],
                "g": gid,
                "k": pick_n,
            }
            if sec_idx is not None:
                row["sec"] = sec_idx
            rows.append(row)
            continue

        items = sa.get("items", [])
        cc_groups = []
        for grp in items:
            if not isinstance(grp, dict):
                continue
            conj = grp.get("courseConjunction", "Or")
            grp_courses = []
            for c in grp.get("items", []):
                if isinstance(c, dict) and c.get("courseNumber"):
                    grp_courses.append({
                        "p": c.get("prefix", ""),
                        "n": c.get("courseNumber", ""),
                        "t": c.get("courseTitle", ""),
                        "u": c.get("maxUnits", ""),
                        "j": conj,
                    })
            if grp_courses:
                if conj == "Or":
                    # Or-conjunction: each CC course is an independent alternative.
                    # Store each as its own cc_group so the engine picks exactly one.
                    for course in grp_courses:
                        cc_groups.append([course])
                else:
                    # And-conjunction: all courses in this group must be taken together
                    # (e.g., CHEM 1A + CHEM 1B as a sequence to satisfy one UC course).
                    cc_groups.append(grp_courses)

        if not cc_groups:
            continue

        row = {
            "uc": {
                "p": uc_c.get("prefix", ""),
                "n": uc_c.get("courseNumber", ""),
                "t": uc_c.get("courseTitle", ""),
            },
            "cc": cc_groups,
            "g": gid,
            "k": pick_n,
        }
        if sec_idx is not None:
            row["sec"] = sec_idx
        rows.append(row)

    return (rows if rows else None), unknown_types


def main():
    if not os.path.isdir(AGREEMENTS_DIR):
        print(f"ERROR: {AGREEMENTS_DIR} not found")
        sys.exit(1)

    fnames = [f for f in os.listdir(AGREEMENTS_DIR) if f.endswith(".json")]
    print(f"Processing {len(fnames)} agreement files...")

    index = {}
    processed = 0
    skipped = 0
    all_unknown: Counter = Counter()

    for i, fname in enumerate(fnames):
        if i % 10000 == 0:
            print(f"  {i}/{len(fnames)}...")
        key = fname[:-5]  # strip .json
        rows, unknown = parse_one(os.path.join(AGREEMENTS_DIR, fname))
        all_unknown.update(unknown)
        if rows:
            index[key] = rows
            processed += 1
        else:
            skipped += 1

    print(f"Done: {processed} agreements indexed, {skipped} skipped")

    if all_unknown:
        print("\nWARNING — unhandled instruction.type values (defaulted to AND):")
        for itype, cnt in all_unknown.most_common():
            print(f"  {itype:<40} {cnt:>6,} occurrences")
    else:
        print("No unhandled instruction types.")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))

    size_mb = os.path.getsize(OUTPUT_PATH) / 1_048_576
    print(f"Output: {OUTPUT_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
