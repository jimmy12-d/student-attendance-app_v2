import { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const useStudentCounts = () => {
  const [studentCounts, setStudentCounts] = useState({});
  const [loadingCounts, setLoadingCounts] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStudentCounts = async () => {
      setLoadingCounts(true);
      setError(null);
      try {
        const studentsRef = collection(db, "students");
        const q = query(studentsRef, where("ay", "==", "2026"));
        const querySnapshot = await getDocs(q);
        
        const counts = {};
        
        querySnapshot.forEach(doc => {
          const data = doc.data();
          const studentClass = data.class;
          const shift = data.shift;
          
          if (studentClass) {
            // Initialize class count if it doesn't exist
            if (!counts[studentClass]) {
              counts[studentClass] = {
                total: 0,
                shifts: {}
              };
            }
            
            // Increment total count for the class
            counts[studentClass].total++;
            
            // Initialize shift count if it doesn't exist
            if (shift) {
              if (!counts[studentClass].shifts[shift]) {
                counts[studentClass].shifts[shift] = 0;
              }
              counts[studentClass].shifts[shift]++;
            }
          }
        });
        
        setStudentCounts(counts);
      } catch (error) {
        console.error("Error fetching student counts: ", error);
        setError("Failed to load student counts.");
        setStudentCounts({});
      }
      setLoadingCounts(false);
    };

    fetchStudentCounts();
  }, []);

  const getClassCountText = (className, selectedShift = null) => {
    const classCount = studentCounts[className];
    if (!classCount) {
      return '';
    }

    // Only show count when a shift is selected
    if (selectedShift && classCount.shifts[selectedShift] !== undefined) {
      return ` (${classCount.shifts[selectedShift]})`;
    }

    // Return empty string when no shift is selected
    return '';
  };

  return {
    studentCounts,
    loadingCounts,
    error,
    getClassCountText
  };
};
