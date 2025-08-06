import { useState, useEffect } from 'react';

export const useStudentForm = (initialData) => {
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
  const [ay, setAy] = useState('2026');
  const [studentClass, setStudentClass] = useState('');
  const [gradeTypeFilter, setGradeTypeFilter] = useState('');
  const [discount, setDiscount] = useState('');
  const [note, setNote] = useState('');
  const [warning, setWarning] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Collapse states for edit mode
  const [isStudentInfoCollapsed, setIsStudentInfoCollapsed] = useState(true);
  const [isParentInfoCollapsed, setIsParentInfoCollapsed] = useState(true);

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
      setDiscount(initialData.discount ? initialData.discount.toString() : '');
      setNote(initialData.note || '');
      setWarning(initialData.warning || false);
      // Default to collapsed in edit mode
      setIsStudentInfoCollapsed(true);
      setIsParentInfoCollapsed(true);
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
      setDiscount('');
      setNote('');
      setWarning(false);
      setGradeTypeFilter('');
      // Not collapsed in create mode
      setIsStudentInfoCollapsed(false);
      setIsParentInfoCollapsed(false);
    }
  }, [initialData]);

  const populateFromSheetData = (data) => {
    const gradeFromSheet = data.grade || '';
    setGradeTypeFilter(gradeFromSheet);
    setFullName(data.name || '');
    setNameKhmer(data.nameKhmer || '');
    setPhone(data.phoneNumber || '');
    setStudentClass('');
    setShift(data.shift || '');
    setScheduleType(data.school || '');
    setMotherName(data.motherName || '');
    setMotherPhone(data.motherPhone || '');
    setFatherName(data.fatherName || '');
    setFatherPhone(data.fatherPhone || '');
    setPhotoUrl(data.photoUrl || '');
  };

  const getFormData = () => {
    const data = {
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
      dropped: false, // Default to false for new students
    };

    // Only add fields if they have values (avoid undefined)
    if (discount && discount.trim() !== '') {
      data.discount = parseFloat(discount);
    }
    
    if (note && note.trim() !== '') {
      data.note = note;
    }
    
    // Warning is a boolean, so we always include it
    data.warning = warning;

    return data;
  };

  return {
    // Form state
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
    
    // Collapse states
    isStudentInfoCollapsed, setIsStudentInfoCollapsed,
    isParentInfoCollapsed, setIsParentInfoCollapsed,
    
    // Helper functions
    populateFromSheetData,
    getFormData
  };
};
