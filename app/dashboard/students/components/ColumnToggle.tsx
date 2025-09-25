import React from 'react';
import Icon from '../../../_components/Icon';
import { mdiEye, mdiEyeOff } from '@mdi/js';

export type ColumnConfig = {
  id: string;
  label: string;
  enabled: boolean;
};

interface ColumnToggleProps {
  columns: ColumnConfig[];
  onToggleColumn: (columnId: string) => void;
  onResetColumns?: () => void; // Add optional reset function
  isBatchEditMode?: boolean;
  isTakeAttendanceMode?: boolean;
  allClassesCollapsed?: boolean; // This actually means "all classes zoomed" when true
  onToggleAllClasses?: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  filteredStudentsCount?: number;
  totalStudentsCount?: number;
  filteredStudents?: Array<{
    id: string;
    fullName: string;
    phone?: string;
    class?: string;
  }>; // Add filtered students list
  onStudentSelect?: (studentId: string) => void; // Add student selection callback
}

export const ColumnToggle: React.FC<ColumnToggleProps> = ({ 
  columns, 
  onToggleColumn, 
  onResetColumns,
  isBatchEditMode = false, 
  isTakeAttendanceMode = false,
  allClassesCollapsed = false, // This actually means "all classes zoomed" when true
  onToggleAllClasses,
  searchQuery = '',
  onSearchChange,
  filteredStudentsCount = 0,
  totalStudentsCount = 0,
  filteredStudents = [], // Add filtered students list
  onStudentSelect // Add student selection callback
}) => {
  const enabledColumns = columns.filter(col => col.enabled);

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl relative z-25">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Column Visibility
        </h2>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {enabledColumns.length} of {columns.length} columns visible
          </span>
          {/* Reset Button */}
          {onResetColumns && (
            <button
              onClick={onResetColumns}
              className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 flex items-center space-x-1"
              title="Reset columns to default"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {columns.map((column) => {
          const isLocked = (isBatchEditMode || isTakeAttendanceMode) && column.id === 'number';
          
          return (
            <button
              key={column.id}
              onClick={() => onToggleColumn(column.id)}
              disabled={isLocked}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                isLocked
                  ? 'border-blue-300 dark:border-blue-600 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 cursor-not-allowed'
                  : column.enabled
                  ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
              } ${!isLocked ? 'hover:shadow-md hover:scale-105' : ''}`}
              title={isLocked ? 'Required for this mode' : undefined}
            >
              <span className="font-medium text-sm flex items-center">
                {column.label}
                {isLocked && (
                  <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </span>
              <Icon
                path={column.enabled ? mdiEye : mdiEyeOff}
                size="16"
                className={
                  isLocked
                    ? 'text-blue-700 dark:text-blue-300'
                    : column.enabled 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-400'
                }
              />
            </button>
          );
        })}
      </div>
      
      {/* Global Class Controls */}
      {onToggleAllClasses && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 flex items-center">
              <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Class Visibility
            </h3>
          </div>
          <button
            onClick={onToggleAllClasses}
            className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 w-full md:w-auto ${
              allClassesCollapsed
                ? 'border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'border-green-300 dark:border-green-600 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
            } hover:shadow-md hover:scale-105`}
          >
            <span className="font-medium text-sm flex items-center">
              {/* Arrow icon for class visibility toggle */}
              <svg 
                className={`w-4 h-4 mr-3 transition-transform duration-200 ${
                  allClassesCollapsed 
                    ? 'transform rotate-180 text-red-600 dark:text-red-400' 
                    : 'transform rotate-0 text-green-600 dark:text-green-400'
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              {allClassesCollapsed ? 'Show All Classes' : 'Hide All Classes'}
            </span>
          </button>
        </div>
      )}
      
      {/* Student Search */}
      {onSearchChange && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-600">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg 
                className="w-5 h-5 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
                />
              </svg>
            </div>
            <input 
              type="text"
              placeholder="Search students by name, class, or phone..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-700 dark:text-white dark:placeholder-gray-400 text-base"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          {searchQuery && (
            <div className="mt-3">
              {filteredStudentsCount === 0 ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  No students found matching "{searchQuery}"
                </div>
              ) : (
                <div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Found {filteredStudentsCount} student(s) matching "{searchQuery}"
                  </div>
                  
                  {/* Show detailed list when fewer than 10 students */}
                  {filteredStudentsCount > 0 && filteredStudentsCount < 10 && filteredStudents.length > 0 && (
                    <div className="mt-3 max-h-48 overflow-y-auto">
                      <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                        Matching Students:
                      </div>
                      <div className="p-2 grid grid-cols-2 gap-3">
                        {filteredStudents.map((student) => (
                          <div 
                            key={student.id}
                            onClick={() => onStudentSelect?.(student.id)}
                            className={`flex flex-col p-3 bg-gray-50 dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 cursor-pointer transition-all duration-200 hover:!bg-blue-50 dark:hover:!bg-blue-900/20 hover:!border-blue-300 dark:hover:!border-blue-600 hover:!shadow-md hover:!scale-[1.02] isolate`}
                            title={onStudentSelect ? `Click to scroll to ${student.fullName}` : undefined}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center">
                                {student.fullName}
                                {onStudentSelect && (
                                  <svg className="w-3 h-3 ml-2 text-blue-500 dark:text-blue-400 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 mt-1">
                                {student.phone && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                    </svg>
                                    {student.phone}
                                  </div>
                                )}
                                {student.class && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                    </svg>
                                    {student.class}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};