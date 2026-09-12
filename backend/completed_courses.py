"""
Interpret the free-text "completed courses" a student types — completed_courses.py

The onboarding field invites plain language ("Calc 1, English 1A, Intro to
CS, Econ 1") and, being a textarea, naturally yields one course per line.
The plan engine, however, only ever matched exact "PREFIX NUMBER" tokens
split on COMMAS — so newline-separated lists lost everything after the first
entry, and plain-language entries never matched at all. Those courses then
stayed in the recommended schedule as if the student had never taken them.

This resolves each entry against the student's OWN college's course catalog
(its ASSIST articulation courses + its Cal-GETC list) with strictly graded
confidence, and reports what it could NOT match so the student is told
instead of left guessing. Precision over recall: a wrong match would drop a
genuinely required course from the plan, which is worse than a miss.

Entry points
------------
  res = interpret_completed(raw_text, catalog)
  res.recognized    -> list[Recognized(prefix, number, title, source, method)]
  res.unrecognized  -> list[str]   (the student's original text, verbatim)

`catalog` is a list of {"prefix", "number", "title"} dicts for one college —
see plan_engine.college_catalog().
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher

from course_sequence import infer_sequence_order


@dataclass
class Recognized:
    prefix: str
    number: str
    title: str
    source: str     # the student's original text for this entry
    method: str     # "code" | "subject" | "sequence" | "title"

    @property
    def code(self) -> str:
        return f"{self.prefix} {self.number}"


@dataclass
class InterpretResult:
    recognized: list = field(default_factory=list)
    unrecognized: list = field(default_factory=list)

    def keys(self) -> set:
        return {(r.prefix, r.number) for r in self.recognized}


# ── Splitting ──────────────────────────────────────────────────────────────────

_SPLIT_RE = re.compile(r"[,;\n\r|•·]+")
_LEADING_BULLET_RE = re.compile(r"^\s*(?:[-*•·]|\d+[.)])\s+")


def split_entries(raw: str) -> list:
    """Split on commas, semicolons, newlines, pipes and bullets. Deliberately
    NOT on ' and ' — course titles contain it constantly ('Composition and
    Reading'); comma/newline lists are what the field's placeholder shows."""
    out = []
    for chunk in _SPLIT_RE.split(str(raw or "")):
        chunk = _LEADING_BULLET_RE.sub("", chunk).strip().strip(".:-–— ")
        chunk = " ".join(chunk.split())
        if chunk:
            out.append(chunk)
    return out


# ── Normalization helpers ─────────────────────────────────────────────────────

def _np(prefix: str) -> str:
    """Prefix key: letters only, uppercase ('ETH ST' -> 'ETHST', 'C S' -> 'CS')."""
    return re.sub(r"[^A-Z]", "", str(prefix or "").upper())


def _nn(number: str) -> str:
    """Number key: alphanumerics only, uppercase, leading zeros dropped from
    the numeric core ('002B' -> '2B', 'c1000' -> 'C1000', '10 L' -> '10L')."""
    n = re.sub(r"[^A-Z0-9]", "", str(number or "").upper())
    m = re.match(r"^([A-Z]*)0*(\d+)([A-Z]*)$", n)
    return f"{m.group(1)}{m.group(2)}{m.group(3)}" if m else n


_WORD_FIXES = {
    "intro": "introduction", "introductory": "introduction",
    "&": "and", "w/": "with", "comp": "composition", "prin": "principles",
    "prog": "programming", "calc": "calculus", "elem": "elementary",
    "gen": "general", "org": "organic", "amer": "american", "hist": "history",
    "psych": "psychology", "econ": "economics", "stats": "statistics",
    "stat": "statistics", "bio": "biology", "chem": "chemistry",
    "phys": "physics", "soc": "sociology", "phil": "philosophy",
    "anthro": "anthropology", "govt": "government", "cs": "computer science",
    "i": "1", "ii": "2", "iii": "3", "iv": "4", "one": "1", "two": "2",
    "three": "3", "four": "4",
}


def _nt(text: str) -> str:
    """Title key: lowercase words, common abbreviations expanded, roman and
    spelled numerals folded to digits, punctuation dropped."""
    words = re.findall(r"[a-z0-9&/]+", str(text or "").lower())
    words = [_WORD_FIXES.get(w, w) for w in words]
    return " ".join(w for w in words if w not in ("the", "a", "an", "of", "to", "in", "for"))


# ── Subject-name -> candidate prefixes ────────────────────────────────────────
# Plain-language subjects map to SEVERAL possible prefixes because colleges
# differ ("English 1A" is EWRT 1A at De Anza, ENGL 1A almost everywhere else;
# CS is CIS / CS / COMSC / CSCI / CMPSC depending on the college). A candidate
# only counts if that (prefix, number) actually exists in THIS college's
# catalog, so the table can be generous without becoming wrong.
_SUBJECT_PREFIXES = {
    "math": ["MATH", "MTH"], "mathematics": ["MATH", "MTH"],
    "calc": ["MATH", "MTH"], "calculus": ["MATH", "MTH"],
    "precalc": ["MATH"], "precalculus": ["MATH"], "trig": ["MATH"], "algebra": ["MATH"],
    "stat": ["STAT", "MATH", "STATS"], "stats": ["STAT", "MATH", "STATS"],
    "statistics": ["STAT", "MATH", "STATS"],
    "english": ["ENGL", "EWRT", "ENG", "ENGLISH", "ENGLI"], "engl": ["ENGL", "EWRT", "ENG"],
    "eng": ["ENGL", "EWRT", "ENG", "ENGR"], "writing": ["EWRT", "ENGL", "WRIT"],
    "comp": ["ENGL", "EWRT"], "composition": ["ENGL", "EWRT"],
    "physics": ["PHYS", "PHYSC", "PHY"], "phys": ["PHYS", "PHYSC", "PHY"],
    "chem": ["CHEM", "CHM"], "chemistry": ["CHEM", "CHM"],
    "bio": ["BIOL", "BIO", "BIOSC"], "biology": ["BIOL", "BIO", "BIOSC"],
    "psych": ["PSYC", "PSY", "PSYCH"], "psychology": ["PSYC", "PSY", "PSYCH"],
    "econ": ["ECON", "ECO", "ECN"], "economics": ["ECON", "ECO", "ECN"],
    "history": ["HIST", "HIS"], "hist": ["HIST", "HIS"],
    "soc": ["SOC", "SOCI", "SOCIO"], "sociology": ["SOC", "SOCI", "SOCIO"],
    "phil": ["PHIL", "PHILO"], "philosophy": ["PHIL", "PHILO"],
    "comm": ["COMM", "SPCH", "SPEECH", "COMS", "CMST"], "communication": ["COMM", "SPCH", "COMS", "CMST"],
    "communications": ["COMM", "SPCH", "COMS", "CMST"], "speech": ["SPCH", "SPEECH", "COMM", "COMS"],
    "cs": ["CIS", "CS", "COMSC", "CSCI", "CMPSC", "COMP", "CSIS", "COMPSCI", "CSC"],
    "compsci": ["CIS", "CS", "COMSC", "CSCI", "CMPSC", "COMP", "CSIS", "CSC"],
    "cis": ["CIS", "CS", "CSIS"], "programming": ["CIS", "CS", "COMSC", "CSCI", "CMPSC", "COMP", "CSC"],
    "computer": ["CIS", "CS", "COMSC", "CSCI", "CMPSC", "COMP", "CSIS", "CSC"],
    "spanish": ["SPAN", "SPA", "SPN"], "french": ["FREN", "FRNC", "FRE", "FR"],
    "german": ["GERM", "GER"], "japanese": ["JAPN", "JPN", "JAPA"], "chinese": ["CHIN", "CHN", "MAND"],
    "art": ["ART", "ARTS", "ARTH"], "music": ["MUS", "MUSI", "MUSC"], "theater": ["THEA", "THTR", "TA", "DRAM"],
    "poli": ["POLS", "POL", "POLI", "PS", "POSC", "GOVT"], "polisci": ["POLS", "POL", "POLI", "PS", "POSC", "GOVT"],
    "political": ["POLS", "POL", "POLI", "PS", "POSC", "GOVT"], "government": ["POLS", "GOVT", "POL", "POSC"],
    "anthro": ["ANTH", "ANTHR", "ANT"], "anthropology": ["ANTH", "ANTHR", "ANT"],
    "geology": ["GEOL", "GEO"], "geography": ["GEOG", "GEO"], "geog": ["GEOG"],
    "astronomy": ["ASTR", "ASTRO", "AST"], "astro": ["ASTR", "ASTRO", "AST"],
    "business": ["BUS", "BUSN", "BUSI", "BUSAD"], "bus": ["BUS", "BUSN", "BUSI"],
    "accounting": ["ACCT", "ACTG", "ACC", "ACCTG"], "acct": ["ACCT", "ACTG", "ACC"],
    "engineering": ["ENGR", "ENGIN", "EGR", "ENGRG"], "engr": ["ENGR", "ENGIN", "EGR"],
    "ethnic": ["ETHS", "ETHN", "ETH", "ES"], "nutrition": ["NUTR", "NTR", "NUTRI"],
    "kin": ["KIN", "KINS", "KINE", "PE"], "kinesiology": ["KIN", "KINS", "KINE"],
    "humanities": ["HUM", "HUMA", "HUMAN"], "religion": ["RELS", "REL", "RLST"],
    "environmental": ["ENVS", "ENV", "ENVSC", "ES"], "health": ["HLTH", "HEA", "HED", "HE"],
    "linguistics": ["LING", "LIN"], "journalism": ["JOUR", "JRNL", "JOURN"],
    "film": ["FILM", "FTV", "FTVE", "CINE", "RTV"], "dance": ["DANC", "DANCE", "DAN"],
    "chicano": ["CHIC", "CHLX", "CHS", "CHST"], "asian": ["ASAM", "ASIA"],
}

# Title keywords used when a plain subject + small ordinal ("calc 1",
# "physics 2") must be resolved to the Nth course of that subject's sequence.
_SEQUENCE_KEYWORDS = {
    "calc": "calculus", "calculus": "calculus", "math": "calculus",
    "physics": "physics", "phys": "physics",
    "chem": "chemistry", "chemistry": "chemistry",
    "bio": "biology", "biology": "biology",
    "spanish": "spanish", "french": "french", "german": "german",
    "japanese": "japanese", "chinese": "chinese",
}


# ── The interpreter ───────────────────────────────────────────────────────────

_CODE_RE = re.compile(
    r"^\s*([A-Za-z][A-Za-z&.\s]{0,14}?)\s*[-:]?\s*([A-Za-z]?\d{1,4}\s?[A-Za-z]{0,2})(?:\b|(?=[\s(:\-–—]))(.*)$"
)


class _Catalog:
    def __init__(self, catalog: list):
        self.by_key: dict = {}          # (np, nn) -> course dict
        self.by_prefix: dict = {}       # np -> list of course dicts
        self.titles: list = []          # (normalized title, course dict)
        for c in catalog or []:
            p, n = c.get("prefix", ""), c.get("number", "")
            if not p or not n:
                continue
            k = (_np(p), _nn(n))
            if k in self.by_key:
                continue
            self.by_key[k] = c
            self.by_prefix.setdefault(k[0], []).append(c)
            nt = _nt(c.get("title", ""))
            if nt:
                self.titles.append((nt, c))

    def lookup(self, prefix: str, number: str):
        return self.by_key.get((_np(prefix), _nn(number)))


# California's Common Course Numbering (C-ID, 2024+) renamed the standard
# intro courses statewide: "English 1A" became ENGL C1000, "Stats" became
# STAT C1000, etc. Students still call them by the old names. Each fallback
# is only used if that C-numbered course actually exists in the catalog.
_CID_BY_SUBJECT_NUMBER = {
    ("english", "1A"): [("ENGL", "C1000")], ("engl", "1A"): [("ENGL", "C1000")],
    ("english", "1B"): [("ENGL", "C1001")], ("engl", "1B"): [("ENGL", "C1001")],
    ("english", "1C"): [("ENGL", "C1001")], ("engl", "1C"): [("ENGL", "C1001")],
    ("english", "1"): [("ENGL", "C1000")], ("english", "2"): [("ENGL", "C1001")],
    ("comp", "1A"): [("ENGL", "C1000")], ("writing", "1A"): [("ENGL", "C1000")],
    ("stats", "1"): [("STAT", "C1000")], ("stat", "1"): [("STAT", "C1000")],
    ("statistics", "1"): [("STAT", "C1000")],
    ("comm", "1"): [("COMM", "C1000")], ("speech", "1"): [("COMM", "C1000")],
    ("communication", "1"): [("COMM", "C1000")],
    ("psych", "1"): [("PSYC", "C1000")], ("psychology", "1"): [("PSYC", "C1000")],
    ("poli", "1"): [("POLS", "C1000")], ("polisci", "1"): [("POLS", "C1000")],
    ("political", "1"): [("POLS", "C1000")], ("government", "1"): [("POLS", "C1000")],
    ("soc", "1"): [("SOCI", "C1000"), ("SOC", "C1000")], ("sociology", "1"): [("SOCI", "C1000"), ("SOC", "C1000")],
    ("anthro", "1"): [("ANTH", "C1000")], ("anthropology", "1"): [("ANTH", "C1000")],
}
# Plain names with no number at all ("Statistics", "Public Speaking",
# "Intro Psych") mean the canonical intro course — the C-ID one.
_CID_BY_PLAIN_NAME = {
    "statistics": [("STAT", "C1000")], "intro statistics": [("STAT", "C1000")],
    "introduction statistics": [("STAT", "C1000")], "elementary statistics": [("STAT", "C1000")],
    "english": [("ENGL", "C1000")], "english composition": [("ENGL", "C1000")],
    "college composition": [("ENGL", "C1000")], "college writing": [("ENGL", "C1000")],
    "freshman composition": [("ENGL", "C1000")], "composition": [("ENGL", "C1000")],
    "critical thinking": [("ENGL", "C1001")], "critical thinking composition": [("ENGL", "C1001")],
    "public speaking": [("COMM", "C1000")], "speech": [("COMM", "C1000")],
    "introduction psychology": [("PSYC", "C1000")], "psychology": [("PSYC", "C1000")],
    "general psychology": [("PSYC", "C1000")],
    "american government": [("POLS", "C1000")], "us government": [("POLS", "C1000")],
    "political science": [("POLS", "C1000")], "introduction political science": [("POLS", "C1000")],
    "introduction sociology": [("SOCI", "C1000"), ("SOC", "C1000")], "sociology": [("SOCI", "C1000"), ("SOC", "C1000")],
    "cultural anthropology": [("ANTH", "C1000")], "introduction anthropology": [("ANTH", "C1000")],
    "microeconomics": [("ECON", "C1000"), ("ECON", "1"), ("ECON", "2")],
    "macroeconomics": [("ECON", "C1001"), ("ECON", "2"), ("ECON", "1")],
    "principles microeconomics": [("ECON", "C1000"), ("ECON", "1"), ("ECON", "2")],
    "principles macroeconomics": [("ECON", "C1001"), ("ECON", "2"), ("ECON", "1")],
}


def _cid_lookup(cat: _Catalog, pairs: list):
    for pfx, num in pairs:
        c = cat.lookup(pfx, num)
        if c:
            return c
    return None


def _match_code(entry: str, cat: _Catalog):
    """'MATH 1A', 'math1a', 'Math-1A', 'MATH 1A - Calculus I', 'English 1A',
    'Econ 1', 'Calc 1'."""
    m = _CODE_RE.match(entry)
    if not m:
        return None
    subj, number, _rest = m.group(1).strip(), m.group(2).strip(), m.group(3)
    number = number.replace(" ", "")
    # (a) an exact prefix at this college. The number pattern allows a leading
    #     letter (STAT C1000), so an unspaced entry like "PHYS4A" can split as
    #     PHY + S4A — retry with that letter moved back onto the prefix.
    c = cat.lookup(subj, number)
    if not c and number[:1].isalpha() and len(number) > 1:
        c = cat.lookup(subj + number[0], number[1:])
        if c:
            subj, number = subj + number[0], number[1:]
    if c:
        return Recognized(c["prefix"], c["number"], c.get("title", ""), entry, "code")
    # (b) a plain-language subject word ("English", "Econ", "Physics")
    subj_words = [w for w in re.findall(r"[a-z]+", subj.lower())]
    cands: list = []
    for w in subj_words:
        cands.extend(_SUBJECT_PREFIXES.get(w, []))
    for pfx in cands:
        c = cat.lookup(pfx, number)
        if c:
            return Recognized(c["prefix"], c["number"], c.get("title", ""), entry, "subject")
    # (b2) legacy name for a course that now carries a statewide C-ID number
    #      ("English 1A" -> ENGL C1000)
    for w in subj_words:
        c = _cid_lookup(cat, _CID_BY_SUBJECT_NUMBER.get((w, number.upper()), []))
        if c:
            return Recognized(c["prefix"], c["number"], c.get("title", ""), entry, "subject")
    # (c) subject + small ordinal naming the Nth course of a sequence
    #     ("calc 1" -> MATH 1A, "physics 2" -> PHYS 4B) — only when no
    #     literal (prefix, N) course exists, and only for a sequence whose
    #     titles carry the subject keyword, so "Econ 1" (a real course
    #     number) is never re-read as an ordinal.
    if re.fullmatch(r"\d", number) and subj_words:
        kw = next((_SEQUENCE_KEYWORDS[w] for w in subj_words if w in _SEQUENCE_KEYWORDS), None)
        if kw:
            n = int(number)
            for pfx in cands:
                seq = [c for c in cat.by_prefix.get(_np(pfx), [])
                       if kw in _nt(c.get("title", "")) and infer_sequence_order(c["number"])[1] >= 0]
                seq.sort(key=lambda c: infer_sequence_order(c["number"]))
                # keep only the FIRST lettered run (1A,1B,1C — not a later 2A)
                if seq:
                    base = infer_sequence_order(seq[0]["number"])[0]
                    run = [c for c in seq if infer_sequence_order(c["number"])[0] == base]
                    if len(run) >= n:
                        c = run[n - 1]
                        return Recognized(c["prefix"], c["number"], c.get("title", ""), entry, "sequence")
    return None


def _match_title(entry: str, cat: _Catalog):
    """No usable number ('Intro to CS', 'Microeconomics', 'Statistics').
    Accept only a single, clearly-best match — an ambiguous or weak match is
    reported back to the student rather than guessed."""
    q = _nt(entry)
    if len(q) < 4:
        return None
    # A plain name for a canonical intro course -> its C-ID course, if this
    # college has it ("Statistics" -> STAT C1000, "Public Speaking" -> COMM C1000).
    c = _cid_lookup(cat, _CID_BY_PLAIN_NAME.get(q, []))
    if c:
        return Recognized(c["prefix"], c["number"], c.get("title", ""), entry, "title")

    scored = []
    for nt, c in cat.titles:
        if nt == q:
            score = 1.0
        elif len(q) >= 8 and (q in nt or nt in q):
            # containment: the more of the title the query covers, the better
            score = 0.88 + 0.06 * (len(q) / max(len(nt), len(q)))
        else:
            score = SequenceMatcher(None, q, nt).ratio()
        # Tie-breakers among equally-good titles: the statewide C-numbered
        # course is the canonical one; an honors section is never what a
        # plain name means; a shorter title is the more direct match.
        if re.match(r"^C\d", str(c.get("number", "")).upper()):
            score += 0.015
        if "honors" in nt:
            score -= 0.03
        score -= 0.0005 * len(nt)
        scored.append((score, c))
    if not scored:
        return None
    scored.sort(key=lambda x: -x[0])
    best, c = scored[0]
    second = scored[1][0] if len(scored) > 1 else 0.0
    if best >= 0.86 and (best - second >= 0.02):
        return Recognized(c["prefix"], c["number"], c.get("title", ""), entry, "title")
    return None


def interpret_completed(raw, catalog: list) -> InterpretResult:
    """Resolve free text (or an already-split list) to catalog courses."""
    res = InterpretResult()
    if isinstance(raw, (list, tuple, set)):
        entries = []
        for item in raw:
            if isinstance(item, (list, tuple)) and len(item) == 2:
                entries.append(f"{item[0]} {item[1]}")
            else:
                entries.extend(split_entries(str(item)))
    else:
        entries = split_entries(raw)

    cat = _Catalog(catalog)
    seen: set = set()
    for entry in entries:
        rec = _match_code(entry, cat) or _match_title(entry, cat)
        if rec is None:
            # Not a course at this college (a typo, a course from elsewhere,
            # or wording we can't pin down). Every course a plan can schedule
            # is in the catalog, so nothing is lost by not passing it on —
            # the student is told so they can add the exact code.
            res.unrecognized.append(entry)
            continue
        k = (_np(rec.prefix), _nn(rec.number))
        if k in seen:
            continue
        seen.add(k)
        res.recognized.append(rec)
    return res
