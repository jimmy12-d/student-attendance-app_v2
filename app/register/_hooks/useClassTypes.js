import { useState, useEffect } from 'react';

export const useClassTypes = () => {
  const [classTypes, setClassTypes] = useState([]);
  const [loadingClassTypes, setLoadingClassTypes] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Static grade data
    const staticGrades = [
      { id: 'grade-7', label: 'Grade 7', value: 'grade-7' },
      { id: 'grade-8', label: 'Grade 8', value: 'grade-8' },
      { id: 'grade-9', label: 'Grade 9', value: 'grade-9' },
      { id: 'grade-10', label: 'Grade 10', value: 'grade-10' },
      { id: 'grade-11', label: 'Grade 11', value: 'grade-11' },
      { id: 'grade-12-science', label: 'Grade 12 Science', value: 'grade-12-science' },
      { id: 'grade-12-social', label: 'Grade 12 Social', value: 'grade-12-social' }
    ];

    // Simulate loading delay for consistency
    setTimeout(() => {
      setClassTypes(staticGrades);
      setLoadingClassTypes(false);
    }, 100);
  }, []);

  return { classTypes, loadingClassTypes, error };
};