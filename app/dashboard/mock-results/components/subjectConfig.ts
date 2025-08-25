/**
 * Subject Configuration Utilities
 * Handles subject mapping, ordering, and labels for different grade types
 */

// Define subject orders for different grade types
export const GRADE_12_SCIENCE_ORDER = ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history', 'english']; // Math, Khmer, Chemistry, Physics, Biology, History, English
export const GRADE_12_SOCIAL_ORDER = ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history', 'english']; // Math(khmer field), Khmer(math field), History, Moral, Geography, Earth, English
export const ALL_SUBJECT_ORDER = ['math', 'khmer', 'chemistry', 'physics', 'biology', 'history', 'english'];

// Subject mapping - Different subjects for different grades
export const GRADE_12_SCIENCE_LABELS: { [key: string]: string } = {
  math: 'Math',         // Math field contains Math scores for Grade 12
  khmer: 'Khmer',       // Khmer field contains Khmer scores for Grade 12
  chemistry: 'Chemistry',
  physics: 'Physics',
  biology: 'Biology',
  history: 'History',
  english: 'English',
};

export const GRADE_12_SOCIAL_LABELS: { [key: string]: string } = {
  math: 'Khmer',        // Math field contains Khmer scores for Grade 12 Social
  khmer: 'Math',        // Khmer field contains Math scores for Grade 12 Social
  chemistry: 'History', 
  physics: 'Moral',
  biology: 'Geography',
  history: 'Earth',
  english: 'English',
};

// Get current subject labels based on selected grade
export const getCurrentSubjectLabels = (selectedGrade: string) => {
  if (selectedGrade === 'Grade 12') {
    return GRADE_12_SCIENCE_LABELS;
  } else if (selectedGrade === 'Grade 12 Social') {
    return GRADE_12_SOCIAL_LABELS;
  } else {
    // For "All" filter - use abbreviated combined format
    return {
      math: 'Math/Khm',     // Math field: Math for Science, Khmer for Social
      khmer: 'Khm/Math',    // Khmer field: Khmer for Science, Math for Social
      chemistry: 'Che/His',
      physics: 'Phy/Moral',
      biology: 'Bio/Geo',
      history: 'His/Ear',
      english: 'English'
    };
  }
};

// Get ordered subjects based on selected grade
export const getOrderedSubjects = (selectedGrade: string) => {
  if (selectedGrade === 'Grade 12') {
    return GRADE_12_SCIENCE_ORDER;
  } else if (selectedGrade === 'Grade 12 Social') {
    return GRADE_12_SOCIAL_ORDER;
  } else {
    return ALL_SUBJECT_ORDER;
  }
};

// Check if a subject should be visible for a specific student
export const shouldShowSubject = (
  subject: string, 
  studentClass: string, 
  selectedGrade: string
): boolean => {
  const isGrade12Social = studentClass.includes('12S') || studentClass.includes('12R') || studentClass.includes('12T');
  const isGrade12Science = studentClass.includes('12') && !isGrade12Social;
  
  // Handle subject visibility based on filter and student type
  if (selectedGrade === 'Grade 12' && subject === 'history') {
    // When filtering Grade 12 only, show history column (Science students will show NC/empty)
    return true;
  } else if (selectedGrade === 'all') {
    // When showing all grades, only show subjects that apply to this specific student
    if (isGrade12Science && subject === 'history') {
      // Science students don't have Earth/History
  //    return false;
    }
  }
  
  return true;
};
