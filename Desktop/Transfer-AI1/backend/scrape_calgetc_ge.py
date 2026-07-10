"""
scrape_calgetc_ge.py — Scrape Cal-GETC GE course lists for all 116 CA community colleges.

Navigates ASSIST's Angular app via Playwright (same session trick that makes the
api/transferability/courses endpoint return 200) and intercepts the JSON response
for each school.

Usage:
    python scrape_calgetc_ge.py              # full sweep; skips already-captured schools
    python scrape_calgetc_ge.py --build-only # skip scraping, just (re)build calgetc_map

Checkpointing:
    gescrape/calgetc_{id}.json exists → school already captured, skip it.
    Delete the file to re-scrape that school.

Output:
    gescrape/calgetc_{id}.json    raw ASSIST response per school (gitignored)
    data/calgetc_map.json.gz      compiled map (same structure conventions as igetc_map)
"""

import argparse
import gzip
import json
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

YEAR_ID = 76          # F2025 — first Cal-GETC year, matches our 2025-26 articulation shards
YEAR_LABEL = "2025-2026"
FALL_YEAR = 2025
REQUEST_DELAY = 2.5   # seconds between school fetches

GESCRAPE_DIR = Path(__file__).parent / "gescrape"
DATA_DIR = Path(__file__).parent / "data"
OUT_MAP = DATA_DIR / "calgetc_map.json.gz"

CALGETC_AREAS = {
    "1A": {"name": "English Composition",                              "required": True,  "courses_needed": 1},
    "1B": {"name": "Critical Thinking and Composition",               "required": True,  "courses_needed": 1},
    "1C": {"name": "Oral Communication",                              "required": True,  "courses_needed": 1},
    "2":  {"name": "Mathematical Concepts and Quantitative Reasoning","required": True,  "courses_needed": 1},
    "3A": {"name": "Arts",                                            "required": True,  "courses_needed": 1},
    "3B": {"name": "Humanities",                                      "required": True,  "courses_needed": 1},
    "4":  {"name": "Social and Behavioral Sciences",                  "required": True,  "courses_needed": 2},
    "5A": {"name": "Physical Science",                                "required": True,  "courses_needed": 1},
    "5B": {"name": "Biological Science",                              "required": True,  "courses_needed": 1},
    "5C": {"name": "Laboratory",                                      "required": False, "courses_needed": 0},
    "6":  {"name": "Ethnic Studies",                                  "required": True,  "courses_needed": 1},
}


def fetch_institutions() -> list[dict]:
    """Return all institutions from ASSIST, loading via Playwright session."""
    from playwright.sync_api import sync_playwright
    result = {}

    def on_resp(r):
        if "api/institutions" in r.url and "?" not in r.url:
            try:
                result["data"] = r.json()
            except Exception:
                pass

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = ctx.new_page()
        page.on("response", on_resp)
        page.goto("https://assist.org", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)
        browser.close()

    return result.get("data", [])


def school_name(inst: dict) -> str:
    """Return the primary display name for an institution."""
    names = inst.get("names", [])
    # Prefer the entry with no fromYear (the original/current name)
    for n in names:
        if not n.get("hideInList") and "fromYear" not in n:
            return n["name"]
    return names[0]["name"] if names else f"Unknown ({inst['id']})"


def scrape_all(institutions: list[dict]) -> None:
    """Navigate to each CC's Cal-GETC page and capture the courses response."""
    from playwright.sync_api import sync_playwright

    cccs = [i for i in institutions if i.get("isCommunityCollege")]
    total = len(cccs)
    already = sum(1 for i in cccs if (GESCRAPE_DIR / f"calgetc_{i['id']}.json").exists())
    todo = [i for i in cccs if not (GESCRAPE_DIR / f"calgetc_{i['id']}.json").exists()]

    print(f"Schools: {total} total, {already} already captured, {len(todo)} to fetch")
    if not todo:
        print("Nothing to fetch.")
        return

    GESCRAPE_DIR.mkdir(exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            viewport={"width": 1280, "height": 800},
        )
        page = ctx.new_page()

        # Prime session (XSRF cookie + Angular bootstrap)
        print("Priming ASSIST session...")
        page.goto("https://assist.org", wait_until="networkidle", timeout=30000)
        page.wait_for_timeout(2000)

        for idx, inst in enumerate(todo, 1):
            inst_id = inst["id"]
            name = school_name(inst)
            out_path = GESCRAPE_DIR / f"calgetc_{inst_id}.json"

            captured = {}

            def on_resp(r, _id=inst_id):
                if (
                    "api/transferability/courses" in r.url
                    and f"institutionId={_id}" in r.url
                    and f"academicYearId={YEAR_ID}" in r.url
                    and "CALGETC" in r.url
                ):
                    try:
                        captured["data"] = r.json()
                    except Exception:
                        pass

            page.on("response", on_resp)
            url = (
                f"https://assist.org/transfer/results"
                f"?year={YEAR_ID}&institution={inst_id}"
                f"&view=transferability&type=CALGETC&viewBy=calgetcArea"
            )
            try:
                page.goto(url, wait_until="networkidle", timeout=35000)
                page.wait_for_timeout(3000)
            except Exception as e:
                print(f"  [{idx}/{len(todo)}] {name} (id={inst_id}) — navigation timeout: {e}")
            finally:
                page.remove_listener("response", on_resp)

            if captured.get("data"):
                out_path.write_text(json.dumps(captured["data"]), encoding="utf-8")
                courses = captured["data"].get("courseInformationList", [])
                by_area = defaultdict(int)
                for c in courses:
                    for a in c.get("transferAreas", []):
                        by_area[a["code"]] += 1
                has1c = by_area.get("1C", 0)
                has6 = by_area.get("6", 0)
                print(f"  [{idx}/{len(todo)}] {name}: {len(courses)} courses  1C={has1c}  6={has6}")
            else:
                print(f"  [{idx}/{len(todo)}] {name} (id={inst_id}) — NO DATA (saving empty marker)")
                out_path.write_text(json.dumps({"institutionName": name, "courseInformationList": []}), encoding="utf-8")

            if idx < len(todo):
                time.sleep(REQUEST_DELAY)

        browser.close()


def build_map(institutions: list[dict]) -> dict:
    """Assemble calgetc_map from gescrape/*.json files."""
    cccs = {i["id"]: i for i in institutions if i.get("isCommunityCollege")}
    by_school = {}
    area_coverage = defaultdict(int)
    total_courses = 0

    for inst_id, inst in sorted(cccs.items(), key=lambda x: school_name(x[1])):
        raw_path = GESCRAPE_DIR / f"calgetc_{inst_id}.json"
        if not raw_path.exists():
            print(f"  WARNING: no gescrape file for {school_name(inst)} (id={inst_id}) — skipping")
            continue

        raw = json.loads(raw_path.read_text(encoding="utf-8"))
        courses = raw.get("courseInformationList", [])
        name = raw.get("institutionName") or school_name(inst)

        by_area: dict[str, list] = defaultdict(list)
        all_courses = []
        seen_area_codes: set[str] = set()

        for c in courses:
            areas = [a for a in c.get("transferAreas", []) if a.get("areaType") == 8]
            if not areas:
                continue

            prefix = c.get("prefixCode", "")
            number = c.get("courseNumber", "")
            title = c.get("courseTitle", "")
            units = c.get("minUnits", 0.0)
            course_id = c.get("courseIdentifierParentId") or c.get("courseParentId", 0)

            course_simple = {
                "prefix": prefix,
                "number": number,
                "title": title,
                "units": units,
            }
            course_full = {
                "courseId": course_id,
                "prefix": prefix,
                "number": number,
                "title": title,
                "units": units,
                "identifier": c.get("identifier", f"{prefix} {number}"),
                "calgetcAreas": [
                    {"code": a["code"], "codeDescription": a.get("codeDescription", "")}
                    for a in areas
                ],
                "isCsuTransferable": c.get("isCsuTransferable", False),
            }
            all_courses.append(course_full)

            for a in areas:
                code = a["code"]
                by_area[code].append(course_simple)
                seen_area_codes.add(code)

        for code in seen_area_codes:
            area_coverage[code] += 1

        total_courses += len(all_courses)
        by_school[name] = {
            "assistId": inst_id,
            "totalCourses": len(all_courses),
            "byArea": dict(by_area),
            "allCourses": all_courses,
        }

    return {
        "source": {
            "scraped": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "academicYear": YEAR_LABEL,
            "yearId": YEAR_ID,
            "listType": "CALGETC",
            "areaType": 8,
        },
        "calgetcAreas": CALGETC_AREAS,
        "totalSchools": len(by_school),
        "totalCourses": total_courses,
        "bySchool": by_school,
        "areaCoverage": dict(area_coverage),
    }


def print_report(data: dict) -> None:
    by_school = data["bySchool"]
    area_coverage = data["areaCoverage"]
    total = data["totalSchools"]

    print(f"\n{'='*60}")
    print(f"Cal-GETC map: {total} schools, {data['totalCourses']} total courses")
    print(f"{'='*60}")
    print("\nArea coverage (schools with >=1 course in that area):")
    for code in ["1A", "1B", "1C", "2", "3A", "3B", "4", "5A", "5B", "5C", "6"]:
        n = area_coverage.get(code, 0)
        bar = "#" * (n // 2)
        print(f"  {code:3s}  {n:3d}/{total}  {bar}")

    empty_1c = [n for n, v in by_school.items() if not v["byArea"].get("1C")]
    empty_6  = [n for n, v in by_school.items() if not v["byArea"].get("6")]

    if empty_1c:
        print(f"\nSchools with NO Area 1C courses ({len(empty_1c)}):")
        for n in sorted(empty_1c):
            print(f"  {n}")

    if empty_6:
        print(f"\nSchools with NO Area 6 courses ({len(empty_6)}):")
        for n in sorted(empty_6):
            print(f"  {n}")

    print(f"\nCourse counts per area:")
    for code in ["1A", "1B", "1C", "2", "3A", "3B", "4", "5A", "5B", "5C", "6"]:
        counts = [len(v["byArea"].get(code, [])) for v in by_school.values()]
        total_in_area = sum(counts)
        avg = total_in_area / len(counts) if counts else 0
        print(f"  {code:3s}  total={total_in_area:5d}  avg={avg:.1f}/school")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--build-only", action="store_true",
                        help="Skip scraping, just rebuild calgetc_map.json.gz from existing gescrape/ files")
    args = parser.parse_args()

    institutions = fetch_institutions()
    print(f"Fetched {len(institutions)} institutions ({sum(1 for i in institutions if i.get('isCommunityCollege'))} CCCs)")

    if not args.build_only:
        scrape_all(institutions)

    print("\nBuilding calgetc_map.json.gz...")
    data = build_map(institutions)

    DATA_DIR.mkdir(exist_ok=True)
    with gzip.open(OUT_MAP, "wt", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))

    raw_size = OUT_MAP.stat().st_size
    print(f"Wrote {OUT_MAP} ({raw_size // 1024} KB compressed)")

    print_report(data)


if __name__ == "__main__":
    main()
