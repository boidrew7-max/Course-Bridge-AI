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

// UC campuses spell subjects out in full — these are the transfer targets, so
// a short prefix cap silently dropped every destination-school course.
check('long UC prefixes', 'COMPSCI 61A Structure of Programs 4.0', ['COMPSCI 61A']);
check('MCELLBI', 'MCELLBI 32 Intro Human Physiology 3.0', ['MCELLBI 32']);
check('BIOLOGY', 'BIOLOGY 1B General Biology 5.0', ['BIOLOGY 1B']);
check('ampersand prefix', 'L&S 1 Discovery Course 2.0', ['L&S 1']);

// Suffix casing varies by school.
check('lowercase suffix', 'MATH 110a Calculus 4.0', ['MATH 110A']);
check('honors suffix', 'ENGL 1AH Honors Composition 3.0', ['ENGL 1AH']);

// The units column butts against the last word of the course title, and
// in-progress markers sit right beside it.
check('units column not a course', 'ECON 1 Principles of Microeconomics 3.00 A', ['ECON 1']);
check('in-progress marker', 'PHYS 4A General Physics IP 4.0', ['PHYS 4A']);

check('empty input', '', []);
check('null input', null, []);

console.log('Transcript parser tests passed');
