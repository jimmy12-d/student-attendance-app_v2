import React, { useState } from 'react';
import { Student } from '../../../_interfaces';
import { ColumnConfig } from './ColumnToggle';
import { db } from '../../../../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';

// Utility function to convert Google Drive share URL to thumbnail URL
const getDisplayableImageUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  if (url.includes("drive.google.com")) {
    // Regex to find the file ID from various Google Drive URL formats
    // Handles /file/d/FILE_ID/, open?id=FILE_ID, and id=FILE_ID
    const regex = /(?:drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|.*[?&]id=([a-zA-Z0-9_-]+)))/;
    const match = url.match(regex);
    
    if (match) {
      // The file ID could be in either capture group
      const fileId = match[1] || match[2];
      if (fileId) {
        // Return the preview URL for iframe embedding (same as AddStudentForm)
        const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        console.log('Google Drive URL converted from:', url, 'to:', previewUrl);
        return previewUrl;
      }
    }
  }
  
  // If it's not a Google Drive link or no ID was found, return it as is
  return url;
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

interface StudentRowProps {
  student: Student;
  index: number;
  enabledColumns: ColumnConfig[];
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  onViewDetails: (student: Student) => void;
  isBatchEditMode?: boolean;
  onBatchUpdate?: () => void;
  isSelected?: boolean;
  onSelect?: (studentId: string, isSelected: boolean) => void;
  getAttendanceStatus?: (student: Student) => string;
}

export const StudentRow: React.FC<StudentRowProps> = ({ 
  student, 
  index, 
  enabledColumns, 
  onEdit, 
  onDelete,
  onViewDetails,
  isBatchEditMode = false,
  onBatchUpdate,
  isSelected = false,
  onSelect,
  getAttendanceStatus
}) => {
  return (
    <tr className={`group transition-all duration-200 ease-in-out hover:shadow-sm ${
      isBatchEditMode && isSelected 
        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
        : 'hover:bg-blue-50 dark:hover:bg-slate-700/50'
    }`}>
        {enabledColumns.map((column) => {
          switch (column.id) {
            case 'number':
              return (
                <td key="number" className="p-1 text-center">
                  {isBatchEditMode ? (
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect?.(student.id, e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  ) : (
                    <div className="relative group/index">
                      <span className="inline-flex items-center justify-center w-8 h-8 text-sm font-mediumtext-purple-600 dark:text-purple-400 rounded-full bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm rounded-fullgroup-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors duration-200 group-hover/index:opacity-0">
                        {index + 1}
                      </span>
                      
                      {/* Hover overlay with eye icon */}
                      <div 
                        className="absolute inset-0 bg-purple-600 bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover/index:opacity-100 transition-opacity duration-200 cursor-pointer"
                        onClick={() => onViewDetails(student)}
                        title="View student details"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </div>
                    </div>
                  )}
                </td>
              );
            case 'name':
              return (
                <td key="name" className="p-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate transition-all duration-300 transform-gpu ${
                        isBatchEditMode && isSelected 
                          ? 'text-purple-600 dark:text-purple-400' 
                          : 'text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                      }`}>
                        {student.fullName}
                      </p>
                      {student.nameKhmer && (
                        <p className={`text-xs truncate transition-all duration-300 transform-gpu ${
                          isBatchEditMode && isSelected 
                            ? 'text-blue-500 dark:text-blue-500' 
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
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
                    ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300 group-hover:bg-sky-200 dark:group-hover:bg-sky-800/50'
                    : student.scheduleType === 'Flip-Flop'
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                }`}>
                  {student.scheduleType || 'N/A'}
                </span>
              </td>
            );
          case 'paymentStatus':
            const currentYearMonth = new Date().toISOString().slice(0, 7); // "2025-07"
            let paymentStatus: 'paid' | 'unpaid' | 'no-record' = 'no-record';
            
            if (student.lastPaymentMonth) {
              paymentStatus = student.lastPaymentMonth >= currentYearMonth ? 'paid' : 'unpaid';
            }

            return (
              <td key="paymentStatus" className="p-3">
                <div className="flex items-center justify-center">
                  {paymentStatus === 'paid' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Paid
                    </span>
                    ) : paymentStatus === 'unpaid' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> {/* Changed path for X icon */}
                        </svg>
                        Unpaid
                    </span>
                    ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      No Record
                    </span>
                  )}
                </div>
              </td>
            );

          case 'warning':
            return (
              <td key="warning" className="p-3">
                <div className="flex items-center justify-center">
                  {student.warning ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Warning
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Normal
                    </span>
                  )}
                </div>
              </td>
            );

          case 'todaysStatus':
            const attendanceStatus = getAttendanceStatus ? getAttendanceStatus(student) : 'unknown';
            
            return (
              <td key="todaysStatus" className="p-3">
                <div className="flex items-center justify-center">
                  {attendanceStatus === 'present' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Present
                    </span>
                  ) : attendanceStatus === 'late' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Late
                    </span>
                  ) : attendanceStatus === 'absent' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Absent
                    </span>
                  ) : attendanceStatus === 'pending' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending
                    </span>
                  ) : attendanceStatus === 'permission' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Permission
                    </span>
                  ) : attendanceStatus === 'holiday' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Holiday
                    </span>
                  ) : attendanceStatus === 'not-student-day' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                      </svg>
                      Not School Day
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Unknown
                    </span>
                  )}
                </div>
              </td>
            );

          default:
            return null;
        }
      })}
    </tr>
  );
};
