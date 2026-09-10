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
    1A/1B/1C). All other rows get their own standalone unit — EXCEPT a plain
    (unlettered) course number that is exactly one more than another row's
    plain number in the same prefix, seen earlier in this same section: that
    chains into the same unit too (e.g. Berkeley MATH 51/52, or a language
    sequence like SPAN 1/2/3).

    Verified via econ.berkeley.edu's own transfer requirements page and
    ASSIST's raw templateAssets ("amountUnitType": "Sequence" advisement,
    meaning "complete 1 whole track" — this function is only ever called for
    such sections, never for flat "amountUnitType": "Course" pick-one-course
    sections): before this, MATH 51 and MATH 52 were both required by
    Berkeley's Economics major but got assigned separate units, so the
    engine treated completing 51 alone as satisfying the *entire* calculus
    requirement — a required course (MATH 52) silently never had to be
    taken. A full-shard scan across all 9 UC campuses found the same plain-
    integer-sequence shape recurring heavily for foreign language sequences
    (French/Spanish/Chinese/German/... 1/2/3, etc.) in addition to Berkeley
    math, confirming this is a general ASSIST data pattern, not a one-off.
    """
    unit_map: dict = {}
    plain_chain: dict = {}   # prefix -> (last_plain_number:int, unit_id)
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
        prefix_u = prefix.upper()
        seq = _sequence_key(number)
        if seq is not None:
            key = (prefix_u, seq[0], seq[1])
            if key not in unit_map:
                unit_map[key] = next_id
                next_id += 1
            unit_ids.append(unit_map[key])
            continue

        # Plain (unlettered) number: chain onto the previous row's unit if
        # this prefix's last plain number was exactly one less than this one.
        plain_num = None
        if re.match(r"^\d+$", number.strip()):
            plain_num = int(number.strip())

        prev = plain_chain.get(prefix_u)
        if plain_num is not None and prev is not None and plain_num == prev[0] + 1:
            unit_id = prev[1]
        else:
            unit_id = next_id
            next_id += 1
        unit_ids.append(unit_id)
        if plain_num is not None:
            plain_chain[prefix_u] = (plain_num, unit_id)
    return unit_ids

def _series_identity(series: dict) -> tuple[int | None, dict] | None:
    """
    A cell/articulation can carry `{"type": "Series", "series": {...}}`
    instead of `{"type": "Course", "course": {...}}` when the UC SIDE of a
    single requirement is itself a multi-course bundle (e.g. Berkeley Civil
    Engineering's "General Chemistry (full sequence with lab)" = CHEM 1A +
    1AL + 1B all required together as ONE requirement, not three separate
    ones). Every place in this file that reads `c.get("course")` needs a
    parallel `c.get("series")` fallback, or the whole requirement — the UC
    course cell in templateAssets AND its matching row in articulations —
    is invisible everywhere: not scheduled, not POST-TRANSFER, not even
    NOT ARTICULATED. Confirmed real and not rare: verified via De Anza ->
    Berkeley Civil Engineering (Chemistry silently missing from every
    output), and this "series"-on-the-UC-side shape is a generic ASSIST
    construct, not specific to that one agreement or major.

    Returns (synthetic_ciid, uc_dict) using the first sub-course's own
    courseIdentifierParentId as the identity — stable and derived
    identically here and in parse_one(), so a cell's synthetic id here
    matches the same series' synthetic id when read again from the
    separate `articulations` blob. Returns None if the series has no
    usable sub-courses.
    """
    courses = series.get("courses") or []
    if not courses or not isinstance(courses[0], dict):
        return None
    ciid = courses[0].get("courseIdentifierParentId")
    prefixes = {c.get("prefix", "") for c in courses if isinstance(c, dict)}
    prefix = courses[0].get("prefix", "") if len(prefixes) == 1 else "/".join(sorted(prefixes))
    number = "+".join(c.get("courseNumber", "") for c in courses if isinstance(c, dict))
    title = series.get("name") or ", ".join(
        f"{c.get('prefix','')} {c.get('courseNumber','')}".strip() for c in courses if isinstance(c, dict)
    )
    return ciid, {"prefix": prefix, "courseNumber": number, "courseTitle": title}


# instruction.type values the parser actively handles
_KNOWN_TYPES = {"Following", "NFromArea"}


_SECTION_UNIT_TYPES = {"Series", "Sequence"}
_UNIT_BASED_TYPES   = {"Unit", "QuarterUnit", "SemesterUnit", "Semester", "Quarter"}

# Per-course attribute text meaning "this CC course alone doesn't fully satisfy
# the UC requirement — a bridge course must also be completed after transfer".
_CONDITIONAL_ATTR_RE = re.compile(r"additional university course", re.IGNORECASE)

# CourseGroup/row-level attribute text meaning the articulation is scheduled to
# change soon — surface as a plan-level warning rather than silently trusting it.
_STALE_ATTR_RE = re.compile(
    r"will be revised|effective next|subject to change|no longer accepted",
    re.IGNORECASE,
)


def _parse_template_assets(ta_raw) -> tuple[dict, Counter, dict, list]:
    """
    Parse templateAssets and return:
      cell_to_group: {courseIdentifierParentId (int) -> (groupId str, pick_n int, sec_idx int|None)}
      unknown_types: Counter of unrecognised instruction.type values
      all_uc_cells: {courseIdentifierParentId (int) -> {"p","n","t"}} for EVERY UC
        course cell seen in the template, regardless of group type. Used to find
        UC courses the major requires that never got a row in `articulations` at
        all (ASSIST gives them no noArticulationReason either — they just don't
        appear there), which the old parser silently dropped.
      unresolved_cells: list of raw cell "type" strings for cells that could not
        be identified at all (neither "course" nor a resolvable "series") - see
        the build-time completeness check in main().

    pick_n semantics:
      0  = "Following" (AND — complete all)
      1+ = select-N (OR). If sec_idx is not None, selection is SECTION-atomic
           (all rows sharing the same (gid, sec_idx) are scheduled together as
           one unit — used for "pick one full track" groups like alternative
           Calculus sequences). If sec_idx is None, selection is course-level
           (flat pool across the whole group — used for NFromArea/NFromFollowing).
    """
    cell_to_group: dict = {}
    unresolved_cells: list = []
    unknown_types: Counter = Counter()
    all_uc_cells: dict = {}

    try:
        ta = json.loads(ta_raw) if isinstance(ta_raw, str) else (ta_raw or [])
    except Exception:
        return cell_to_group, unknown_types, all_uc_cells
    if not isinstance(ta, list):
        return cell_to_group, unknown_types, all_uc_cells

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

            # ── Section-level advisement override ──────────────────────────
            # ASSIST sometimes expresses "pick N of the following" not via
            # the item's top-level instruction (which may just say
            # Conjunction/And, since there's only one section) but via an
            # advisement attached to the SECTION itself. Two variants seen:
            #   {"type":"NFollowing","amount":1,"amountUnitType":"Sequence"}
            #     — "complete 1 SEQUENCE" (a bundled multi-course track, e.g.
            #     "Math 51+52 OR Math 16A+16B") — section-atomic, needs
            #     row_units to bundle the rows that form each sequence.
            #   {"type":"NFollowing","amount":1,"amountUnitType":"Course"}
            #     — "complete 1 COURSE" (a flat pick among independent rows,
            #     e.g. "Math 53/54/56") — course-level, no row bundling.
            # Both were previously unread entirely, so the item fell through
            # to itype="Conjunction"/conj="And" -> pick_n=0, flattening every
            # such group into independent AND requirements. Detected
            # per-section (not per-item) since only some sections carry this
            # advisement even within groups that have several sections.
            sec_pick_n = pick_n
            sec_use_sections = use_sections
            sec_overridden = False
            for adv in (s.get("advisements") or []):
                if not isinstance(adv, dict):
                    continue
                if adv.get("type") not in ("NFollowing", "NFromFollowing"):
                    continue
                unit = adv.get("amountUnitType")
                if unit not in _SECTION_UNIT_TYPES and unit != "Course":
                    continue
                amt = adv.get("amount", 1)
                sec_pick_n = max(1, int(amt)) if amt else 1
                sec_use_sections = unit in _SECTION_UNIT_TYPES
                sec_overridden = True
                break

            # A single RequirementGroup (one groupId) can contain several
            # INDEPENDENT section-level advisements (e.g. "pick 1 of
            # STAT20/DATA C8" in one section and, separately, "pick 1 of
            # MATH54/56" in another section of the SAME group). Reusing the
            # bare item-level gid for both would merge two unrelated
            # pick-1-of-2 choices into one incorrect pick-1-of-4 group.
            # Synthesize a per-section id whenever an override actually
            # fired so each section-level advisement forms its own group.
            eff_gid = f"{gid}::sec{sec_idx}" if sec_overridden else gid

            row_units = _row_units(rows) if sec_use_sections else None
            for row_idx, r in enumerate(rows):
                if not isinstance(r, dict):
                    continue
                unit_key = f"{sec_idx}:{row_units[row_idx]}" if sec_use_sections else None
                for c in r.get("cells", []):
                    if not isinstance(c, dict):
                        continue
                    course = c.get("course") or {}
                    ciid = course.get("courseIdentifierParentId")
                    if ciid is None and c.get("series"):
                        ident = _series_identity(c["series"])
                        if ident is not None:
                            ciid, series_uc = ident
                            course = {
                                "prefix": series_uc["prefix"],
                                "courseNumber": series_uc["courseNumber"],
                                "courseTitle": series_uc["courseTitle"],
                            }
                    if ciid is None:
                        # Neither "course" nor a resolvable "series" - this cell
                        # represents a real UC requirement (it has a "type" and
                        # took up a row in the template) that this parser cannot
                        # identify at all. This must never happen silently: see
                        # the build-time completeness check in main() - unlike a
                        # genuine "na" row (a real, IDENTIFIED UC course with no
                        # articulation data), this is a cell whose very identity
                        # was never established, so it can't even become an "na"
                        # row. Counted and surfaced by main(); the build fails
                        # loudly rather than silently dropping the requirement
                        # the way the pre-fix "series" gap did.
                        unresolved_cells.append(c.get("type", "<unknown>"))
                        continue
                    # If the same course appears in multiple groups, first wins.
                    # (Duplicate across emphasis tracks handled at engine level.)
                    if ciid not in cell_to_group:
                        cell_to_group[ciid] = (eff_gid, sec_pick_n, unit_key)
                    if ciid not in all_uc_cells:
                        all_uc_cells[ciid] = {
                            "p": course.get("prefix", ""),
                            "n": course.get("courseNumber", ""),
                            "t": course.get("courseTitle", ""),
                        }

    return cell_to_group, unknown_types, all_uc_cells, unresolved_cells


def parse_one(filepath) -> tuple[list | None, Counter, list]:
    """
    Returns (rows, unknown_instr_types, unresolved_cells).
    rows: list of shard entries, or None if no CC articulations found.
    unresolved_cells: raw "type" strings for cells this parser could not
      identify at all, from both templateAssets and articulations - see the
      build-time completeness check in main(), which fails the build loudly
      if this is ever non-empty rather than let a requirement vanish with no
      trace the way the "series" shape did before this parser handled it.

    Row fields beyond uc/cc/g/k/sec:
      "cond": True on a CC course dict inside "cc" — ASSIST attaches a per-course
        attribute saying the CC course alone doesn't fully satisfy the UC
        requirement; a bridge course must still be completed after transfer.
      "stale": <note text> on a row — ASSIST attaches a note to the whole
        CourseGroup (e.g. "Effective next fall, this articulation will be
        revised") saying the mapping is due to change.
      "na": True on a row — the UC course appears in the major's template
        (so it's required) but has NO entry at all in `articulations` — not
        even a noArticulationReason. Distinct from a genuine POST-TRANSFER
        row (noArticulationReason set): "na" rows are silently dropped by
        ASSIST's own data, not explicitly marked post-transfer.
    """
    unknown_types: Counter = Counter()
    unresolved_cells: list = []
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None, unknown_types, unresolved_cells

    result = data.get("result") or {}
    arts_raw = result.get("articulations", "[]")
    try:
        arts = json.loads(arts_raw) if isinstance(arts_raw, str) else (arts_raw or [])
    except Exception:
        return None, unknown_types, unresolved_cells

    cell_to_group, unknown_types, all_uc_cells, unresolved_cells = _parse_template_assets(
        result.get("templateAssets", "[]")
    )

    rows = []
    covered_ciids: set = set()
    seen_row_ciids: set = set()   # dedupe duplicate raw articulation rows for
                                   # the same UC course (ASSIST sometimes lists
                                   # the identical course twice when it belongs
                                   # to two different RequirementGroups in the
                                   # same agreement, e.g. Math 54 as both an
                                   # alternative to Math 53 AND to Math 56 —
                                   # without this, both raw rows survive and
                                   # the same requirement renders twice in the
                                   # audit table). Keeps first occurrence,
                                   # consistent with cell_to_group's existing
                                   # first-wins group assignment above.
    for art in arts:
        if not isinstance(art, dict):
            continue
        inner = art.get("articulation") or {}
        uc_c = inner.get("course") or {}
        if not uc_c and inner.get("series"):
            ident = _series_identity(inner["series"])
            if ident is not None:
                _series_ciid, uc_c = ident
                uc_c = {"courseIdentifierParentId": _series_ciid, **uc_c}
        if not uc_c:
            if inner.get("type"):
                # Same "cannot identify this cell at all" case as the
                # templateAssets side - a real articulation row this parser
                # doesn't recognize, not a genuinely empty one.
                unresolved_cells.append(inner.get("type"))
            continue

        # Link articulation to its RequirementGroup via courseIdentifierParentId
        ciid = uc_c.get("courseIdentifierParentId")
        if ciid is not None:
            covered_ciids.add(ciid)
            if ciid in seen_row_ciids:
                continue
            seen_row_ciids.add(ciid)
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
        stale_note = None
        for grp in items:
            if not isinstance(grp, dict):
                continue
            conj = grp.get("courseConjunction", "Or")
            for grp_attr in (grp.get("attributes") or []):
                content = grp_attr.get("content", "") if isinstance(grp_attr, dict) else ""
                if _STALE_ATTR_RE.search(content):
                    stale_note = content
            grp_courses = []
            for c in grp.get("items", []):
                if isinstance(c, dict) and c.get("courseNumber"):
                    course_dict = {
                        "p": c.get("prefix", ""),
                        "n": c.get("courseNumber", ""),
                        "t": c.get("courseTitle", ""),
                        "u": c.get("maxUnits", ""),
                        "j": conj,
                    }
                    for c_attr in (c.get("attributes") or []):
                        content = c_attr.get("content", "") if isinstance(c_attr, dict) else ""
                        if _CONDITIONAL_ATTR_RE.search(content):
                            course_dict["cond"] = True
                    grp_courses.append(course_dict)
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
        if stale_note:
            row["stale"] = stale_note
        rows.append(row)

    # UC courses required by the major (present in templateAssets) but with NO
    # entry at all in `articulations` — ASSIST gives them no CC mapping and no
    # explicit noArticulationReason either. Without this, they silently vanish.
    for ciid, uc_cell in all_uc_cells.items():
        if ciid in covered_ciids:
            continue
        gid, pick_n, sec_idx = cell_to_group.get(ciid, ("", 0, None))
        row = {
            "uc": dict(uc_cell),
            "cc": [[]],
            "g": gid,
            "k": pick_n,
            "na": True,
        }
        if sec_idx is not None:
            row["sec"] = sec_idx
        rows.append(row)

    return (rows if rows else None), unknown_types, unresolved_cells


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
    unresolved_by_uc: Counter = Counter()
    unresolved_type_counts: Counter = Counter()
    unresolved_examples: dict = {}   # uc -> first offending filename

    for i, fname in enumerate(fnames):
        if i % 10000 == 0:
            print(f"  {i}/{len(fnames)}...")
        key = fname[:-5]  # strip .json
        # "College__UC__Major.json" - UC is the second "__"-delimited segment.
        parts = key.split("__")
        uc_label = parts[1] if len(parts) >= 3 else "<unknown>"
        rows, unknown, unresolved = parse_one(os.path.join(AGREEMENTS_DIR, fname))
        all_unknown.update(unknown)
        if unresolved:
            unresolved_by_uc[uc_label] += len(unresolved)
            unresolved_type_counts.update(unresolved)
            unresolved_examples.setdefault(uc_label, fname)
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

    # ── Build-time completeness check ───────────────────────────────────────
    # Every UC course cell the parser encounters must become exactly one
    # output row: articulated (a normal row), post-transfer (noArticulation-
    # Reason set), or "na" (present in templateAssets, absent from
    # articulations). A cell this parser can't identify at all - neither
    # "course" nor a resolvable "series", or any future shape not yet
    # handled - falls through all three and disappears with zero trace. That
    # is exactly the bug this whole fix started from (Chemistry silently
    # missing from every De Anza -> Berkeley Civil Engineering output). Never
    # let that happen again silently: fail the build loudly instead.
    if unresolved_by_uc:
        print("\nFAILED — unresolved UC requirement cells (neither course nor series), by campus:")
        for uc_label, cnt in unresolved_by_uc.most_common():
            example = unresolved_examples.get(uc_label, "?")
            print(f"  {uc_label:<20} {cnt:>6,} unresolved cell(s)  (e.g. {example})")
        print("\nBy raw cell type:")
        for cell_type, cnt in unresolved_type_counts.most_common():
            print(f"  {cell_type:<20} {cnt:>6,}")
        print(
            "\nRefusing to write output: a requirement type this parser doesn't "
            "recognize would silently vanish from the shard. Extend "
            "_parse_template_assets()/parse_one() to handle the type(s) above, "
            "then re-run."
        )
        sys.exit(1)
    print("Completeness check passed: every UC requirement cell resolved to a real row.")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))

    size_mb = os.path.getsize(OUTPUT_PATH) / 1_048_576
    print(f"Output: {OUTPUT_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
