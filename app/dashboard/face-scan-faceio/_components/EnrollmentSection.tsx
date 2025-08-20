import React from 'react';
import LoadingSpinner from '../../../_components/LoadingSpinner';
import { Student } from '../_lib/types';

interface EnrollmentSectionProps {
  showEnrollment: boolean;
  students: Student[];
  unenrolledStudents: Student[];
  sortedUnenrolledStudents: Student[];
  selectedStudent: string;
  setSelectedStudent: (id: string) => void;
  handleEnrollment: () => void;
  isEnrolling: boolean;
  isRecognizing: boolean;
}

export const EnrollmentSection: React.FC<EnrollmentSectionProps> = ({
  showEnrollment,
  students,
  unenrolledStudents,
  sortedUnenrolledStudents,
  selectedStudent,
  setSelectedStudent,
  handleEnrollment,
  isEnrolling,
  isRecognizing,
}) => {
  if (!showEnrollment) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-600">New students must enroll their face before using attendance recognition.</p>
      
      {students.length === 0 ? (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-800 font-semibold">⚠️ No students found</p>
          <p className="text-yellow-700 text-sm mt-1">
            No students are available in the database. Please add students to the system first.
          </p>
          <button
            onClick={() => window.location.href = '/dashboard/students'}
            className="mt-2 px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Go to Students Page
          </button>
        </div>
      ) : unenrolledStudents.length === 0 ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold">✅ All students enrolled</p>
          <p className="text-green-700 text-sm mt-1">
            All students in the database have been enrolled with FaceIO.
          </p>
        </div>
      ) : (
        <>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-black"
            disabled={isEnrolling || isRecognizing}
          >
            <option value="">Select a student to enroll ({sortedUnenrolledStudents.length} available)</option>
            {sortedUnenrolledStudents.map(student => {
              const displayName = `${student.fullName || ''}`.trim();
              const rollNumber = student.rollNumber ? `(${student.rollNumber})` : '';
              const shift = student.shift ? `[${student.shift}]` : '[No Shift]';
              return (
                <option key={student.id} value={student.id}>
                  {shift} {displayName} {rollNumber}
                </option>
              );
            })}
          </select>

          <button
            onClick={handleEnrollment}
            disabled={!selectedStudent || isEnrolling || isRecognizing}
            className={`w-full px-6 py-3 font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-150 ease-in-out ${
              !selectedStudent || isEnrolling || isRecognizing
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-400'
            }`}
          >
            {isEnrolling ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner />
                <span className="ml-2">Enrolling Face...</span>
              </div>
            ) : (
              'Enroll Selected Student'
            )}
          </button>
        </>
      )}
    </div>
  );
};
