// Utility to load articulation agreements from CSV
// Converts CSV data to format expected by the TransferPlan type in page.tsx

import fs from 'fs';
import path from 'path';
import { parse as csvParse } from 'csv-parse/sync';

/**
 * Load and parse articulation agreements from CSV file
 * @returns {Object} Object mapping sourceCollege -> targetUniversity -> major -> { requiredCourses: Array }
 */
export function loadArticulationData() {
  try {
    const filePath = path.resolve(process.cwd(), 'data/processed/assist_articulations.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Parse CSV with proper handling of quoted fields
    const records = csvParse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    // Build the data structure matching RequirementDatabase type
    const database = {};

    // Group articulations by source college, target university, and major
    const grouped = {};

    for (const record of records) {
      const {
        source_college,
        target_university,
        major,
        required_uc_course_or_area,
        articulated_ccsf_course,
        notes
      } = record;

      // Skip empty records
      if (!required_uc_course_or_area) continue;

      if (!grouped[source_college]) {
        grouped[source_college] = {};
      }
      if (!grouped[source_college][target_university]) {
        grouped[source_college][target_university] = {};
      }
      if (!grouped[source_college][target_university][major]) {
        grouped[source_college][target_university][major] = [];
      }

      // Add this course pairing to the group
      grouped[source_college][target_university][major].push({
        ucCourse: required_uc_course_or_area.trim(),
        ccsfCourse: (articulated_ccsf_course || 'No Course Articulated').trim(),
        notes: notes || ''
      });
    }

    // Convert grouped data to the format expected by requirements object
    for (const [sourceCollege, targets] of Object.entries(grouped)) {
      if (!database[sourceCollege]) {
        database[sourceCollege] = {};
      }

      for (const [targetUniversity, majors] of Object.entries(targets).sort(([a], [b]) => a.localeCompare(b))) {
        if (!database[sourceCollege][targetUniversity]) {
          database[sourceCollege][targetUniversity] = {};
        }

        for (const [major, articulations] of Object.entries(majors).sort(([a], [b]) => a.localeCompare(b))) {
          // Convert articulations to requiredCourses format
          const requiredCourses = articulations.map(articulation => ({
            code: articulation.ucCourse,
            name: articulation.ucCourse, // Using course code as name for now
            category: 'Major Requirement', // Default category
            priority: 'High', // Default priority
            aliases: generateAliases(articulation.ucCourse),
            // Add satisfiedBy relationship to show what CCSF course satisfies this UC course
            satisfiedBy: splitCourseSet(articulation.ccsfCourse)
          }));

          database[sourceCollege][targetUniversity][major] = {
            notes: `Articulation agreements from ASSIST.org for ${sourceCollege} to ${targetUniversity}. ${articulations.length} course mappings found.`,
            competitivenessNote: `Transfer preparation based on official articulation agreements.`,
            requiredCourses: requiredCourses
          };
        }
      }
    }

    return database;
  } catch (error) {
    console.error('Error loading articulation data:', error);
    // Return empty structure matching expected shape
    return {};
  }
}

/**
 * @param {Record<string, Record<string, Record<string, unknown>>>} database
 * @returns {{
 *   colleges: string[],
 *   targetsByCollege: Record<string, string[]>,
 *   majorsByCollegeAndTarget: Record<string, Record<string, string[]>>
 * }}
 */
export function getArticulationOptions(database) {
  const colleges = Object.keys(database).sort((a, b) => a.localeCompare(b));
  /** @type {Record<string, string[]>} */
  const targetsByCollege = {};
  /** @type {Record<string, Record<string, string[]>>} */
  const majorsByCollegeAndTarget = {};

  for (const college of colleges) {
    const targets = Object.keys(database[college] ?? {}).sort((a, b) =>
      a.localeCompare(b)
    );
    targetsByCollege[college] = targets;
    majorsByCollegeAndTarget[college] = {};

    for (const target of targets) {
      majorsByCollegeAndTarget[college][target] = Object.keys(
        database[college]?.[target] ?? {}
      ).sort((a, b) => a.localeCompare(b));
    }
  }

  return { colleges, targetsByCollege, majorsByCollegeAndTarget };
}

/**
 * Generate common aliases for a course code
 * @param {string} courseCode - Course code like "MATH 110A"
 * @returns {string[]} Array of alias variations
 */
function generateAliases(courseCode) {
  const aliases = [courseCode];

  // Remove space variation
  aliases.push(courseCode.replace(/\s+/g, ''));

  // Add common variations
  const parts = courseCode.split(/\s+/);
  if (parts.length === 2) {
    const [subject, number] = parts;
    aliases.push(`${subject} ${number}`); // Original
    aliases.push(`${subject}${number}`); // No space
    if (/^\d+$/.test(number)) {
      aliases.push(`${subject} ${Number(number)}`); // Remove leading zeros from number
    }
  }

  // Remove duplicates
  return [...new Set(aliases)];
}

function splitCourseSet(courseSet) {
  if (!courseSet || /No Course Articulated/i.test(courseSet)) return [];

  return courseSet
    .split(/\s+OR\s+/i)
    .map(option => option
      .split(/\s+AND\s+|\s*\+\s*|\s*;\s*/i)
      .map(course => course.trim())
      .filter(Boolean)
    )
    .filter(option => option.length > 0);
}

// If this script is run directly (not imported), test the function
if (import.meta.url === `file://${process.argv[1]}`) {
  const data = loadArticulationData();
  console.log('Loaded articulation data for:');
  console.log(Object.keys(data).join(', '));

  if (data.CCSF && data.CCSF['UC Berkeley']) {
    const majors = Object.keys(data.CCSF['UC Berkeley']);
    console.log(`CCSF -> UC Berkeley majors: ${majors.length}`);
    if (majors.length > 0) {
      const firstMajor = majors[0];
      console.log(`Sample major "${firstMajor}" has ${data.CCSF['UC Berkeley'][firstMajor].requiredCourses.length} required courses`);
    }
  }
}

export default { loadArticulationData };
