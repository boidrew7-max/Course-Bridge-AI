"""
Split data/alternative_hints.json into per-UC shards for the chat advisor.

data/alternative_hints.json holds ASSIST's free-text "GeneralText" advisory
blocks (real UC-authored admission criteria, GPA thresholds, selection
policy, application notes — not just course articulation rows). It was
extracted by extract_prereq_data.py but never wired into anything that
actually reads it.

Output: data/hints_{UC}.json.gz, one per UC campus, keyed by
"<cc_college>||<major>" -> text, deduplicated (the same advisory text is
often repeated verbatim across every CC that shares a UC+major agreement).
"""
import gzip
import json
import os
from collections import defaultdict

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE_DIR, "data", "alternative_hints.json")
OUT_DIR = os.path.join(BASE_DIR, "data")

_UC_SHARD_MAP = {
    "los angeles":   "Los_Angeles",
    "berkeley":      "Berkeley",
    "san diego":     "San_Diego",
    "irvine":        "Irvine",
    "santa barbara": "Santa_Barbara",
    "davis":         "Davis",
    "santa cruz":    "Santa_Cruz",
    "riverside":     "Riverside",
    "merced":        "Merced",
}


def main():
    print("Loading alternative_hints.json...")
    with open(SRC, encoding="utf-8") as f:
        entries = json.load(f)
    print(f"Loaded {len(entries)} entries")

    by_uc: dict = defaultdict(dict)
    skipped = 0
    for e in entries:
        uc_raw = (e.get("uc_campus") or "").lower().strip()
        shard = _UC_SHARD_MAP.get(uc_raw)
        if not shard:
            skipped += 1
            continue
        cc = e.get("cc_college", "").strip()
        major = e.get("major", "").strip()
        text = e.get("text", "").strip()
        if not cc or not major or not text:
            skipped += 1
            continue
        key = f"{cc}||{major}"
        # First entry wins if duplicates exist for the same (cc, major) key.
        by_uc[shard].setdefault(key, text)

    print(f"Skipped {skipped} entries (missing fields or unmapped UC)")

    for shard, data in by_uc.items():
        out_path = os.path.join(OUT_DIR, f"hints_{shard}.json.gz")
        with gzip.open(out_path, "wt", encoding="utf-8") as f:
            json.dump(data, f, separators=(",", ":"))
        size_mb = os.path.getsize(out_path) / 1_048_576
        print(f"  {shard}: {len(data)} entries -> {size_mb:.2f} MB")

    print("Done.")


if __name__ == "__main__":
    main()
