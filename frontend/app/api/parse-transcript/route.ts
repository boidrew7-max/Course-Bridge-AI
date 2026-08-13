import { NextResponse } from "next/server";
import { getDocumentProxy, extractText } from "unpdf";
import { extractCourseCodes } from "../../../lib/transcriptParser.js";

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
        warning: "Couldn't find any course codes in that PDF. It may be a scanned image rather than text. Try entering your courses manually instead.",
      });
    }

    return NextResponse.json({ courses });
  } catch (err) {
    console.error("Transcript parse error:", err);
    return NextResponse.json({ error: "Failed to read that PDF. Try a different file or enter your courses manually." }, { status: 500 });
  }
}
