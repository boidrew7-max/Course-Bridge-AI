import { useState, useCallback } from 'react';

/**
 * Hook for correcting course text
 * Usage:
 *   const { correctCourse, loading, results } = useCourseCorrectionAI();
 *   const correction = await correctCourse('math 101');
 */
export function useCourseCorrectionAI() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const correctCourse = useCallback(async (courseInput) => {
    if (!courseInput || typeof courseInput !== 'string') {
      setError('Invalid input');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/correct-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ course: courseInput.trim() })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const result = data.results?.[0] || null;
      setResults([result]);
      return result;
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      console.error('Course correction error:', errorMsg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const correctMultipleCourses = useCallback(async (courseInputs) => {
    if (!Array.isArray(courseInputs)) {
      setError('Input must be an array');
      return [];
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/correct-course', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courses: courseInputs.map(c => c.trim()) })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results || []);
      return data.results || [];
    } catch (err) {
      const errorMsg = String(err);
      setError(errorMsg);
      console.error('Course correction error:', errorMsg);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    correctCourse,
    correctMultipleCourses,
    loading,
    results,
    error,
    lastResult: results[0] || null
  };
}

/**
 * Component that shows correction suggestion
 */
export function CourseCorrection({ input, onCorrect }) {
  const { correctCourse, loading, lastResult, error } = useCourseCorrectionAI();

  const handleCorrect = async () => {
    const result = await correctCourse(input);
    if (result?.corrected && onCorrect) {
      onCorrect(result);
    }
  };

  return (
    <div className="course-correction">
      {lastResult && lastResult.corrected && lastResult.corrected !== input && (
        <div className="correction-suggestion">
          <span className="label">Correction:</span>
          <span className="suggestion">{lastResult.corrected}</span>
          <span className={`confidence ${lastResult.confidence}`}>
            {lastResult.confidence} confidence
          </span>
          <button onClick={handleCorrect} disabled={loading}>
            {loading ? 'Correcting...' : 'Apply'}
          </button>
        </div>
      )}
      {error && (
        <div className="error-message">{error}</div>
      )}
    </div>
  );
}
