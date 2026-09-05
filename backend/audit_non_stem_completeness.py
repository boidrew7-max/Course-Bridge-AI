"""
Full-matrix completeness audit for every NON-STEM major: for every real
(college, UC, major) triple in our own ASSIST-derived shard data, verify a
fresh plan (no completed courses) actually:

  1. Certifies every required Cal-GETC area (no area missing, no "NOT
     ASSIGNED", no silently-empty area) - except areas legitimately deferred
     under the sourced MAJOR_PREP_FIRST policy (see plan_engine._ge_strategy),
     which is a real, documented UC allowance, not a gap.
  2. Schedules every real, ASSIST-articulated major-prep requirement (never
     leaves one at "NOT MET" when the student has no completed courses -
     that would mean a genuinely available course was silently skipped).

This is a stricter, narrower pass than backtest_matrix.py's general
invariant sweep - it specifically answers "can this student actually use
this plan to transfer," not just "is the output internally consistent."

Usage:
    python audit_non_stem_completeness.py                # full run
    python audit_non_stem_completeness.py --limit 500     # debug
"""
import argparse
import sys
import time
from collections import Counter

from backtest_matrix import enumerate_triples
from plan_engine import build_plan, _STEM_MAJOR_WORDS, _CALGETC_REQUIRED

_KNOWN_STATUSES = {"MET", "MET (CONDITIONAL)", "NOT MET", "POST-TRANSFER"}


def is_stem(major: str) -> bool:
    major_l = (major or "").lower()
    return any(w in major_l for w in _STEM_MAJOR_WORDS)


def audit_one(college, uc, major, key):
    try:
        r = build_plan(college=college, uc=uc, major=major, _known_key=key)
    except Exception as e:
        return {"status": "CRASH", "detail": str(e)[:200]}

    if not r.all_courses():
        return {"status": "EMPTY_PLAN", "detail": "no courses placed"}

    problems = []

    # ── Cal-GETC completeness ────────────────────────────────────────────
    deferred = set(r.ge_deferred_areas or [])
    for area_code, area_name, _ in _CALGETC_REQUIRED:
        if area_code in deferred:
            continue  # sourced, documented MAJOR_PREP_FIRST allowance
        val = r.ge_completion.get(area_code)
        if not val or "NOT ASSIGNED" in str(val):
            problems.append(f"Cal-GETC area {area_code} ({area_name}) missing/unassigned: {val!r}")

    # ── Major-prep completeness ──────────────────────────────────────────
    for uc_req, cc_code, status in r.requirement_audit:
        if status not in _KNOWN_STATUSES:
            problems.append(f"unrecognized status for {uc_req!r}: {status!r}")
        elif status == "NOT MET":
            # Fresh student, no completed courses - NOT MET here means a
            # real, available course was left unscheduled.
            problems.append(f"major-prep {uc_req!r} left NOT MET (cc={cc_code!r})")

    if problems:
        return {"status": "FAIL", "detail": problems}
    return {"status": "PASS"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    all_triples = enumerate_triples()
    non_stem = [t for t in all_triples if not is_stem(t[4])]
    if args.limit:
        non_stem = non_stem[: args.limit]

    print(f"Total triples: {len(all_triples)}")
    print(f"Non-STEM triples: {len(non_stem)}")
    print()

    t0 = time.time()
    status_counts = Counter()
    failures = []

    for i, (shard_name, key, college, uc, major) in enumerate(non_stem):
        result = audit_one(college, uc, major, key)
        status_counts[result["status"]] += 1
        if result["status"] != "PASS":
            failures.append((f"{college} -> {uc} / {major}", result))
        if i and i % 10000 == 0:
            print(f"  {i}/{len(non_stem)}... ({time.time()-t0:.1f}s)")

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s")
    print(f"PASS: {status_counts['PASS']}")
    for k in ("FAIL", "EMPTY_PLAN", "CRASH"):
        if status_counts[k]:
            print(f"{k}: {status_counts[k]}")

    pct = 100.0 * status_counts["PASS"] / len(non_stem) if non_stem else 0
    print(f"\n% fully usable (Cal-GETC + major prep complete): {pct:.2f}%")

    if failures:
        print(f"\nFirst 40 failures of {len(failures)}:")
        for label, result in failures[:40]:
            print(f"- {label}")
            for p in (result.get("detail") if isinstance(result.get("detail"), list) else [result.get("detail")]):
                print(f"    {p}")

    with open("audit_non_stem_completeness.txt", "w", encoding="utf-8") as f:
        f.write(f"Non-STEM triples: {len(non_stem)}\n")
        f.write(f"PASS: {status_counts['PASS']}  ({pct:.2f}%)\n")
        for k in ("FAIL", "EMPTY_PLAN", "CRASH"):
            if status_counts[k]:
                f.write(f"{k}: {status_counts[k]}\n")
        f.write("\nAll failures:\n")
        for label, result in failures:
            f.write(f"- {label}\n")
            details = result.get("detail") if isinstance(result.get("detail"), list) else [result.get("detail")]
            for p in details:
                f.write(f"    {p}\n")
    print("\nFull results written to audit_non_stem_completeness.txt")


if __name__ == "__main__":
    main()
