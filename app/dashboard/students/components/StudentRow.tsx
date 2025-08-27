import React, { useState } from 'react';
import { Student } from '../../../_interfaces';
import { ColumnConfig } from './ColumnToggle';
import { db } from '../../../../firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { AbsentStatusTracker } from './AbsentStatusTracker';

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
  isTakeAttendanceMode?: boolean;
  isFlipFlopPreviewMode?: boolean;
  onBatchUpdate?: () => void;
  isSelected?: boolean;
  onSelect?: (studentId: string, isSelected: boolean) => void;
  getAttendanceStatus?: (student: Student) => string;
  getTodayAttendanceStatus?: (student: Student) => { status?: string; time?: string };
  isStudentCurrentlyPresent?: (student: Student) => boolean;
  onAttendanceChange?: (studentId: string, isPresent: boolean) => void;
}

export const StudentRow: React.FC<StudentRowProps> = ({ 
  student, 
  index, 
  enabledColumns, 
  onEdit, 
  onDelete,
  onViewDetails,
  isBatchEditMode = false,
  isTakeAttendanceMode = false,
  isFlipFlopPreviewMode = false,
  onBatchUpdate,
  isSelected = false,
  onSelect,
  getAttendanceStatus,
  getTodayAttendanceStatus,
  isStudentCurrentlyPresent,
  onAttendanceChange
}) => {
  // Check if student has warning and is absent today
  const todayStatus = getTodayAttendanceStatus ? getTodayAttendanceStatus(student) : { status: 'Unknown' };
  const isWarningAbsent = student.warning && todayStatus.status === 'Absent';
  
  // Helper function to get flipped shift for flip-flop students
  const getFlippedShift = (originalShift: string) => {
    if (originalShift.toLowerCase() === 'morning') {
      return 'Afternoon';
    } else if (originalShift.toLowerCase() === 'afternoon') {
      return 'Morning';
    }
    return originalShift;
  };
  
  return (
    <tr className={`group transition-all duration-200 ease-in-out hover:shadow-sm ${
      isWarningAbsent 
        ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 shadow-md animate-pulse' 
        : isBatchEditMode && isSelected 
        ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
        : 'hover:bg-blue-50 dark:hover:bg-slate-700/50'
    }`}>
        {enabledColumns.map((column) => {
          switch (column.id) {
            case 'number':
              return (
                <td key="number" className="p-1 text-center whitespace-nowrap">
                  {isBatchEditMode ? (
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelect?.(student.id, e.target.checked)}
                        className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 dark:focus:ring-purple-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  ) : isTakeAttendanceMode ? (
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isStudentCurrentlyPresent?.(student) || false}
                        onChange={(e) => onAttendanceChange?.(student.id, e.target.checked)}
                        className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 dark:focus:ring-green-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                        title={`Mark ${student.fullName} as ${isStudentCurrentlyPresent?.(student) ? 'absent' : 'present'}`}
                      />
                    </div>
                  ) : (
                    <div className="relative group/index">
                      {/* Alert icon for warning + absent students */}
                      {isWarningAbsent && (
                        <div className="absolute -top-1 -right-1 z-10">
                          <div className="flex items-center justify-center w-4 h-4 bg-red-500 rounded-full animate-bounce">
                            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                      
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
              const handleCopyName = async () => {
                try {
                  await navigator.clipboard.writeText(student.fullName);
                  toast.success(`Copied "${student.fullName}" to clipboard`);
                } catch (err) {
                  // Fallback for older browsers
                  const textArea = document.createElement('textarea');
                  textArea.value = student.fullName;
                  document.body.appendChild(textArea);
                  textArea.select();
                  document.execCommand('copy');
                  document.body.removeChild(textArea);
                  toast.success(`Copied "${student.fullName}" to clipboard`);
                }
              };

              return (
                <td key="name" className="p-3 whitespace-nowrap">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 min-w-0">
                      <p 
                        className={`text-sm font-semibold truncate transition-all duration-300 transform-gpu cursor-pointer hover:underline ${
                          isBatchEditMode && isSelected 
                            ? 'text-purple-600 dark:text-purple-400' 
                            : 'text-gray-900 dark:text-gray-100 group-hover:text-purple-600 dark:group-hover:text-purple-400'
                        }`}
                        onClick={handleCopyName}
                        title={`Click to copy "${student.fullName}"`}
                      >
                        {student.fullName}
                      </p>
                      {student.nameKhmer && (
                          <p 
                            className={`khmer-font text-xs truncate transition-all duration-300 transform-gpu ${
                              isBatchEditMode && isSelected 
                                ? 'text-blue-500 dark:text-blue-500' 
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                          {student.nameKhmer}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
              );
          case 'phone':
            return (
              <td key="phone" className="p-3 whitespace-nowrap">
                {student.phone ? (
                  student.hasTelegramUsername && student.telegramUsername ? (
                    <a 
                      href={`https://t.me/${student.telegramUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 group-hover:bg-blue-200 dark:group-hover:bg-blue-600 hover:text-blue-900 dark:hover:text-blue-100 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                      title={`Contact ${student.fullName} on Telegram (@${student.telegramUsername})`}
                    >
                      <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                      </svg>
                      <span className="truncate">{formatPhoneNumber(student.phone)}</span>
                    </a>
                  ) : student.hasTelegramUsername && !student.telegramUsername ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50 transition-colors duration-200 whitespace-nowrap"
                          title={`${student.fullName} needs Telegram username setup`}>
                      <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="truncate">{formatPhoneNumber(student.phone)}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600 transition-colors duration-200 whitespace-nowrap">
                      <span className="truncate">{formatPhoneNumber(student.phone)}</span>
                    </span>
                  )
                ) : (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 transition-colors duration-200 whitespace-nowrap">
                    N/A
                  </span>
                )}
              </td>
            );
          case 'scheduleType':
            return (
              <td key="scheduleType" className="p-3 whitespace-nowrap">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                  student.scheduleType === 'Fix' 
                    ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300 group-hover:bg-fuchsia-200 dark:group-hover:bg-fuchsia-800/50'
                    : student.scheduleType === 'Flip-Flop'
                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                }`}>
                  {student.scheduleType || 'N/A'}
                  {isFlipFlopPreviewMode && student.scheduleType?.toLowerCase() === 'flip-flop' && (
                    <span className="ml-1 text-xs opacity-75">
                      ({getFlippedShift(student.shift)} next month)
                    </span>
                  )}
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
              <td key="paymentStatus" className="p-3 whitespace-nowrap">
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
              <td key="warning" className="p-3 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  {student.warning ? (
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${
                      isWarningAbsent 
                        ? 'bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-200 border-red-300 dark:border-red-600 animate-pulse shadow-lg' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800'
                    }`}>
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {isWarningAbsent ? 'URGENT' : 'Warning'}
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

          case 'todayAttendance':
            const todayStatus = getTodayAttendanceStatus ? getTodayAttendanceStatus(student) : { status: 'Unknown' };
            const todayDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            return (
              <td key="todayAttendance" className="p-3 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  {todayStatus.status === 'Present' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Present

                    </span>
                  ) : todayStatus.status === 'Late' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Late
                      {todayStatus.time && (
                        <span className="ml-1 text-xs opacity-75">({todayStatus.time})</span>
                      )}
                    </span>
                  ) : todayStatus.status === 'Absent' ? (
                    // Use AbsentStatusTracker for absent students
                    <AbsentStatusTracker
                      studentId={student.id}
                      studentName={student.fullName}
                      date={todayDate}
                      currentStatus="Absent"
                    />
                  ) : todayStatus.status === 'Permission' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Permission
                    </span>
                  ) : todayStatus.status === 'Pending' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Pending
                    </span>
                  ) : todayStatus.status === 'No School' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      No School
                    </span>
                  ) : 
                  todayStatus.status === 'Not Yet Enrolled' ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Join Today
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {todayStatus.status || 'Unknown'}
                    </span>
                  )}
                </div>
              </td>
            );

          case 'registerQR':
            // Show different states based on registration and payment status
            const getDateFromTimestamp = (timestamp: any): Date | null => {
              if (!timestamp) return null;
              if (timestamp instanceof Date) return timestamp;
              if (timestamp?.toDate && typeof timestamp.toDate === 'function') {
                return timestamp.toDate();
              }
              return null;
            };

            const tokenExpiryDate = getDateFromTimestamp(student.tokenExpiresAt);
            const hasActiveToken = student.registrationToken && tokenExpiryDate && tokenExpiryDate > new Date();
            const isLoggedIn = student.chatId && student.passwordHash; // Fully registered
            const hasExpiredToken = student.registrationToken && tokenExpiryDate && tokenExpiryDate <= new Date();
            const hasNeverPaid = !student.lastPaymentMonth; // Never made a payment
            const hasRecentPayment = student.lastPaymentMonth && student.lastPaymentMonth >= "2025-09"; // QR available from September 2025 onwards
            
            return (
              <td key="registerQR" className="p-3 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  {isLoggedIn ? (
                    // 1. Logged In - Student is fully registered
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Logged In
                    </span>
                  ) : hasActiveToken ? (
                    // 2. Unused QR - Has active token but not registered yet (PRIORITY over payment status)
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('openQRModal', { detail: student }))}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 animate-pulse hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors cursor-pointer"
                      title="Click to view unused QR code"
                    >
                    <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1.5 12s4-7.5 10.5-7.5S22.5 12 22.5 12s-4 7.5-10.5 7.5S1.5 12 1.5 12z" />
                      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                    </svg>
                      Unused QR
                    </button>
                  ) : hasExpiredToken ? (
                    // 3. Expired - Had token but it expired, admin can generate new one
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent('generateQR', { detail: student }))}
                      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors cursor-pointer"
                      title="Token expired - Generate new QR code"
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Expired
                    </button>
                  ) : hasNeverPaid ? (
                    // 4. Unpaid - Never made a sale, no QR available
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Unpaid
                    </span>
                  ) : hasRecentPayment ? (
                    // 5. QR on Receipt - Student has paid from September 2025 onwards and has no active/expired tokens
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.171 6.171m3.707 3.707l4.243 4.243m0 0L17.828 17.828" />
                        </svg>
                        QR on Receipt
                      </span>
                      <button
                        onClick={() => window.dispatchEvent(new CustomEvent('generateQR', { detail: student }))}
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800/50 transition-colors cursor-pointer"
                        title="Generate QR code for lost receipt"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11a9 9 0 11-18 0 9 9 0 0118 0zm-9 8a1 1 0 100-2 1 1 0 000 2z" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    // 6. Unpaid - Student has old payment (before September 2025), treated as unpaid for QR purposes
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2 0 1.105 1.343 2 3 2s3-.895 3-2c0-1.105-1.343-2-3-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14c1.657 0 3 .895 3 2s-1.343 2-3 2-3-.895-3-2 1.343-2 3-2z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V2m0 16v4" />
                      </svg>
                      Unpaid
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
