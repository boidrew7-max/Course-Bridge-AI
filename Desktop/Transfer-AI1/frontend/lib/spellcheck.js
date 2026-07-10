// Shared spellcheck utilities (ES module)
export function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function levenshtein(a, b) {
  a = a || '';
  b = b || '';
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(0));
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + 1
        );
    }
  }
  return matrix[b.length][a.length];
}

// Decide if candidate is acceptable as a suggestion to avoid hallucinations.
export function shouldSuggest(input, candidate) {
  const nIn = normalize(input);
  const nCand = normalize(candidate);
  if (!nIn || !nCand) return false;
  if (nIn === nCand) return false; // exact match -> no suggestion

  const dist = levenshtein(nIn, nCand);
  const maxLen = Math.max(nIn.length, nCand.length);
  const ratio = dist / (maxLen || 1);

  // Reject if too different
  if (ratio > 0.35) return false;
  // Reject if absolute distance too large for short strings
  if (maxLen <= 3 && dist > 1) return false;

  return true;
}

export function bestMatch(input, candidates) {
  const nInput = normalize(input);
  if (!nInput) return null;

  // Prefer exact normalized matches first
  for (const c of candidates) {
    if (normalize(c) === nInput) return { candidate: c, dist: 0 };
  }

  let best = null;
  for (const c of candidates) {
    const d = levenshtein(nInput, normalize(c));
    if (best === null || d < best.dist) best = { candidate: c, dist: d };
  }
  if (!best) return null;
  if (!shouldSuggest(input, best.candidate)) return null;
  return best;
}

export function scoreConfidence(dist, input, candidate) {
  const nIn = normalize(input);
  const nBest = normalize(candidate);
  const maxLen = Math.max(nIn.length, nBest.length) || 1;
  const ratio = dist / maxLen;
  if (dist === 0) return 'high';
  if (ratio <= 0.2) return 'medium';
  return 'low';
}

// Parse course code into subject and number (e.g., "MATH101" -> {subject: "MATH", number: "101"})
export function parseCourseCode(code) {
  const match = String(code || '').match(/^([A-Z]+)\s*(\d+[A-Z]?)$/i);
  if (!match) return null;
  return { subject: match[1].toUpperCase(), number: match[2].toUpperCase() };
}

// Format course code consistently (e.g., "MATH 101")
export function formatCourseCode(code) {
  const parsed = parseCourseCode(code);
  if (!parsed) return code;
  return `${parsed.subject} ${parsed.number}`;
}

// Correct course text with pattern matching
export function correctCourseText(input, candidates) {
  // Try exact match first
  const exactMatch = candidates.find(c => normalize(c) === normalize(input));
  if (exactMatch) return { corrected: exactMatch, method: 'exact', confidence: 'high' };

  // Try fuzzy match
  const fuzzyResult = bestMatch(input, candidates);
  if (fuzzyResult && shouldSuggest(input, fuzzyResult.candidate)) {
    const confidence = scoreConfidence(fuzzyResult.dist, input, fuzzyResult.candidate);
    return { corrected: fuzzyResult.candidate, method: 'fuzzy', confidence };
  }

  // Try course code pattern matching
  const coursePattern = /^([A-Z]+)\s*(\d+[A-Z]?)$/i;
  const inputMatch = input.match(coursePattern);
  if (inputMatch) {
    const normalizedInput = `${inputMatch[1].toUpperCase()} ${inputMatch[2].toUpperCase()}`;
    const candidateMatch = candidates.find(c => {
      const parsed = parseCourseCode(c);
      if (!parsed) return false;
      return formatCourseCode(c) === normalizedInput;
    });
    if (candidateMatch) return { corrected: candidateMatch, method: 'code_pattern', confidence: 'high' };
  }

  return { corrected: null, method: 'none', confidence: 'none' };
}
