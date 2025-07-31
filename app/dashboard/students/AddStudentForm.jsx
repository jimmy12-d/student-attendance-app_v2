// /Users/jimmy/datta-able-free-react-admin-template/admin-one-react-tailwind/app/dashboard/students/AddStudentForm.jsx

import React, { useState, useEffect, useRef, useMemo} from 'react';
import { db } from '../../../firebase-config';
import { collection, addDoc, setDoc, doc, query, where, getDocs, serverTimestamp, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

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

  const [gradeTypeFilter, setGradeTypeFilter] = useState(''); // To filter classes by type

  // Form fields state
  const [fullName, setFullName] = useState('');
  const [nameKhmer, setNameKhmer] = useState('');
  const [phone, setPhone] = useState('');
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
      setScheduleType(initialData.scheduleType || '');
      setMotherName(initialData.motherName || '');
      setMotherPhone(initialData.motherPhone || '');
      setFatherName(initialData.fatherName || '');
      setFatherPhone(initialData.fatherPhone || '');
      setPhotoUrl(initialData.photoUrl || '');
      setAy(initialData.ay || '2026');
    } else {
      // Reset all fields for a new entry
      setIsEditMode(false);
      setFullName('');
      setNameKhmer('');
      setPhone('');
      setStudentClass('');
      setShift('');
      setScheduleType('');
      setMotherName('');
      setMotherPhone('');
      setFatherName('');
      setFatherPhone('');
      setPhotoUrl('');
      setAy('2026');
      setTimestampInput('');
      setSheetError(null);
      setGradeTypeFilter(''); // Reset the filter for new entries
    }
  }, [initialData]);

  // Effect to set grade type filter when editing a student (to show classes of the same type)
  useEffect(() => {
    if (isEditMode && studentClass && allClassData && !loadingClasses) {
      const classData = allClassData[studentClass];
      if (classData && classData.type) {
        setGradeTypeFilter(classData.type);
      }
    }
  }, [isEditMode, studentClass, allClassData, loadingClasses]);

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
    let options = classOptions;

    // If user is actively searching, show all classes that match the search term
    if (classSearchTerm.trim()) {
      return classOptions.filter((option) =>
        option.label.toLowerCase().includes(classSearchTerm.toLowerCase())
      );
    }

    // Otherwise, filter by grade type if a filter is set (for default view)
    if (gradeTypeFilter && allClassData) {
      const filteredClassNames = Object.keys(allClassData).filter(
        (className) => allClassData[className].type === gradeTypeFilter
      );
      options = filteredClassNames.map((name) => ({
        value: name,
        label: name,
      }));
    }

    return options;
  }, [classOptions, allClassData, gradeTypeFilter, classSearchTerm]); 

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
      const gradeFromSheet = data.grade || '';
      setGradeTypeFilter(gradeFromSheet); // Set the filter

      setFullName(data.name || '');
      setNameKhmer(data.nameKhmer || '');
      setPhone(data.phoneNumber || '');

      // Do not auto-select a class after fetching.
      // The `gradeTypeFilter` will narrow down the options, but the user must make the final selection.
      setStudentClass('');
      
      setShift(data.shift || '');
      setScheduleType(data.school || '');
      setMotherName(data.motherName || '');
      setMotherPhone(data.motherPhone || '');
      setFatherName(data.fatherName || '');
      setFatherPhone(data.fatherPhone || '');
      setPhotoUrl(data.photoUrl || '');
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
      toast.error("Full Name, Class, and Shift are required.");
      setLoading(false);
      return;
    }

    try {
      // Check for duplicates
      const studentsRef = collection(db, "students");
      
      // Create query for duplicate name or phone
      const nameQuery = query(studentsRef, where("fullName", "==", fullName));
      const phoneQuery = query(studentsRef, where("phone", "==", phone));
      
      // Execute both queries
      const [nameSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(phoneQuery)
      ]);

      // Check for duplicates, excluding the current student in edit mode
      const hasDuplicateName = nameSnapshot.docs.length > 0 && nameSnapshot.docs.some(doc => {
        const docData = doc.data();
        // In edit mode, check if this is not the current document
        if (isEditMode && initialData?.id) {
          return doc.id !== initialData.id && docData.fullName === fullName;
        }
        // In create mode, any match is a duplicate
        return docData.fullName === fullName;
      });
      
      const hasDuplicatePhone = phone && phoneSnapshot.docs.length > 0 && phoneSnapshot.docs.some(doc => {
        const docData = doc.data();
        // In edit mode, check if this is not the current document
        if (isEditMode && initialData?.id) {
          return doc.id !== initialData.id && docData.phone === phone;
        }
        // In create mode, any match is a duplicate
        return docData.phone === phone;
      });

      if (hasDuplicateName) {
        toast.error(`A student with the name "${fullName}" already exists.`);
        setLoading(false);
        return;

      }

      if (hasDuplicatePhone) {
        toast.error(`A student with the phone number "${phone}" already exists.`);
        setLoading(false);
        return;
      }

      const studentData = {
        fullName,
        nameKhmer,
        phone,
        class: studentClass,
        shift,
        ay,
        scheduleType,
        motherName,
        motherPhone,
        fatherName,
        fatherPhone,
        photoUrl,
      };

      if (isEditMode && initialData?.id) {
        const studentRef = doc(db, "students", initialData.id);
        await setDoc(studentRef, { ...studentData, updatedAt: serverTimestamp() }, { merge: true });
        toast.success(`Student '${studentData.fullName}' has been updated successfully!`);
        if (onStudentAdded) {
          onStudentAdded(initialData.id);
        }
      } else {
        const docRef = await addDoc(collection(db, "students"), { ...studentData, authUid: '', createdAt: serverTimestamp() });
        toast.success(`Student '${studentData.fullName}' has been added successfully!`);
        if (onStudentAdded) {
          onStudentAdded(docRef.id);
        }
      }
    } catch (err) {
      console.error("Error saving student: ", err);
      toast.error("Failed to save student. Please try again.");
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

  // Helper function to convert Google Drive link to a direct image link
  const getDisplayableImageUrl = (url) => {
    if (!url || typeof url !== 'string') {
      return null;
    }

    if (url.includes("drive.google.com")) {
      // Regex to find the file ID from various Google Drive URL formats
      // Handles both /file/d/FILE_ID/ and ?id=FILE_ID
      const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/;
      const match = url.match(regex);
      
      if (match && match[1]) {
        const fileId = match[1];
        // Return the preview URL for iframe embedding
        const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        return previewUrl;
      }
    }
    
    // If it's not a Google Drive link or no ID was found, return it as is
    return url;
  };

  const handleImageError = (e) => {
    console.error('Image failed to load:', e.target.src);
  };

  const handleImageLoad = (e) => {
    console.log('Image loaded successfully:', e.target.src);
  };


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

       {/* Row 2: Phone and Schedule Type */}
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

      {/* Row 2.5: Academic Year */}
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
        {/* SHIFT DROPDOWN */}
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
            <div className="mt-2">
              {photoUrl.includes("drive.google.com") ? (
                <iframe 
                  src={getDisplayableImageUrl(photoUrl)}
                  className="h-64 w-64 rounded-lg border border-gray-300"
                  title="Student Photo Preview"
                  frameBorder="0"
                  allow="autoplay"
                />
              ) : (
                <img 
                  src={getDisplayableImageUrl(photoUrl)} 
                  alt="Student Preview" 
                  className="h-64 w-64 rounded-lg object-cover shadow-md"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* This error display can be removed or kept as a fallback */}
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