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
  isBatchEditMode?: boolean;
  allClassesCollapsed?: boolean;
  onToggleAllClasses?: () => void;
}

export const ColumnToggle: React.FC<ColumnToggleProps> = ({ 
  columns, 
  onToggleColumn, 
  isBatchEditMode = false, 
  allClassesCollapsed = false, 
  onToggleAllClasses 
}) => {
  const enabledColumns = columns.filter(col => col.enabled);

  return (
    <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl relative z-30">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center">
          <svg className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          Column Visibility
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {enabledColumns.length} of {columns.length} columns visible
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {columns.map((column) => {
          const isLocked = isBatchEditMode && column.id === 'number';
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
                ? 'border-green-300 dark:border-green-600 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                : 'border-yellow-300 dark:border-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
            } hover:shadow-md hover:scale-105`}
          >
            <span className="font-medium text-sm flex items-center">
              {/* Mac-style traffic light buttons */}
              <div className="flex items-center space-x-1 mr-3">
                {/* Minimize button */}
                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                  allClassesCollapsed 
                    ? 'bg-yellow-300 dark:bg-yellow-400 opacity-50' 
                    : 'bg-yellow-400 dark:bg-yellow-500 shadow-sm'
                }`}>
                  {!allClassesCollapsed && (
                    <div className="w-2 h-0.5 bg-yellow-800 dark:bg-yellow-900 rounded-full"></div>
                  )}
                </div>
                {/* Zoom button */}
                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                  !allClassesCollapsed 
                    ? 'bg-green-300 dark:bg-green-400 opacity-50' 
                    : 'bg-green-400 dark:bg-green-500 shadow-sm'
                }`}>
                  {allClassesCollapsed && (
                    <div className="w-1.5 h-1.5 border border-green-800 dark:border-green-900 rounded-sm"></div>
                  )}
                </div>
              </div>
              {allClassesCollapsed ? 'Show All Classes' : 'Hide All Classes'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
};