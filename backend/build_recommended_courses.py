"""
Extract just the "Highly Recommended Courses for Admission" course codes out
of the full hints_{UC}.json.gz shards into one small lookup file.

Why: advisor._find_uc_hint() returns full free-text advisory blocks, and an
earlier attempt to use it per-request in plan_engine.py loaded a full UC
hints shard (tens of MB decompressed) into memory on every /plan_v2 call —
that OOM-killed the backend for larger campuses and was reverted. All that
feature actually needs is a short list of course codes per (UC, CC, major),
so pre-extract just that into a single tiny file instead of shipping full
hint text at request time.

Output: data/recommended_courses.json.gz
  { "<uc>||<cc>||<major>": ["COMPSCI 61A", "COMPSCI 61C", ...], ... }
Only keys with at least one recommended course are kept, so the file stays
small (a few hundred KB at most vs. the ~11MB the 9 hints shards total).
"""
import gzip
import json
import os
import re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")

_UC_SHARDS = [
    "Berkeley", "Davis", "Irvine", "Los_Angeles", "Merced",
    "Riverside", "San_Diego", "Santa_Barbara", "Santa_Cruz",
]

_RECOMMENDED_BLOCK_RE = re.compile(
    r"Highly Recommended Courses? for Admission(.*?)(?:\n\s*\n|Required Courses|$)",
    re.IGNORECASE | re.DOTALL,
)
_COURSE_CODE_RE = re.compile(r"\b([A-Z]{2,10})\s+(\d{1,4}[A-Z]?)\b")


def extract_recommended_codes(hint_text: str) -> list:
    m = _RECOMMENDED_BLOCK_RE.search(hint_text)
    if not m:
        return []
    codes = []
    seen = set()
    for code_m in _COURSE_CODE_RE.finditer(m.group(1)):
        code = f"{code_m.group(1).upper()} {code_m.group(2).upper()}"
        if code not in seen:
            seen.add(code)
            codes.append(code)
    return codes


def main():
    out: dict = {}
    for shard_name in _UC_SHARDS:
        path = os.path.join(DATA_DIR, f"hints_{shard_name}.json.gz")
        if not os.path.exists(path):
            print(f"  skip {shard_name}: no shard file")
            continue
        with gzip.open(path, "rt", encoding="utf-8") as f:
            hints = json.load(f)
        found = 0
        for key, text in hints.items():
            codes = extract_recommended_codes(text)
            if codes:
                cc, _, major = key.partition("||")
                out[f"{shard_name}||{cc}||{major}"] = codes
                found += 1
        print(f"  {shard_name}: {found} entries with recommended courses (of {len(hints)} total)")

    out_path = os.path.join(DATA_DIR, "recommended_courses.json.gz")
    with gzip.open(out_path, "wt", encoding="utf-8") as f:
        json.dump(out, f)
    size_kb = os.path.getsize(out_path) / 1024
    print(f"\nWrote {len(out)} entries to {out_path} ({size_kb:.1f} KB)")


if __name__ == "__main__":
    main()
