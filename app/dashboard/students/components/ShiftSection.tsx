import React from 'react';
import { Student } from '../../../_interfaces';
import { ColumnConfig } from './ColumnToggle';
import { ClassTable } from './ClassTable';

interface ShiftSectionProps {
  title: string;
  subtitle: string;
  shiftClasses: string[];
  groupedStudents: Record<string, { Morning: Student[]; Afternoon: Student[]; Evening: Student[] }>;
  shift: 'Morning' | 'Afternoon' | 'Evening';
  enabledColumns: ColumnConfig[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  gradientClass: string;
  iconPath: string;
  shiftColor: string;
}

export const ShiftSection: React.FC<ShiftSectionProps> = ({
  title,
  subtitle,
  shiftClasses,
  groupedStudents,
  shift,
  enabledColumns,
  onEdit,
  onDelete,
  gradientClass,
  iconPath,
  shiftColor
}) => {
  if (shiftClasses.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <p className="text-gray-500 dark:text-gray-400">No students in {title}.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className={`text-3xl font-bold ${gradientClass} bg-clip-text text-transparent`}>
          {title}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">{subtitle}</p>
        <div className={`inline-flex items-center px-4 py-2 ${shiftColor} text-white rounded-full shadow-lg`}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
          </svg>
          <span className="font-semibold">{title}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {shiftClasses.map(className => (
          <div key={`${className}-${shift.toLowerCase()}`} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                shift === 'Morning' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' :
                shift === 'Afternoon' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
              }`}>
                {groupedStudents[className][shift].length} students
              </span>
            </div>
            <ClassTable 
              studentList={groupedStudents[className][shift]} 
              enabledColumns={enabledColumns}
              onEdit={onEdit}
              onDelete={onDelete}
              onViewDetails={(student: Student) => console.log('View details for', student)} // Placeholder for actual view details function
            />
          </div>
        ))}
      </div>
    </div>
  );
};
