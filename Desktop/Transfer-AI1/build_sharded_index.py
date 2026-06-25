"""
Split articulations_index.json into 9 UC-specific shards.
Each shard loads ~18MB instead of 163MB, staying within Railway's memory limit.
Output: data/articulations_{UC}.json.gz for each of 9 UCs.
"""
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

def main():
    if not os.path.exists(SRC):
        print("ERROR: articulations_index.json not found. Run build_articulation_index.py first.")
        sys.exit(1)

    print("Loading full index...")
    with open(SRC, encoding="utf-8") as f:
        full = json.load(f)
    print(f"Loaded {len(full)} entries")

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
        raw = json.dumps(shard, separators=(",", ":")).encode("utf-8")
        with gzip.open(out_path, "wb", compresslevel=9) as f:
            f.write(raw)
        size_mb = os.path.getsize(out_path) / 1_048_576
        print(f"  {uc}: {len(shard)} entries -> {size_mb:.1f} MB")

    print("Done.")

if __name__ == "__main__":
    main()
