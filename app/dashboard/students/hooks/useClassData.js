import { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';

export const useClassData = () => {
  const [allClassData, setAllClassData] = useState(null);
  const [classOptions, setClassOptions] = useState([]);
  const [allShiftOptions, setAllShiftOptions] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setError(null);
      try {
        const classesCollectionRef = collection(db, "classes");
        const q = query(classesCollectionRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        
        const fetchedClassConfigs = {};
        const dropdownOpts = [];
        const allShifts = new Set();

        if (querySnapshot.empty) {
          console.warn("No documents found in 'classes' collection.");
        } else {
          querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) {
              fetchedClassConfigs[data.name] = { 
                name: data.name, 
                shifts: data.shifts || {}, 
                type: data.type 
              };
              dropdownOpts.push({
                value: data.name,
                label: data.name,
              });

              if (data.shifts) {
                Object.keys(data.shifts).forEach(shiftKey => allShifts.add(shiftKey));
              }
            }
          });
        }
        
        setAllClassData(fetchedClassConfigs);
        setClassOptions(dropdownOpts);
        setAllShiftOptions(Array.from(allShifts).map(s => ({ value: s, label: s })));
      } catch (error) {
        console.error("Error fetching classes: ", error);
        setError("Failed to load class list.");
        setAllClassData({});
        setClassOptions([]);
        setAllShiftOptions([]);
      }
      setLoadingClasses(false);
    };

    fetchClasses();
  }, []);

  return {
    allClassData,
    classOptions,
    allShiftOptions,
    loadingClasses,
    error
  };
};
