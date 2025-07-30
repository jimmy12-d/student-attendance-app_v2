import { Student } from "../../../_interfaces";

// Phone formatting utility
export const formatPhoneNumber = (phone: string | undefined | null): string => {
  if (!phone) return 'N/A';
  const cleaned = ('' + phone).replace(/\D/g, '');

  let digits = cleaned;
  // Standardize to 10 digits if it's a 9-digit number missing the leading 0
  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }
  
  // Format 10-digit numbers (0XX-XXX-XXXX)
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // Format 9-digit numbers (0XX-XXX-XXX)
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  }
  
  return phone; // Return original if it doesn't match formats
};

// Helper function to convert Google Drive link to a direct image link
export const getDisplayableImageUrl = (url: string | undefined) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  if (url.includes("drive.google.com")) {
    // Regex to find the file ID from various Google Drive URL formats
    const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }
  
  return url;
};

// Group students by class and shift
export const groupStudentsByClassAndShift = (students: Student[]) => {
  const shiftOrder: ('Morning' | 'Afternoon' | 'Evening')[] = ['Morning', 'Afternoon', 'Evening'];
  
  // Filter out students who are missing a class property
  const validStudents = students.filter(student => student.class);

  // Group students by class, then by shift
  const groupedStudents = validStudents.reduce((acc, student) => {
    const { class: studentClass, shift } = student;
    if (!acc[studentClass]) {
      acc[studentClass] = { Morning: [], Afternoon: [], Evening: [] };
    }
    if (shift && shiftOrder.includes(shift as any)) {
      acc[studentClass][shift as 'Morning' | 'Afternoon' | 'Evening'].push(student);
    }
    return acc;
  }, {} as Record<string, { Morning: Student[]; Afternoon: Student[]; Evening: Student[] }>);

  // Sort students by fullName within each class and shift
  for (const classGroup of Object.values(groupedStudents)) {
    shiftOrder.forEach(shift => {
      if (classGroup[shift]) {
        classGroup[shift].sort((a, b) => a.fullName.localeCompare(b.fullName));
      }
    });
  }

  return groupedStudents;
};

// Partition classes into day and evening shifts
export const partitionClasses = (groupedStudents: Record<string, { Morning: Student[]; Afternoon: Student[]; Evening: Student[] }>) => {
  const dayShiftClasses: string[] = [];
  const eveningShiftClasses: string[] = [];

  const sortedAllClasses = Object.keys(groupedStudents).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  sortedAllClasses.forEach(className => {
    const group = groupedStudents[className];
    if (group.Morning.length > 0 || group.Afternoon.length > 0) {
      dayShiftClasses.push(className);
    }
    if (group.Evening.length > 0) {
      eveningShiftClasses.push(className);
    }
  });

  return { dayShiftClasses, eveningShiftClasses };
};
