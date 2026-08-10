import assert from 'assert';
import { extractCourseCodes } from '../lib/transcriptParser.js';

function check(label, text, expected) {
  const actual = extractCourseCodes(text);
  assert.deepStrictEqual(
    actual.slice().sort(),
    expected.slice().sort(),
    `${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`
  );
}

check('single-space rows', `
Student Transcript
Spring 2024
MATH 110A Calculus I 4.0
ECON 1 Principles of Microeconomics 3.0
STAT C1000 Elementary Statistics 4.0
`, ['MATH 110A', 'ECON 1', 'STAT C1000']);

// PDF column extraction: separators arrive as runs of spaces, tabs, or newlines.
check('column separators', 'MATH  110A\tCalc\nENGL\tC1000\nCIS\n22CH', ['MATH 110A', 'ENGL C1000', 'CIS 22CH']);

// Some schools print codes in title case or hyphenated.
check('title case', 'Math 110A Calculus', ['MATH 110A']);
check('hyphenated', 'BIOL-9 General Biology', ['BIOL 9']);

// Header/label noise must not become courses.
check('header noise', 'Fall 2024 CUM GPA 3.65 TOT UNITS 18.0 Page 1 Printed 2024', []);
check('years rejected', 'Class of 2019 Awarded 2024', []);

// Course titles must not conjure codes the transcript never listed.
check('no phantom codes', 'PSYC 1 Introduction to Statistics for Psychology 4.0', ['PSYC 1']);

check('empty input', '', []);
check('null input', null, []);

console.log('Transcript parser tests passed');
