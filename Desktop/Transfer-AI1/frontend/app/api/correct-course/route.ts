import { NextResponse } from 'next/server';
import { correctCourseText, formatCourseCode } from '../../../lib/spellcheck.js';
import { getAllCourses } from '../../../lib/courseLoader.js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputs: string[] = Array.isArray(body.courses) ? body.courses : 
                             typeof body.course === 'string' ? [body.course] : [];

    if (!inputs.length) {
      return NextResponse.json({ error: 'No courses provided' }, { status: 400 });
    }

    // Load available courses
    const candidates = getAllCourses();

    if (!candidates.length) {
      return NextResponse.json({ 
        error: 'No course data available', 
        results: inputs.map(i => ({ input: i, corrected: null, method: 'none', confidence: 'none' }))
      }, { status: 200 });
    }

    // Correct each input
    const results = inputs.map((input) => {
      const result = correctCourseText(input, candidates);
      return {
        input: input.trim(),
        corrected: result.corrected,
        method: result.method,
        confidence: result.confidence
      };
    });

    return NextResponse.json({ results, totalCourses: candidates.length });
  } catch (err) {
    console.error('Course correction error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
