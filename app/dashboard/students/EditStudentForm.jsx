import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase-config';
import { collection, setDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { mdiInformation, mdiClockOutline, mdiAlertCircle, mdiCash } from '@mdi/js';
import Icon from '../../_components/Icon';

// Components
import CustomDropdown from './components/CustomDropdown';
import CollapsibleSection from './components/CollapsibleSection';

// Hooks
import { useClassData } from './hooks/useClassData';
import { useStudentForm } from './hooks/useStudentForm';
import { useStudentCount } from './hooks/useStudentCount';

// Utilities
import { getClassCapacityInfo, formatClassLabelWithCapacityAndSchedule, canEnrollInClass, getScheduleTypeStats } from './utils/classCapacity';

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
  const [capacityWarning, setCapacityWarning] = useState(null);
  const [enrollmentCheck, setEnrollmentCheck] = useState(null);

  // Custom hooks
  const { allClassData, classOptions, allShiftOptions, loadingClasses } = useClassData();
  const { clearCacheForClass } = useStudentCount();
  const {
    fullName, setFullName,
    nameKhmer, setNameKhmer,
    phone, setPhone,
    scheduleType, setScheduleType,
    birthDay, setBirthDay,
    birthMonth, setBirthMonth,
    birthYear, setBirthYear,
    motherName, setMotherName,
    motherPhone, setMotherPhone,
    fatherName, setFatherName,
    fatherPhone, setFatherPhone,
    shift, setShift,
    studentClass, setStudentClass,
    _, setGradeTypeFilter,
    discount, setDiscount,
    note, setNote,
    warning, setWarning,
    onWaitlist, setOnWaitlist, // Add waitlist functionality
    lateFeePermission, setLateFeePermission, // Add late fee permission variables
    hasTelegramUsername, setHasTelegramUsername,
    telegramUsername, setTelegramUsername,
    isStudentInfoCollapsed, setIsStudentInfoCollapsed,
    isParentInfoCollapsed, setIsParentInfoCollapsed,
    getFormData
  } = useStudentForm(studentData);

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

  // Effect to check enrollment eligibility when class and shift are selected
  useEffect(() => {
    const checkEnrollmentEligibility = async () => {
      if (!studentClass || !shift) {
        setEnrollmentCheck(null);
        setCapacityWarning(null);
        return;
      }

      try {
        const enrollmentResult = await canEnrollInClass(studentClass, shift, onWaitlist, studentData?.id);
        setEnrollmentCheck(enrollmentResult);

        // For editing existing students, only show capacity warnings if they're moving to a different class/shift
        const isMovingToDifferentClass = studentData?.class !== studentClass || studentData?.shift !== shift;

        if (!enrollmentResult.canEnroll && !onWaitlist && isMovingToDifferentClass) {
          setCapacityWarning(enrollmentResult.message);
        } else {
          setCapacityWarning(null);
        }
      } catch (error) {
        console.error('Error checking enrollment eligibility:', error);
        setEnrollmentCheck(null);
        setCapacityWarning(null);
      }
    };

    checkEnrollmentEligibility();
  }, [studentClass, shift, onWaitlist, studentData?.id]);

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
          
          // If shift is selected and this class has that shift, get capacity info
          try {
            const capacityInfo = await getClassCapacityInfo(className, shift, studentData?.id);
            const scheduleTypeStats = await getScheduleTypeStats(className, shift);
            const formattedLabel = formatClassLabelWithCapacityAndSchedule(className, capacityInfo, scheduleTypeStats);

            return {
              ...option,
              label: formattedLabel,
              capacityInfo
            };
          } catch (error) {
            console.error(`Error fetching capacity for ${className}-${shift}:`, error);
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

    // Check class capacity before proceeding (only if not on waitlist and class/shift changed)
    const classChanged = studentData.class !== studentClass || studentData.shift !== shift;
    if (!onWaitlist && classChanged) {
      try {
        const enrollmentResult = await canEnrollInClass(studentClass, shift, false, studentData.id);
        if (!enrollmentResult.canEnroll) {
          toast.error(enrollmentResult.message);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error checking class capacity:', error);
        toast.error('Failed to verify class capacity. Please try again.');
        setLoading(false);
        return;
      }
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
      
      // Update parentNotifications collection if student name changed
      const nameChanged = (studentData.fullName !== updatedStudentData.fullName) || 
                         (studentData.nameKhmer !== updatedStudentData.nameKhmer);
      
      if (nameChanged) {
        try {
          // Query all parentNotifications for this student
          const parentNotificationsRef = collection(db, "parentNotifications");
          const parentQuery = query(parentNotificationsRef, where("studentId", "==", studentData.id));
          const parentSnapshot = await getDocs(parentQuery);
          
          // Update each parent notification document
          const updatePromises = parentSnapshot.docs.map(doc => {
            const updateData = {};
            if (studentData.fullName !== updatedStudentData.fullName) {
              updateData.studentName = updatedStudentData.fullName;
            }
            if (studentData.nameKhmer !== updatedStudentData.nameKhmer) {
              updateData.studentKhmerName = updatedStudentData.nameKhmer || null;
            }
            return setDoc(doc.ref, updateData, { merge: true });
          });
          
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
            console.log(`Updated ${updatePromises.length} parent notification records for student ${updatedStudentData.fullName}`);
          }
        } catch (error) {
          console.error("Error updating parent notifications:", error);
          // Don't fail the entire operation if parent notifications update fails
          toast.warning("Student updated successfully, but there was an issue updating parent notification records.");
        }
      }
      
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-7xl mx-auto">
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

          {/* Row 2: Phone and Date of Birth */}
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
                Date of Birth
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    type="number"
                    placeholder="DD"
                    value={birthDay}
                    onChange={(e) => setBirthDay(e.target.value)}
                    min="1"
                    max="31"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black text-center"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">Day</p>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="MM"
                    value={birthMonth}
                    onChange={(e) => setBirthMonth(e.target.value)}
                    min="1"
                    max="12"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black text-center"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">Month</p>
                </div>
                <div>
                  <input
                    type="number"
                    placeholder="YYYY"
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    min="1900"
                    max="2030"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black text-center"
                  />
                  <p className="text-xs text-gray-500 mt-1 text-center">Year</p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 3: Schedule Type */}
          <div className="grid grid-cols-1 md:grid-cols-1 md:gap-x-8 gap-y-8 md:gap-y-0 mt-6">
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

          {/* Row 4: Telegram Settings */}
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
            <div className={`bg-gradient-to-r rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${
              onWaitlist
                ? 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800 hover:border-orange-300 dark:hover:border-orange-700'
                : 'from-gray-50 to-gray-50 dark:from-gray-800 dark:to-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
              <div className="flex items-start space-x-4">
                <div className="flex items-center">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      id="onWaitlist"
                      checked={onWaitlist}
                      onChange={(e) => setOnWaitlist(e.target.checked)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="onWaitlist"
                      className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
                        onWaitlist ? 'bg-orange-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                          onWaitlist ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Icon path={mdiClockOutline} size={16} className={`transition-colors duration-200 ${
                      onWaitlist ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'
                    }`} />
                    <label htmlFor="onWaitlist" className={`text-sm font-medium cursor-pointer transition-colors duration-200 ${
                      onWaitlist
                        ? 'text-orange-800 dark:text-orange-200'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Add to Waitlist
                    </label>
                    {onWaitlist && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 animate-in fade-in duration-300">
                        Waitlisted
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-xs transition-colors duration-200 ${
                    onWaitlist
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {onWaitlist
                      ? 'Student is currently on the waitlist and can be enrolled later when space becomes available'
                      : 'Enable this to add the student to the waitlist instead of keeping them enrolled'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Row 5: Class and Shift */}
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

          {/* Class Capacity Warning */}
          {capacityWarning && !onWaitlist && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start">
                <Icon path={mdiAlertCircle} size={1} className="text-red-600 dark:text-red-400 mr-3 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-red-800 dark:text-red-300 font-medium">Class Full</p>
                  <p className="text-red-700 dark:text-red-400 text-sm mt-1">{capacityWarning}</p>
                </div>
              </div>
            </div>
          )}

          {/* Enrollment Info */}
          {enrollmentCheck && enrollmentCheck.canEnroll && !onWaitlist && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-300 text-sm">
                ✓ {enrollmentCheck.message}
              </p>
            </div>
          )}

          {/* Waitlist Info */}
          {onWaitlist && studentClass && shift && (
            <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <p className="text-orange-800 dark:text-orange-300 text-sm">
                ℹ️ Student will remain on the waitlist for this class
              </p>
            </div>
          )}
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
              <div className={`bg-gradient-to-r rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${
                lateFeePermission
                  ? 'from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                  : 'from-gray-50 to-gray-50 dark:from-gray-800 dark:to-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}>
                <div className="flex items-start space-x-4">
                  <div className="flex items-center">
                    <div className="relative inline-flex items-center">
                      <input
                        type="checkbox"
                        id="lateFeePermission"
                        name="lateFeePermission"
                        checked={lateFeePermission}
                        onChange={(e) => setLateFeePermission(e.target.checked)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="lateFeePermission"
                        className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                          lateFeePermission ? 'bg-emerald-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                            lateFeePermission ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Icon path={mdiCash} size={16} className={`transition-colors duration-200 ${
                        lateFeePermission ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                      }`} />
                      <label htmlFor="lateFeePermission" className={`text-sm font-medium cursor-pointer transition-colors duration-200 ${
                        lateFeePermission
                          ? 'text-emerald-800 dark:text-emerald-200'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        Late Fee Permission
                      </label>
                      {lateFeePermission && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 animate-in fade-in duration-300">
                          Allowed
                        </span>
                      )}
                    </div>
                    <p className={`mt-1 text-xs transition-colors duration-200 ${
                      lateFeePermission
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {lateFeePermission
                        ? 'This student can pay late without 5$ fee'
                        : 'Enable this to allow charging late fees for this student'
                      }
                    </p>
                  </div>
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
            <div className={`bg-gradient-to-r rounded-xl p-4 border transition-all duration-200 hover:shadow-md ${
              warning
                ? 'from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800 hover:border-red-300 dark:hover:border-red-700'
                : 'from-gray-50 to-gray-50 dark:from-gray-800 dark:to-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}>
              <div className="flex items-start space-x-4">
                <div className="flex items-center">
                  <div className="relative inline-flex items-center">
                    <input
                      type="checkbox"
                      id="warning"
                      name="warning"
                      checked={warning}
                      onChange={(e) => setWarning(e.target.checked)}
                      className="sr-only"
                    />
                    <label
                      htmlFor="warning"
                      className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                        warning ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition duration-200 ease-in-out ${
                          warning ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <Icon path={mdiAlertCircle} size={16} className={`transition-colors duration-200 ${
                      warning ? 'text-red-600 dark:text-red-400' : 'text-gray-400'
                    }`} />
                    <label htmlFor="warning" className={`text-sm font-medium cursor-pointer transition-colors duration-200 ${
                      warning
                        ? 'text-red-800 dark:text-red-200'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Student Warning
                    </label>
                    {warning && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 animate-in fade-in duration-300">
                        ⚠️ Flagged
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-xs transition-colors duration-200 ${
                    warning
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {warning
                      ? 'Student is flagged for special attention and close monitoring'
                      : 'Enable this to flag students who need extra supervision or have behavioral concerns'
                    }
                  </p>
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
          disabled={loading || (enrollmentCheck && !enrollmentCheck.canEnroll && !onWaitlist && (studentData?.class !== studentClass || studentData?.shift !== shift))}
          className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Updating...' : 'Update Student'}
        </button>
      </div>
    </form>
  );
}

export default EditStudentForm;
