import { NextResponse } from "next/server";
import { getDocumentProxy, extractText } from "unpdf";
import { extractCourseCodes } from "../../../lib/transcriptParser.js";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

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

    // A transcript is a handful of text pages; anything larger is either a
    // mistake or someone trying to exhaust the server parsing a huge PDF.
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "That PDF is too large. Please upload a file under 10 MB." }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    // The checks above only look at the filename/MIME type the browser
    // reported, both of which the client fully controls and can lie about —
    // renaming any file to "transcript.pdf" would sail through. Check the
    // actual file signature instead: every real PDF starts with "%PDF-"
    // somewhere in its first kilobyte (some tools prefix a little junk).
    // This is the same defense-in-depth reason we never trust a browser-sent
    // Content-Type for anything that gets processed server-side.
    const header = new TextDecoder("latin1").decode(bytes.slice(0, 1024));
    if (!header.includes("%PDF-")) {
      return NextResponse.json({ error: "That doesn't look like a valid PDF file." }, { status: 400 });
    }

    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });

    const courses = extractCourseCodes(text);
    if (courses.length === 0) {
      return NextResponse.json({
        courses: [],
        warning: "Couldn't find any course codes in that PDF. It may be a scanned image rather than text. Try entering your courses manually instead.",
      });
    }

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("Transcript parse error:", err);
    return NextResponse.json({ error: "Failed to read that PDF. Try a different file or enter your courses manually." }, { status: 500 });
  }
}
