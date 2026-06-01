// Course inference system for CourseBridge
// Normalizes user input and maps to articulation data

/**
 * Normalize course input string
 * @param {string} input - Raw user input
 * @returns {string} Normalized string
 */
export function normalizeCourseInput(input) {
  if (!input) return '';

  // Convert to lowercase
  let normalized = input.toLowerCase().trim();

  // Remove punctuation except spaces and hyphens (keep hyphens for course codes like CS-SS)
  normalized = normalized.replace(/[^\w\s\-]/g, '');

  // Collapse multiple spaces
  normalized = normalized.replace(/\s+/g, ' ');

  // Handle common abbreviations
  const abbreviations = {
    calc: 'calculus',
    intro: 'introduction',
    comp: 'composition',
    r&c: 'reading and composition',
    'reading comp': 'reading and composition',
    econ: 'economics',
    stats: 'statistics',
    diff: 'differential',
    eq: 'equation',
    data: 'data science',
    oop: 'object oriented programming',
    prog: 'programming',
    'cs ss': 'computer science social sciences'
  };

  // Replace abbreviations
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    normalized = normalized.replace(regex, full);
  });

  // Handle roman numerals and number words
  const romanNumerals = {
    i: '1',
    ii: '2',
    iii: '3',
    iv: '4',
    v: '5',
    vi: '6',
    vii: '7',
    viii: '8',
    ix: '9',
    x: '10'
  };

  Object.entries(romanNumerals).forEach(([roman, arabic]) => {
    const regex = new RegExp(`\\b${roman}\\b`, 'g');
    normalized = normalized.replace(regex, arabic);
  });

  const numberWords = {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10'
  };

  Object.entries(numberWords).forEach(([word, num]) => {
    const regex = new RegExp(`\\b${word}\\b`, 'g');
    normalized = normalized.replace(regex, num);
  });

  // Final trim and collapse spaces again
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Generate aliases for a course code or requirement
 * @param {string} courseCode - Course code like "MATH 110A"
 * @param {string} courseTitle - Optional course title
 * @param {string} requirementName - Optional requirement area name
 * @returns {string[]} Array of normalized aliases
 */
export function generateCourseAliases(courseCode, courseTitle = '', requirementName = '') {
  const aliases = new Set();

  if (courseCode) {
    // Add the course code itself
    aliases.add(normalizeCourseInput(courseCode));

    // Add spaced/unspaced variants
    const noSpace = courseCode.replace(/\s+/g, '');
    aliases.add(normalizeCourseInput(noSpace));

    // Add common variations (e.g., MATH 110A -> MATH110A, MATH 110 A)
    const parts = courseCode.split(/\s+/);
    if (parts.length === 2) {
      const [subject, number] = parts;
      aliases.add(normalizeCourseInput(`${subject}${number}`)); // Already added above
      aliases.add(normalizeCourseInput(`${subject} ${number}`)); // Original
    }
  }

  if (courseTitle) {
    aliases.add(normalizeCourseInput(courseTitle));
    // Add title without common words
    const titleWords = courseTitle.toLowerCase().split(/\s+/);
    const filtered = titleWords.filter(word => !['introduction', 'to', 'of', 'and', 'the'].includes(word));
    if (filtered.length > 0) {
      aliases.add(normalizeCourseInput(filtered.join(' ')));
    }
  }

  if (requirementName) {
    aliases.add(normalizeCourseInput(requirementName));
  }

  return Array.from(aliases);
}

/**
 * Build a lookup map from aliases to course information
 * @param {Object} articulationData - The articulation data from loadArticulationData()
 * @returns {Map<string, Array<{type: 'requirement'|'course', major: string, targetUniversity: string, courseCode: string, satisfiedBy: string[]}>>} Map of alias to matches
 */
export function buildAliasMap(articulationData) {
  const aliasMap = new Map();

  // Iterate through source colleges (should be CCSF)
  for (const [sourceCollege, targets] of Object.entries(articulationData)) {
    // Iterate through target universities (should be UC Berkeley)
    for (const [targetUniversity, majors] of Object.entries(targets)) {
      // Iterate through majors
      for (const [major, majorData] of Object.entries(majors)) {
        const { requiredCourses } = majorData;

        // Process each requirement (UC Berkeley course)
        for (const requirement of requiredCourses) {
          const { code: ucbCourse, satisfiedBy } = requirement;

          // Generate aliases for the UC Berkeley course
          const ucbAliases = generateCourseAliases(ucbCourse);
          ucbAliases.forEach(alias => {
            if (!aliasMap.has(alias)) {
              aliasMap.set(alias, []);
            }
            aliasMap.get(alias).push({
              type: 'requirement',
              major,
              targetUniversity,
              courseCode: ucbCourse,
              satisfiedBy
            });
          });

          // Generate aliases for each satisfying CCSF course
          satisfiedBy.forEach(ccsfCourse => {
            if (ccsfCourse && cscfCourse !== 'No Course Articulated') {
              const ccsfAliases = generateCourseAliases(ccsfCourse);
              ccsfAliases.forEach(alias => {
                if (!aliasMap.has(alias)) {
                  aliasMap.set(alias, []);
                }
                aliasMap.get(alias).push({
                  type: 'course',
                  major,
                  targetUniversity,
                  courseCode: ccsfCourse,
                  satisfiedBy: [ccsfCourse] // For consistency
                });
              });
            }
          });
        }
      }
    }
  }

  return aliasMap;
}

/**
 * Find best course matches for user input
 * @param {string} rawInput - Raw user input string
 * @param {Map} aliasMap - Alias map built from buildAliasMap()
 * @returns {Object} Match results with confidence levels
 */
export function findBestCourseMatch(rawInput, aliasMap) {
  const normalized = normalizeCourseInput(rawInput);
  if (!normalized) {
    return {
      input: rawInput,
      normalized,
      matches: [],
      confidence: 'none',
      message: 'No input provided'
    };
  }

  const matches = aliasMap.get(normalized) || [];

  // Determine confidence level
  let confidence = 'none';
  let message = '';

  if (matches.length === 0) {
    confidence = 'none';
    message = 'No match found';
  } else if (matches.length === 1) {
    // Check if it's an exact match to the course code (not just an alias)
    const match = matches[0];
    const exactCourseCode = normalizeCourseInput(match.courseCode);
    if (normalized === exactCourseCode) {
      confidence = 'exact';
      message = `Exact match: ${match.courseCode}`;
    } else {
      confidence = 'strong';
      message = `Strong match: ${match.courseCode}`;
    }
  } else {
    confidence = 'possible';
    message = `Possible matches: ${matches.map(m => m.courseCode).join(', ')}. Please verify with ASSIST.org.`;
  }

  return {
    input: rawInput,
    normalized,
    matches,
    confidence,
    message
  };
}

/**
 * Check if a requirement is satisfied by inferred courses
 * @param {Object} requirement - Requirement object from articulation data
 * @param {Array} inferredCourses - Array of normalized course strings the user has completed
 * @param {Map} aliasMap - Alias map for looking up course mappings
 * @returns {boolean} True if requirement is satisfied
 */
export function requirementIsCompleted(requirement, inferredCourses, aliasMap) {
  const { satisfiedBy } = requirement;

  // For each satisfying CCSF course, check if user has taken it or an alias
  for (const ccsfCourse of satisfiedBy) {
    if (!ccsfCourse || ccsfCourse === 'No Course Articulated') continue;

    // Generate aliases for this CCSF course
    const ccsfAliases = generateCourseAliases(ccsfCourse);

    // Check if any of the user's inferred courses match any alias
    for (const userCourse of inferredCourses) {
      const normalizedUser = normalizeCourseInput(userCourse);
      if (ccsfAliases.includes(normalizedUser)) {
        return true;
      }

      // Also check direct course code match
      if (normalizedUser === normalizeCourseInput(ccsfCourse)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Infer completed courses from user input strings
 * @param {Array<string>} rawInputs - Array of raw user input strings
 * @param {Map} aliasMap - Alias map built from articulation data
 * @returns {Object} Inferred courses with details
 */
export function inferCompletedCourses(rawInputs, aliasMap) {
  const inferred = [];
  const details = [];

  for (const rawInput of rawInputs) {
    const result = findBestCourseMatch(rawInput, aliasMap);
    if (result.confidence !== 'none' && result.matches.length > 0) {
      // Take the first match (or we could handle multiple matches differently)
      const match = result.matches[0];
      inferred.push(match.courseCode);
      details.push({
        input: rawInput,
        matchedCourse: match.courseCode,
        type: match.type,
        major: match.major,
        targetUniversity: match.targetUniversity,
        confidence: result.confidence
      });
    }
  }

  return {
    inferredCourses: inferred,
    details
  };
}
