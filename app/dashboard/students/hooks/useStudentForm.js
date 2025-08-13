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
  const [onWaitlist, setOnWaitlist] = useState(false); // Add waitlist state
  const [hasTelegramUsername, setHasTelegramUsername] = useState(true);
  const [telegramUsername, setTelegramUsername] = useState('');
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
      setOnWaitlist(initialData.onWaitlist || false); // Initialize waitlist from data
      setHasTelegramUsername(initialData.hasTelegramUsername !== undefined ? initialData.hasTelegramUsername : true);
      setTelegramUsername(initialData.telegramUsername || '');
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
      setHasTelegramUsername(true);
      setTelegramUsername('');
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
      hasTelegramUsername: true, // Default to true for new students
      telegramUsername: '', // Default to empty string - needs to be filled later
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
    
    // Waitlist is a boolean, so we always include it
    data.onWaitlist = onWaitlist;
    
    // If adding to waitlist, set waitlistDate to current timestamp
    if (onWaitlist) {
      data.waitlistDate = new Date();
    }

    // Telegram fields
    data.hasTelegramUsername = hasTelegramUsername;
    if (hasTelegramUsername && telegramUsername.trim() !== '') {
      data.telegramUsername = telegramUsername.trim();
    } else if (!hasTelegramUsername) {
      // If hasTelegramUsername is false, remove telegramUsername field
      data.telegramUsername = null;
    } else {
      // If hasTelegramUsername is true but no username provided, set empty string
      data.telegramUsername = '';
    }

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
    onWaitlist, setOnWaitlist, // Add waitlist to exports
    hasTelegramUsername, setHasTelegramUsername,
    telegramUsername, setTelegramUsername,
    isEditMode,
    
    // Collapse states
    isStudentInfoCollapsed, setIsStudentInfoCollapsed,
    isParentInfoCollapsed, setIsParentInfoCollapsed,
    
    // Helper functions
    populateFromSheetData,
    getFormData
  };
};
