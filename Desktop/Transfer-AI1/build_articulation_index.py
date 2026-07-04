"""
Build a compact articulation index from all agreement files.
Output: data/articulations_index.json
Format: {"CC__UC__Major": [{"uc":{...}, "cc":[...], "g":"<groupId>", "k":<pick_n>}, ...], ...}

"g" (groupId) and "k" (pick_n) encode the ASSIST RequirementGroup structure:
  k == 0  →  "Following" (complete all — AND)
  k >= 1  →  "NFromArea" (pick exactly k courses — OR/select-N)
  g == "" →  legacy / no templateAssets match (treated as AND by engine)

Only includes agreements where CC courses exist (major prep).
"""
import json
import os
import sys
from collections import Counter

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AGREEMENTS_DIR = os.path.join(BASE_DIR, "agreements")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "articulations_index.json")

# instruction.type values the parser actively handles
_KNOWN_TYPES = {"Following", "NFromArea"}


def _parse_template_assets(ta_raw) -> tuple[dict, Counter]:
    """
    Parse templateAssets and return:
      cell_to_group: {courseIdentifierParentId (int) -> (groupId str, pick_n int)}
      unknown_types: Counter of unrecognised instruction.type values

    pick_n semantics:
      0  = "Following" (AND — complete all)
      1+ = "NFromArea" amount (OR — pick N)
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

        if itype == "Following":
            # Complete all in this group (AND).
            pick_n = 0

        elif itype == "NFromArea":
            amt  = instr.get("amount", 1)
            unit = instr.get("amountUnitType", "Course")
            if unit in ("Unit", "QuarterUnit", "SemesterUnit", "Semester", "Quarter"):
                # Unit-based: can't map units→courses precisely; pick-1 is conservative.
                pick_n = 1
            else:
                # Course-based (Course, Series, Sequence, OrMoreCourses, CourseOrCombination)
                pick_n = max(1, int(amt)) if amt else 1

        elif itype == "Conjunction":
            # The group has multiple sections linked by a conjunction.
            # Semantically "Or" means "pick 1 complete section" — but each section
            # may contain multiple courses.  Picking the cheapest SECTION requires
            # section-ID awareness in the shard, which we don't store yet.
            # Conservative: treat both And and Or as AND (require all entries).
            # This over-schedules Or groups but never drops a required multi-course
            # section.  Future work: store "sec" field and pick cheapest section.
            pick_n = 0

        elif itype == "NFromConjunction":
            # "Select N from the following conjunctions."  Each section is one
            # complete multi-course option.  With Or-conjunction, the correct
            # behaviour is to pick N *sections*, not N individual courses.
            # Same limitation as Conjunction=Or: conservative AND for now.
            pick_n = 0

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

        for s in item.get("sections", []):
            if not isinstance(s, dict):
                continue
            for r in s.get("rows", []):
                if not isinstance(r, dict):
                    continue
                for c in r.get("cells", []):
                    if not isinstance(c, dict):
                        continue
                    course = c.get("course") or {}
                    ciid = course.get("courseIdentifierParentId")
                    if ciid is not None:
                        # If the same course appears in multiple groups, first wins.
                        # (Duplicate across emphasis tracks handled at engine level.)
                        if ciid not in cell_to_group:
                            cell_to_group[ciid] = (gid, pick_n)

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
        gid, pick_n = cell_to_group.get(ciid, ("", 0)) if ciid is not None else ("", 0)

        sa = inner.get("sendingArticulation") or {}
        if sa.get("noArticulationReason"):
            # Post-transfer: no CC equivalent
            rows.append({
                "uc": {
                    "p": uc_c.get("prefix", ""),
                    "n": uc_c.get("courseNumber", ""),
                    "t": uc_c.get("courseTitle", ""),
                },
                "cc": [[]],
                "g": gid,
                "k": pick_n,
            })
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

        rows.append({
            "uc": {
                "p": uc_c.get("prefix", ""),
                "n": uc_c.get("courseNumber", ""),
                "t": uc_c.get("courseTitle", ""),
            },
            "cc": cc_groups,
            "g": gid,
            "k": pick_n,
        })

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
