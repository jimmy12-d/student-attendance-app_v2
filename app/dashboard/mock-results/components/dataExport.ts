/**
 * Data Export Utilities
 * Functions for exporting data to CSV and other formats
 */

import { getCurrentSubjectLabels, getOrderedSubjects } from './subjectConfig';
import { calculateStudentTotals, calculateGrade } from './gradeCalculations';

// Export students data to CSV
export const exportStudentsToCSV = (
  students: any[],
  selectedMock: string,
  selectedGrade: string,
  getMaxScoresFunc: (classType: string, mockName: string) => { [subject: string]: number }
) => {
  const currentSubjectLabels = getCurrentSubjectLabels(selectedGrade);
  
  const headers = [
    'Student ID',
    'Full Name',
    'Phone',
    'Class',
    'Shift',
    'Room',
    'Seat',
    'Total Score',
    'Total Grade',
    ...getOrderedSubjects(selectedGrade).map(subject => [
      `${currentSubjectLabels[subject]} Score`,
      `${currentSubjectLabels[subject]} Grade`
    ]).flat()
  ];

  const csvData = students.map(student => {
    const mockData = student.mockResults[selectedMock] || {};
    const hasResults = Object.keys(mockData).length > 0;
    const maxScores = getMaxScoresFunc(student.class, selectedMock);
    const studentTotals = hasResults ? calculateStudentTotals(mockData, student.class, maxScores) : null;
    
    const subjectData = getOrderedSubjects(selectedGrade).map(subject => {
      const score = mockData[subject];
      const maxScore = maxScores[subject] || 0;
      const grade = score !== undefined ? calculateGrade(score, maxScore) : 'N/A';
      
      return [
        score !== undefined ? score : 'N/A',
        grade
      ];
    }).flat();

    return [
      student.studentId,
      student.fullName,
      student.phone,
      student.class,
      student.shift,
      student.roomLabel,
      student.seat,
      studentTotals ? studentTotals.totalScore : 'N/A',
      studentTotals?.totalGrade || 'N/A',
      ...subjectData
    ];
  });

  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

// Download CSV file
export const downloadCSV = (csvContent: string, filename: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Generate CSV filename with timestamp
export const generateCSVFilename = (prefix: string, selectedMock: string): string => {
  const date = new Date().toISOString().split('T')[0];
  return `${prefix}_${selectedMock}_${date}.csv`;
};
