// app/dashboard/students/TableStudents.tsx
"use client";

import { mdiPencil, mdiTrashCan, mdiAccount, mdiEye, mdiEyeOff } from "@mdi/js";
import React, { useState } from "react";
import { Student } from "../../_interfaces";
import Button from "../../_components/Button";
import Buttons from "../../_components/Buttons";
import Icon from "../../_components/Icon";

type Props = {
  students: Student[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
};

type ColumnConfig = {
  id: string;
  label: string;
  enabled: boolean;
};

// Phone formatting utility
const formatPhoneNumber = (phone: string | undefined | null): string => {
  if (!phone) return 'N/A';
  const cleaned = ('' + phone).replace(/\D/g, '');

  let digits = cleaned;
  // Standardize to 10 digits if it's a 9-digit number missing the leading 0
  if (digits.length === 9 && !digits.startsWith('0')) {
    digits = '0' + digits;
  }
  
  // Format 10-digit numbers (0XX-XXX-XXXX)
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  // Format 9-digit numbers (0XX-XXX-XXX)
  if (digits.length === 9) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
  }
  
  return phone; // Return original if it doesn't match formats
};

// Helper function to convert Google Drive link to a direct image link
const getDisplayableImageUrl = (url: string | undefined) => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  if (url.includes("drive.google.com")) {
    // Regex to find the file ID from various Google Drive URL formats
    const regex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=))([a-zA-Z0-9_-]+)/;
    const match = url.match(regex);
    
    if (match && match[1]) {
      const fileId = match[1];
      // Try multiple Google Drive endpoints for better compatibility
      // First try the direct download endpoint
      return `https://drive.google.com/uc?export=download&id=${fileId}`;
    }
  }
  
  // If it's not a Google Drive link or no ID was found, return it as is
  return url;
};

const TableStudents = ({ students, onEdit, onDelete }: Props) => {
  // Column configuration state
  const [columns, setColumns] = useState<ColumnConfig[]>([
    { id: 'number', label: '#N', enabled: true },
    { id: 'name', label: 'Name', enabled: true },
    { id: 'phone', label: 'Phone', enabled: true },
    { id: 'scheduleType', label: 'Schedule Type', enabled: false },
    { id: 'actions', label: 'Actions', enabled: false },
  ]);

  // Define the desired order of shifts
  const shiftOrder: ('Morning' | 'Afternoon' | 'Evening')[] = ['Morning', 'Afternoon', 'Evening'];

  // Filter out students who are missing a class property to prevent 'undefined' groups
  const validStudents = students.filter(student => student.class);

  // 1. Group students by class, then by shift
  const groupedStudents = validStudents.reduce((acc, student) => {
    const { class: studentClass, shift } = student;
    if (!acc[studentClass]) {
      acc[studentClass] = { Morning: [], Afternoon: [], Evening: [] };
    }
    if (shift && shiftOrder.includes(shift as any)) {
      acc[studentClass][shift as 'Morning' | 'Afternoon' | 'Evening'].push(student);
    }
    return acc;
  }, {} as Record<string, { Morning: Student[]; Afternoon: Student[]; Evening: Student[] }>);

  // Sort students by fullName within each class and shift
  for (const classGroup of Object.values(groupedStudents)) {
    shiftOrder.forEach(shift => {
      if (classGroup[shift]) {
        classGroup[shift].sort((a, b) => a.fullName.localeCompare(b.fullName));
      }
    });
  }

  // 2. Partition classes into day (morning/afternoon) and evening lists
  const dayShiftClasses: string[] = [];
  const eveningShiftClasses: string[] = [];

  const sortedAllClasses = Object.keys(groupedStudents).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  sortedAllClasses.forEach(className => {
    const group = groupedStudents[className];
    if (group.Morning.length > 0 || group.Afternoon.length > 0) {
      dayShiftClasses.push(className);
    }
    if (group.Evening.length > 0) {
      eveningShiftClasses.push(className);
    }
  });

  // Toggle column visibility
  const toggleColumn = (columnId: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, enabled: !col.enabled } : col
      )
    );
  };

  // Get enabled columns
  const enabledColumns = columns.filter(col => col.enabled);

  // Helper component for rendering a table for a specific class/shift
  const ClassTable = ({ studentList }: { studentList: Student[] }) => (
    studentList.length > 0 ? (
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
                      column.id === 'number' || column.id === 'actions' ? 'text-center' : 'text-left'
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
            </tr>
          </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
            {studentList.map((student, index) => (
                <tr 
                  key={student.id} 
                  className="group hover:bg-blue-50 dark:hover:bg-slate-700/50 transition-all duration-200 ease-in-out hover:shadow-sm"
                >
                  {enabledColumns.map((column) => {
                    switch (column.id) {
                      case 'number':
                        return (
                          <td key="number" className="p-1 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors duration-200">
                              {index + 1}
                            </span>
                          </td>
                        );
                      case 'name':
                        return (
                          <td key="name" className="p-3">
                            <div className="flex items-center space-x-3">
                              {/* <div className="flex-shrink-0">
                                {student.photoUrl ? (
                                  <div className="relative">
                                    <img
                                      src={getDisplayableImageUrl(student.photoUrl) || ''}
                                      alt={student.fullName}
                                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-lg ring-2 ring-blue-100 dark:ring-blue-900/30"
                                      onError={(e) => {
                                        // Fallback to initials if image fails to load
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const fallback = target.nextElementSibling as HTMLElement;
                                        if (fallback) {
                                          fallback.style.display = 'flex';
                                        }
                                      }}
                                    />
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg hidden">
                                      {student.fullName.charAt(0).toUpperCase()}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                                    {student.fullName.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div> */}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                                  {student.fullName}
                                </p>
                                {student.nameKhmer && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {student.nameKhmer}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      case 'phone':
                        return (
                          <td key="phone" className="p-3">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors duration-200">
                              {formatPhoneNumber(student.phone)}
                            </span>
                          </td>
                        );
                      case 'scheduleType':
                        return (
                          <td key="scheduleType" className="p-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                              student.scheduleType === 'Fix' 
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 group-hover:bg-green-200 dark:group-hover:bg-green-800/50'
                                : student.scheduleType === 'Flip-Flop'
                                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50'
                                : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                            }`}>
                              {student.scheduleType || 'N/A'}
                            </span>
                          </td>
                        );
                      case 'actions':
                        return (
                          <td key="actions" className="p-3">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => onEdit(student)}
                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-white hover:bg-blue-600 dark:text-blue-400 dark:hover:bg-blue-500 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                                title="Edit Student"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => onDelete(student)}
                                className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 dark:text-red-400 dark:hover:bg-red-500 rounded-lg transition-all duration-200 hover:shadow-lg hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                title="Delete Student"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                </td>
                        );
                      default:
                        return null;
                    }
                  })}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    ) : (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">No students assigned</p>
      </div>
    )
  );

  return (
    <div className="space-y-8 p-6 pb-24 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Column Selection Panel */}
      <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl">
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
          {columns.map((column) => (
            <button
              key={column.id}
              onClick={() => toggleColumn(column.id)}
              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all duration-200 ${
                column.enabled
                  ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
              } hover:shadow-md hover:scale-105`}
            >
              <span className="font-medium text-sm">{column.label}</span>
              <Icon
                path={column.enabled ? mdiEye : mdiEyeOff}
                size="16"
                className={column.enabled ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Morning & Afternoon Section */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Day Shifts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Morning & Afternoon Classes</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full shadow-lg mb-4">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-semibold">Morning Shift</span>
              </div>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg mb-4">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-semibold">Afternoon Shift</span>
              </div>
            </div>
          </div>

          {dayShiftClasses.length > 0 ? (
            <div className="space-y-6">
              {dayShiftClasses.map(className => (
                <div key={`${className}-day`} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300">
                        {groupedStudents[className]['Morning'].length} students
                      </span>
                    </div>
                    <ClassTable studentList={groupedStudents[className]['Morning']} />
                  </div>
                  <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {groupedStudents[className]['Afternoon'].length} students
                      </span>
                    </div>
                    <ClassTable studentList={groupedStudents[className]['Afternoon']} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400">No students in Morning or Afternoon shifts.</p>
          </div>
          )}
        </div>

        {/* Evening Section */}
        {eveningShiftClasses.length > 0 && (
          <div className="space-y-6 pt-8 border-t border-gray-200 dark:border-slate-700">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Evening Shift
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Night Classes</p>
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                <span className="font-semibold">Evening Classes</span>
            </div>
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {eveningShiftClasses.map(className => (
                <div key={`${className}-evening`} className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 dark:border-slate-700/50 rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{className}</h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                      {groupedStudents[className].Evening.length} students
                    </span>
                  </div>
                  <ClassTable studentList={groupedStudents[className].Evening} />
        </div>
      ))}
            </div>
          </div>
        )}
    </div>
  );
};

export default TableStudents;