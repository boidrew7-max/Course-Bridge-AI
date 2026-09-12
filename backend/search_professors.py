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

# ── Prefix variants -> canonical subject ─────────────────────────────────────
# Colleges spell the same subject dozens of ways (BIO / BIOL / BIOSC /
# BIOLOGY, PSY / PSYC / PSYCH, MAT / MATH / MTH, ...). SUBJECT_TO_DEPARTMENT
# only knew 37 exact prefixes, so 31% of scheduled courses (measured across
# a 9,800-course sample) got no professor lookup at all — the rating panel
# just showed nothing. Every variant here resolves to a canonical key.
_PREFIX_ALIASES = {
    # math / stats
    "MAT": "MATH", "MTH": "MATH", "MATHS": "MATH", "MATHEMATICS": "MATH",
    "STATS": "STAT", "STATISTICS": "STAT",
    # sciences
    "BIO": "BIOL", "BIOSC": "BIOL", "BIOLOGY": "BIOL", "BISC": "BIOL", "BIOS": "BIOL",
    "ANAT": "BIOL", "ANATOMY": "BIOL", "PHYSIO": "BIOL", "PHYSIOL": "BIOL", "MICRO": "BIOL",
    "MICR": "BIOL", "BOT": "BIOL", "ZOO": "BIOL", "ZOOL": "BIOL",
    "PHY": "PHYS", "PHYSICS": "PHYS", "PHYSC": "PHYS", "PHYSCS": "PHYS",
    "CHM": "CHEM", "CHEMISTRY": "CHEM",
    "ASTRO": "ASTR", "ASTRON": "ASTR", "ASTRONOMY": "ASTR",
    "GEO": "GEOL", "GEOLOGY": "GEOL", "EARTH": "GEOL", "ERTH": "GEOL", "ESCI": "GEOL",
    "OCEAN": "OCAN", "OCEA": "OCAN", "OCN": "OCAN",
    "GEOGRAPHY": "GEOG", "GEOGR": "GEOG",
    "ENV": "ENVS", "ENVSC": "ENVS", "ENVST": "ENVS", "ENVIRON": "ENVS",
    # social sciences
    "PSY": "PSYC", "PSYCH": "PSYC", "PSYCHOLOGY": "PSYC",
    "SOCI": "SOC", "SOCIO": "SOC", "SOCIOLOGY": "SOC", "SOCIOL": "SOC",
    "ANT": "ANTH", "ANTHR": "ANTH", "ANTHRO": "ANTH", "ANTHROPOLOGY": "ANTH",
    "ECO": "ECON", "ECONOMICS": "ECON", "ECN": "ECON",
    "POL": "POLS", "POLI": "POLS", "POLIT": "POLS", "POSC": "POLS", "PS": "POLS",
    "GOVT": "POLS", "GOV": "POLS", "POLSC": "POLS", "POLISCI": "POLS", "PSCI": "POLS",
    "HIS": "HIST", "HISTORY": "HIST", "HST": "HIST",
    "PHI": "PHIL", "PHILO": "PHIL", "PHILOSOPHY": "PHIL",
    # english / writing / communication
    "ENG": "ENGL", "ENGLISH": "ENGL", "ENGLI": "ENGL", "WRIT": "ENGL", "WRT": "ENGL",
    "LIT": "ENGL", "LITR": "ENGL", "READ": "ENGL", "RDG": "ENGL",
    "SPCH": "COMM", "SPEECH": "COMM", "COMS": "COMM", "CMST": "COMM", "COMMST": "COMM",
    "COMMUN": "COMM", "COMMUNICATION": "COMM", "COMST": "COMM",
    "JOURN": "JOUR", "JRNL": "JOUR", "JOURNALISM": "JOUR",
    # computing / engineering
    "COMSC": "CS", "CSCI": "CS", "CMPSC": "CS", "COMP": "CS", "CSIS": "CS", "COMPSCI": "CS",
    "CSC": "CS", "CST": "CS", "CIT": "CIS", "CISC": "CIS", "COMPUTER": "CS", "C S": "CS",
    "ENGIN": "ENGR", "EGR": "ENGR", "ENGRG": "ENGR", "ENGINEERING": "ENGR", "ENGT": "ENGR",
    # arts
    "ARTS": "ART", "AHIS": "ARTH", "ARTHIST": "ARTH", "ARH": "ARTH",
    "MUSIC": "MUS", "MUSC": "MUS", "MUSI": "MUS",
    "THTR": "THEA", "THEATRE": "THEA", "THEATER": "THEA", "DRAM": "THEA",
    "DRAMA": "THEA", "TA": "THEA",
    "DANCE": "DANC", "DAN": "DANC",
    "FILM": "CINE", "FTV": "CINE", "FTVE": "CINE", "CINEMA": "CINE", "RTV": "CINE", "FMS": "CINE",
    "PHOTO": "PHOT", "PHOTOG": "PHOT",
    # languages
    "SPAN": "LANG", "SPA": "LANG", "SPN": "LANG", "SPANISH": "LANG",
    "FREN": "LANG", "FRNC": "LANG", "FRE": "LANG", "FR": "LANG", "FRENCH": "LANG",
    "GERM": "LANG", "GER": "LANG", "GERMAN": "LANG",
    "JAPN": "LANG", "JPN": "LANG", "JAPA": "LANG", "JAPANESE": "LANG",
    "CHIN": "LANG", "CHN": "LANG", "MAND": "LANG", "CHINESE": "LANG",
    "ITAL": "LANG", "ITL": "LANG", "ITALIAN": "LANG",
    "KOR": "LANG", "KORE": "LANG", "KOREAN": "LANG",
    "ARAB": "LANG", "ARBC": "LANG", "PORT": "LANG", "RUSS": "LANG", "RUS": "LANG",
    "VIET": "LANG", "VIETN": "LANG", "TAGA": "LANG", "FIL": "LANG", "HEBR": "LANG",
    "LATN": "LANG", "LAT": "LANG", "GRK": "LANG", "GREEK": "LANG", "HIND": "LANG",
    "PERS": "LANG", "FARS": "LANG", "ASL": "LANG", "SIGN": "LANG", "SLAN": "LANG",
    "FL": "LANG", "FLAN": "LANG", "WLAN": "LANG", "MLNG": "LANG",
    # ethnic / cultural studies
    "ETHS": "ETHN", "ETH": "ETHN", "ETHNS": "ETHN", "ETST": "ETHN", "ES": "ETHN",
    "ETHNIC": "ETHN", "ETH ST": "ETHN",
    "CHICANO": "ETHN", "CHIC": "ETHN", "CHLX": "ETHN", "CHS": "ETHN", "CHST": "ETHN",
    "CHCN": "ETHN", "CH ST": "ETHN", "MEXAM": "ETHN", "LTNX": "ETHN", "LATX": "ETHN",
    "AFRAM": "ETHN", "AFAM": "ETHN", "AFRO": "ETHN", "BLST": "ETHN", "BL ST": "ETHN",
    "AFRIC": "ETHN", "ASAM": "ETHN", "AS AM": "ETHN", "ASIA": "ETHN", "AAPI": "ETHN",
    "NAIS": "ETHN", "NATAM": "ETHN", "AMIN": "ETHN", "AIS": "ETHN", "ICS": "ETHN",
    "WMST": "ETHN", "WGS": "ETHN", "WGSS": "ETHN", "WS": "ETHN", "WOMEN": "ETHN",
    "GNDR": "ETHN", "GWS": "ETHN", "LGBT": "ETHN",
    "HUM": "HUMA", "HUMAN": "HUMA", "HUMANITIES": "HUMA", "IDS": "IDST",
    "REL": "RELS", "RLST": "RELS", "RELIG": "RELS", "RS": "RELS",
    # business / applied
    "BUSN": "BUS", "BUSI": "BUS", "BUSAD": "BUS", "BUSINESS": "BUS", "MGMT": "BUS",
    "MKTG": "BUS", "MGT": "BUS", "BADM": "BUS", "BA": "BUS",
    "ACTG": "ACCT", "ACC": "ACCT", "ACCTG": "ACCT", "ACCOUNTING": "ACCT",
    "ADMJ": "AJ", "ADJU": "AJ", "CJ": "AJ", "CRIM": "AJ", "CRJ": "AJ",
    "CJUS": "AJ", "JUST": "AJ", "LAW": "AJ", "AOJ": "AJ", "CJA": "AJ",
    "KINS": "KIN", "KINE": "KIN", "KINES": "KIN", "KINESIOLOGY": "KIN", "PHED": "PE",
    "PEA": "PE", "HED": "HLTH", "HE": "HLTH", "HEA": "HLTH", "HEALTH": "HLTH", "HSCI": "HLTH",
    "NTR": "NUTR", "NUTRI": "NUTR", "NUTRITION": "NUTR", "FN": "NUTR",
    "CD": "CDEV", "CHDV": "CDEV", "ECE": "CDEV", "CHLD": "CDEV", "ECED": "CDEV",
    "ED": "EDUC", "EDU": "EDUC",
    "NURSE": "NURS", "NUR": "NURS", "NRS": "NURS",
    "AG": "AGRI", "AGBUS": "AGRI", "AGR": "AGRI", "PLSC": "AGRI", "AGPS": "AGRI",
    "PLNT SC": "AGRI", "PLNTSC": "AGRI", "ANSC": "AGRI", "HORT": "AGRI",
    "ARCHT": "ARCH",
    # stragglers seen in the coverage sweep
    "CHDEV": "CDEV", "CDE": "CDEV", "HD": "CDEV", "HDEV": "CDEV", "FCS": "CDEV",
    "PHSC": "PHYS", "PHYC": "PHYS", "PSC": "PHYS", "PHSCI": "PHYS",
    "POSCI": "POLS", "POLSCI": "POLS",
    "EAR": "GEOL", "EARTH SC": "GEOL", "ERSC": "GEOL", "GEOS": "GEOL",
    "BEHS": "PSYC", "BHS": "PSYC", "SBS": "SOC", "SOSC": "SOC", "SSCI": "SOC",
    "GWOS": "ETHN", "GWS": "ETHN", "AS": "ETHN", "ASST": "ETHN", "AMST": "ETHN",
    "AMER": "HIST", "AMERST": "HIST",
}

# Subjects the original table lacked entirely, in RMP's own department vocabulary.
SUBJECT_TO_DEPARTMENT.update({
    "LANG": ["languages", "foreign language", "world language", "spanish", "french", "german",
             "japanese", "chinese", "italian", "sign language", "modern language", "english as a second"],
    "ARTH": ["art history", "art"],
    "THEA": ["theater", "theatre", "drama", "performing arts"],
    "DANC": ["dance", "physical education", "performing arts"],
    "PHOT": ["photography", "art"],
    "ENVS": ["environmental", "earth science", "geology", "biology"],
    "HUMA": ["humanities", "philosophy", "english"],
    "RELS": ["religio", "philosophy", "humanities"],
    "AJ":   ["administration of justice", "criminal justice", "law", "justice"],
    "NUTR": ["nutrition", "health science", "family", "consumer"],
    "CDEV": ["child development", "early childhood", "education"],
    "EDUC": ["education", "child development"],
    "AGRI": ["agriculture", "horticulture", "plant science", "animal science"],
})

# Course-title keywords -> canonical subject: the fallback when a prefix is
# unknown even after aliasing (ordered: more specific phrases first).
_TITLE_KEYWORDS = [
    ("sign language", "LANG"), ("spanish", "LANG"), ("french", "LANG"), ("german", "LANG"),
    ("japanese", "LANG"), ("chinese", "LANG"), ("mandarin", "LANG"), ("italian", "LANG"),
    ("korean", "LANG"), ("arabic", "LANG"), ("russian", "LANG"), ("latin", "LANG"),
    ("art history", "ARTH"), ("history of art", "ARTH"), ("photograph", "PHOT"),
    ("statistic", "STAT"), ("calculus", "MATH"), ("algebra", "MATH"), ("trigonometr", "MATH"),
    ("mathematic", "MATH"), ("precalc", "MATH"), ("geometry", "MATH"),
    ("biolog", "BIOL"), ("anatomy", "BIOL"), ("physiolog", "BIOL"), ("microbiolog", "BIOL"),
    ("genetic", "BIOL"), ("ecolog", "BIOL"), ("botany", "BIOL"), ("zoolog", "BIOL"),
    ("astronom", "ASTR"), ("physics", "PHYS"), ("chemistr", "CHEM"), ("geolog", "GEOL"),
    ("oceanograph", "OCAN"), ("environment", "ENVS"), ("geograph", "GEOG"),
    ("psycholog", "PSYC"), ("sociolog", "SOC"), ("anthropolog", "ANTH"),
    ("economic", "ECON"), ("political", "POLS"), ("government", "POLS"), ("histor", "HIST"),
    ("philosoph", "PHIL"), ("ethic", "PHIL"), ("logic", "PHIL"), ("religio", "RELS"),
    ("ethnic", "ETHN"), ("chicano", "ETHN"), ("chicana", "ETHN"), ("latino", "ETHN"),
    ("african american", "ETHN"), ("black studies", "ETHN"), ("asian american", "ETHN"),
    ("native american", "ETHN"), ("indigenous", "ETHN"), ("women", "ETHN"), ("gender", "ETHN"),
    ("composition", "ENGL"), ("reading and writing", "ENGL"), ("literature", "ENGL"),
    ("critical thinking", "ENGL"), ("writing", "ENGL"), ("english", "ENGL"),
    ("public speaking", "COMM"), ("communication", "COMM"), ("speech", "COMM"),
    ("journalism", "JOUR"), ("film", "CINE"), ("cinema", "CINE"),
    ("programming", "CS"), ("computer", "CS"), ("software", "CS"), ("data structure", "CS"),
    ("engineering", "ENGR"), ("circuit", "ENGR"), ("statics", "ENGR"),
    ("accounting", "ACCT"), ("business", "BUS"), ("marketing", "BUS"), ("management", "BUS"),
    ("criminal", "AJ"), ("justice", "AJ"), ("law", "AJ"),
    ("nutrition", "NUTR"), ("health", "HLTH"), ("kinesiolog", "KIN"), ("physical education", "PE"),
    ("nursing", "NURS"), ("child development", "CDEV"), ("early childhood", "CDEV"),
    ("education", "EDUC"), ("music", "MUS"), ("theat", "THEA"), ("drama", "THEA"),
    ("acting", "THEA"), ("dance", "DANC"), ("humanities", "HUMA"), ("architect", "ARCH"),
    ("agricultur", "AGRI"), ("horticultur", "AGRI"), ("art", "ART"), ("drawing", "ART"),
    ("painting", "ART"), ("design", "ART"),
]


def _course_prefix(subject_or_code):
    """Leading alphabetic tokens of a course code ('C S 2B' -> 'C S',
    'ETH ST 1' -> 'ETH ST', 'MATH 1A' -> 'MATH', 'MATH' -> 'MATH')."""
    s = (subject_or_code or "").strip().upper()
    toks = []
    for tok in s.split():
        if re.search(r"\d", tok):
            break
        toks.append(re.sub(r"[^A-Z&]", "", tok))
    return " ".join(t for t in toks if t)


def resolve_subject(subject_or_code, title=""):
    """(canonical subject key, department candidates) or (None, None).
    Tries the exact prefix, then aliases (with and without internal spaces),
    then the course title's keywords."""
    pfx = _course_prefix(subject_or_code)
    for key in (pfx, pfx.replace(" ", ""), _PREFIX_ALIASES.get(pfx), _PREFIX_ALIASES.get(pfx.replace(" ", ""))):
        if key and key in SUBJECT_TO_DEPARTMENT:
            return key, SUBJECT_TO_DEPARTMENT[key]
    t = (title or "").lower()
    if t:
        for kw, key in _TITLE_KEYWORDS:
            if kw in t and key in SUBJECT_TO_DEPARTMENT:
                return key, SUBJECT_TO_DEPARTMENT[key]
    return None, None


_SCHOOL_STOPWORDS = {"college", "community", "district", "of", "the"}


def _normalize_school(name):
    words = [w for w in re.split(r"[^a-z]+", (name or "").lower()) if w and w not in _SCHOOL_STOPWORDS]
    return " ".join(words)


_BY_SCHOOL_CACHE = None


def _professors_by_school():
    """{normalized school name: [professor, ...]}, built once. Both lookups
    below used to re-normalize all ~138k professors' school names on EVERY
    call — a full scan per click of a course card."""
    global _BY_SCHOOL_CACHE
    if _BY_SCHOOL_CACHE is None:
        idx = {}
        for p in _get_professors():
            idx.setdefault(_normalize_school(p.get("school", "")), []).append(p)
        _BY_SCHOOL_CACHE = idx
    return _BY_SCHOOL_CACHE


def _dept_matches(department, candidates):
    # Candidate-in-department only (e.g. "economics" in "english & economics").
    # The reverse direction is too loose: short generic department names like
    # "Science" or "Math" are themselves substrings of nearly every candidate
    # ("computer science", "earth science"), which pulled in unrelated
    # professors for narrower subjects like CS.
    d = (department or "").lower()
    return any(c in d for c in candidates)


def explain_no_professor(college, subject, title=""):
    """Why recommend_professor() found nothing — so the UI can say something
    true instead of showing an empty panel:
      "no_school"      — this college isn't in our RateMyProfessors data at all
      "no_subject"     — we couldn't tell what subject this course is
      "no_department"  — the college is covered, but no professor in this
                         subject's department has been rated
    """
    key, _cands = resolve_subject(subject, title)
    n_college = _normalize_school(college)
    pool = _professors_by_school().get(n_college, [])
    if not pool:
        return "no_school"
    if not key:
        return "no_subject"
    return "no_department"


def recommend_professor(college, subject, min_ratings=3, title=""):
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
    # `subject` may be a bare prefix ("MATH") or a full code ("C S 2B");
    # `title` is the fallback when the prefix is one we've never seen.
    _key, candidates = resolve_subject(subject, title)
    if not candidates:
        return None

    professors = _get_professors()
    n_college = _normalize_school(college)
    if not n_college:
        return None

    pool = _professors_by_school().get(n_college, [])
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
