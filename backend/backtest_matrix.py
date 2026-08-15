"""
Full-matrix backtesting for the deterministic planner (plan_engine.build_plan).

Enumerates every (college, uc, major) triple that has a real ASSIST
articulation agreement in our own shard data — no fuzzy-matching, no guessed
inputs — builds a plan for each via the exact-shard-key fast path, and checks
it against a battery of answer-free invariants (see invariants.py).

Usage:
  python backtest_matrix.py                 # full matrix, all 9 UC campuses
  python backtest_matrix.py --smoke         # 32 goldens + deterministic sample
  python backtest_matrix.py --uc Berkeley   # single campus only
  python backtest_matrix.py --workers 4     # override worker count
  python backtest_matrix.py --limit 500     # cap triples processed (debug)

Results land in:
  backend/backtest_results.db     — SQLite, one row per (run_id, triple)
  backend/backtest_results.jsonl  — same data, flat, easy to grep/diff in PRs
  backend/backtest_summary.md     — headline metrics + triage buckets

Deterministic: sorted key iteration, no randomness. run_id is derived from
the current git commit + a UTC timestamp so runs are identifiable and
diffable (`WHERE run_id != :prev_run_id` in the sqlite db).
"""

from __future__ import annotations

import argparse
import gzip
import json
import os
import sqlite3
import subprocess
import sys
import time
import traceback
from datetime import datetime, timezone
from multiprocessing import Pool, cpu_count

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from plan_engine import build_plan, _UC_SHARD_MAP, _DATA_DIR
from invariants import run_all_invariants, load_course_index
from test_plan_engine import CASES as GOLDEN_CASES

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backtest_results.db")
JSONL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backtest_results.jsonl")
SUMMARY_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backtest_summary.md")

# Module-level so worker processes (spawned/forked) each load their own copy
# lazily on first use instead of pickling a possibly-huge dict through the Pool.
_COURSE_INDEX_CACHE: dict | None = None


def _get_course_index() -> dict:
    global _COURSE_INDEX_CACHE
    if _COURSE_INDEX_CACHE is None:
        _COURSE_INDEX_CACHE = load_course_index()
    return _COURSE_INDEX_CACHE


# ── Enumeration ─────────────────────────────────────────────────────────────────

def enumerate_triples(uc_filter: str | None = None) -> list:
    """Return sorted list of (shard_file_campus, shard_key, college, uc, major).

    shard_key is the literal dict key ("College__Campus__Major") passed to
    build_plan(..., _known_key=shard_key) — the exact-match fast path, so
    enumeration never depends on (and never exercises) the fuzzy matcher.
    """
    triples = []
    for uc_canonical, shard_name in sorted(_UC_SHARD_MAP.items()):
        if uc_filter and uc_filter.lower() not in shard_name.lower():
            continue
        base = os.path.join(_DATA_DIR, f"articulations_{shard_name}.json")
        path = base + ".gz" if os.path.exists(base + ".gz") else base
        if not os.path.exists(path):
            continue
        opener = gzip.open if path.endswith(".gz") else open
        with opener(path, "rt", encoding="utf-8") as f:
            shard = json.load(f)
        for key in sorted(shard.keys()):
            if key.startswith("_"):
                continue
            parts = key.split("__")
            if len(parts) < 3:
                continue
            college = parts[0].replace("_", " ")
            major = "__".join(parts[2:]).replace("_", " ")
            triples.append((shard_name, key, college, uc_canonical, major))
    return triples


def smoke_sample(all_triples: list, stride: int = 300) -> list:
    """Deterministic sample: every Nth triple by sorted index. Not random —
    reproducible across runs so CI diffs are meaningful."""
    return all_triples[::stride]


# ── Worker ────────────────────────────────────────────────────────────────────

def _run_one(triple) -> dict:
    shard_name, shard_key, college, uc, major = triple
    t0 = time.time()
    row = {
        "shard_key": shard_key, "college": college, "uc": uc, "major": major,
        "status": "ERROR", "failed_invariants": [], "notes": "",
        "duration_ms": 0,
    }
    try:
        if shard_key.startswith("GOLDEN__"):
            # Golden cases intentionally exercise the fuzzy matcher (that's
            # what a real user request does) rather than the exact-key path.
            result = build_plan(college, uc, major, accept_honors=False,
                                 completed=set(), ap_credits="")
        else:
            result = build_plan(college, uc, major, accept_honors=False,
                                 completed=set(), ap_credits="", _known_key=shard_key)
    except Exception as e:
        row["status"] = "CRASH"
        row["notes"] = f"{type(e).__name__}: {e}"
        row["failed_invariants"] = [traceback.format_exc(limit=6)]
        row["duration_ms"] = int((time.time() - t0) * 1000)
        return row

    if not result.all_courses():
        # No courses scheduled: either a genuine no-articulation case
        # (not_articulated covers everything, expected) or a silent match
        # failure. Distinguish so triage buckets correctly.
        if result.not_articulated and not result.warnings:
            row["status"] = "NO_ARTICULATION"
        else:
            row["status"] = "EMPTY_PLAN"
        row["notes"] = f"not_articulated={len(result.not_articulated)} warnings={result.warnings[:2]}"
        row["duration_ms"] = int((time.time() - t0) * 1000)
        return row

    errors = run_all_invariants(result, college, course_index=_get_course_index())
    row["duration_ms"] = int((time.time() - t0) * 1000)
    if errors:
        row["status"] = "INVARIANT_FAIL"
        row["failed_invariants"] = errors
    else:
        row["status"] = "PASS"
    return row


# ── Triage ────────────────────────────────────────────────────────────────────

_AMBIGUOUS_MARKERS = (
    "dept consent", "department consent", "see counselor", "see a counselor",
    "conditional", "cond", "unit-based", "sectionadvisement",
    # A course legitimately satisfying two Cal-GETC areas (e.g. a History
    # course counting for both 3B Humanities and 4 Social Science) is a real
    # ASSIST modeling question, not a planner logic bug — surfaced heavily in
    # the first matrix run, reclassified here rather than left as noise in
    # likely_logic_bug.
    "claimed for multiple cal-getc areas",
)


def triage_bucket(row: dict) -> str:
    if row["status"] == "PASS":
        return "pass"
    if row["status"] == "NO_ARTICULATION":
        return "expected_no_agreement"
    text = (row["notes"] + " " + " ".join(row["failed_invariants"])).lower()
    if any(m in text for m in _AMBIGUOUS_MARKERS):
        return "ambiguous_assist"
    return "likely_logic_bug"


# ── Storage ───────────────────────────────────────────────────────────────────

def _git_commit() -> str:
    try:
        out = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                              cwd=os.path.dirname(os.path.abspath(__file__)),
                              capture_output=True, text=True, timeout=5)
        return out.stdout.strip() or "unknown"
    except Exception:
        return "unknown"


def init_db(conn: sqlite3.Connection) -> None:
    conn.execute("""
        CREATE TABLE IF NOT EXISTS backtest_runs (
            run_id TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            shard_key TEXT NOT NULL,
            college TEXT NOT NULL,
            uc TEXT NOT NULL,
            major TEXT NOT NULL,
            status TEXT NOT NULL,
            bucket TEXT NOT NULL,
            failed_invariants TEXT NOT NULL,
            notes TEXT NOT NULL,
            duration_ms INTEGER NOT NULL,
            PRIMARY KEY (run_id, shard_key)
        )
    """)
    conn.execute("CREATE INDEX IF NOT EXISTS idx_run ON backtest_runs(run_id)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_status ON backtest_runs(run_id, status)")
    conn.commit()


def write_results(run_id: str, rows: list) -> None:
    conn = sqlite3.connect(DB_PATH)
    init_db(conn)
    ts = datetime.now(timezone.utc).isoformat()
    conn.executemany(
        """INSERT OR REPLACE INTO backtest_runs
           (run_id, timestamp, shard_key, college, uc, major, status, bucket,
            failed_invariants, notes, duration_ms)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
        [
            (run_id, ts, r["shard_key"], r["college"], r["uc"], r["major"],
             r["status"], triage_bucket(r), json.dumps(r["failed_invariants"]),
             r["notes"], r["duration_ms"])
            for r in rows
        ],
    )
    conn.commit()
    conn.close()

    with open(JSONL_PATH, "w", encoding="utf-8") as f:
        for r in rows:
            rec = dict(r)
            rec["run_id"] = run_id
            rec["bucket"] = triage_bucket(r)
            f.write(json.dumps(rec) + "\n")


def write_summary(run_id: str, rows: list, elapsed_s: float) -> None:
    total = len(rows)
    by_status: dict = {}
    by_bucket: dict = {}
    invariant_violation_count = 0
    for r in rows:
        by_status[r["status"]] = by_status.get(r["status"], 0) + 1
        b = triage_bucket(r)
        by_bucket[b] = by_bucket.get(b, 0) + 1
        invariant_violation_count += len(r["failed_invariants"])

    valid_plans = by_status.get("PASS", 0)
    pct_valid = (valid_plans / total * 100) if total else 0.0

    lines = [
        f"# Backtest summary — run `{run_id}`",
        "",
        f"- Triples processed: **{total}**",
        f"- Elapsed: {elapsed_s:.1f}s",
        f"- **% producing a valid plan: {pct_valid:.2f}%** ({valid_plans}/{total})",
        f"- **Total invariant-violation count: {invariant_violation_count}**",
        "",
        "## By status",
        "",
        "| Status | Count |",
        "|---|---|",
    ]
    for status, count in sorted(by_status.items(), key=lambda x: -x[1]):
        lines.append(f"| {status} | {count} |")

    lines += [
        "",
        "## Triage buckets",
        "",
        "| Bucket | Count | Meaning |",
        "|---|---|---|",
        f"| pass | {by_bucket.get('pass', 0)} | Valid plan, all invariants held |",
        f"| expected_no_agreement | {by_bucket.get('expected_no_agreement', 0)} | No CC articulation at all — not a bug |",
        f"| ambiguous_assist | {by_bucket.get('ambiguous_assist', 0)} | Dept consent / conditional / section-based — needs a modeling decision |",
        f"| likely_logic_bug | {by_bucket.get('likely_logic_bug', 0)} | Crash or invariant violation with no ambiguity marker — investigate |",
        "",
        "## Worst offenders (likely_logic_bug, first 25)",
        "",
    ]
    bugs = [r for r in rows if triage_bucket(r) == "likely_logic_bug"][:25]
    for r in bugs:
        first_err = (r["failed_invariants"][0] if r["failed_invariants"] else r["notes"])[:150]
        lines.append(f"- `{r['shard_key']}` — {r['status']}: {first_err}")

    with open(SUMMARY_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--smoke", action="store_true",
                     help="Fast subset: the 32 golden regression cases + a deterministic sample of the matrix")
    ap.add_argument("--uc", default=None, help="Restrict to one UC campus (substring match on shard filename)")
    ap.add_argument("--workers", type=int, default=None, help="Worker process count (default: cpu_count()-1)")
    ap.add_argument("--limit", type=int, default=None, help="Cap number of triples processed (debug)")
    ap.add_argument("--stride", type=int, default=300, help="Smoke-mode sampling stride (default 300)")
    args = ap.parse_args()

    all_triples = enumerate_triples(uc_filter=args.uc)

    golden_triples = []
    if args.smoke:
        for case in GOLDEN_CASES:
            _id, _desc, college, uc, major = case[0], case[1], case[2], case[3], case[4]
            golden_triples.append((None, f"GOLDEN__{college}__{uc}__{major}", college, uc, major))
        triples = golden_triples + smoke_sample(all_triples, stride=args.stride)
    else:
        triples = all_triples

    if args.limit:
        triples = triples[:args.limit]

    print(f"Enumerated {len(all_triples)} total triples with an agreement.")
    print(f"Running {len(triples)} triples ({'SMOKE' if args.smoke else 'FULL'} mode)"
          f"{' [UC=' + args.uc + ']' if args.uc else ''}...")

    workers = args.workers or max(1, cpu_count() - 1)
    t0 = time.time()
    rows = []
    with Pool(processes=workers) as pool:
        for i, row in enumerate(pool.imap_unordered(_run_one, triples, chunksize=8), 1):
            rows.append(row)
            if i % 500 == 0 or i == len(triples):
                print(f"  {i}/{len(triples)} done...")
    elapsed = time.time() - t0

    run_id = f"{_git_commit()}_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')}"
    write_results(run_id, rows)
    write_summary(run_id, rows, elapsed)

    print(f"\nDone in {elapsed:.1f}s. run_id={run_id}")
    print(f"Results: {DB_PATH}, {JSONL_PATH}")
    print(f"Summary: {SUMMARY_PATH}")
    with open(SUMMARY_PATH, encoding="utf-8") as f:
        print("\n" + f.read())


if __name__ == "__main__":
    main()
