import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase-config';
import { collection, setDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { mdiInformation } from '@mdi/js';
import Icon from '../../_components/Icon';

// Components
import CustomDropdown from './components/CustomDropdown';
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
 * @typedef {object} EditStudentFormProps
 * @property {(id: string) => void} onStudentUpdated
 * @property {() => void} onCancel
 * @property {Student} studentData - Required for edit form
 */

/**
 * @param {EditStudentFormProps} props
 */
function EditStudentForm({ onStudentUpdated, onCancel, studentData }) {
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
    lateFeePermission, setLateFeePermission, // Add late fee permission variables
    hasTelegramUsername, setHasTelegramUsername,
    telegramUsername, setTelegramUsername,
    isStudentInfoCollapsed, setIsStudentInfoCollapsed,
    isParentInfoCollapsed, setIsParentInfoCollapsed,
    getFormData
  } = useStudentForm(studentData);

  const scheduleTypeOptions = [
    { value: 'Fix', label: 'Fix' },
    { value: 'Flip-Flop', label: 'Flip-Flop' },
  ];

  // Effect to set grade type filter when editing a student
  useEffect(() => {
    if (studentClass && allClassData && !loadingClasses) {
      const classData = allClassData[studentClass];
      if (classData && classData.type) {
        setGradeTypeFilter(classData.type);
      }
    }
  }, [studentClass, allClassData, loadingClasses, setGradeTypeFilter]);

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
  }, [studentClass, allClassData, loadingClasses, shift, setShift]);

  // Effect to update class options with student counts
  useEffect(() => {
    const updateClassOptionsWithCounts = async () => {
      if (!classOptions.length || !allClassData || loadingClasses) {
        setClassOptionsWithCounts(classOptions);
        return;
      }

      const optionsWithCounts = await Promise.all(
        classOptions.map(async (option) => {
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

            let count = activeStudents.length;

            // If we need to exclude a specific student (for edit mode)
            if (studentData?.id) {
              const hasExcludedStudent = querySnapshot.docs.some(doc => doc.id === studentData.id);
              if (hasExcludedStudent) {
                count -= 1;
              }
            }
            
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
  }, [classOptions, allClassData, shift, loadingClasses, studentData?.id]);

  // Always show all class options for better search functionality
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

  const handleDiscountChange = (e) => {
    const value = e.target.value;
    // Allow empty string or valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setDiscount(value);
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
      // Check for duplicates, excluding the current student
      const studentsRef = collection(db, "students");
      const nameQuery = query(studentsRef, where("fullName", "==", fullName));
      const phoneQuery = query(studentsRef, where("phone", "==", phone));
      
      const [nameSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(phoneQuery)
      ]);

      // Check for duplicates, excluding the current student
      const hasDuplicateName = nameSnapshot.docs.length > 0 && nameSnapshot.docs.some(doc => {
        const docData = doc.data();
        return doc.id !== studentData.id && docData.fullName === fullName;
      });
      
      const hasDuplicatePhone = phone && phoneSnapshot.docs.length > 0 && phoneSnapshot.docs.some(doc => {
        const docData = doc.data();
        return doc.id !== studentData.id && docData.phone === phone;
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

      const updatedStudentData = getFormData();

      const studentRef = doc(db, "students", studentData.id);
      await setDoc(studentRef, { ...updatedStudentData, updatedAt: serverTimestamp() }, { merge: true });
      
      // Clear cache for both old and new class/shift combinations if they changed
      if (studentData.class !== updatedStudentData.class || studentData.shift !== updatedStudentData.shift) {
        clearCacheForClass(studentData.class, studentData.shift); // Old combination
        clearCacheForClass(updatedStudentData.class, updatedStudentData.shift); // New combination
        
        // Refresh class options with updated counts
        setTimeout(() => {
          const updateEvent = new CustomEvent('refreshClassCounts');
          window.dispatchEvent(updateEvent);
        }, 100);
      } else {
        clearCacheForClass(updatedStudentData.class, updatedStudentData.shift);
        
        // Refresh class options with updated counts
        setTimeout(() => {
          const updateEvent = new CustomEvent('refreshClassCounts');
          window.dispatchEvent(updateEvent);
        }, 100);
      }
      
      toast.success(`Student '${updatedStudentData.fullName}' has been updated successfully!`);
      
      if (onStudentUpdated) {
        onStudentUpdated(studentData.id);
      }
    } catch (err) {
      console.error("Error updating student: ", err);
      toast.error("Failed to update student. Please try again.");
      setError("Failed to update student. Please try again.");
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Student Information Section */}
      <CollapsibleSection
        title="Student Information"
        isCollapsed={!isStudentInfoCollapsed}
        onToggle={() => setIsStudentInfoCollapsed(!isStudentInfoCollapsed)}
        showOnlyInEditMode={true}
        isEditMode={true}
        className="space-y-6"
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
            <CustomDropdown
              label="Schedule Type"
              id="scheduleType"
              value={scheduleType}
              onChange={setScheduleType}
              options={scheduleTypeOptions}
              placeholder="Select Type"
            />
          </div>

          {/* Row 2.5: Telegram Settings */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-6">
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
                  <div className="mt-4">
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
                        className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-black"
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
        showOnlyInEditMode={true}
        isEditMode={true}
        className="relative z-0"
      >
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-8 md:gap-y-0">
          <div>
            <label htmlFor="motherName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label htmlFor="motherPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label htmlFor="fatherName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
            <label htmlFor="fatherPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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

      {/* Admin Information Section (modernized) */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admin Information</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Administrative settings for billing and internal notes.</p>
            </div>
            <div className="hidden sm:flex items-center space-x-3">
              <Icon path={mdiInformation} size={20} className="text-gray-400" />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Discount */}
            <div className="space-y-2">
              <label htmlFor="discount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Discount Amount ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="discount"
                  name="discount"
                  value={discount}
                  onChange={handleDiscountChange}
                  placeholder="0.00"
                  className="block w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white"
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Enter discount amount in USD (e.g., 10.50)</p>
            </div>

            {/* Late Fee Permission */}
            <div className="flex flex-col justify-between">
              <div className="flex items-start justify-between">
                <div>
                  <label htmlFor="lateFeePermission" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Allow Late Fee Charges</label>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enable to allow charging late fees for this student.</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      id="lateFeePermission"
                      name="lateFeePermission"
                      type="checkbox"
                      checked={lateFeePermission}
                      onChange={(e) => setLateFeePermission(e.target.checked)}
                      className="sr-only"
                      aria-checked={lateFeePermission}
                    />
                    <div
                      role="switch"
                      aria-checked={lateFeePermission}
                      onClick={() => setLateFeePermission(!lateFeePermission)}
                      className={`w-12 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${lateFeePermission ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      <div className={`bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-200 ${lateFeePermission ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                  </div>

                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lateFeePermission ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                    {lateFeePermission ? 'Allowed' : '5$ Fee'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Admin Note</label>
            <textarea
              id="note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any administrative notes here..."
              className="mt-1 block w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-gray-900 dark:text-white resize-none"
            />
          </div>

          <div className="mt-6">
            <label htmlFor="warning" className="block text-sm font-medium text-red-700 dark:text-red-400 mb-3">Student Warning</label>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start space-x-4">
                <input
                  type="checkbox"
                  id="warning"
                  name="warning"
                  checked={warning}
                  onChange={(e) => setWarning(e.target.checked)}
                  className="h-5 w-5 text-red-600 border-red-300 rounded focus:ring-red-500 focus:ring-2 mt-0.5"
                />
                <div className="flex-1">
                  <label htmlFor="warning" className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer">This student requires special attention or close monitoring</label>
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">Check this box to flag students who need extra supervision or have behavioral concerns. This will display a warning badge in the student details.</p>
                </div>
              </div>
            </div>
          </div>
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
          {loading ? 'Updating...' : 'Update Student'}
        </button>
      </div>
    </form>
  );
}

export default EditStudentForm;
