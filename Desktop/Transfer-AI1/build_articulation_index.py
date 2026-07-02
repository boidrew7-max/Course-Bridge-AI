"""
Build a compact articulation index from all agreement files.
Output: data/articulations_index.json
Format: {"CC__UC__Major": [[uc_course, [[cc_course, ...], ...]], ...], ...}
Only includes agreements where CC courses exist (major prep).
"""
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
AGREEMENTS_DIR = os.path.join(BASE_DIR, "agreements")
OUTPUT_PATH = os.path.join(BASE_DIR, "data", "articulations_index.json")


def parse_one(filepath):
    try:
        with open(filepath, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        return None

    result = data.get("result", {})
    arts_raw = result.get("articulations", "[]")
    try:
        arts = json.loads(arts_raw) if isinstance(arts_raw, str) else (arts_raw or [])
    except Exception:
        return None

    rows = []
    for art in arts:
        if not isinstance(art, dict):
            continue
        inner = art.get("articulation", {})
        uc_c = inner.get("course", {})
        if not uc_c:
            continue
        sa = inner.get("sendingArticulation", {})
        if sa.get("noArticulationReason"):
            # Preserve as post-transfer requirement (complete at UC after transfer)
            rows.append({
                "uc": {
                    "p": uc_c.get("prefix", ""),
                    "n": uc_c.get("courseNumber", ""),
                    "t": uc_c.get("courseTitle", ""),
                },
                "cc": [[]],  # empty group = no CC equivalent
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
        })

    return rows if rows else None


def main():
    if not os.path.isdir(AGREEMENTS_DIR):
        print(f"ERROR: {AGREEMENTS_DIR} not found")
        sys.exit(1)

    fnames = [f for f in os.listdir(AGREEMENTS_DIR) if f.endswith(".json")]
    print(f"Processing {len(fnames)} agreement files...")

    index = {}
    processed = 0
    skipped = 0

    for i, fname in enumerate(fnames):
        if i % 5000 == 0:
            print(f"  {i}/{len(fnames)}...")
        key = fname[:-5]  # strip .json
        rows = parse_one(os.path.join(AGREEMENTS_DIR, fname))
        if rows:
            index[key] = rows
            processed += 1
        else:
            skipped += 1

    print(f"Done: {processed} agreements indexed, {skipped} skipped (parse error or empty)")

    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(index, f, separators=(",", ":"))

    size_mb = os.path.getsize(OUTPUT_PATH) / 1_048_576
    print(f"Output: {OUTPUT_PATH} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    main()
