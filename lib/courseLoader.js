import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

let courseCache = null;

/**
 * Load all unique courses from CSV files
 * Returns a list of course codes/names for matching
 */
export function loadCoursesFromCSV() {
  if (courseCache) return courseCache;

  const courses = new Set();

  try {
    // Load from assist_articulations.csv
    const csvPath = path.join(process.cwd(), 'data', 'processed', 'assist_articulations.csv');
    if (fs.existsSync(csvPath)) {
      const raw = fs.readFileSync(csvPath, 'utf8');
      const records = parse(raw, { columns: true });
      records.forEach(record => {
        if (record.course) courses.add(record.course.trim());
      });
    }

    // Load from sample_courses.csv if it exists
    const samplePath = path.join(process.cwd(), 'processed', 'sample_courses.csv');
    if (fs.existsSync(samplePath)) {
      const raw = fs.readFileSync(samplePath, 'utf8');
      const records = parse(raw, { columns: true });
      records.forEach(record => {
        if (record.course) courses.add(record.course.trim());
      });
    }
  } catch (err) {
    console.error('Error loading course CSV:', err);
  }

  courseCache = Array.from(courses);
  return courseCache;
}

/**
 * Clear the course cache (useful for testing or manual refresh)
 */
export function clearCourseCache() {
  courseCache = null;
}

/**
 * Get all available courses
 */
export function getAllCourses() {
  return loadCoursesFromCSV();
}
