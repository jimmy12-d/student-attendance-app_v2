import { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';

export const useStudentCount = () => {
  const [studentCounts, setStudentCounts] = useState({});
  const [loading, setLoading] = useState(false);

  const getStudentCount = async (className, shift, excludeStudentId = null) => {
    if (!className || !shift) return 0;

    const key = `${className}-${shift}${excludeStudentId ? `-exclude-${excludeStudentId}` : ''}`;
    
    // Return cached count if available
    if (studentCounts[key] !== undefined) {
      return studentCounts[key];
    }

    setLoading(true);
    try {
      const studentsRef = collection(db, "students");
      const q = query(
        studentsRef, 
        where("class", "==", className),
        where("shift", "==", shift),
        where("ay", "==", "2026") // Filter by current academic year
      );
      const querySnapshot = await getDocs(q);
      
      let count = querySnapshot.size;
      
      // If we need to exclude a specific student (for edit mode)
      if (excludeStudentId) {
        const hasExcludedStudent = querySnapshot.docs.some(doc => doc.id === excludeStudentId);
        if (hasExcludedStudent) {
          count -= 1;
        }
      }
      
      // Cache the result
      setStudentCounts(prev => ({
        ...prev,
        [key]: count
      }));
      
      setLoading(false);
      return count;
    } catch (error) {
      console.error("Error fetching student count: ", error);
      setLoading(false);
      return 0;
    }
  };

  const clearCacheForClass = (className, shift) => {
    if (!className || !shift) return;
    
    setStudentCounts(prev => {
      const newCounts = { ...prev };
      // Remove all cached entries for this class/shift combination
      Object.keys(newCounts).forEach(key => {
        if (key.startsWith(`${className}-${shift}`)) {
          delete newCounts[key];
        }
      });
      return newCounts;
    });
  };

  const clearCache = () => {
    setStudentCounts({});
  };

  return {
    getStudentCount,
    loading,
    clearCache,
    clearCacheForClass
  };
};
