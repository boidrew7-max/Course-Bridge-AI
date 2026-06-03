# Course Correction AI Integration Guide

## Overview
Automatic AI-powered course text correction with fuzzy matching and pattern recognition. Supports correcting typos, formatting, and code variations.

## Quick Start

### 1. **Single Course Correction (API)**
```bash
curl -X POST http://localhost:3000/api/correct-course \
  -H "Content-Type: application/json" \
  -d '{"course": "math 110a"}'
```

Response:
```json
{
  "results": [
    {
      "input": "math 110a",
      "corrected": "MATH 110A",
      "method": "exact",
      "confidence": "high"
    }
  ],
  "totalCourses": 3
}
```

### 2. **Multiple Courses Correction**
```bash
curl -X POST http://localhost:3000/api/correct-course \
  -H "Content-Type: application/json" \
  -d '{"courses": ["math 110a", "ecno 1", "CS111B"]}'
```

## React Integration

### Using the Hook
```jsx
import { useCourseCorrectionAI } from '@/lib/useCourseCorrectionAI';

export function CourseInput() {
  const { correctCourse, loading, lastResult } = useCourseCorrectionAI();
  const [input, setInput] = useState('');

  const handleBlur = async () => {
    await correctCourse(input);
  };

  return (
    <div>
      <input 
        value={input} 
        onChange={e => setInput(e.target.value)}
        onBlur={handleBlur}
        placeholder="Enter course (e.g., MATH 101)"
      />
      
      {lastResult?.corrected && lastResult.corrected !== input && (
        <div className="suggestion">
          Did you mean: <strong>{lastResult.corrected}</strong>?
          <small>({lastResult.confidence} confidence)</small>
        </div>
      )}
    </div>
  );
}
```

## Correction Methods

The system uses multiple strategies, tried in this order:

| Method | Description | Confidence |
|--------|-------------|-----------|
| **exact** | Normalized exact match | high |
| **code_pattern** | Course code format match (e.g., MATH101 → MATH 101) | high |
| **fuzzy** | Levenshtein distance fuzzy match | medium/low |
| **none** | No suitable correction found | none |

## Supported Input Patterns

✅ `MATH 110A` - Standard format
✅ `MATH110A` - No space
✅ `math 110a` - Lowercase
✅ `MAT 110A` - Minor typo
❌ `MATHHH 110A` - Too different (rejected)

## Configuration

### Thresholds (in `lib/spellcheck.js`)

```javascript
// Fuzzy match ratio threshold
if (ratio > 0.35) return false;  // Reject if too different

// Short string threshold
if (maxLen <= 3 && dist > 1) return false;  // Strict for short codes
```

Adjust these values to be more/less permissive with corrections.

## Adding Course Data

Courses are loaded from:
1. `data/processed/assist_articulations.csv` (column: `course`)
2. `processed/sample_courses.csv` (column: `course`)

Add more CSV files by editing `lib/courseLoader.js`:

```javascript
// Add to loadCoursesFromCSV()
const newPath = path.join(process.cwd(), 'data', 'your_courses.csv');
if (fs.existsSync(newPath)) {
  const raw = fs.readFileSync(newPath, 'utf8');
  const records = parse(raw, { columns: true });
  records.forEach(record => {
    if (record.course) courses.add(record.course.trim());
  });
}
```

## Testing

Run the test suite:
```bash
node scripts/test_course_correction.js
```

## API Endpoints

### POST `/api/correct-course`

**Request:**
```json
{
  "course": "string (single course)",
  // OR
  "courses": ["string", "string"] (multiple)
}
```

**Response:**
```json
{
  "results": [
    {
      "input": "string (original input)",
      "corrected": "string (corrected) or null",
      "method": "exact|code_pattern|fuzzy|none",
      "confidence": "high|medium|low|none"
    }
  ],
  "totalCourses": number (courses in database)
}
```

## Performance

- **Load time**: ~5ms per request (cached course data)
- **Batch time**: ~1ms per course
- **Cache**: In-memory, cleared on server restart

To clear cache programmatically:
```javascript
import { clearCourseCache } from '@/lib/courseLoader';
clearCourseCache();
```

## Troubleshooting

### "No course data available"
- Check CSV files exist at paths in `courseLoader.js`
- Ensure CSV has `course` column
- Run `clearCourseCache()` to force reload

### Corrections too permissive
- Decrease threshold in `shouldSuggest()` 
- Current: `ratio > 0.35`
- Lower to `0.25` for stricter matching

### Corrections too strict
- Increase threshold
- Current: `ratio > 0.35`
- Increase to `0.45` for more lenient matching

## Future Enhancements

- [ ] LLM-powered corrections for semantics
- [ ] Learning from user corrections
- [ ] Multi-college course synonyms
- [ ] Caching corrections to database
- [ ] Real-time suggestion as user types
