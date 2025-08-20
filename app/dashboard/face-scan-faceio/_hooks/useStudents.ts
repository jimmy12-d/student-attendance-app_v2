import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase-config';
import { Student } from '../_lib/types';

export const useStudents = () => {
  const [students, setStudents] = useState<Student[]>([]);

  const loadStudents = useCallback(async () => {
    try {
      const studentsRef = collection(db, 'students');
      const snapshot = await getDocs(studentsRef);
      
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      
      setStudents(studentsData);
      
      if (studentsData.length === 0) {
        toast.error('No students found in database. Please add students first.');
      }
    } catch (error) {
      console.error('❌ Error loading students:', error);
      toast.error('Failed to load students');
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  return { students, setStudents };
};
