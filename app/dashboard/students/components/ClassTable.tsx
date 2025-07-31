import React, { useState } from 'react';
import { Student } from '../../../_interfaces';
import { ColumnConfig } from './ColumnToggle';
import { StudentRow } from './StudentRow';
import Icon from '../../../_components/Icon';
import { mdiChevronDown, mdiChevronUp } from '@mdi/js';

interface ClassTableProps {
  studentList: Student[];
  enabledColumns: ColumnConfig[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onViewDetails: (student: Student, studentList: Student[]) => void;
  initialLimit?: number;
  className?: string;
  studentCount?: number;
  shift?: 'Morning' | 'Afternoon' | 'Evening';
  isBatchEditMode?: boolean;
  onBatchUpdate?: () => void;
  selectedStudents?: Set<string>;
  onStudentSelect?: (studentId: string, isSelected: boolean) => void;
  onSelectAll?: (studentIds: string[], isSelected: boolean) => void;
}

export const ClassTable: React.FC<ClassTableProps> = ({ 
  studentList, 
  enabledColumns, 
  onEdit, 
  onDelete,
  onViewDetails,
  initialLimit = 5,
  className,
  studentCount,
  shift = 'Morning',
  isBatchEditMode = false,
  onBatchUpdate,
  selectedStudents = new Set(),
  onStudentSelect,
  onSelectAll
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMore = studentList.length > initialLimit;

  // Check if all students in this class are selected
  const allSelected = studentList.length > 0 && studentList.every(student => selectedStudents.has(student.id));
  const someSelected = studentList.some(student => selectedStudents.has(student.id));

  // Wrapper function to pass the studentList context
  const handleViewDetails = (student: Student) => {
    onViewDetails(student, studentList);
  };

  // Determine badge colors based on shift
  const getBadgeColors = () => {
    switch (shift) {
      case 'Morning':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
      case 'Afternoon':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
      case 'Evening':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300';
    }
  };

  if (studentList.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getBadgeColors()}`}>
            0 students
          </span>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No students assigned</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
      {/* Header with expand/collapse icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
          {isBatchEditMode && studentList.length > 0 && onSelectAll && (
            <button
              onClick={() => onSelectAll(studentList.map(s => s.id), !allSelected)}
              className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors duration-200 ${
                allSelected 
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                  : someSelected
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-slate-600'
              } hover:opacity-80`}
              title={allSelected ? 'Deselect all' : 'Select all'}
            >
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => {}}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>{allSelected ? 'All' : someSelected ? 'Some' : 'None'}</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getBadgeColors()}`}>
            {studentCount || studentList.length} students
          </span>
          {hasMore && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all duration-200"
              title={isExpanded ? 'Show scrollable view' : 'Show all students'}
            >
              <Icon
                path={isExpanded ? mdiChevronDown : mdiChevronUp}
                size="20"
                className="transition-transform duration-200"
              />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden">
        <div className={isExpanded ? "overflow-visible" : "max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800"}>
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
              {studentList.map((student, index) => (
                <StudentRow
                  key={student.id}
                  student={student}
                  index={index}
                  enabledColumns={enabledColumns}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewDetails={handleViewDetails}
                  isBatchEditMode={isBatchEditMode}
                  onBatchUpdate={onBatchUpdate}
                  isSelected={selectedStudents.has(student.id)}
                  onSelect={onStudentSelect}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
