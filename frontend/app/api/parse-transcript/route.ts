import { NextResponse } from "next/server";
import { getDocumentProxy, extractText } from "unpdf";

// Matches course codes like "MATH 1A", "ENGL C1000", "CIS 22CH", "STAT 1".
// Requires a real subject prefix (2+ letters) followed by a number, so it
// doesn't false-positive on random capitalized words in transcript text.
const COURSE_CODE_RE = /\b([A-Z]{2,6})\s?(C?\d{1,4}[A-Z]{0,2})\b/g;

// Words that occasionally match the pattern above but aren't course prefixes
// (transcript headers, GPA/unit column labels, etc).
const PREFIX_STOPWORDS = new Set([
  "GPA", "GE", "AP", "IB", "ID", "SSN", "DOB", "CA", "US", "USA",
  "FALL", "WINTER", "SPRING", "SUMMER", "TERM", "UNIT", "UNITS",
  "CUM", "TOT", "TOTAL", "ATT", "EARN", "GRADE", "GRD", "PG",
  // Roman numerals ("Calculus II", "Chemistry III") — not course prefixes.
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
]);

function extractCourseCodes(text: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  COURSE_CODE_RE.lastIndex = 0;
  while ((match = COURSE_CODE_RE.exec(text)) !== null) {
    const prefix = match[1].toUpperCase();
    const number = match[2].toUpperCase();
    if (PREFIX_STOPWORDS.has(prefix)) continue;
    found.add(`${prefix} ${number}`);
  }
  return Array.from(found);
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a PDF file." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });

    const courses = extractCourseCodes(text);
    if (courses.length === 0) {
      return NextResponse.json({
        courses: [],
        warning: "Couldn't find any course codes in that PDF. It may be a scanned image rather than text — try entering your courses manually instead.",
      });
    }

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("Transcript parse error:", err);
    return NextResponse.json({ error: "Failed to read that PDF. Try a different file or enter your courses manually." }, { status: 500 });
  }
}
