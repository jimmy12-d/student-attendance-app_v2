/**
 * Component Index
 * Exports all utility functions and components for easy importing
 */

// Grade calculation utilities
export * from './gradeCalculations';

// Grade styling utilities
export * from './gradeStyles';

// Subject configuration utilities
export * from './subjectConfig';

// Data export utilities
export * from './dataExport';

// Firebase utilities
export * from './firebaseUtils';

// Filtering and sorting utilities
export * from './filterUtils';

// Components
export { default as MockExamScoresTable } from './MockExamScoresTable';
export { default as SubjectCompletionView } from './SubjectCompletionView';

// Type definitions
export interface StudentResult {
  id: string;
  fullName: string;
  studentId: string | number;
  phone: string | number;
  class: string;
  shift: string;
  room: number;
  roomLabel: string;
  seat: string;
  mockResults: {
    mock_1?: { [subject: string]: number };
    mock_2?: { [subject: string]: number };
    mock_3?: { [subject: string]: number };
    mock_4?: { [subject: string]: number };
  };
  totalScores: {
    mock_1?: number;
    mock_2?: number;
    mock_3?: number;
    mock_4?: number;
  };
  averageScores: {
    mock_1?: number;
    mock_2?: number;
    mock_3?: number;
    mock_4?: number;
  };
  // Absent data for Mock 4
  mock_4_absent_subjects?: string[];
  mock_4_absent_timestamp?: string | null;
  mock_4_absent_recorded_by?: string | null;
}

export interface ClassStats {
  totalStudents: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  passRate: number;
}

export interface ExamSettings {
  [mockName: string]: {
    [subject: string]: {
      maxScore: number;
    };
  };
}
