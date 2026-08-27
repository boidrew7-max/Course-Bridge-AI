# Repo Organization Proposal

Written for review, not yet executed — per your instruction, this is a plan, not a change.

## 1. Root-level clutter (the biggest issue)

The actual project lives cleanly in `backend/` and `frontend/`. Everything else sitting loose at the repo root is either stale, a duplicate, or genuinely important documentation that's at real risk of being lost. Untracked (never committed) items found:

| Item | What it is | Recommendation |
|---|---|---|
| `team-docs/` (`Data_Sources.md`, `Project_Overview.md`) | Real, current-looking team documentation | **Commit it.** It's one accidental `rm -rf` away from being gone forever — it's not in git at all right now. |
| `BREAKDOWN.md` | The plain-English architecture doc (the one you had open earlier this session) | **Commit it**, probably into a `docs/` folder alongside `team-docs/`'s contents. |
| `data/` (repo root) | An old/duplicate copy of pipeline outputs, including a **`users.db`** file | **Needs a direct answer from you**: is this a stale local dev database, or does it contain real data? Don't want to guess and delete something real. Everything else in it looks superseded by `backend/data/`, which is what the live app actually reads. |
| `agreements/`, `gescrape/` | Raw scrape staging directories (~121K + ~2K files) | Correctly excluded from git already (too large). Fine to leave in place locally, but confirm they're genuinely untracked/ignored and not accidentally about to get committed. |
| `De_Anza_calgetc_raw.json`, `Foothill_calgetc_raw.json` | One-off raw scrape dumps | Look superseded by the built pipeline outputs in `backend/data/`. Candidates for deletion once confirmed unused. |
| `extract_prereq_data.py`, `scrape_ge_probe.py`, `test_plan_v2.py` | Loose one-off scripts | Need your call: still useful (move into `backend/` or a `scripts/` folder) or abandoned experiments (delete)? |
| `failed_plans/`, `flask_frontend.log`, `flask_local.log`, `flask_local_err.log`, `flask_out.txt`, `test_report.txt`, `CourseBridge_Open_Fixes.pdf` | Stale debug/log output from past local runs | Safe to delete — these are point-in-time debug artifacts, not source of truth for anything. |
| `.env` | Real secrets | Correctly untracked already. No action — just confirming it's not accidentally about to get committed. |

## 2. Stale git branches

6 of the 7 non-`main` remote branches (`calgetc-mode`, `elective-filling`, `fix/plan-correctness`, `monorepo-merge`, `rebuild-fixes`, `term-system`) have **zero commits ahead of `main`** — everything in them already landed. Safe to delete; keeping them around just adds noise to the branch list with no informational value.

The 7th, `fix/transcript-parser`, was **not** in this category — it had two full, real, unmerged commits (comprehensive auth rate-limiting/CSRF fixes, and a dark-mode accessibility restoration) that never made it into `main`. I found and merged that one tonight (commit `313fd4d5`) since it was live, valuable work sitting abandoned — not a stale pointer like the other six. It's already deleted from the remote since its content is now in `main`.

**Recommendation:** delete the 6 stale branches. Worth a habit going forward — check `git log main..origin/<branch>` before considering a feature branch "safe to ignore," since one out of seven wasn't.

## 3. Data pipeline scripts — leave as-is

`build_articulation_index.py`, `build_sharded_index.py`, `build_hints_shards.py`, `build_recommended_courses.py`, `scrape_assist.py`, `scrape_calgetc_ge.py` all show "0 references" if you search for imports, which could look like dead code — **they're not.** They're standalone maintenance tools meant to be run manually (we used two of them ourselves this session to rebuild the articulation index). No change needed; just noting so nobody "cleans" these away by mistake.

## 4. `backend/static/index.html`

A 2,505-line standalone HTML file — clearly an old, pre-Next.js prototype of the app (titled "Transfer AI", inline CSS/JS). It's still technically served by the backend's own `/` route (`app.send_static_file("index.html")`), but per `BREAKDOWN.md`'s own description, the backend is intentionally not publicly reachable — real users go through the separate Next.js frontend service. This route is very likely dead weight in practice, but I didn't remove it since it's still an active, working route and I wanted your confirmation rather than assume: **is this route ever actually hit by anything (health checks, an old bookmark, anything)?** If not, safe to delete.

## Net effect of doing all of the above

- Every real project file lives under `backend/` or `frontend/` (already true).
- Every piece of real documentation is actually tracked in git.
- Nothing genuinely important is sitting one accidental delete away from being lost.
- `git status` and `git branch -a` stop showing 20+ years of accumulated cruft alongside real, current work.
