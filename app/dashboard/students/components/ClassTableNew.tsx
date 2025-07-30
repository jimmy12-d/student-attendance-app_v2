import React, { useState } from 'react';
import { Student } from '../../../_interfaces';
import { ColumnConfig } from './ColumnToggle';
import { StudentRow } from './StudentRow';
import { StudentDetailsModal } from './StudentDetailsModal';
import Icon from '../../../_components/Icon';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';
import { toast } from 'sonner';

interface ClassTableProps {
  studentList: Student[];
  enabledColumns: ColumnConfig[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  initialLimit?: number;
}

export const ClassTable: React.FC<ClassTableProps> = ({ 
  studentList, 
  enabledColumns, 
  onEdit, 
  onDelete,
  initialLimit = 5
}) => {
  const [showAll, setShowAll] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const displayedStudents = showAll ? studentList : studentList.slice(0, initialLimit);
  const hasMore = studentList.length > initialLimit;

  const handleViewDetails = (student: Student) => {
    setSelectedStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleDeleteWithToast = async (student: Student) => {
    try {
      await onDelete(student);
      toast.success(`${student.fullName} has been deleted successfully`);
      handleCloseModal(); // Close modal after successful delete
    } catch (error) {
      toast.error('Failed to delete student. Please try again.');
      console.error('Delete error:', error);
    }
  };

  if (studentList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No students assigned</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      <div className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800">
        <table className="w-full border-separate border-spacing-0">
          <thead className="sticky top-0 z-10">
            <tr>
              {enabledColumns.map((column, index) => (
                <th 
                  key={column.id}
                  className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 ${
                    index === 0 ? 'rounded-tl-lg' : ''
                  } ${index === enabledColumns.length - 1 ? 'rounded-tr-lg' : ''} ${
                    column.id === 'number' || column.id === 'edit' ? 'text-center' : 'text-left'
                  }`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {displayedStudents.map((student, index) => (
              <StudentRow
                key={student.id}
                student={student}
                index={index}
                enabledColumns={enabledColumns}
                onEdit={onEdit}
                onDelete={onDelete}
                onViewDetails={handleViewDetails}
              />
            ))}
          </tbody>
        </table>
      </div>
      
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-800/50 rounded-lg border border-blue-200 dark:border-blue-700 transition-all duration-200 hover:shadow-md"
          >
            <span className="mr-2">
              {showAll ? `Show Less (${initialLimit})` : `Show All (${studentList.length})`}
            </span>
            <Icon
              path={showAll ? mdiChevronUp : mdiChevronDown}
              size="16"
              className="transition-transform duration-200"
            />
          </button>
        </div>
      )}
      
      {/* Student Details Modal - rendered outside table container */}
      <StudentDetailsModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={onEdit}
        onDelete={handleDeleteWithToast}
      />
    </div>
  );
};
