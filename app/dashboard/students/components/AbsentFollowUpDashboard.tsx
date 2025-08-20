import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { getStudentDailyStatus, RawAttendanceRecord } from '../../_lib/attendanceLogic';
import { AllClassConfigs } from '../../_lib/configForAttendanceLogic';
import { AbsentFollowUp, AbsentStatus, PermissionRecord } from '../../../_interfaces';
import { AbsentStatusTracker } from './AbsentStatusTracker';
import CardBox from '../../../_components/CardBox';
import SectionTitleLineWithButton from '../../../_components/Section/TitleLineWithButton';
import { mdiAccountOff, mdiFilter, mdiCalendarRange, mdiPhone, mdiCheckCircle } from '@mdi/js';
import { toast } from 'sonner';

// Phone formatting utility (same as StudentRow)
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

interface AbsentFollowUpDashboardProps {
  selectedDate?: string; // YYYY-MM-DD format
  selectedClass?: string;
  selectedShift?: string;
  onViewDetails?: (student: any) => void; // Add view details callback
}

interface AbsentFollowUpWithDetails extends AbsentFollowUp {
  daysSinceAbsent: number;
  isUrgent: boolean;
  student?: any; // Add student data for priority calculation
}

const getStatusColor = (status: AbsentStatus, isUrgent: boolean = false): string => {
  if (isUrgent && status === 'Absent') {
    return 'bg-red-200 dark:bg-red-800/50 text-red-900 dark:text-red-200 border-red-300 dark:border-red-600 animate-pulse shadow-lg font-bold';
  }
  
  switch (status) {
    case 'Absent':
      return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
    case 'Contacted':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800';
    case 'Waiting for Response':
      return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
    case 'Resolved':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
    default:
      return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700';
  }
};

const getPriorityLevel = (student: any, daysSinceAbsent: number, status: AbsentStatus, updatedAt?: Date | Timestamp): 'low' | 'high' => {
  if (status === 'Resolved') return 'low';
  
  // High priority if student has warning field true
  if (student?.warning === true) {
    return 'high';
  }
  
  // High priority if student is "Waiting for Response" for longer than 2 hours
  if (status === 'Waiting for Response' && updatedAt) {
    const now = new Date();
    // Convert Timestamp to Date if needed
    const dateUpdatedAt = updatedAt instanceof Date ? updatedAt : updatedAt.toDate();
    const timeDiff = now.getTime() - dateUpdatedAt.getTime();
    const hoursWaiting = timeDiff / (1000 * 60 * 60); // Convert to hours
    
    if (hoursWaiting > 2) {
      return 'high';
    }
  }
  
  return 'low';
};

export const AbsentFollowUpDashboard: React.FC<AbsentFollowUpDashboardProps> = ({
  selectedDate,
  selectedClass,
  selectedShift,
  onViewDetails
}) => {
  const [followUps, setFollowUps] = useState<AbsentFollowUpWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<AbsentStatus | 'All'>('All');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'high'>('all');

  useEffect(() => {
    fetchAbsentFollowUpsAndAbsentStudents();
  }, [selectedDate, selectedClass, selectedShift]);

  const fetchAbsentFollowUpsAndAbsentStudents = async () => {
    if (!selectedDate) {
      setFollowUps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch all students
      const studentsSnapshot = await getDocs(collection(db, 'students'));
      let allStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // Filter out dropped, break, and waitlist students
      allStudents = allStudents.filter(s => !s.dropped && !s.onBreak && !s.onWaitlist);

      // Filter by class and shift if provided
      if (selectedClass) {
        allStudents = allStudents.filter(s => s.class === selectedClass);
      }
      if (selectedShift) {
        allStudents = allStudents.filter(s => s.shift === selectedShift);
      }

      // 2. Fetch all attendance records for the selected date
      let attendanceQuery = query(collection(db, 'attendance'), where('date', '==', selectedDate));
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceRecords = attendanceSnapshot.docs.map(doc => doc.data());

      // 3. Fetch all permissions for the selected date
      const permissionsSnapshot = await getDocs(collection(db, 'permissions'));
      const allPermissions = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PermissionRecord[];
      
      // 4. Fetch class configs (needed for attendance logic)
      const classConfigsSnapshot = await getDocs(collection(db, 'classes'));
      const allClassConfigs: AllClassConfigs = {};
      classConfigsSnapshot.docs.forEach(doc => {
        allClassConfigs[doc.id] = doc.data() as any;
      });

      // 5. Fetch all follow-ups for the selected date
      let followUpsQuery = query(collection(db, 'absentFollowUps'), where('date', '==', selectedDate));
      const followUpsSnapshot = await getDocs(followUpsQuery);
      const followUpData: AbsentFollowUp[] = [];
      followUpsSnapshot.forEach((doc) => {
        const data = doc.data();
        followUpData.push({
          id: doc.id,
          studentId: data.studentId,
          studentName: data.studentName,
          date: data.date,
          status: data.status,
          notes: data.notes,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
          updatedBy: data.updatedBy
        });
      });

      // 6. Use the same logic as TableStudents to determine absent students
      const today = new Date();
      const absentStudents: AbsentFollowUpWithDetails[] = allStudents.map(student => {
        try {
          // Find attendance record for this student on selected date
          const attendanceRecord = attendanceRecords.find((rec: any) => rec.studentId === student.id) as RawAttendanceRecord | undefined;
          
          // Find permissions for this student on selected date
          const studentPermissions = allPermissions.filter(permission => 
            permission.studentId === student.id && 
            permission.status === 'approved' &&
            selectedDate >= permission.permissionStartDate && 
            selectedDate <= permission.permissionEndDate
          );

          // Use the same attendance logic as the main table
          const result = getStudentDailyStatus(
            student,
            selectedDate,
            attendanceRecord,
            allClassConfigs,
            studentPermissions
          );

          const status = result.status?.toLowerCase() || '';
          
          // Only include students who are actually absent
          if (status === 'absent') {
            // Check if there's already a follow-up
            const followUp = followUpData.find(f => f.studentId === student.id);
            const absentDate = new Date(selectedDate || today);
            const daysSinceAbsent = Math.floor((today.getTime() - absentDate.getTime()) / (1000 * 60 * 60 * 24));
            const isUrgent = daysSinceAbsent >= 3;
            
            const studentWithFollowUp = followUp ? {
              ...followUp,
              daysSinceAbsent,
              isUrgent,
              nameKhmer: student.nameKhmer, // Add Khmer name to the object
              student: student // Add full student data for priority calculation
            } : {
              id: undefined,
              studentId: student.id,
              studentName: student.fullName,
              date: selectedDate,
              status: 'Absent' as AbsentStatus,
              notes: '',
              updatedAt: new Date(),
              updatedBy: '',
              daysSinceAbsent,
              isUrgent,
              nameKhmer: student.nameKhmer, // Add Khmer name to the object
              student: student // Add full student data for priority calculation
            };
            
            return studentWithFollowUp;
          }
        } catch (error) {
          console.error('Error checking attendance for student', student.fullName, ':', error);
        }
        return null;
      }).filter(Boolean) as (AbsentFollowUpWithDetails & { nameKhmer?: string })[];

      // 7. Add any follow-ups for the date that are not in the absentStudents list (e.g. status changed to Contacted, etc.)
      followUpData.forEach(fu => {
        if (!absentStudents.find(s => s.studentId === fu.studentId)) {
          const absentDate = new Date(selectedDate || today);
          const daysSinceAbsent = Math.floor((today.getTime() - absentDate.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysSinceAbsent >= 3 && fu.status === 'Absent';
          
          // Find the student data for this follow-up
          const studentData = allStudents.find(s => s.id === fu.studentId);
          
          absentStudents.push({ 
            ...fu, 
            daysSinceAbsent, 
            isUrgent,
            student: studentData || {} // Add student data for priority calculation
          });
        }
      });

      setFollowUps(absentStudents);
    } catch (error) {
      console.error('Error fetching absent follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (studentId: string, date: string, newStatus: AbsentStatus) => {
    setFollowUps(prev => prev.map(followUp => 
      followUp.studentId === studentId && followUp.date === date
        ? { ...followUp, status: newStatus, updatedAt: new Date() }
        : followUp
    ));
  };

  // Sort by shift function (Morning -> Afternoon -> Evening)
  const getShiftOrder = (shift: string): number => {
    switch (shift?.toLowerCase()) {
      case 'morning': return 1;
      case 'afternoon': return 2;
      case 'evening': return 3;
      default: return 4; // Unknown shifts go last
    }
  };

  // Filter follow-ups based on selected filters
  const filteredFollowUps = followUps.filter(followUp => {
    if (statusFilter !== 'All' && followUp.status !== statusFilter) return false;
    
    if (priorityFilter !== 'all') {
      const priority = getPriorityLevel(followUp.student || {}, followUp.daysSinceAbsent, followUp.status, followUp.updatedAt);
      if (priorityFilter === 'high' && priority !== 'high') return false;
    }
    
    return true;
  });

  // Sort filtered follow-ups by shift
  const sortedFollowUps = [...filteredFollowUps].sort((a, b) => {
    const shiftA = getShiftOrder(a.student?.shift || '');
    const shiftB = getShiftOrder(b.student?.shift || '');
    
    if (shiftA !== shiftB) {
      return shiftA - shiftB;
    }
    
    // If same shift, sort by student name
    return a.studentName.localeCompare(b.studentName);
  });

  // Group by priority for better organization
  const highFollowUps = sortedFollowUps.filter(f => getPriorityLevel(f.student || {}, f.daysSinceAbsent, f.status, f.updatedAt) === 'high');
  const lowFollowUps = sortedFollowUps.filter(f => getPriorityLevel(f.student || {}, f.daysSinceAbsent, f.status, f.updatedAt) === 'low');

  const FollowUpRow: React.FC<{ followUp: AbsentFollowUpWithDetails }> = ({ followUp }) => {
    const priority = getPriorityLevel(followUp.student || {}, followUp.daysSinceAbsent, followUp.status, followUp.updatedAt);
    const isHigh = priority === 'high';
    const student = followUp.student || {};
    
    return (
      <tr className={`transition-all duration-200 group ${
        isHigh 
          ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500' 
          : 'hover:bg-gray-50 dark:hover:bg-slate-700/50'
      }`}>
        <td className="p-4">
          <div className="flex items-center">
            <div className="relative group/index mr-3">
              {/* Priority indicator */}
              {isHigh && (
                <div className="absolute -top-1 -right-1 z-10">
                  <div className="flex items-center justify-center w-4 h-4 bg-red-500 rounded-full animate-bounce">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              )}
              
              <span className={`inline-flex items-center justify-center w-8 h-8 text-sm font-medium rounded-full bg-white/70 dark:bg-slate-700/70 backdrop-blur-sm transition-colors duration-200 group-hover/index:opacity-0 ${
                isHigh ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {isHigh ? '!' : '✓'}
              </span>
              
              {/* Hover overlay with eye icon */}
              {onViewDetails && (
                <div 
                  className={`absolute inset-0 ${
                    isHigh ? 'bg-red-600' : 'bg-green-600'
                  } bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover/index:opacity-100 transition-opacity duration-200 cursor-pointer`}
                  onClick={() => onViewDetails(student)}
                  title="View student details"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <div 
                className="font-semibold text-gray-900 dark:text-gray-100 cursor-pointer hover:underline transition-colors duration-200 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(followUp.studentName);
                    toast.success(`Copied "${followUp.studentName}" to clipboard`);
                  } catch (err) {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = followUp.studentName;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    toast.success(`Copied "${followUp.studentName}" to clipboard`);
                  }
                }}
                title={`Click to copy "${followUp.studentName}"`}
              >
                {followUp.studentName}
              </div>
              <div className="text-sm khmer-font text-gray-500 dark:text-gray-400">
                {(followUp as any).nameKhmer || 'N/A'}
              </div>
            </div>
          </div>
        </td>
        
        {/* Phone/Telegram Column */}
        <td className="p-4 whitespace-nowrap">
          {student.phone ? (
            student.hasTelegramUsername && student.telegramUsername ? (
              <a 
                href={`https://t.me/${student.telegramUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-600 hover:text-blue-900 dark:hover:text-blue-100 transition-colors duration-200 cursor-pointer whitespace-nowrap"
                title={`Contact ${followUp.studentName} on Telegram (@${student.telegramUsername})`}
              >
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="truncate">{formatPhoneNumber(student.phone)}</span>
              </a>
            ) : student.hasTelegramUsername && !student.telegramUsername ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors duration-200 whitespace-nowrap"
                    title={`${followUp.studentName} needs Telegram username setup`}>
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="truncate">{formatPhoneNumber(student.phone)}</span>
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors duration-200 whitespace-nowrap">
                <span className="truncate">{formatPhoneNumber(student.phone)}</span>
              </span>
            )
          ) : (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 transition-colors duration-200 whitespace-nowrap">
              N/A
            </span>
          )}
        </td>
        
        {/* Message Template Column */}
        <td className="p-4 whitespace-nowrap">
          {(() => {
            // Only show message templates for Absent status - these are for contacting students
            if (followUp.status === 'Absent') {
              let message = '';
              let previewText = '';
              let bgColor = 'bg-blue-100 dark:bg-blue-900/30';
              let textColor = 'text-blue-800 dark:text-blue-300';
              let borderColor = 'border-blue-200 dark:border-blue-800';
              let hoverColor = 'hover:bg-blue-200 dark:hover:bg-blue-800/50';
              
              // Handle daysSinceAbsent cases (including 0 or null)
              const daysAbsent = followUp.daysSinceAbsent || 0;
              
              if (daysAbsent === 0 || daysAbsent === 1) {
                message = `Hi ${followUp.studentName}, why didn't you come to school today?`;
                previewText = 'Why absent today?';
              } else if (daysAbsent === 2) {
                message = `Hi ${followUp.studentName}, you've been absent for 2 days now. We're concerned about you. Please contact us when you get this message.`;
                previewText = '2 days absent - need contact...';
              } else if (daysAbsent >= 3 && daysAbsent <= 4) {
                message = `Hi ${followUp.studentName}, you've missed ${daysAbsent} days of class. This is affecting your learning. Please come to school or let us know what's happening.`;
                previewText = `${daysAbsent} days - affecting learning...`;
                bgColor = 'bg-orange-100 dark:bg-orange-900/30';
                textColor = 'text-orange-800 dark:text-orange-300';
                borderColor = 'border-orange-200 dark:border-orange-800';
                hoverColor = 'hover:bg-orange-200 dark:hover:bg-orange-800/50';
              } else if (daysAbsent >= 5 && daysAbsent <= 7) {
                message = `Hi ${followUp.studentName}, you've been absent for ${daysAbsent} days. You're missing important lessons and falling behind. Please return to school immediately or contact us to discuss your situation.`;
                previewText = `${daysAbsent} days - falling behind...`;
                bgColor = 'bg-red-100 dark:bg-red-900/30';
                textColor = 'text-red-800 dark:text-red-300';
                borderColor = 'border-red-200 dark:border-red-800';
                hoverColor = 'hover:bg-red-200 dark:hover:bg-red-800/50';
              } else if (daysAbsent >= 8) {
                message = `Hi ${followUp.studentName}, you've been absent for over a week (${daysAbsent} days). This is very concerning. Please contact the school urgently to discuss your continued enrollment.`;
                previewText = `${daysAbsent} days - urgent action...`;
                bgColor = 'bg-red-100 dark:bg-red-900/30';
                textColor = 'text-red-800 dark:text-red-300';
                borderColor = 'border-red-200 dark:border-red-800';
                hoverColor = 'hover:bg-red-200 dark:hover:bg-red-800/50';
              }

              // Only show the template button if we have a message
              if (message && previewText) {
                return (
                  <div className="group/message relative">
                    <button
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(message);
                          toast.success('Message template copied to clipboard!');
                        } catch (err) {
                          // Fallback for older browsers
                          const textArea = document.createElement('textarea');
                          textArea.value = message;
                          document.body.appendChild(textArea);
                          textArea.select();
                          document.execCommand('copy');
                          document.body.removeChild(textArea);
                          toast.success('Message template copied to clipboard!');
                        }
                      }}
                      className={`inline-flex items-center px-3 py-2 rounded-lg text-xs font-medium ${bgColor} ${textColor} border ${borderColor} ${hoverColor} transition-colors duration-200 cursor-pointer max-w-xs`}
                      title="Click to copy message template"
                    >
                      <svg className="w-3 h-3 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      <span className="truncate">
                        {previewText}
                      </span>
                    </button>
                    
                    {/* Tooltip with full message */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover/message:opacity-100 transition-opacity duration-200 pointer-events-none z-[9999] max-w-sm whitespace-normal">
                      {message}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                    </div>
                  </div>
                );
              }
            }
            
            // For non-absent statuses or when no message template is available, show N/A
            return (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
                N/A
              </span>
            );
          })()}
        </td>
        
        <td className="p-4">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {new Date(followUp.date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </div>
          <div className={`text-xs font-medium ${
            followUp.daysSinceAbsent >= 3 ? 'text-red-600 dark:text-red-400' :
            followUp.daysSinceAbsent >= 2 ? 'text-orange-600 dark:text-orange-400' :
            'text-gray-500 dark:text-gray-400'
          }`}>
            {followUp.daysSinceAbsent === 0 ? 'Today' : 
             followUp.daysSinceAbsent === 1 ? 'Yesterday' :
             `${followUp.daysSinceAbsent} days ago`}
          </div>
        </td>
        
        <td className="p-4">
          <AbsentStatusTracker
            studentId={followUp.studentId}
            studentName={followUp.studentName}
            date={followUp.date}
            currentStatus={followUp.status}
            onStatusUpdate={(newStatus) => handleStatusUpdate(followUp.studentId, followUp.date, newStatus)}
          />
        </td>
        
        <td className="p-4">
          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
            priority === 'high' ? 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-900/50 dark:text-red-300' :
            'bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/50 dark:text-green-300'
          }`}>
            {priority.charAt(0).toUpperCase() + priority.slice(1)}
            {/* Add indicator if high priority due to waiting too long */}
            {priority === 'high' && followUp.status === 'Waiting for Response' && followUp.updatedAt && (() => {
              const now = new Date();
              const dateUpdatedAt = followUp.updatedAt instanceof Date ? followUp.updatedAt : followUp.updatedAt.toDate();
              const hoursWaiting = (now.getTime() - dateUpdatedAt.getTime()) / (1000 * 60 * 60);
              return hoursWaiting > 2;
            })() && (
              <span title="High priority due to waiting over 2 hours">
                <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
        </td>
        
        <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex flex-col">
            <span>{(followUp.updatedAt instanceof Date ? followUp.updatedAt : new Date()).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })}</span>
            <span className="text-xs">{(followUp.updatedAt instanceof Date ? followUp.updatedAt : new Date()).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            })}</span>
          </div>
        </td>
      </tr>
    );
  };

  const PrioritySection: React.FC<{ 
    title: string; 
    followUps: AbsentFollowUpWithDetails[]; 
    icon: string; 
    color: string 
  }> = ({ title, followUps, icon, color }) => {
    if (followUps.length === 0) return null;
    
    return (
      <div className="mb-6 overflow-visible">
        <div className={`flex items-center space-x-3 mb-4 px-4 py-3 rounded-xl ${color} shadow-sm`}>
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{title}</h3>
          </div>
          <div className="flex-shrink-0">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-white/20 backdrop-blur-sm">
              {followUps.length} student{followUps.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700">
          <div className="overflow-visible">
            <table className="min-w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Phone/Telegram
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Message Template
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Absent Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Follow-up Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {followUps.map((followUp) => (
                  <FollowUpRow key={`${followUp.studentId}-${followUp.date}`} followUp={followUp} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <CardBox>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading absent follow-ups...</span>
        </div>
      </CardBox>
    );
  }

  return (
    <div className="space-y-6 overflow-visible">
      <SectionTitleLineWithButton 
        icon={mdiAccountOff} 
        title="Absent Students Follow-up Dashboard"
      />
      
      {/* Filters */}
      <CardBox>
        <div className="flex flex-wrap items-center gap-4 p-4">
          <div className="flex items-center space-x-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as AbsentStatus | 'All')}
            className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="All">All Statuses</option>
            <option value="Absent">Absent</option>
            <option value="Contacted">Contacted</option>
            <option value="Waiting for Response">Waiting for Response</option>
            <option value="Resolved">Resolved</option>
          </select>
          
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as 'all' | 'high')}
            className="px-3 py-1 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority Only</option>
          </select>
          
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Total: {sortedFollowUps.length}</span>
            {highFollowUps.length > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                High: {highFollowUps.length}
              </span>
            )}
          </div>
        </div>
      </CardBox>

      {/* Priority Sections */}
      <PrioritySection
        title="🚨 High Priority - Warning Students & Delayed Responses"
        followUps={highFollowUps}
        icon="M6 18L18 6M6 6l12 12"
        color="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
      />
      
      <PrioritySection
        title=" Low Priority - Regular Follow-up"
        followUps={lowFollowUps}
        icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        color="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
      />

      {sortedFollowUps.length === 0 && (
        <CardBox>
          <div className="text-center py-8">
            <svg className="w-12 h-12 mx-auto text-green-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400">
              {followUps.length === 0 
                ? "No absent students to follow up on! 🎉"
                : "No follow-ups match your current filters."}
            </p>
          </div>
        </CardBox>
      )}
    </div>
  );
};
