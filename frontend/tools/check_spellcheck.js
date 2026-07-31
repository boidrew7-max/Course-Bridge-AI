import assert from 'assert';
import { bestMatch, levenshtein, normalize, scoreConfidence } from '../lib/spellcheck.js';

function runTests() {
  // Basic normalize
  assert.equal(normalize('Calc 1'), 'calc1');
  assert.equal(normalize(' MATH-110A '), 'math110a');

  // Levenshtein
  assert.equal(levenshtein('kitten', 'sitting'), 3);
  assert.equal(levenshtein('abc', 'abc'), 0);

  // bestMatch exact
  const candidates = ['MATH 110A', 'ECON 1', 'CALCULUS I'];
  let m = bestMatch('math110a', candidates);
  assert(m && m.candidate === 'MATH 110A');

  // bestMatch basic exact candidate
  m = bestMatch('calculus 1', ['CALCULUS 1', 'CALCULUS 2']);
  assert(m && m.candidate === 'CALCULUS 1');

  // confidence scoring
  assert.equal(scoreConfidence(0, 'abc', 'abc'), 'high');
  assert.equal(scoreConfidence(1, 'calculus', 'calclus'), 'medium');

  console.log('All spellcheck tests passed');
}

runTests();
