import React, { useState, useEffect } from 'react';
import { Student } from '../../../_interfaces';
import { ColumnConfig } from './ColumnToggle';
import { StudentRow } from './StudentRow';
import Icon from '../../../_components/Icon';
import { mdiChevronDown, mdiChevronUp, mdiChevronRight,mdiAccountSchool } from '@mdi/js';

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
  getAttendanceStatus?: (student: Student) => string;
  forceCollapsed?: boolean;
  onClassToggle?: (className: string, collapsed: boolean) => void;
  expandedClasses?: Set<string>;
  onZoomToggle?: (className: string, isExpanded: boolean) => void;
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
  onSelectAll,
  getAttendanceStatus,
  forceCollapsed = false,
  onClassToggle,
  expandedClasses = new Set(),
  onZoomToggle
}) => {
  const [isClassCollapsed, setIsClassCollapsed] = useState(forceCollapsed);
  
  // Get unique identifier for this class (combining className and shift for uniqueness)
  const classId = `${className}-${shift}`;
  // Use just className for zoom state so all shifts of same class share zoom state
  const isExpanded = expandedClasses.has(className || '');

  // Three-state system: 0=hidden, 1=normal, 2=zoomed
  const getViewState = () => {
    if (isClassCollapsed) return 0; // Hidden
    if (isExpanded) return 2; // Zoomed
    return 1; // Normal (default)
  };

  // Zoom button cycles: 1 → 2 → 1 (normal ↔ zoom)
  const handleZoomToggle = () => {
    if (onZoomToggle && className) {
      const currentState = getViewState();
      if (currentState === 0) {
        // From hidden: go to normal first, then user can zoom again
        setIsClassCollapsed(false);
        if (onClassToggle) {
          onClassToggle(className, false);
        }
      } else if (currentState === 1) {
        // From normal: go to zoom
        onZoomToggle(className, true);
      } else if (currentState === 2) {
        // From zoom: go back to normal
        onZoomToggle(className, false);
      }
    }
  };

  // Minimize button toggles: 1 ↔ 0 (normal ↔ hidden)
  const handleClassToggle = (collapsed: boolean) => {
    setIsClassCollapsed(collapsed);
    if (onClassToggle && className) {
      onClassToggle(className, collapsed);
    }
  };

  // Sync local collapse state with global force collapse
  useEffect(() => {
    setIsClassCollapsed(forceCollapsed);
  }, [forceCollapsed]);

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
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-800 dark:border-blue-300';
      case 'Afternoon':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-800 dark:border-yellow-300';
      case 'Evening':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-800 dark:border-purple-300';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-800 dark:border-blue-300';
    }
  };

  if (studentList.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl px-4 py-2 shadow-xl">
        {/* Header with class title, buttons, and student count */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Mac-style buttons with less top padding */}
            <div className="flex items-center space-x-2 -mt-2 -ml-1">
              {/* Minimize button - different yellows for different states */}
              <button
                onClick={() => handleClassToggle(!isClassCollapsed)}
                className={`inline-flex items-center justify-center w-3 h-3 rounded-full transition-all duration-200 opacity-60 hover:opacity-80 ${
                  isClassCollapsed 
                    ? 'bg-yellow-100 dark:bg-yellow-200 shadow-sm'
                    : 'bg-yellow-400 dark:bg-yellow-500 shadow-sm'
                }`}
                title={isClassCollapsed ? 'Restore class (show students)' : 'Minimize class (hide students)'}
              >
                <div className={`w-2 h-0.5 rounded-full transition-all duration-200 ${
                  isClassCollapsed 
                    ? 'bg-yellow-600 dark:bg-yellow-700' 
                    : 'bg-yellow-800 dark:bg-yellow-900'
                }`}></div>
              </button>
              {/* Zoom button - always visible and clickable */}
              <button
                onClick={handleZoomToggle}
                className={`inline-flex items-center justify-center w-3 h-3 rounded-full transition-all duration-300 opacity-60 hover:opacity-80 transform hover:scale-110 ${
                  isExpanded
                    ? 'bg-green-500 dark:bg-green-600 shadow-sm'
                    : 'bg-green-300 dark:bg-green-400 shadow-sm'
                }`}
                title={isExpanded ? 'Compact view (limited height)' : 'Expanded view (full height)'}
              >
                <Icon
                  path={isExpanded ? mdiChevronDown : mdiChevronUp}
                  size="12"
                  className={`transition-transform duration-200 ${
                    isExpanded 
                      ? 'text-green-100 dark:text-green-200' 
                      : 'text-green-700 dark:text-green-800'
                  }`}
                />
              </button>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
          </div>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getBadgeColors()}`}>
            0 students
          </span>
        </div>
        {/* Empty state - show when not hidden (state 0) */}
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
          getViewState() === 0 
            ? "max-h-0 opacity-0 -translate-y-2" 
            : "max-h-screen opacity-100 translate-y-0"
        }`}>
          <div className="flex flex-col items-center justify-center py-12 px-4 transition-all duration-500 ease-in-out transform">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4 transition-all duration-300">
              <svg className="w-8 h-8 text-gray-400 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center transition-all duration-300">No students assigned</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl px-4 py-2 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
      {/* Header with class title, buttons, and controls */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {/* Mac-style buttons with less top padding */}
          <div className="flex items-center space-x-2 -mt-2 -ml-1">
            {/* Minimize button - different yellows for different states */}
            <button
              onClick={() => handleClassToggle(!isClassCollapsed)}
              className={`inline-flex items-center justify-center w-3 h-3 rounded-full transition-all duration-300 opacity-60 hover:opacity-80 transform hover:scale-110 ${
                isClassCollapsed 
                  ? 'bg-yellow-100 dark:bg-yellow-200 shadow-sm'
                  : 'bg-yellow-400 dark:bg-yellow-500 shadow-sm'
              }`}
              title={isClassCollapsed ? 'Restore class (show students)' : 'Minimize class (hide students)'}
            >
              <div className={`w-2 h-0.5 rounded-full transition-all duration-300 ${
                isClassCollapsed 
                  ? 'bg-yellow-600 dark:bg-yellow-700' 
                  : 'bg-yellow-800 dark:bg-yellow-900'
              }`}></div>
            </button>
            {/* Zoom button - always visible and clickable, even when minimized */}
            <button
              onClick={handleZoomToggle}
              className={`inline-flex items-center justify-center w-3 h-3 rounded-full transition-all duration-300 opacity-60 hover:opacity-80 transform hover:scale-110 ${
                isExpanded
                  ? 'bg-green-500 dark:bg-green-600 shadow-sm'
                  : 'bg-green-300 dark:bg-green-400 shadow-sm'
              }`}
              title={isExpanded ? 'Compact view (limited height)' : 'Expanded view (full height)'}
            >
              <Icon
                path={isExpanded ? mdiChevronDown : mdiChevronUp}
                size="12"
                className={`transition-transform duration-200 ${
                  isExpanded 
                    ? 'text-green-100 dark:text-green-200' 
                    : 'text-green-700 dark:text-green-800'
                }`}
                />
            </button>
          </div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
          {isBatchEditMode && studentList.length > 0 && onSelectAll && (!isClassCollapsed || isExpanded) && (
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
            {/* Add the Icon component here */}
            <Icon path={mdiAccountSchool} size={18} className="mr-1" />
            {studentCount || studentList.length} Students
          </span>
        </div>
      </div>

      {/* Table - Three-state system: 0=hidden, 1=normal (default), 2=zoomed */}
      <div className={`transition-all duration-500 ease-in-out ${
        (() => {
          const state = getViewState();
          if (state === 0) return "max-h-0 opacity-0 -translate-y-2 overflow-hidden"; // Hidden
          if (state === 2) return "max-h-screen opacity-100 translate-y-0 overflow-hidden"; // Zoomed
          return "max-h-80 opacity-100 translate-y-0 overflow-hidden"; // Normal (default) - scrollable
        })()
      }`}>
        <div className={`transition-all duration-300 ease-in-out ${
          (() => {
            const state = getViewState();
            if (state === 2) return "h-full overflow-x-auto overflow-y-auto"; // Zoomed - full scroll
            if (state === 1) return "max-h-80 overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-slate-600 scrollbar-track-gray-100 dark:scrollbar-track-slate-800 scroll-smooth"; // Normal - limited scroll with custom scrollbar
            return "overflow-hidden"; // Hidden
          })()
        }`}>
          <table className="w-full border-separate border-spacing-0 transition-all duration-300 min-w-full">
            <thead className="sticky top-0 z-10">
              <tr>
                {enabledColumns.map((column, index) => (
                  <th 
                    key={column.id}
                    className={`bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-700 dark:to-slate-600 p-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider border-b border-gray-200 dark:border-slate-600 transition-all duration-300 ${
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
                  getAttendanceStatus={getAttendanceStatus}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
