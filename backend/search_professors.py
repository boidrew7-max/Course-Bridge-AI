import gzip, json, os, re

BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def _load_json_or_gz(base_path):
    for path in (base_path + ".gz", base_path):
        if not os.path.exists(path):
            continue
        try:
            opener = gzip.open if path.endswith(".gz") else open
            with opener(path, "rt", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            continue
    return []


_professors_path = os.path.join(BASE_DIR, "data", "professors.json")
_professors_cache = None


def _get_professors():
    global _professors_cache
    if _professors_cache is None:
        _professors_cache = _load_json_or_gz(_professors_path)
        # flatten nested format if needed
        if isinstance(_professors_cache, dict):
            edges = _professors_cache.get("data", {}).get("newSearch", {}).get("teachers", {}).get("edges", [])
            _professors_cache = [e["node"] for e in edges if isinstance(e, dict) and "node" in e]
    return _professors_cache

SUBJECT_KEYWORDS = [
    "english", "biology", "computer", "history", "math", "mathematics",
    "physics", "chemistry", "psychology", "business", "accounting",
    "economics", "sociology", "art", "music", "philosophy", "nursing",
    "engineering", "statistics", "political", "anthropology", "geography",
    "kinesiology", "communications", "journalism", "architecture",
]


def search_professors(query):
    _professors = _get_professors()
    q = query.lower()

    # Detect subject
    subject = None
    for kw in SUBJECT_KEYWORDS:
        if kw in q:
            subject = kw
            break

    # Detect school name (simple word match)
    school_hint = None
    for prof in _professors[:500]:  # sample to find unique school names
        school = prof.get("school", "")
        if not school:
            continue
        school_words = [w for w in school.lower().split()
                        if len(w) >= 4 and w not in {"college", "community", "district"}]
        if any(w in q for w in school_words):
            school_hint = school.lower()
            break

    matches = []
    for prof in _professors:
        searchable = (
            prof.get("firstName", "").lower() + " " +
            prof.get("lastName", "").lower() + " " +
            prof.get("department", "").lower() + " " +
            prof.get("school", "").lower()
        )

        # Filter by school if detected
        if school_hint:
            if school_hint not in prof.get("school", "").lower():
                continue

        # Filter by subject if detected
        if subject:
            if subject not in searchable:
                continue

        # Require at least 3 ratings
        if prof.get("numRatings", 0) < 3:
            continue

        matches.append(prof)

    # Bayesian weighted score: pulls low-count ratings toward the global mean.
    # score = (v * R + m * C) / (v + m)
    #   v = numRatings, R = avgRating, C = global mean (3.86), m = weight threshold (20)
    C = 3.86
    m = 20

    def _score(p):
        v = p.get("numRatings", 0)
        R = p.get("avgRating", 0)
        return (v * R + m * C) / (v + m)

    matches.sort(key=_score, reverse=True)
    return matches[:5]


# ── recommend_professor — one best pick for a specific course, at a specific
# community college, used by the My Plan schedule board's "recommended
# professor" drawer. Not a free-text search: caller supplies the course's
# subject prefix (e.g. "MATH", "ECON") so matching is exact enough to trust
# for a single recommendation instead of a top-5 list. ──────────────────────

SUBJECT_TO_DEPARTMENT = {
    "MATH": ["mathematics"],
    "STAT": ["statistics", "mathematics"],
    "ECON": ["economics"],
    "ACCT": ["accounting"],
    "CS":   ["computer science", "computer information", "computer applications", "computer engineering"],
    "CIS":  ["computer science", "computer information", "computer applications"],
    "ENGN": ["engineering"],
    "ENGR": ["engineering"],
    "ENGL": ["english"],
    "EWRT": ["english"],
    "COMM": ["communication", "speech"],
    "MUS":  ["music"],
    "CINE": ["film", "cinema"],
    "PHIL": ["philosophy"],
    "PSYC": ["psychology"],
    "SOC":  ["sociology", "social science"],
    "ASTR": ["astronomy"],
    "OCAN": ["oceanography", "earth science", "geology"],
    "GEOL": ["geology", "earth science"],
    "ETHN": ["ethnic studies"],
    "IDST": ["ethnic studies", "interdisciplinary"],
    "LALS": ["ethnic studies", "chicano", "latin american"],
    "POLS": ["political science"],
    "HIST": ["history"],
    "HLTH": ["health"],
    "PE":   ["kinesiology", "physical education"],
    "KIN":  ["kinesiology", "physical education"],
    "CHEM": ["chemistry"],
    "PHYS": ["physics"],
    "BIOL": ["biology"],
    "ART":  ["art"],
    "ANTH": ["anthropology"],
    "GEOG": ["geography"],
    "JOUR": ["journalism"],
    "ARCH": ["architecture"],
    "NURS": ["nursing"],
    "BUS":  ["business"],
}

_SCHOOL_STOPWORDS = {"college", "community", "district", "of", "the"}


def _normalize_school(name):
    words = [w for w in re.split(r"[^a-z]+", (name or "").lower()) if w and w not in _SCHOOL_STOPWORDS]
    return " ".join(words)


def _dept_matches(department, candidates):
    # Candidate-in-department only (e.g. "economics" in "english & economics").
    # The reverse direction is too loose: short generic department names like
    # "Science" or "Math" are themselves substrings of nearly every candidate
    # ("computer science", "earth science"), which pulled in unrelated
    # professors for narrower subjects like CS.
    d = (department or "").lower()
    return any(c in d for c in candidates)


def recommend_professor(college, subject, min_ratings=3):
    """Return the single best-reviewed, most-consistently-rated, reasonably
    manageable professor for `subject` (a course prefix like "ECON") at
    `college`.

    Ranks by a Bayesian-weighted rating (same formula as search_professors)
    so a professor with a handful of glowing reviews can't outrank one with
    a long, consistently strong record, then adjusts that score against
    avgDifficulty (RMP's 1-5 scale, ~3 is a typical class): difficulty above
    average costs a little, below average gains a little. The weight is
    intentionally modest — a genuinely excellent, well-reviewed professor
    who happens to run a harder class should still usually win over a
    mediocre easy one, but between two comparably well-reviewed professors
    this is what breaks the tie toward the less brutal one. Falls back to a
    lower rating-count floor only if nothing clears the preferred one,
    rather than returning nothing.
    """
    candidates = SUBJECT_TO_DEPARTMENT.get((subject or "").upper())
    if not candidates:
        return None

    professors = _get_professors()
    n_college = _normalize_school(college)
    if not n_college:
        return None

    pool = [p for p in professors if _normalize_school(p.get("school", "")) == n_college]
    if not pool:
        return None
    pool = [p for p in pool if _dept_matches(p.get("department", ""), candidates)]
    if not pool:
        return None

    C = 3.86  # same global-mean prior used by search_professors
    m = 20
    DIFFICULTY_BASELINE = 3.0
    DIFFICULTY_WEIGHT = 0.3

    def _score(p):
        v = p.get("numRatings", 0)
        R = p.get("avgRating", 0)
        bayesian = (v * R + m * C) / (v + m)
        difficulty = p.get("avgDifficulty")
        if difficulty is None:
            difficulty = DIFFICULTY_BASELINE
        return bayesian - DIFFICULTY_WEIGHT * (difficulty - DIFFICULTY_BASELINE)

    for floor in (min_ratings, 1):
        eligible = [p for p in pool if p.get("numRatings", 0) >= floor]
        if eligible:
            best = max(eligible, key=_score)
            return {
                "name": f"{best.get('firstName', '')} {best.get('lastName', '')}".strip(),
                "department": best.get("department", ""),
                "avgRating": best.get("avgRating"),
                "numRatings": best.get("numRatings"),
                "avgDifficulty": best.get("avgDifficulty"),
                "wouldTakeAgainPercent": best.get("wouldTakeAgainPercentRounded"),
                "school": best.get("school", ""),
            }
    return None
