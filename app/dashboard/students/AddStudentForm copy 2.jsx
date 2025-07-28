// /Users/jimmy/datta-able-free-react-admin-template/admin-one-react-tailwind/app/dashboard/students/AddStudentForm.jsx

import React, { useState, useEffect, useRef, useMemo} from 'react';
import { db } from '../../../firebase-config';
import { collection, addDoc, doc, setDoc, serverTimestamp, query, orderBy, getDocs} from "firebase/firestore";

/**
 * @typedef {object} Student
 * @property {string} id
 * @property {string} fullName
 * @property {string} [nameKhmer]
 * @property {string} [phone]
 * @property {string} class
 * @property {string} shift
 * @property {string} [school]
 * @property {string} [scheduleType]
 * @property {string} [motherName]
 * @property {string} [motherPhone]
 * @property {string} [fatherName]
 * @property {string} [fatherPhone]
 * @property {string} [photoUrl]
 */

/**
 * @typedef {object} AddStudentFormProps
 * @property {(id: string) => void} onStudentAdded
 * @property {() => void} onCancel
 * @property {Student | null | undefined} [initialData]
 */

/**
 * @param {AddStudentFormProps} props
 */
function AddStudentForm({ onStudentAdded, onCancel, initialData }) {
  // Timestamp fetching state
  const [timestampInput, setTimestampInput] = useState('');
  const [isFetchingSheetData, setIsFetchingSheetData] = useState(false);
  const [sheetError, setSheetError] = useState(null);

  // Form fields state
  const [fullName, setFullName] = useState('');
  const [nameKhmer, setNameKhmer] = useState('');
  const [phone, setPhone] = useState('');
  const [school, setSchool] = useState('');
  const [scheduleType, setScheduleType] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [shift, setShift] = useState('');
  const [ay, setAy] = useState('2026'); // Academic Year
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [studentClass, setStudentClass] = useState('');
  const [isClassDropdownOpen, setIsClassDropdownOpen] = useState(false); // For the new class dropdown
  const classDropdownRef = useRef(null); // For the new class dropdown
  const [classOptions, setClassOptions] = useState([]); // To store fetched classes { value: string, label: string }[]
  const [loadingClasses, setLoadingClasses] = useState(true); // Loading state for classes

  const [allClassData, setAllClassData] = useState(null); // Or useState<AllClassConfigs | null>(null); if using TypeScript interface here
  const [classSearchTerm, setClassSearchTerm] = useState('');

  const [isShiftDropdownOpen, setIsShiftDropdownOpen] = useState(false);
  const shiftDropdownRef = useRef(null); // To detect clicks outside

  const [allShiftOptions, setAllShiftOptions] = useState([]); // To store all available shifts

  const [isScheduleTypeDropdownOpen, setIsScheduleTypeDropdownOpen] = useState(false);
  const scheduleTypeDropdownRef = useRef(null);
  const scheduleTypeOptions = [
    { value: 'Fix', label: 'Fix' },
    { value: 'Flip-Flop', label: 'Flip-Flop' },
  ];

  // Effect to populate form from initial data (for editing)
  useEffect(() => {
    if (initialData && initialData.id) {
      setIsEditMode(true);
      setFullName(initialData.fullName || '');
      setNameKhmer(initialData.nameKhmer || '');
      setPhone(initialData.phone || '');
      setStudentClass(initialData.class || '');
      setShift(initialData.shift || '');
      setSchool(initialData.school || '');
      setMotherName(initialData.motherName || '');
      setMotherPhone(initialData.motherPhone || '');
      setFatherName(initialData.fatherName || '');
      setFatherPhone(initialData.fatherPhone || '');
      setPhotoUrl(initialData.photoUrl || '');
      setAy(initialData.ay || '2026');
      setScheduleType(initialData.scheduleType || '');
    } else {
      // Reset all fields for a new entry
      setIsEditMode(false);
      setFullName('');
      setNameKhmer('');
      setPhone('');
      setStudentClass('');
      setShift('');
      setSchool('');
      setMotherName('');
      setMotherPhone('');
      setFatherName('');
      setFatherPhone('');
      setPhotoUrl('');
      setAy('2026');
      setScheduleType('');
      setTimestampInput('');
      setSheetError(null);
    }
  }, [initialData]);

  // Effect to fetch class data
  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      setError(null);
      try {
        const classesCollectionRef = collection(db, "classes");
        const q = query(classesCollectionRef, orderBy("name"));
        const querySnapshot = await getDocs(q);
        
        const fetchedClassConfigs = {}; // To store all class data
        const dropdownOpts = [];      // For the class dropdown
        const allShifts = new Set(); // To gather all unique shifts

        if (querySnapshot.empty) {
          console.warn("No documents found in 'classes' collection.");
        } else {
          querySnapshot.forEach(doc => {
            const data = doc.data();
            if (data.name) { // Ensure the class has a name
              // Store class config including type and shifts
              fetchedClassConfigs[data.name] = { name: data.name, shifts: data.shifts || {}, type: data.type };
              dropdownOpts.push({
                value: data.name, // Use the full name as the value
                label: data.name, // Use the full name as the label
              });

              // Add this class's shifts to the global set
              if (data.shifts) {
                Object.keys(data.shifts).forEach(shiftKey => allShifts.add(shiftKey));
              }
            }
          });
        }
        setAllClassData(fetchedClassConfigs);
        setClassOptions(dropdownOpts); // For the class selection dropdown
        setAllShiftOptions(Array.from(allShifts).map(s => ({ value: s, label: s }))); // Set all unique shifts
      } catch (error) {
        console.error("Error fetching classes: ", error);
        setError("Failed to load class list.");
        setAllClassData({}); // Ensure it's an empty object on error
        setClassOptions([]);
      }
      setLoadingClasses(false);
    };

    fetchClasses();
  }, []);

  // Effect to validate selected shift against the selected class
  useEffect(() => {
    // Don't do anything if there's no selected class or data is not ready
    if (!studentClass || !allClassData || loadingClasses) {
        return;
    }

    const classData = allClassData[studentClass];
    // If class exists and has defined shifts
    if (classData && classData.shifts) {
        const shiftKeys = Object.keys(classData.shifts);

        // Auto-select shift if there's only one option for the selected class
        if (shiftKeys.length === 1) {
            setShift(shiftKeys[0]);
        }
        // If the current shift is not valid for the newly selected class, reset it
        else if (shift && !shiftKeys.includes(shift)) {
            setShift('');
        }
    } else {
        // If the selected class has no shifts, reset the shift
        setShift('');
    }
  }, [studentClass, allClassData, loadingClasses]);


  const filteredClassOptions = useMemo(() => {
    if (!classSearchTerm.trim()) {
      return classOptions; // If search term is empty, show all original class options
    }
    return classOptions.filter(option =>
      option.label.toLowerCase().includes(classSearchTerm.toLowerCase())
    );
  }, [classOptions, classSearchTerm]); 

  // A more reliable function to format timestamps for dd/MM/yyyy format
const formatTimestamp = (input) => {
  const parts = input.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (!parts) {
    // Return null if the input format doesn't match the expected pattern
    return null; 
  }
  
  // Extract date and time components from the matched parts
  const [, day, month, year, hours, minutes, seconds] = parts;
  
  // Create a new Date object (Note: month is 0-indexed in JS)
  const date = new Date(year, month - 1, day, hours, minutes, seconds);

  // Return the date formatted back into the exact string format
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}:${String(date.getSeconds()).padStart(2, '0')}`;
};

const handleFetchData = async () => {
  if (!timestampInput) {
    setSheetError('Please enter a timestamp.');
    return;
  }
  setIsFetchingSheetData(true);
  setSheetError(null);
  setError(null);

  try {
    // Use the new, more reliable formatting function
    const standardizedTimestamp = formatTimestamp(timestampInput.trim());

    if (!standardizedTimestamp) {
      setSheetError('Invalid timestamp format. Please use dd/MM/yyyy HH:mm:ss.');
      setIsFetchingSheetData(false);
      return;
    }

    const response = await fetch(`/api/student-registration?timestamp=${encodeURIComponent(standardizedTimestamp)}`);
    const data = await response.json();
    
    // ... rest of your code for handling success and errors (it's already correct)
    if (!response.ok || data.error) {
      const errorMessage = data.error || `Failed to fetch data. Status: ${response.status}`;
      setSheetError(errorMessage);
    } else {
      // Response was successful and has no error key
      setFullName(data.name || '');
      setNameKhmer(data.nameKhmer || '');
      setPhone(data.phoneNumber || '');

      // New logic to find class name by type from sheet's grade
      const gradeFromSheet = data.grade;
      if (gradeFromSheet && allClassData && Object.keys(allClassData).length > 0) {
        const matchingClassName = Object.keys(allClassData).find(
          (className) => allClassData[className].type === gradeFromSheet
        );

        if (matchingClassName) {
          setStudentClass(matchingClassName);
        } else {
          console.warn(`No class found with type matching sheet grade: "${gradeFromSheet}"`);
          setStudentClass(''); // Clear if no match found
        }
      } else {
        setStudentClass(''); // Fallback to empty if no grade or no class data
      }
      
      setShift(data.shift || '');
      setScheduleType(data.scheduleType || '');
      setSchool(data.school || '');
      setMotherName(data.motherName || '');
      setMotherPhone(data.motherPhone || '');
      setFatherName(data.fatherName || '');
      setFatherPhone(data.fatherPhone || '');
      setPhotoUrl(data.photoUrl || '');
      setAy(data.ay || '2026');
      setSheetError(null);
    }

  } catch (err) {
    console.error("Error fetching sheet data:", err);
    setSheetError(err.message || 'An unexpected error occurred.');
  } finally {
    setIsFetchingSheetData(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!fullName || !studentClass || !shift) {
      setError("Full Name, Class, and Shift are required.");
      setLoading(false);
      return;
    }

    try {
      const studentData = {
        fullName,
        nameKhmer,
        phone,
        class: studentClass,
        shift,
        ay,
        scheduleType,
        school,
        motherName,
        motherPhone,
        fatherName,
        fatherPhone,
        photoUrl,
      };

      if (isEditMode && initialData?.id) {
        const studentRef = doc(db, "students", initialData.id);
        await setDoc(studentRef, { ...studentData, updatedAt: serverTimestamp() }, { merge: true });
        if (onStudentAdded) {
          onStudentAdded(initialData.id);
        }
      } else {
        const docRef = await addDoc(collection(db, "students"), { ...studentData, authUid: '', createdAt: serverTimestamp() });
        if (onStudentAdded) {
          onStudentAdded(docRef.id);
        }
      }
    } catch (err) {
      console.error("Error saving student: ", err);
      setError("Failed to save student. Please try again.");
    }
    setLoading(false);
  };

  useEffect(() => {
    const handleClickOutsideShift = (event) => {
      if (shiftDropdownRef.current && !shiftDropdownRef.current.contains(event.target)) {
        setIsShiftDropdownOpen(false);
      }
    };
    if (isShiftDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutsideShift);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideShift);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideShift); // Cleanup
  }, [isShiftDropdownOpen]);

  useEffect(() => {
    const handleClickOutsideClass = (event) => {
      if (classDropdownRef.current && !classDropdownRef.current.contains(event.target)) {
        setIsClassDropdownOpen(false);
      }
    };
    if (isClassDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutsideClass);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideClass);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideClass); // Cleanup
  }, [isClassDropdownOpen]);

  useEffect(() => {
    const handleClickOutsideScheduleType = (event) => {
      if (scheduleTypeDropdownRef.current && !scheduleTypeDropdownRef.current.contains(event.target)) {
        setIsScheduleTypeDropdownOpen(false);
      }
    };
    if (isScheduleTypeDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutsideScheduleType);
    } else {
      document.removeEventListener("mousedown", handleClickOutsideScheduleType);
    }
    return () => document.removeEventListener("mousedown", handleClickOutsideScheduleType);
  }, [isScheduleTypeDropdownOpen]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
       {/* Timestamp Fetcher */}
       {!isEditMode && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-600">
          <label htmlFor="timestamp" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Fetch from Registration Sheet
          </label>
          <div className="mt-1 flex items-stretch">
            <input
              type="text"
              id="timestamp"
              name="timestamp"
              value={timestampInput}
              onChange={(e) => setTimestampInput(e.target.value)}
              placeholder="Paste Timestamp here..."
              className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            />
            <button
              type="button"
              onClick={handleFetchData}
              disabled={isFetchingSheetData || !timestampInput}
              className="relative -ml-px inline-flex items-center space-x-2 px-4 py-2 border border-gray-300 text-sm font-medium rounded-r-md text-gray-700 bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-wait"
            >
              {isFetchingSheetData ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching...
                </>
              ) : (
                'Fetch Data'
              )}
            </button>
          </div>
          {sheetError && <p className="mt-2 text-sm text-red-600 dark:text-red-500">{sheetError}</p>}
        </div>
      )}
      {/* Row 1: Full Name and Khmer Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name (English)
          </label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            required
          />
        </div>
        <div>
          <label htmlFor="nameKhmer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Full Name (Khmer)
          </label>
          <input
            type="text"
            id="nameKhmer"
            name="nameKhmer"
            value={nameKhmer}
            onChange={(e) => setNameKhmer(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          />
        </div>
      </div>

       {/* Row 2: Phone and School */}
       <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          />
        </div>
        <div>
          <label htmlFor="school" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            School
          </label>
          <input
            type="text"
            id="school"
            name="school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          />
        </div>
      </div>

      {/* Row 2.5: Academic Year and Schedule Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0">
        <div>
          <label htmlFor="ay" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Academic Year
          </label>
          <input
            type="text"
            id="ay"
            name="ay"
            value={ay}
            onChange={(e) => setAy(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          />
        </div>
        <div>
          <label htmlFor="scheduleType-button" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Schedule Type
          </label>
          <div className="mt-1 relative" ref={scheduleTypeDropdownRef}>
            <button
              type="button"
              id="scheduleType-button"
              onClick={() => setIsScheduleTypeDropdownOpen(!isScheduleTypeDropdownOpen)}
              className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500"
              aria-haspopup="true"
              aria-expanded={isScheduleTypeDropdownOpen}
            >
              <span className="truncate">{scheduleType || "Select Type"}</span>
              <svg className="w-2.5 h-2.5 ms-3 text-gray-700 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
              </svg>
            </button>
            {isScheduleTypeDropdownOpen && (
              <div className="z-10 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="scheduleType-button">
                  {scheduleTypeOptions.map((option) => (
                    <li key={option.value}>
                      <button type="button" onClick={() => { setScheduleType(option.value); setIsScheduleTypeDropdownOpen(false); }}
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${scheduleType === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                        role="menuitem">
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Class and Shift */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0">
        {/* CLASS DROPDOWN */}
        <div>
          <label htmlFor="class-button" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Class
          </label>
          <div className="mt-1 relative" ref={classDropdownRef}>
            <button
              type="button"
              id="class-button"
              onClick={() => setIsClassDropdownOpen(!isClassDropdownOpen)}
              disabled={loadingClasses}
              className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-haspopup="true"
              aria-expanded={isClassDropdownOpen}
              required // Add required if class is mandatory
            >
              <span className="truncate">
                {loadingClasses ? "Loading classes..." : (studentClass || "Select Class")}
                {!loadingClasses && classOptions.length === 0 && !studentClass && "No classes available"}
              </span>
              <svg className="w-2.5 h-2.5 ms-3 text-gray-700 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
              </svg>
            </button>

            {isClassDropdownOpen && !loadingClasses && ( // Keep !loadingClasses guard
              <div
                className="z-20 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-60 flex flex-col" // Added flex flex-col for structure
              >
                {/* VVVV ADD SEARCH INPUT HERE VVVV */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    placeholder="Search class..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                    value={classSearchTerm}
                    onChange={(e) => setClassSearchTerm(e.target.value)}
                    autoFocus // Optional: auto-focus when dropdown opens
                  />
                </div>
                {/* ^^^^ END OF SEARCH INPUT ^^^^ */}

                <ul className="flex-grow overflow-y-auto py-1 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="class-button">
                  {/* Only show "Select Class" option if no search term or if it matches */}
                  {(!classSearchTerm || "Select Class".toLowerCase().includes(classSearchTerm.toLowerCase())) && (
                    <li>
                      <button type="button" onClick={() => { setStudentClass(''); setIsClassDropdownOpen(false); setClassSearchTerm(''); }}
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${!studentClass ? 'bg-gray-50 dark:bg-gray-500' : ''}`}
                        role="menuitem">
                        Select Class
                      </button>
                    </li>
                  )}

                  {/* VVVV Use filteredClassOptions for mapping VVVV */}
                  {filteredClassOptions.length > 0 ? (
                    filteredClassOptions.map((option) => (
                      <li key={option.value}>
                        <button type="button" onClick={() => { setStudentClass(option.value); setIsClassDropdownOpen(false); setClassSearchTerm(''); /* Clear search on selection */ }}
                          className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${studentClass === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                          role="menuitem">
                          {option.label}
                        </button>
                      </li>
                    ))
                  ) : (
                    <li className="px-4 py-2 text-gray-500 dark:text-gray-400">No matching classes found.</li>
                  )}
                  {/* ^^^^ Use filteredClassOptions for mapping ^^^^ */}
                </ul>
              </div>
            )}
          </div>
        </div>
        {/* SHIFT DROPDOWN (NOW DYNAMIC) */}
        <div>
          <label htmlFor="shift-button" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Shift
          </label>
          <div className="mt-1 relative" ref={shiftDropdownRef}>
            <button
              type="button"
              id="shift-button"
              onClick={() => setIsShiftDropdownOpen(!isShiftDropdownOpen)}
              // Disable if classes (and therefore shifts) are still loading
              disabled={loadingClasses}
              className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-haspopup="true"
              aria-expanded={isShiftDropdownOpen}
              required // Add required if shift is mandatory
            >
              <span className="truncate">
                {loadingClasses ? "Loading..." : (shift || "Select Shift")}
              </span>
              <svg className="w-2.5 h-2.5 ms-3 text-gray-700 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
              </svg>
            </button>

            {isShiftDropdownOpen && !loadingClasses && allShiftOptions.length > 0 && (
              <div className="z-10 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                <ul className="py-2 text-sm text-gray-700 dark:text-gray-200" aria-labelledby="shift-button">
                  <li>
                    <button type="button" onClick={() => { setShift(''); setIsShiftDropdownOpen(false); }}
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${!shift ? 'bg-gray-50 dark:bg-gray-500' : ''}`}
                      role="menuitem">
                      Select Shift
                    </button>
                  </li>
                  {allShiftOptions.map((option) => (
                    <li key={option.value}>
                      <button type="button" onClick={() => { setShift(option.value); setIsShiftDropdownOpen(false); }}
                        className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${shift === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                        role="menuitem">
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isShiftDropdownOpen && !loadingClasses && allShiftOptions.length === 0 && (
              <div className="z-10 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <p className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">No shifts available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Row 4: Parent Information */}
      <div className="pt-6">
        <p className="text-lg font-semibold text-gray-800 dark:text-white">Parent/Guardian Information</p>
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0 mt-4">
          <div>
            <label htmlFor="motherName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mother's Name
            </label>
            <input
              type="text"
              id="motherName"
              name="motherName"
              value={motherName}
              onChange={(e) => setMotherName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            />
          </div>
          <div>
            <label htmlFor="motherPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Mother's Phone
            </label>
            <input
              type="tel"
              id="motherPhone"
              name="motherPhone"
              value={motherPhone}
              onChange={(e) => setMotherPhone(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0 mt-6">
          <div>
            <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Father's Name
            </label>
            <input
              type="text"
              id="fatherName"
              name="fatherName"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            />
          </div>
          <div>
            <label htmlFor="fatherPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Father's Phone
            </label>
            <input
              type="tel"
              id="fatherPhone"
              name="fatherPhone"
              value={fatherPhone}
              onChange={(e) => setFatherPhone(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
            />
          </div>
        </div>
      </div>
      
       {/* Row 5: Photo URL and Preview */}
       <div className="pt-6">
        <label htmlFor="photoUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Photo URL
        </label>
        <input
          type="text"
          id="photoUrl"
          name="photoUrl"
          value={photoUrl}
          onChange={(e) => setPhotoUrl(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
          placeholder="https://example.com/image.jpg"
        />
        {photoUrl && (
          <div className="mt-4">
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300">Photo Preview</p>
            <img src={photoUrl} alt="Student Preview" className="mt-2 h-40 w-40 rounded-lg object-cover shadow-md" />
          </div>
        )}
      </div>

      {error && <p className="text-red-500 text-sm mb-3 -mt-2">{error}</p>}
      <div className="flex justify-end space-x-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {loading ? (isEditMode ? 'Updating...' : 'Adding...') : (isEditMode ? 'Update Student' : 'Add Student')}
        </button>
      </div>
    </form>
  );
}

export default AddStudentForm;