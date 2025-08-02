import React, { useState, useEffect } from 'react';
import { useStudentCount } from '../hooks/useStudentCount';

const StudentCountDisplay = ({ className, shift, showLabel = true, excludeStudentId = null, compact = false }) => {
  const [count, setCount] = useState(null);
  const { getStudentCount, loading } = useStudentCount();

  useEffect(() => {
    const fetchCount = async () => {
      if (className && shift) {
        const studentCount = await getStudentCount(className, shift, excludeStudentId);
        setCount(studentCount);
      } else {
        setCount(null);
      }
    };

    fetchCount();
  }, [className, shift, excludeStudentId, getStudentCount]);

  if (!className || !shift) {
    return null;
  }

  if (loading && count === null) {
    if (compact) {
      return (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          (loading...)
        </span>
      );
    }
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>Loading student count...</span>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <span className="text-xs text-gray-600 dark:text-gray-400 ml-1">
        ({count !== null ? count : '0'} {count === 1 ? 'student' : 'students'})
      </span>
    );
  }

  return (
    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <div className="flex-1">
          {showLabel && (
            <span className="text-gray-700 dark:text-gray-300">
              Current students in <span className="font-medium text-gray-900 dark:text-white">{className}</span> class, <span className="font-medium text-gray-900 dark:text-white">{shift}</span> shift:
            </span>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="font-bold text-2xl text-indigo-600 dark:text-indigo-400">
              {count !== null ? count : '0'}
            </span>
            <span className="text-gray-500 text-sm">
              {count === 1 ? 'student' : 'students'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentCountDisplay;
