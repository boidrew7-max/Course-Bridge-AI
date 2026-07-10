"""
Split articulations_index.json into 9 UC-specific shards.
Each shard loads ~18MB instead of 163MB, staying within Railway's memory limit.
Output: data/articulations_{UC}.json.gz for each of 9 UCs.

Each shard includes a top-level "_meta" key with build timestamp and catalog year
so the app can show a "data last updated" note and you can tell shard freshness at
a glance without opening every file.
"""
import datetime
import gzip, json, os, sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE_DIR, "data", "articulations_index.json")
OUT_DIR = os.path.join(BASE_DIR, "data")

UC_SHARDS = [
    "Los_Angeles",
    "Berkeley",
    "San_Diego",
    "Irvine",
    "Santa_Barbara",
    "Davis",
    "Santa_Cruz",
    "Riverside",
    "Merced",
]

def _detect_catalog_year() -> str:
    """Sample one agreement file to read its academic year code (e.g. '2025-2026')."""
    agree_dir = os.path.join(BASE_DIR, "agreements")
    if not os.path.isdir(agree_dir):
        return "unknown"
    for fname in os.listdir(agree_dir):
        if not fname.endswith(".json"):
            continue
        try:
            with open(os.path.join(agree_dir, fname), encoding="utf-8") as f:
                d = json.load(f)
            ay = d.get("result", {}).get("academicYear", "")
            if isinstance(ay, str):
                ay = json.loads(ay)
            if isinstance(ay, dict) and ay.get("code"):
                return ay["code"].strip()
        except Exception:
            continue
    return "unknown"


def main():
    if not os.path.exists(SRC):
        print("ERROR: articulations_index.json not found. Run build_articulation_index.py first.")
        sys.exit(1)

    print("Loading full index...")
    with open(SRC, encoding="utf-8") as f:
        full = json.load(f)
    print(f"Loaded {len(full)} entries")

    catalog_year = _detect_catalog_year()
    built_at = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    meta = {
        "_built_at": built_at,
        "_catalog_year": catalog_year,
        "_source": "ASSIST.org",
    }
    print(f"Catalog year: {catalog_year}  Built at: {built_at}")

    shards = {uc: {} for uc in UC_SHARDS}
    unmatched = 0

    for key, data in full.items():
        parts = key.split("__")
        if len(parts) < 2:
            unmatched += 1
            continue
        uc_part = parts[1]
        if uc_part in shards:
            shards[uc_part][key] = data
        else:
            unmatched += 1

    print(f"Unmatched: {unmatched}")

    for uc, shard in shards.items():
        out_path = os.path.join(OUT_DIR, f"articulations_{uc}.json.gz")
        # _meta is a reserved key; app.py skips keys starting with "_"
        shard_with_meta = {"_meta": meta, **shard}
        raw = json.dumps(shard_with_meta, separators=(",", ":")).encode("utf-8")
        with gzip.open(out_path, "wb", compresslevel=9) as f:
            f.write(raw)
        size_mb = os.path.getsize(out_path) / 1_048_576
        print(f"  {uc}: {len(shard)} entries -> {size_mb:.1f} MB")

    # Also write a plain-text metadata file for quick inspection without decompressing
    meta_path = os.path.join(OUT_DIR, "articulations_meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(f"Metadata written to: {meta_path}")

    print("Done.")

if __name__ == "__main__":
    main()
