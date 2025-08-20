/**
 * Filtering and Sorting Utilities
 * Functions for filtering students and sorting data
 */

// Filter students based on search term and filter criteria
export const filterStudents = (
  students: any[],
  searchTerm: string,
  selectedClass: string,
  selectedShift: string,
  selectedGrade: string
) => {
  let filtered = students;

  // Search filter
  if (searchTerm) {
    filtered = filtered.filter(student =>
      student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.phone.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }

  // Class filter
  if (selectedClass !== 'all') {
    filtered = filtered.filter(student => student.class === selectedClass);
  }

  // Shift filter
  if (selectedShift !== 'all') {
    filtered = filtered.filter(student => student.shift === selectedShift);
  }

  // Grade filter
  if (selectedGrade !== 'all') {
    if (selectedGrade === 'Grade 12') {
      filtered = filtered.filter(student => 
        student.class.includes('12') && 
        !student.class.includes('12S') && 
        !student.class.includes('12R') && 
        !student.class.includes('12T')
      );
    } else if (selectedGrade === 'Grade 12 Social') {
      filtered = filtered.filter(student => 
        student.class.includes('12S') || 
        student.class.includes('12R') || 
        student.class.includes('12T')
      );
    }
  }

  return filtered;
};

// Sort students based on field and direction
export const sortStudents = (
  students: any[],
  sortField: string,
  sortDirection: 'asc' | 'desc',
  selectedMock: string,
  currentSubjectLabels: { [key: string]: string }
) => {
  if (!sortField) return students;

  return [...students].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'name':
        aValue = a.fullName.toLowerCase();
        bValue = b.fullName.toLowerCase();
        break;
      case 'studentId':
        aValue = a.studentId.toString();
        bValue = b.studentId.toString();
        break;
      case 'class':
        aValue = a.class;
        bValue = b.class;
        break;
      case 'shift':
        aValue = a.shift;
        bValue = b.shift;
        break;
      case 'room':
        aValue = a.roomLabel;
        bValue = b.roomLabel;
        break;
      case 'totalScore':
        aValue = a.totalScores[selectedMock] || 0;
        bValue = b.totalScores[selectedMock] || 0;
        break;
      case 'averageScore':
        aValue = a.averageScores[selectedMock] || 0;
        bValue = b.averageScores[selectedMock] || 0;
        break;
      default:
        // Handle subject scores
        if (Object.keys(currentSubjectLabels).includes(sortField)) {
          const mockData_a = a.mockResults[selectedMock] || {};
          const mockData_b = b.mockResults[selectedMock] || {};
          aValue = mockData_a[sortField] || 0;
          bValue = mockData_b[sortField] || 0;
        } else {
          return 0;
        }
    }

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    } else {
      return sortDirection === 'asc' 
        ? (aValue - bValue)
        : (bValue - aValue);
    }
  });
};

// Get unique values for filter dropdowns
export const getUniqueValues = (students: any[], field: string): string[] => {
  return Array.from(new Set(students.map(s => s[field]))).filter(value => value !== 'N/A');
};
