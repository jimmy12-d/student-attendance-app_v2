import React, { useState, useEffect } from 'react';
import { Student } from '../../../_interfaces';
import { ColumnConfig } from './ColumnToggle';
import { toast } from 'sonner';
import { AbsentStatusTracker } from './AbsentStatusTracker';
import { getStatusStyles } from '../../_lib/statusStyles';
import { getPaymentStatus } from '../../_lib/paymentLogic';
import { mdiTrophy, mdiMedal } from '@mdi/js';
import Icon from "../../../_components/Icon";
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../../../firebase-config';

// Event interface for upcoming events
interface Event {
  id: string;
  name: string;
  date: Timestamp | Date;
  formId: string;
}
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
  onBatchUpdate?: () => void;
  isSelected?: boolean;
  onSelect?: (studentId: string, isSelected: boolean) => void;
  getAttendanceStatus?: (student: Student) => string;
  // Note: These functions are wrapped by ClassTable with class/shift context already applied
  getTodayAttendanceStatus?: (student: Student) => { status?: string; time?: string };
  isStudentCurrentlyPresent?: (student: Student) => boolean;
  onAttendanceChange?: (studentId: string, isPresent: boolean) => void;
  calculateAverageArrivalTime?: (student: Student) => string;
  shiftRankings?: { earliest: { [studentId: string]: number }, latest: { [studentId: string]: number } };
  searchQuery?: string;
  highlightText?: (text: string, query: string) => React.ReactNode;
  // Upcoming events
  upcomingEvents?: Event[];
  getStudentEventStatus?: (studentId: string, eventId: string) => 'not-registered' | 'pending' | 'borrow' | 'paid';
}

export const StudentRow: React.FC<StudentRowProps> = ({ 
  student, 
  index, 
  enabledColumns, 
  onViewDetails, 
  isBatchEditMode = false, 
  isTakeAttendanceMode = false, 
  isSelected = false, 
  onSelect, 
  getTodayAttendanceStatus, 
  isStudentCurrentlyPresent, 
  onAttendanceChange, 
  calculateAverageArrivalTime, 
  shiftRankings,
  searchQuery = '',
  highlightText,
  upcomingEvents = [],
  getStudentEventStatus
}) => {
  const [hasParentLink, setHasParentLink] = useState(false);

  useEffect(() => {
    const checkParentLink = async () => {
      if (!student?.id) return;
      try {
        const q = query(
          collection(db, 'parentNotifications'),
          where('studentId', '==', student.id)
        );
        const querySnapshot = await getDocs(q);
        setHasParentLink(!querySnapshot.empty);
      } catch (error) {
        console.error('Error checking parent link:', error);
      }
    };
    checkParentLink();
  }, [student?.id]);

  // DEBUG: Log the full student object for Test Testing on October 11th
  if (student.fullName === "Test Testing" && new Date().toISOString().split('T')[0] === "2025-10-11") {
    console.log("🔍 StudentRow - Full student object for Test Testing:");
    console.log("  - student:", student);
    console.log("  - student.id:", student.id);
    console.log("  - student.class:", student.class);
    console.log("  - student.shift:", student.shift);
    console.log("  - student.inBPClass:", (student as any).inBPClass);
  }
  
  // Check if student has warning and is absent today
  // CRITICAL: getTodayAttendanceStatus is already wrapped with class/shift context by ClassTable
  const todayStatus = getTodayAttendanceStatus ? getTodayAttendanceStatus(student) : { status: 'Unknown' };
  
  // DEBUG: Log for Test Testing on October 11th
  if (student.fullName === "Test Testing" && new Date().toISOString().split('T')[0] === "2025-10-11") {
    console.log("🎯 StudentRow calling getTodayAttendanceStatus for Test Testing:");
    console.log("  - Context already wrapped by ClassTable");
    console.log("  - Returned status:", todayStatus);
  }
  
  const isWarningAbsent = student.warning && todayStatus.status === 'Absent';
  
  // Check if it's the student's birthday
  const isBirthday = (() => {
    if (!student.dateOfBirth) return false;
    const today = new Date();
    const birthDate = new Date(student.dateOfBirth);
    return today.getMonth() === birthDate.getMonth() && today.getDate() === birthDate.getDate();
  })();
  
  // Helper function to render status badge with optional SVG
  const renderStatusBadge = (status: string, displayText?: string, showTime?: string) => {
    const styles = getStatusStyles(status, true);
    const text = displayText || status;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${styles.badge}`}>
        {styles.svg && (
          <svg 
            className="w-3 h-3 mr-1" 
            fill={status.toLowerCase() === 'pending' ? "none" : "currentColor"} 
            stroke={status.toLowerCase() === 'pending' ? "currentColor" : "none"} 
            viewBox={status.toLowerCase() === 'pending' ? "0 0 22 22" : "0 0 20 20"}
          >
            <path 
              fillRule={status.toLowerCase() === 'pending' ? undefined : "evenodd"} 
              clipRule={status.toLowerCase() === 'pending' ? undefined : "evenodd"}
              strokeLinecap={status.toLowerCase() === 'pending' ? "round" : undefined}
              strokeLinejoin={status.toLowerCase() === 'pending' ? "round" : undefined}
              strokeWidth={status.toLowerCase() === 'pending' ? 2 : undefined}
              d={styles.svg} 
            />
          </svg>
        )}
        {text}
        {showTime && <span className="ml-1 text-xs opacity-75">({showTime})</span>}
      </span>
    );
  };

  
  return (
    <>
      {/* Birthday confetti effect */}
      {isBirthday && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
          <div className="absolute top-2 left-1/4 w-1 h-1 bg-yellow-400 rounded-full animate-bounce opacity-60 pointer-events-none"></div>
          <div className="absolute top-4 right-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-ping opacity-50 pointer-events-none"></div>
          <div className="absolute bottom-3 left-1/2 w-1 h-1 bg-rose-400 rounded-full animate-pulse opacity-70 pointer-events-none"></div>
          <div className="absolute top-6 right-1/4 w-0.5 h-0.5 bg-purple-400 rounded-full animate-bounce opacity-80 pointer-events-none"></div>
          <div className="absolute bottom-2 right-1/5 w-1 h-1 bg-orange-400 rounded-full animate-ping opacity-60 pointer-events-none"></div>
        </div>
      )}
      
      <tr 
      data-student-id={student.id}
      className={`group transition-all duration-300 ease-in-out hover:shadow-lg ${
        isWarningAbsent 
          ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 shadow-md animate-pulse' 
          : isBirthday
          ? 'bg-gradient-to-r from-pink-50 via-rose-50 to-pink-100 dark:from-pink-900/30 dark:via-rose-900/30 dark:to-pink-900/40 border-l-4 border-pink-400 shadow-lg ring-2 ring-pink-200 dark:ring-pink-800/50 animate-pulse shadow-pink-200/50 dark:shadow-pink-900/50'
          : isBatchEditMode && isSelected 
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' 
          : student.isFlipPreview && student.scheduleType?.toLowerCase() === 'flip-flop'
          ? 'bg-orange-50 dark:bg-orange-900/20 border-l-4 border-orange-400 shadow-sm' 
          : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
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
                      
                      {/* Birthday indicator */}
                      {isBirthday && (
                        <div className="absolute -top-2 -right-2 z-20">
                          <div className="relative">
                            {/* Main birthday badge */}
                            <div 
                              className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full shadow-lg animate-bounce border-2 border-white dark:border-gray-800 cursor-pointer hover:scale-110 transition-transform duration-200"
                              onClick={() => onViewDetails(student)}
                              title="View student details"
                            >
                              <span className="text-lg animate-pulse">🎂</span>
                            </div>
                            {/* Sparkle effects */}
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping opacity-75"></div>
                            <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-pink-300 rounded-full animate-pulse"></div>
                            <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-rose-400 rounded-full animate-bounce"></div>
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
                        {highlightText ? highlightText(student.fullName, searchQuery) : student.fullName}
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
                      {/* Birthday celebration message */}
                      {isBirthday && (
                        <div className="mt-1 flex items-center space-x-1 animate-pulse">
                          <span className="text-xs font-bold text-pink-600 dark:text-pink-400">🎉 HAPPY BIRTHDAY!</span>
                          <div className="flex space-x-1">
                            <span className="text-xs animate-bounce delay-100">🎂</span>
                            <span className="text-xs animate-bounce delay-200">🎈</span>
                            <span className="text-xs animate-bounce delay-300">🎊</span>
                          </div>
                        </div>
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
                    ? student.isFlipPreview 
                      ? 'bg-orange-200 dark:bg-orange-800/50 text-orange-900 dark:text-orange-200 group-hover:bg-orange-300 dark:group-hover:bg-orange-700/70 border border-orange-300 dark:border-orange-600'
                      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 group-hover:bg-orange-200 dark:group-hover:bg-orange-800/50'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 group-hover:bg-gray-200 dark:group-hover:bg-slate-600'
                }`}>
                  {student.scheduleType || 'N/A'}
                  {student.isFlipPreview && student.scheduleType?.toLowerCase() === 'flip-flop' && (
                    <span className="ml-1 text-xs font-semibold bg-orange-300 dark:bg-orange-700 px-1.5 py-0.5 rounded-full">
                      PREVIEW
                    </span>
                  )}
                </span>
              </td>
            );
          case 'paymentStatus':
            const paymentStatus = getPaymentStatus(student.lastPaymentMonth);

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

          case 'samsLink':
            return (
              <td key="samsLink" className="p-3 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  {hasParentLink ? (
                    // Link sent state - badge style with tick icon
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-default">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      Connected
                    </span>
                  ) : (
                    // Copy button state - interactive button style
                    <button
                      onClick={() => {
                        const botUsername = 'rodwell_sams_bot';
                        const token = btoa(`parent_${student.id}_${Date.now()}`);
                        const telegramUrl = `https://t.me/${botUsername}?start=parent_${token}`;
                        
                        const studentName = student.nameKhmer || student.fullName;
                        const khmerMessage = `សួស្តីបង,

ខាងក្រោមនេះជាលីងតភ្ជាប់ទៅ SAMS របស់សិស្សឈ្មោះ ${studentName}

សូមចុចលើលីងនេះ
${telegramUrl}

ទាំងម៉ាក់ ទាំងប៉ា អាចប្រើលីងតែមួយនេះបាន។ ប្រសិនបើបងមានសំណួរទាក់ទងនឹងការប្រើប្រាស់ បងអាចទាក់ទងមកពួកខ្ញុំបាន។`;
                        
                        navigator.clipboard.writeText(khmerMessage).then(() => {
                          toast.success('SAMS message copied!');
                        }).catch(() => {
                          alert(khmerMessage);
                        });
                      }}
                      className="group relative inline-flex items-center px-3 py-1 text-xs font-medium rounded-full shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-700 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white focus:ring-teal-500/25"
                    >
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                      </svg>
                      SAMS Link
                    </button>
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
                  {/* Show loading state if status is undefined, contains error messages, or is explicitly "Loading..." */}
                  {(!todayStatus || !todayStatus.status || 
                    todayStatus.status.includes('config missing') || 
                    todayStatus.status.includes('loading') ||
                    todayStatus.status === 'Loading...' ||
                    todayStatus.status === 'Unknown') ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                      <div className="w-3 h-3 mr-1 animate-spin rounded-full border border-current border-t-transparent"></div>
                      Loading...
                    </span>
                  ) : todayStatus.status === 'Absent' ? (
                    // Use AbsentStatusTracker for absent students
                    <AbsentStatusTracker
                      studentId={student.id}
                      studentName={student.fullName}
                      date={todayDate}
                      currentStatus="Absent"
                    />
                  ) : todayStatus.status === 'Not Yet Enrolled' ? (
                    renderStatusBadge(todayStatus.status, 'Join Today')
                  ) : todayStatus.status === 'Late' ? (
                    renderStatusBadge(todayStatus.status, 'Late', todayStatus.time)
                  ) : todayStatus.status.toLowerCase() === 'send home' || todayStatus.status.toLowerCase() === 'send-home' ? (
                    renderStatusBadge(todayStatus.status, 'Send Home')
                  ) : (
                    renderStatusBadge(
                      todayStatus.status || 'Unknown', 
                      todayStatus.status === 'No School' ? 'No School' : 
                      todayStatus.status || 'Unknown'
                    )
                  )}
                </div>
              </td>
            );

            case 'averageArrivalTime':
              const averageTime = calculateAverageArrivalTime ? calculateAverageArrivalTime(student) : "Loading...";
              const isOnTime = averageTime === "on time";
              const isLate = averageTime.includes('late');
              const isEarly = averageTime.includes('early');
              
              // Check for rankings
              const earliestRank = shiftRankings?.earliest[student.id];
              const latestRank = shiftRankings?.latest[student.id];
              
              // Determine status type for styling
              let statusType = 'default';
              let badgeText = averageTime;
              let showIcon = false;
              let iconType = '';
              
              if (isOnTime) {
                statusType = 'pending'; // Use pending for blue styling
                badgeText = 'On Time';
                showIcon = true;
                iconType = 'check';
                // Override with custom blue styling for on-time
                //enhancedClasses = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700';
              } else if (isEarly) {
                statusType = 'present'; // Green for early
                if (earliestRank) {
                  badgeText = averageTime; // Just show time, icon will be separate
                  showIcon = true;
                  iconType = 'trophy';
                } else {
                  showIcon = true;
                  iconType = 'early';
                }
              } else if (isLate) {
                statusType = 'late'; // Yellow/amber for late
                if (latestRank) {
                  badgeText = averageTime; // Just show time, icon will be separate
                  showIcon = true;
                  iconType = 'warning';
                } else {
                  showIcon = true;
                  iconType = 'clock';
                }
              } else if (averageTime === "Loading...") {
                statusType = 'pending';
                badgeText = 'Loading...';
              } else {
                statusType = 'default';
                badgeText = averageTime;
              }
              
              // Get status styles
              const statusStyles = getStatusStyles(statusType);
              
              // Enhanced styling for top rankings and special cases
              let enhancedClasses = statusStyles.badge;
              let ringClasses = '';
              
              // Custom blue styling for on-time status
              if (isOnTime) {
                enhancedClasses = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700';
              } else if (earliestRank && earliestRank <= 3) {
                // Green styling for top 3 earliest (use original green status badge)
                enhancedClasses = statusStyles.badge + ' ring-1 ring-green-300 dark:ring-green-600';
                if (earliestRank === 1) {
                  enhancedClasses = statusStyles.badge + ' ring-2 ring-green-400 dark:ring-green-500 shadow-lg';
                }
              } else if (latestRank && latestRank <= 3) {
                // Yellow/amber styling for top 3 latest
                const lateStatusStyles = getStatusStyles('late');
                enhancedClasses = lateStatusStyles.badge + ' ring-1 ring-amber-300 dark:ring-amber-600';
                if (latestRank === 1) {
                  enhancedClasses = lateStatusStyles.badge + ' ring-2 ring-amber-400 dark:ring-amber-500 shadow-lg';
                }
              }
              
              return (
                <td key="averageArrivalTime" className="p-3 whitespace-nowrap">
                  <div className="flex items-center justify-center">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${enhancedClasses} ${ringClasses} ${
                      (earliestRank === 1 || latestRank === 1) ? 'animate-pulse' : ''
                    }`}>
                      {/* Rank number for top 3 performers - prioritize earliest over latest */}
                      {((earliestRank && earliestRank <= 3) || (latestRank && latestRank <= 3)) && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                          earliestRank && earliestRank <= 3
                            ? earliestRank === 1 
                              ? 'bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200' // Gold for #1 earliest
                              : earliestRank === 2
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200' // Silver for #2 earliest
                              : 'bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-200' // Bronze for #3 earliest
                            : latestRank === 1 
                              ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100' // Red for #1 latest
                              : latestRank === 2
                              ? 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100' // Red for #2 latest
                              : 'bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-100' // Red for #3 latest
                        }`}>
                          #{earliestRank && earliestRank <= 3 ? earliestRank : latestRank}
                        </span>
                      )}
                      
                      {/* Icon based on type - Different icons for each rank */}
                      {showIcon && (earliestRank || latestRank) && (
                        <span className="flex-shrink-0">
                          {earliestRank && earliestRank <= 3 ? (
                            earliestRank === 1 ? (
                              // Gold Trophy for #1 earliest
                              <Icon path={mdiTrophy} className="w-5 h-5 text-yellow-500" />
                            ) : earliestRank === 2 ? (
                              // Silver Medal for #2 earliest
                              <Icon path={mdiMedal} className="w-5 h-5 text-gray-400" />
                            ) : (
                              // Bronze Medal for #3 earliest
                              <Icon path={mdiMedal} className="w-5 h-5 text-orange-400" />
                            )
                          ) : latestRank && latestRank <= 3 ? (
                            // Warning icon for latest ranks
                            <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          ) : iconType === 'check' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : null}
                        </span>
                      )}
                      
                      {/* Regular icons for non-ranked students */}
                      {showIcon && !earliestRank && !latestRank && (
                        <span className="mr-1.5 flex-shrink-0">
                          {iconType === 'check' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : iconType === 'clock' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : iconType === 'early' ? (
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          ) : null}
                        </span>
                      )}
                      
                      {/* Badge text (arrival time) */}
                      <span className="truncate max-w-32">
                        {badgeText}
                      </span>
                    </span>
                  </div>
                </td>
              );

          case 'portal':
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
            const isLoggedIn = student.authUid && student.authUid.trim() !== ""; // Has legitimate auth UID
            const hasUsedQR = student.chatId && student.passwordHash && (!student.authUid || student.authUid.trim() === ""); // Used QR but not fully logged in
            const hasExpiredToken = student.registrationToken && tokenExpiryDate && tokenExpiryDate <= new Date();
            const hasNeverPaid = !student.lastPaymentMonth; // Never made a payment
            const hasRecentPayment = student.lastPaymentMonth && student.lastPaymentMonth >= "2025-09"; // QR available from September 2025 onwards
            
            return (
              <td key="portal" className="p-3 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  {isLoggedIn ? (
                    // 1. Logged In - Student is fully registered with legitimate auth UID
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Logged In
                    </span>
                  ) : hasUsedQR ? (
                    // 2. Used QR - Has chatId and passwordHash but no legitimate auth UID
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Used QR
                    </span>
                  ) : hasActiveToken ? (
                    // 3. Unused QR - Has active token but not registered yet
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
                    // 4. Expired - Had token but it expired, admin can generate new one
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
                    // 5. Unpaid - Never made a sale, no QR available
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Unpaid
                    </span>
                  ) : hasRecentPayment ? (
                    // 6. QR on Receipt - Student has paid from September 2025 onwards and has no active/expired tokens
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
                    // 7. Unpaid - Student has old payment (before September 2025), treated as unpaid for QR purposes
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

          case 'notificationVersion':
            // Show notification version status - especially important for Android after fixes
            const needsUpdate = student.notificationPlatform === 'Android' && 
                               (!student.notificationVersion || student.notificationVersion === 'unknown' || 
                                student.notificationVersion !== 'v2.2.0-android-fix');
            const hasNotificationSetup = student.authUid && student.notificationVersion;
            
            return (
              <td key="notificationVersion" className="p-3 whitespace-nowrap">
                <div className="flex items-center justify-center">
                  {!student.authUid ? (
                    // No auth UID - not logged in
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                      Not Logged In
                    </span>
                  ) : !hasNotificationSetup ? (
                    // Logged in but no notification token
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-700">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                      No Notif Setup
                    </span>
                  ) : student.notificationPlatform === 'Android' && needsUpdate ? (
                    // Android with outdated version - needs reinstall
                    <span 
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-700 animate-pulse cursor-help"
                      title={`Android user with old notification system (${student.notificationVersion || 'unknown'}). Needs to reinstall PWA for Android notification fix.`}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      {student.notificationPlatform} ({student.notificationVersion || 'old'})
                      <span className="ml-1 text-xs bg-red-200 dark:bg-red-800 px-1.5 py-0.5 rounded-full font-semibold">REINSTALL</span>
                    </span>
                  ) : student.notificationPlatform === 'Android' ? (
                    // Android with current version - good!
                    <span 
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-700"
                      title={`Android user with latest notification system (${student.notificationVersion}).`}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {student.notificationPlatform} ✓
                    </span>
                  ) : student.notificationPlatform === 'iOS' ? (
                    // iOS - always works
                    <span 
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                      title={`iOS user - notifications working (${student.notificationVersion || 'active'}).`}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {student.notificationPlatform} ✓
                    </span>
                  ) : (
                    // Other platform or unknown
                    <span 
                      className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                      title={`Platform: ${student.notificationPlatform || 'unknown'}, Version: ${student.notificationVersion || 'unknown'}`}
                    >
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {student.notificationPlatform || 'Unknown'}
                    </span>
                  )}
                </div>
              </td>
            );

          case 'upcomingEvents':
            // This case is no longer used - individual event columns are handled in the default case
            return null;

          default:
            // Handle individual event columns (event-{eventId})
            if (column.id.startsWith('event-')) {
              const eventId = column.id.replace('event-', '');
              const event = upcomingEvents.find(e => e.id === eventId);
              
              if (!event) return null;
              
              const eventStatus = getStudentEventStatus ? getStudentEventStatus(student.id, event.id) : 'not-registered';
              const eventDate = event.date instanceof Date ? event.date : event.date.toDate();
              const isToday = eventDate.toDateString() === new Date().toDateString();
              
              // Status styling
              let statusColor = '';
              let statusText = '';
              let statusIcon = '';
              
              switch (eventStatus) {
                case 'paid':
                  statusColor = 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700';
                  statusText = 'Paid';
                  statusIcon = 'M5.5 12.5L10.167 17L19.5 8';
                  break;
                case 'borrow':
                  statusColor = 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700';
                  statusText = 'Borrowed';
                  statusIcon = 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
                  break;
                case 'pending':
                  statusColor = 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700';
                  statusText = 'Pending';
                  statusIcon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
                  break;
                case 'not-registered':
                default:
                  statusColor = 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600';
                  statusText = 'Not Registered';
                  statusIcon = 'M213.333 960c0-167.36 56-321.707 149.44-446.4L1406.4 1557.227c-124.693 93.44-279.04 149.44-446.4 149.44-411.627 0-746.667-335.04-746.667-746.667m1493.334 0c0 167.36-56 321.707-149.44 446.4L513.6 362.773c124.693-93.44 279.04-149.44 446.4-149.44 411.627 0 746.667 335.04 746.667 746.667M960 0C429.76 0 0 429.76 0 960s429.76 960 960 960 960-429.76 960-960S1490.24 0 960 0';
                  break;
              }
              
              return (
                <td key={column.id} className="p-3 whitespace-nowrap">
                  <div className="flex flex-col space-y-1">
                    {isToday && (
                      <div className="text-xs font-bold text-red-600 dark:text-red-400">
                        🔴 Today
                      </div>
                    )}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                      <svg 
                        className="w-3 h-3 mr-1" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox={
                          statusIcon.includes('M960 0') ? "0 0 1920 1920" : 
                          statusIcon.includes('M5.5 12.5') ? "0 -0.5 25 25" : 
                          "0 0 24 24"
                        }
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={statusIcon.includes('M960 0') ? 0 : 1.5} 
                          fill={statusIcon.includes('M960 0') ? "currentColor" : "none"}
                          d={statusIcon} 
                        />
                      </svg>
                      {statusText}
                    </span>
                  </div>
                </td>
              );
            }
            
            return null;
        }
      })}
    </tr>
    </>
  );
};
