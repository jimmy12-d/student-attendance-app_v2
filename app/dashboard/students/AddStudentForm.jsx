import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase-config';
import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

// Components
import TimestampFetcher from './components/TimestampFetcher';
import CustomDropdown from './components/CustomDropdown';
import PhotoPreview from './components/PhotoPreview';
import CollapsibleSection from './components/CollapsibleSection';

// Hooks
import { useClassData } from './hooks/useClassData';
import { useStudentForm } from './hooks/useStudentForm';
import { useStudentCount } from './hooks/useStudentCount';

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
 * @property {number} [discount]
 * @property {string} [note]
 * @property {boolean} [warning]
 * @property {boolean} [lateFeePermission]
 */

/**
 * @typedef {object} AddStudentFormProps
 * @property {(id: string) => void} onStudentAdded
 * @property {() => void} onCancel
 */

/**
 * @param {AddStudentFormProps} props
 */
function AddStudentForm({ onStudentAdded, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classOptionsWithCounts, setClassOptionsWithCounts] = useState([]);

  // Custom hooks
  const { allClassData, classOptions, allShiftOptions, loadingClasses } = useClassData();
  const { clearCacheForClass } = useStudentCount();
  const {
    fullName, setFullName,
    nameKhmer, setNameKhmer,
    phone, setPhone,
    scheduleType, setScheduleType,
    motherName, setMotherName,
    motherPhone, setMotherPhone,
    fatherName, setFatherName,
    fatherPhone, setFatherPhone,
    photoUrl, setPhotoUrl,
    shift, setShift,
    ay, setAy,
    studentClass, setStudentClass,
    gradeTypeFilter, setGradeTypeFilter,
    discount, setDiscount,
    note, setNote,
    warning, setWarning,
    onWaitlist, setOnWaitlist, // Add waitlist variables
    lateFeePermission, setLateFeePermission, // Add late fee permission variables
    hasTelegramUsername, setHasTelegramUsername,
    telegramUsername, setTelegramUsername,
    isStudentInfoCollapsed, setIsStudentInfoCollapsed,
    isParentInfoCollapsed, setIsParentInfoCollapsed,
    populateFromSheetData,
    getFormData
  } = useStudentForm();

  const scheduleTypeOptions = [
    { value: 'Fix', label: 'Fix' },
    { value: 'Flip-Flop', label: 'Flip-Flop' },
  ];

  // Effect to set grade type filter when adding a student
  useEffect(() => {
    if (studentClass && allClassData && !loadingClasses) {
      const classData = allClassData[studentClass];
      if (classData && classData.type) {
        setGradeTypeFilter(classData.type);
      }
    }
  }, [studentClass, allClassData, loadingClasses]);

  // Effect to validate selected shift against the selected class
  useEffect(() => {
    if (!studentClass || !allClassData || loadingClasses) {
      return;
    }

    const classData = allClassData[studentClass];
    if (classData && classData.shifts) {
      const shiftKeys = Object.keys(classData.shifts);

      if (shiftKeys.length === 1) {
        setShift(shiftKeys[0]);
      } else if (shift && !shiftKeys.includes(shift)) {
        setShift('');
      }
    } else {
      setShift('');
    }
  }, [studentClass, allClassData, loadingClasses, shift]);

  // Effect to update class options with student counts
  useEffect(() => {
    const updateClassOptionsWithCounts = async () => {
      if (!classOptions.length || !allClassData || loadingClasses) {
        setClassOptionsWithCounts(classOptions);
        return;
      }

      // For add mode, apply grade type filter first
      let baseOptions = classOptions;
      if (gradeTypeFilter && allClassData) {
        const filteredClassNames = Object.keys(allClassData).filter(
          (className) => allClassData[className].type === gradeTypeFilter
        );
        baseOptions = filteredClassNames.map((name) => ({
          value: name,
          label: name,
        }));
      }

      const optionsWithCounts = await Promise.all(
        baseOptions.map(async (option) => {
          const className = option.value;
          const classData = allClassData[className];
          
          // If no shift is selected, just show the class name
          if (!shift || !classData?.shifts || !Object.keys(classData.shifts).includes(shift)) {
            return {
              ...option,
              label: className
            };
          }
          
          // If shift is selected and this class has that shift, get student count
          try {
            const studentsRef = collection(db, "students");
            const q = query(
              studentsRef, 
              where("class", "==", className),
              where("shift", "==", shift),
              where("ay", "==", "2026") // Filter by current academic year
            );
            const querySnapshot = await getDocs(q);

            const activeStudents = querySnapshot.docs.filter(doc => {
            const data = doc.data();
            // Return the student if `dropped` is not true.
            // This will include students where `dropped` is false or the field is missing.
            return data.dropped !== true && data.onBreak !== true && data.onWaitlist !== true;
          });

            const count = activeStudents.length;

            return {
              ...option,
              label: `${className} (${count})`
            };
          } catch (error) {
            console.error(`Error fetching count for ${className}-${shift}:`, error);
            return {
              ...option,
              label: className
            };
          }
        })
      );
      
      setClassOptionsWithCounts(optionsWithCounts);
    };

    updateClassOptionsWithCounts();

    // Listen for refresh events
    const handleRefresh = () => {
      updateClassOptionsWithCounts();
    };

    window.addEventListener('refreshClassCounts', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshClassCounts', handleRefresh);
    };
  }, [classOptions, allClassData, shift, loadingClasses, gradeTypeFilter]);

  const filteredClassOptions = useMemo(() => {
    return classOptionsWithCounts;
  }, [classOptionsWithCounts]);

  const availableShiftOptions = useMemo(() => {
    if (!studentClass || !allClassData || loadingClasses) {
      return allShiftOptions;
    }

    const classData = allClassData[studentClass];
    if (classData && classData.shifts) {
      const shiftKeys = Object.keys(classData.shifts);
      return shiftKeys.map(key => ({ value: key, label: key }));
    }

    return [];
  }, [studentClass, allClassData, loadingClasses, allShiftOptions]);

  const handleSheetDataFetched = (data) => {
    populateFromSheetData(data);
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
      const nameQuery = query(studentsRef, where("fullName", "==", fullName));
      // Remove spaces from phone for duplicate check
      const cleanPhone = phone.replace(/\s+/g, '');
      const phoneQuery = query(studentsRef, where("phone", "==", cleanPhone));
      
      const [nameSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(nameQuery),
        phoneQuery ? getDocs(phoneQuery) : Promise.resolve({ docs: [] })
      ]);

      // Check for duplicates
      const hasDuplicateName = nameSnapshot.docs.length > 0;
      const hasDuplicatePhone = cleanPhone && phoneSnapshot.docs.length > 0;

      if (hasDuplicateName) {
        toast.error(`A student with the name "${fullName}" already exists.`);
        setLoading(false);
        return;
      }

      if (hasDuplicatePhone) {
        toast.error(`A student with the phone number "${cleanPhone}" already exists.`);
        setLoading(false);
        return;
      }

      const studentData = getFormData();

      const docRef = await addDoc(collection(db, "students"), { ...studentData, authUid: '', createdAt: serverTimestamp() });
      
      // Clear cache for the class/shift combination
      clearCacheForClass(studentData.class, studentData.shift);
      
      // Refresh class options with updated counts
      setTimeout(() => {
        const updateEvent = new CustomEvent('refreshClassCounts');
        window.dispatchEvent(updateEvent);
      }, 100);
      
      toast.success(`Student '${studentData.fullName}' has been added successfully!`);
      if (onStudentAdded) {
        onStudentAdded(docRef.id);
      }
    } catch (err) {
      console.error("Error saving student: ", err);
      toast.error("Failed to save student. Please try again.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Timestamp Fetcher */}
      <TimestampFetcher 
        onDataFetched={handleSheetDataFetched}
        onError={setError}
      />

      {/* Student Information Section */}
      <CollapsibleSection
        title="Student Information"
        isCollapsed={isStudentInfoCollapsed}
        onToggle={() => setIsStudentInfoCollapsed(!isStudentInfoCollapsed)}
        showOnlyInEditMode={false}
        isEditMode={false}
        className="mt-2"
      >
        {/* Row 1: Full Name and Khmer Name */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-8 md:gap-y-0">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label htmlFor="nameKhmer" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-8 md:gap-y-0 mt-6">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Schedule Type
              </label>
              <div className="relative">
                <div className={`flex bg-gradient-to-r rounded-full p-1 w-fit relative overflow-hidden shadow-inner ${
                  !scheduleType
                    ? 'from-gray-100 to-gray-100 dark:from-gray-800 dark:to-gray-800 border border-gray-300 dark:border-gray-600'
                    : 'from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-gray-200 dark:border-gray-600'
                }`}>
                  {/* Sliding background */}
                  <div
                    className={`absolute top-1 bottom-1 rounded-full shadow-lg transition-all duration-300 ease-out ${
                      !scheduleType
                        ? 'left-1/2 right-1/2 bg-gray-300 dark:bg-gray-600'
                        : scheduleType === 'Flip-Flop'
                        ? 'left-1/2 right-1 bg-gradient-to-r from-purple-400 to-purple-500'
                        : 'left-1 right-1/2 bg-gradient-to-r from-blue-400 to-blue-500'
                    }`}
                  />

                  {/* Fix Option */}
                  <button
                    type="button"
                    onClick={() => setScheduleType('Fix')}
                    className={`relative px-6 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 z-10 flex items-center justify-center min-w-[110px] gap-2 ${
                      !scheduleType
                        ? 'text-gray-500 dark:text-gray-400'
                        : scheduleType === 'Fix'
                        ? 'text-white drop-shadow-sm'
                        : 'text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full transition-colors ${
                      !scheduleType
                        ? 'bg-gray-400'
                        : scheduleType === 'Fix'
                        ? 'bg-white/80'
                        : 'bg-blue-400'
                    }`} />
                    Fix
                  </button>

                  {/* Flip-Flop Option */}
                  <button
                    type="button"
                    onClick={() => setScheduleType('Flip-Flop')}
                    className={`relative px-6 py-1.5 text-sm font-semibold rounded-full transition-all duration-200 z-10 flex items-center justify-center min-w-[110px] gap-2 ${
                      !scheduleType
                        ? 'text-gray-500 dark:text-gray-400'
                        : scheduleType === 'Flip-Flop'
                        ? 'text-white drop-shadow-sm'
                        : 'text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full transition-colors ${
                      !scheduleType
                        ? 'bg-gray-400'
                        : scheduleType === 'Flip-Flop'
                        ? 'bg-white/80'
                        : 'bg-purple-400'
                    }`} />
                    Flip-Flop
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2.5: Telegram Settings */}
          <div className="mt-6 transition-all duration-500 ease-in-out">
            {hasTelegramUsername ? (
              // Full visual version when enabled
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 transform transition-all duration-300 ease-in-out opacity-100 scale-100">
                <div className="flex items-start space-x-4">
                  <div className="flex items-center">
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        id="hasTelegramUsername"
                        checked={hasTelegramUsername}
                        onChange={(e) => {
                          setHasTelegramUsername(e.target.checked);
                          if (!e.target.checked) {
                            setTelegramUsername('');
                          }
                        }}
                        className="sr-only"
                      />
                      <label
                        htmlFor="hasTelegramUsername"
                        className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          hasTelegramUsername ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                            hasTelegramUsername ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label htmlFor="hasTelegramUsername" className="text-sm font-medium text-blue-800 dark:text-blue-200 cursor-pointer">
                      Student has Telegram account
                    </label>
                    <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                      Enable this to allow Telegram communication with the student
                    </p>

                    {hasTelegramUsername && (
                      <div className="mt-4 transform transition-all duration-300 ease-in-out">
                        <label htmlFor="telegramUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Telegram Username
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">@</span>
                          </div>
                          <input
                            type="text"
                            id="telegramUsername"
                            name="telegramUsername"
                            value={telegramUsername}
                            onChange={(e) => setTelegramUsername(e.target.value)}
                            placeholder="username"
                            className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black transition-all duration-200 ease-in-out"
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Enter the username without @ symbol (e.g., john_doe)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // Minimal toggle when disabled
              <div className="flex items-center space-x-3 transform transition-all duration-300 ease-in-out opacity-100 scale-100">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    id="hasTelegramUsername"
                    checked={hasTelegramUsername}
                    onChange={(e) => {
                      setHasTelegramUsername(e.target.checked);
                      if (!e.target.checked) {
                        setTelegramUsername('');
                      }
                    }}
                    className="sr-only"
                  />
                  <label
                    htmlFor="hasTelegramUsername"
                    className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      hasTelegramUsername ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                        hasTelegramUsername ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </label>
                </div>
                <div>
                  <label htmlFor="hasTelegramUsername" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Enable Telegram integration
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Allow Telegram communication with this student
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Waitlist Option */}
          <div className="mt-6">
            <div className="flex items-center">
              <input
                id="onWaitlist"
                name="onWaitlist"
                type="checkbox"
                checked={onWaitlist}
                onChange={(e) => setOnWaitlist(e.target.checked)}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="onWaitlist" className="ml-2 block text-sm text-gray-900 dark:text-gray-100">
                Add to Waitlist
              </label>
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Check this box to add the student to the waitlist instead of enrolling them immediately
            </p>
          </div>

          {/* Row 3: Class and Shift */}
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-8 md:gap-y-0 relative z-50 mt-6">
            <div className="relative z-[60]">
              <CustomDropdown
                label="Class"
                id="class"
                value={studentClass}
                onChange={setStudentClass}
                options={filteredClassOptions}
                placeholder={loadingClasses ? "Loading classes..." : "Select Class"}
                disabled={loadingClasses}
                required
                searchable
              />
            </div>
            <div className="relative z-[50]">
              <CustomDropdown
                label="Shift"
                id="shift"
                value={shift}
                onChange={setShift}
                options={availableShiftOptions}
                placeholder={loadingClasses ? "Loading..." : "Select Shift"}
                disabled={loadingClasses}
                required
              />
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Parent Information Section */}
      <CollapsibleSection
        title="Parent/Guardian Information"
        isCollapsed={isParentInfoCollapsed}
        onToggle={() => setIsParentInfoCollapsed(!isParentInfoCollapsed)}
        showOnlyInEditMode={false}
        isEditMode={false}
        className="relative z-0"
      >
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-8 md:gap-y-0">
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
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-8 md:gap-y-0 mt-6">
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
      </CollapsibleSection>
      
      {/* Row 5: Photo URL and Preview */}
     
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
        <PhotoPreview photoUrl={photoUrl} />

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
          {loading ? 'Adding...' : 'Add Student'}
        </button>
      </div>
    </form>
  );
}

export default AddStudentForm;