import React from 'react';
import { Student } from '../_lib/types';

interface EnrolledStudentsListProps {
  enrolledStudents: Student[];
  onUnenroll: (studentId: string, studentName: string) => void;
}

export const EnrolledStudentsList: React.FC<EnrolledStudentsListProps> = ({ 
  enrolledStudents, 
  onUnenroll 
}) => {
  if (enrolledStudents.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h4 className="text-lg font-semibold mb-3">Enrolled Students ({enrolledStudents.length})</h4>
      <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
        <div className="space-y-2">
          {enrolledStudents.map(student => (
            <div key={student.id} className="flex items-center justify-between bg-white p-2 rounded border">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>{student.fullName}</span>
                {student.rollNumber && (
                  <span className="text-blue-500">({student.rollNumber})</span>
                )}
              </div>
              <button
                onClick={() => onUnenroll(student.id, student.fullName)}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                title="Remove enrollment"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
