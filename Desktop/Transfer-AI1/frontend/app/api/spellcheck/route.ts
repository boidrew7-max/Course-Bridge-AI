import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { bestMatch, scoreConfidence, normalize } from '../../../lib/spellcheck.js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const inputs: string[] = Array.isArray(body.courses) ? body.courses : [];

    const jsonPath = path.join(process.cwd(), 'public', 'data', 'assist_articulations.json');
    const raw = fs.readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(raw);

    const candidates = new Set();
    if (data.assistRequirements) {
      for (const fromCollege of Object.keys(data.assistRequirements)) {
        const targets = data.assistRequirements[fromCollege];
        for (const targetUniv of Object.keys(targets)) {
          const majors = targets[targetUniv];
          for (const major of Object.keys(majors)) {
            const majorData = majors[major];
            if (!majorData) continue;
            const reqs = majorData.requiredCourses || [];
            for (const r of reqs) {
              if (r.code) candidates.add(r.code);
              if (Array.isArray(r.satisfiedBy)) {
                r.satisfiedBy.forEach((s) => { if (s) candidates.add(s); });
              }
            }
          }
        }
      }
    }

    const candidateList = Array.from(candidates);

    const results = inputs.map((input) => {
      const match = bestMatch(input, candidateList);
      if (!match) return { input, suggestion: null, confidence: 'none' };
      const confidence = scoreConfidence(match.dist, input, match.candidate);
      return { input, suggestion: match.candidate, distance: match.dist, confidence };
    });

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
