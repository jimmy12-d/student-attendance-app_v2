import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase-config';
import { collection, addDoc, setDoc, doc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { toast } from 'sonner';

// Components
import TimestampFetcher from './components/TimestampFetcher';
import CustomDropdown from './components/CustomDropdown';
import PhotoPreview from './components/PhotoPreview';
import CollapsibleSection from './components/CollapsibleSection';

// Hooks
import { useClassData } from './hooks/useClassData';
import { useStudentForm } from './hooks/useStudentForm';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Custom hooks
  const { allClassData, classOptions, allShiftOptions, loadingClasses } = useClassData();
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
    isEditMode,
    isStudentInfoCollapsed, setIsStudentInfoCollapsed,
    isParentInfoCollapsed, setIsParentInfoCollapsed,
    populateFromSheetData,
    getFormData
  } = useStudentForm(initialData);

  const scheduleTypeOptions = [
    { value: 'Fix', label: 'Fix' },
    { value: 'Flip-Flop', label: 'Flip-Flop' },
  ];

  // Effect to set grade type filter when editing a student
  useEffect(() => {
    if (isEditMode && studentClass && allClassData && !loadingClasses) {
      const classData = allClassData[studentClass];
      if (classData && classData.type) {
        setGradeTypeFilter(classData.type);
      }
    }
  }, [isEditMode, studentClass, allClassData, loadingClasses]);

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

  const filteredClassOptions = useMemo(() => {
    let options = classOptions;

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
  }, [classOptions, allClassData, gradeTypeFilter]);

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
      // Check for duplicates
      const studentsRef = collection(db, "students");
      const nameQuery = query(studentsRef, where("fullName", "==", fullName));
      const phoneQuery = query(studentsRef, where("phone", "==", phone));
      
      const [nameSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(phoneQuery)
      ]);

      // Check for duplicates, excluding the current student in edit mode
      const hasDuplicateName = nameSnapshot.docs.length > 0 && nameSnapshot.docs.some(doc => {
        const docData = doc.data();
        if (isEditMode && initialData?.id) {
          return doc.id !== initialData.id && docData.fullName === fullName;
        }
        return docData.fullName === fullName;
      });
      
      const hasDuplicatePhone = phone && phoneSnapshot.docs.length > 0 && phoneSnapshot.docs.some(doc => {
        const docData = doc.data();
        if (isEditMode && initialData?.id) {
          return doc.id !== initialData.id && docData.phone === phone;
        }
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

      const studentData = getFormData();

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Timestamp Fetcher */}
      {!isEditMode && (
        <TimestampFetcher 
          onDataFetched={handleSheetDataFetched}
          onError={setError}
        />
      )}

      {/* Student Information Section */}
      <CollapsibleSection
        title="Student Information"
        isCollapsed={isStudentInfoCollapsed}
        onToggle={() => setIsStudentInfoCollapsed(!isStudentInfoCollapsed)}
        showOnlyInEditMode={true}
        isEditMode={isEditMode}
        className="space-y-6"
      >
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
      </CollapsibleSection>

      {/* Parent Information Section */}
      <CollapsibleSection
        title="Parent/Guardian Information"
        isCollapsed={isParentInfoCollapsed}
        onToggle={() => setIsParentInfoCollapsed(!isParentInfoCollapsed)}
        showOnlyInEditMode={true}
        isEditMode={isEditMode}
        className="pt-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6 gap-y-6 md:gap-y-0">
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
      </CollapsibleSection>

      {/* Admin Section - Only show in edit mode */}
      {isEditMode && (
        <div className="pt-6">
          <p className="text-lg font-semibold text-gray-800 dark:text-white">Admin Information</p>
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-6">
              <div>
                <label htmlFor="discount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Discount Amount ($)
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
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
                    className="block w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Enter discount amount in USD (e.g., 10.50)
                </p>
              </div>
            </div>
            <div>
              <label htmlFor="note" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
      )}
      
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
        <PhotoPreview photoUrl={photoUrl} />
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