import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase-config';
import { collection, setDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

// Components
import CustomDropdown from './components/CustomDropdown';
import CollapsibleSection from './components/CollapsibleSection';

// Hooks
import { useClassData } from './hooks/useClassData';
import { useStudentForm } from './hooks/useStudentForm';
import { useStudentCounts } from './hooks/useStudentCounts';

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
 * @property {number} [scholarship]
 * @property {string} [note]
 * @property {boolean} [warning]
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

  // Custom hooks
  const { allClassData, classOptions, allShiftOptions, loadingClasses } = useClassData();
  const { studentCounts, loadingCounts, getClassCountText } = useStudentCounts();
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
    scholarship, setScholarship,
    note, setNote,
    warning, setWarning,
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

  // Always show all class options for better search functionality
  const filteredClassOptions = useMemo(() => {
    if (loadingCounts) {
      return classOptions;
    }
    
    return classOptions.map(option => ({
      ...option,
      label: `${option.label}${getClassCountText(option.value, shift)}`
    }));
  }, [classOptions, loadingCounts, getClassCountText, shift]);

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

  const handleScholarshipChange = (e) => {
    const value = e.target.value;
    // Allow empty string or valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setScholarship(value);
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

        {/* Row 2.5: Academic Year */}
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8 gap-y-8 md:gap-y-0 mt-6">
          <div>
            <label htmlFor="ay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
      </CollapsibleSection>

      {/* Parent Information Section */}
      <CollapsibleSection
        title="Parent/Guardian Information"
        isCollapsed={isParentInfoCollapsed}
        onToggle={() => setIsParentInfoCollapsed(!isParentInfoCollapsed)}
        showOnlyInEditMode={true}
        isEditMode={true}
        className="pt-4 relative z-0"
      >
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
      </CollapsibleSection>

      {/* Admin Information Section */}
      <div className="pt-4">
        <p className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Admin Information</p>
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
            <div>
              <label htmlFor="scholarship" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scholarship Amount ($)
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="text"
                  id="scholarship"
                  name="scholarship"
                  value={scholarship}
                  onChange={handleScholarshipChange}
                  placeholder="0.00"
                  className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter scholarship amount in USD (e.g., 10.50)
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Admin Note
            </label>
            <textarea
              id="note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any administrative notes here..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black resize-none"
            />
          </div>
          <div>
            <label htmlFor="warning" className="block text-sm font-medium text-red-700 dark:text-red-400 mb-3">
              Student Warning
            </label>
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
                  <label htmlFor="warning" className="text-sm font-medium text-red-800 dark:text-red-200 cursor-pointer">
                    This student requires special attention or close monitoring
                  </label>
                  <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    Check this box to flag students who need extra supervision or have behavioral concerns. This will display a warning badge in the student details.
                  </p>
                </div>
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
