// Extracts course codes from raw transcript text (PDF text-layer output).
//
// PDF extraction rarely preserves the neat "MATH 110A" spacing you see on
// screen — columns come through as runs of spaces, tabs, or newlines, and some
// schools print codes in title case ("Math 110A") or hyphenated ("MATH-110A").
// The separator and case handling below covers those shapes.
const COURSE_CODE_RE = /\b([A-Z][A-Za-z]{1,5})[\s.\-–]{0,3}(C?\d{1,4}[A-Za-z]{0,2})\b/g;

// Tokens that fit the code shape but aren't subject prefixes: transcript
// headers, column labels, term names, and grade notations.
const PREFIX_STOPWORDS = new Set([
  "GPA", "GE", "AP", "IB", "ID", "SSN", "DOB", "CA", "US", "USA",
  "FALL", "WINTER", "SPRING", "SUMMER", "TERM", "UNIT", "UNITS",
  "CUM", "TOT", "TOTAL", "ATT", "EARN", "GRADE", "GRD", "PG",
  "QUARTER", "SEMESTER", "SESSION", "PAGE", "CREDIT", "CREDITS",
  "HOUR", "HOURS", "QUALITY", "POINT", "POINTS", "CUMULATIVE",
  "LEVEL", "CAREER", "DEGREE", "AWARDED", "TRANSFER", "STUDENT",
  "NAME", "DATE", "DEAN", "LIST", "HONORS", "PLAN", "PROGRAM",
  "MAJOR", "MINOR", "SCHOOL", "COLLEGE", "UNIV", "UNIVERSITY",
  "RECORD", "PRINTED", "ISSUED", "PHONE", "FAX", "BOX", "STE",
  "APT", "RM", "ROOM", "SEC", "SECTION", "CRN", "REG", "WD", "INC",
  "PASS", "FAIL", "NP", "CR", "NC", "IN", "OF", "AND", "THE", "TO",
  "FOR", "NO", "ON", "AT", "BY",
  // Roman numerals ("Calculus II", "Chemistry III") — not course prefixes.
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
]);

// "Fall 2024", "Class of 2019" — a bare four-digit year is never a course number.
const YEAR_LIKE_RE = /^(19|20)\d{2}$/;

export function extractCourseCodes(text) {
  const found = new Set();
  const normalizedText = String(text || "");

  let match;
  COURSE_CODE_RE.lastIndex = 0;
  while ((match = COURSE_CODE_RE.exec(normalizedText)) !== null) {
    const prefix = match[1].toUpperCase();
    const number = match[2].toUpperCase();
    if (PREFIX_STOPWORDS.has(prefix)) continue;
    if (YEAR_LIKE_RE.test(number)) continue;
    found.add(`${prefix} ${number}`);
  }

  return Array.from(found);
}
