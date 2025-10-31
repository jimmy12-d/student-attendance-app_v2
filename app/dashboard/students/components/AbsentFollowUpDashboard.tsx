import React, { useState, useEffect } from 'react';
import { db } from '../../../../firebase-config';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getStudentDailyStatus, RawAttendanceRecord, calculateMonthlyAbsencesLogic, getMonthDetailsForLogic } from '../../_lib/attendanceLogic';
import { AllClassConfigs } from '../../_lib/configForAttendanceLogic';
import { AbsentFollowUp, AbsentStatus, PermissionRecord } from '../../../_interfaces';
import { AbsentStatusTracker } from './AbsentStatusTracker';
import CardBox from '../../../_components/CardBox';
import SectionTitleLineWithButton from '../../../_components/Section/TitleLineWithButton';
import { mdiAccountOff } from '@mdi/js';
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
  monthlyAbsentCount?: number; // Add monthly absent count
  nameKhmer?: string; // Add Khmer name field
}

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
  const [monthlyAbsenceCounts, setMonthlyAbsenceCounts] = useState<{[studentId: string]: number}>({});
  const [sendingNotifications, setSendingNotifications] = useState<{[key: string]: boolean}>({});

  const handleSendParentNotification = async (followUp: AbsentFollowUpWithDetails) => {
    const key = `${followUp.studentId}-${followUp.date}`;
    
    try {
      setSendingNotifications(prev => ({ ...prev, [key]: true }));
      
      const functions = getFunctions(undefined, 'asia-southeast1');
      const notifyParentAbsence = httpsCallable(functions, 'notifyParentAbsence');
      
      const result = await notifyParentAbsence({
        studentId: followUp.studentId,
        studentName: followUp.studentName || 'Unknown Student',
        date: followUp.date,
        absentFollowUpId: followUp.id
      });
      
      const data = result.data as any;
      
      if (data.success) {
        toast.success(`Sent ${data.notificationsSent} notification(s) to parent(s)`);
        // Refresh the data to show updated notification status
        await fetchAbsentFollowUpsAndAbsentStudents();
      } else if (data.status === 'no_parent') {
        toast.info('No active parent registered for this student');
      } else {
        toast.error(data.error || 'Failed to send notification');
      }
    } catch (error: any) {
      console.error('Error sending parent notification:', error);
      toast.error(error.message || 'Failed to send parent notification');
    } finally {
      setSendingNotifications(prev => ({ ...prev, [key]: false }));
    }
  };

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
      const attendanceQuery = query(collection(db, 'attendance'), where('date', '==', selectedDate));
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
      const followUpsQuery = query(collection(db, 'absentFollowUps'), where('date', '==', selectedDate));
      const followUpsSnapshot = await getDocs(followUpsQuery);
      const followUpData: AbsentFollowUp[] = [];
      followUpsSnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Fix "Unknown" student name by looking up from students collection
        let studentName = data.studentName;
        if (!studentName || studentName === 'Unknown' || studentName === 'Unknown Student') {
          const studentData = allStudents.find(s => s.id === data.studentId);
          studentName = studentData?.fullName || data.studentName || 'Unknown Student';
        }
        
        followUpData.push({
          id: doc.id,
          studentId: data.studentId,
          studentName: studentName, // Use the fixed student name
          date: data.date,
          status: data.status,
          notes: data.notes,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
          updatedBy: data.updatedBy,
          parentNotificationStatus: data.parentNotificationStatus || null,
          parentNotificationTimestamp: data.parentNotificationTimestamp instanceof Timestamp ? data.parentNotificationTimestamp.toDate() : data.parentNotificationTimestamp || null,
          parentNotificationsSent: data.parentNotificationsSent || 0,
          parentNotificationError: data.parentNotificationError || null
        });
      });

      // 6. Use the same logic as TableStudents to determine absent students
      const today = new Date();
      const currentDate = new Date(selectedDate || today);
      const currentMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      
      // Calculate monthly absence counts for all students
      const monthlyAbsenceCountsMap: {[studentId: string]: number} = {};
      const [yearStr, monthStr] = currentMonth.split('-');
      const year = parseInt(yearStr);
      const monthIndex = parseInt(monthStr) - 1;
      const { monthStartDateString, monthEndDateStringUsedForQuery } = getMonthDetailsForLogic(year, monthIndex);
      
      // Fetch all attendance records for the current month
      const monthlyAttendanceQuery = query(
        collection(db, 'attendance'), 
        where('date', '>=', monthStartDateString),
        where('date', '<=', monthEndDateStringUsedForQuery)
      );
      const monthlyAttendanceSnapshot = await getDocs(monthlyAttendanceQuery);
      const monthlyAttendanceRecords = monthlyAttendanceSnapshot.docs.map(doc => doc.data());

      allStudents.forEach(student => {
        const studentAttendanceInMonth = monthlyAttendanceRecords.filter(
          (att: any) => att.studentId === student.id
        ) as RawAttendanceRecord[];
        const studentPermissions = allPermissions.filter(p => p.studentId === student.id);
        const absenceData = calculateMonthlyAbsencesLogic(student, studentAttendanceInMonth, currentMonth, allClassConfigs, studentPermissions);
        monthlyAbsenceCountsMap[student.id] = absenceData.count;
      });
      
      setMonthlyAbsenceCounts(monthlyAbsenceCountsMap);

      const absentStudents: AbsentFollowUpWithDetails[] = allStudents.map(student => {
        try {
          // CRITICAL: Determine the student's effective shift for attendance matching
          // BP students (inBPClass=true) have their stored shift as their original class shift (e.g., "Afternoon")
          // but they actually attend Evening shift for 12BP class. We need to use "Evening" for matching.
          const isBPStudent = (student as any).inBPClass === true;
          const effectiveShift = isBPStudent ? 'Evening' : student.shift;

          // Find attendance record for this student on selected date AND matching shift
          // This is critical for students with multiple classes/shifts (e.g., 12B afternoon + 12BP evening)
          // We need to find the record that matches BOTH studentId AND shift
          const attendanceRecord = attendanceRecords.find((rec: any) => {
            if (rec.studentId !== student.id) return false;
            
            // Use effectiveShift for BP students when matching
            const recordShift = rec.shift || effectiveShift;
            
            // Match using effectiveShift instead of student.shift
            return !rec.shift || !effectiveShift || recordShift.toLowerCase() === effectiveShift.toLowerCase();
          }) as RawAttendanceRecord | undefined;
          
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
          
          // Only include students who are actually absent (not present, not on permission, etc.)
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
              student: student, // Add full student data for priority calculation
              monthlyAbsentCount: monthlyAbsenceCountsMap[student.id] || 0
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
              student: student, // Add full student data for priority calculation
              monthlyAbsentCount: monthlyAbsenceCountsMap[student.id] || 0,
              // Add parent notification fields for students without follow-up records
              parentNotificationStatus: null,
              parentNotificationTimestamp: null,
              parentNotificationsSent: 0,
              parentNotificationError: null
            };
            
            return studentWithFollowUp;
          }
        } catch (error) {
          console.error('Error checking attendance for student', student.fullName, ':', error);
        }
        return null;
      }).filter(Boolean) as AbsentFollowUpWithDetails[];

      // 7. Add any follow-ups for the date that are not in the absentStudents list (e.g. status changed to Contacted, etc.)
      // BUT only if the student is still actually absent (not present)
      followUpData.forEach(fu => {
        if (!absentStudents.find(s => s.studentId === fu.studentId)) {
          const absentDate = new Date(selectedDate || today);
          const daysSinceAbsent = Math.floor((today.getTime() - absentDate.getTime()) / (1000 * 60 * 60 * 24));
          const isUrgent = daysSinceAbsent >= 3 && fu.status === 'Absent';
          
          // Find the student data for this follow-up
          const studentData = allStudents.find(s => s.id === fu.studentId);
          
          // Check if student is actually present now
          if (studentData) {
            // CRITICAL: Determine the student's effective shift for attendance matching
            // BP students (inBPClass=true) have their stored shift as their original class shift (e.g., "Afternoon")
            // but they actually attend Evening shift for 12BP class. We need to use "Evening" for matching.
            const isBPStudent = (studentData as any).inBPClass === true;
            const effectiveShift = isBPStudent ? 'Evening' : studentData.shift;

            // Find attendance record matching both studentId AND shift
            const attendanceRecord = attendanceRecords.find((rec: any) => {
              if (rec.studentId !== studentData.id) return false;
              
              // Use effectiveShift for BP students when matching
              const recordShift = rec.shift || effectiveShift;
              
              // Match using effectiveShift instead of student.shift
              return !rec.shift || !effectiveShift || recordShift.toLowerCase() === effectiveShift.toLowerCase();
            }) as RawAttendanceRecord | undefined;
            
            const studentPermissions = allPermissions.filter(permission => 
              permission.studentId === studentData.id && 
              permission.status === 'approved' &&
              selectedDate >= permission.permissionStartDate && 
              selectedDate <= permission.permissionEndDate
            );
            
            const result = getStudentDailyStatus(
              studentData,
              selectedDate,
              attendanceRecord,
              allClassConfigs,
              studentPermissions
            );
            
            const status = result.status?.toLowerCase() || '';
            
            // Skip if student is now present, on permission, or if it's not a school day
            if (status === 'present' || status === 'permission' || status === 'no school') {
              return; // Don't add this follow-up to the list
            }
          }
          
          // Fix "Unknown" student name by looking up from students collection
          let studentName = fu.studentName;
          if (!studentName || studentName === 'Unknown' || studentName === 'Unknown Student') {
            studentName = studentData?.fullName || fu.studentName || 'Unknown Student';
          }
          
          absentStudents.push({ 
            ...fu,
            studentName, // Use the fixed student name
            nameKhmer: studentData?.nameKhmer, // Add Khmer name from student data
            daysSinceAbsent, 
            isUrgent,
            student: studentData || {}, // Add student data for priority calculation
            monthlyAbsentCount: monthlyAbsenceCountsMap[fu.studentId] || 0
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

  // Group by shift function
  const groupByShift = (followUps: AbsentFollowUpWithDetails[]) => {
    const grouped = {
      morning: [] as AbsentFollowUpWithDetails[],
      afternoon: [] as AbsentFollowUpWithDetails[],
      evening: [] as AbsentFollowUpWithDetails[]
    };

    followUps.forEach(followUp => {
      const shift = followUp.student?.shift?.toLowerCase() || '';
      if (shift === 'morning') {
        grouped.morning.push(followUp);
      } else if (shift === 'afternoon') {
        grouped.afternoon.push(followUp);
      } else if (shift === 'evening') {
        grouped.evening.push(followUp);
      }
    });

    return grouped;
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
    
    // If same shift, sort by student name (handle undefined names)
    const nameA = a.studentName || '';
    const nameB = b.studentName || '';
    return nameA.localeCompare(nameB);
  });

  // Group follow-ups by shift
  const groupedByShift = groupByShift(sortedFollowUps);

  // Group by priority for better organization
  const highFollowUps = sortedFollowUps.filter(f => getPriorityLevel(f.student || {}, f.daysSinceAbsent, f.status, f.updatedAt) === 'high');

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
                    await navigator.clipboard.writeText(followUp.studentName || 'Unknown Student');
                    toast.success(`Copied "${followUp.studentName || 'Unknown Student'}" to clipboard`);
                  } catch (err) {
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = followUp.studentName || 'Unknown Student';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    toast.success(`Copied "${followUp.studentName || 'Unknown Student'}" to clipboard`);
                  }
                }}
                title={`Click to copy "${followUp.studentName || 'Unknown Student'}"`}
              >
                {followUp.studentName || 'Unknown Student'}
              </div>
              <div className="text-sm khmer-font text-gray-500 dark:text-gray-400">
                {followUp.nameKhmer || followUp.student?.nameKhmer || 'N/A'}
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
                title={`Contact ${followUp.studentName || 'Unknown Student'} on Telegram (@${student.telegramUsername})`}
              >
                <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="truncate">{formatPhoneNumber(student.phone)}</span>
              </a>
            ) : student.hasTelegramUsername && !student.telegramUsername ? (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors duration-200 whitespace-nowrap"
                    title={`${followUp.studentName || 'Unknown Student'} needs Telegram username setup`}>
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
        
        <td className="p-4">
          <div className="flex items-center">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              (followUp.monthlyAbsentCount || 0) >= 10 ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800' :
              (followUp.monthlyAbsentCount || 0) >= 5 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800' :
              (followUp.monthlyAbsentCount || 0) >= 3 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-800' :
              'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800'
            }`}>
              {followUp.monthlyAbsentCount || 0} days
            </div>
          </div>
        </td>
        
        <td className="p-4">
          <AbsentStatusTracker
            studentId={followUp.studentId}
            studentName={followUp.studentName || 'Unknown Student'}
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
        
        {/* Parent Notification Column */}
        <td className="p-4">
          <div className="flex flex-col space-y-2">
            {followUp.parentNotificationStatus ? (
              <div className="space-y-1">
                <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  followUp.parentNotificationStatus === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                  followUp.parentNotificationStatus === 'failed' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                  followUp.parentNotificationStatus === 'no_parent' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                  'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                }`}>
                  {followUp.parentNotificationStatus === 'success' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                      <span>Sent{followUp.parentNotificationsSent && followUp.parentNotificationsSent > 0 ? ` (${followUp.parentNotificationsSent})` : ''}</span>
                    </>
                  ) : followUp.parentNotificationStatus === 'failed' ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M18 6L6 18"></path>
                        <path d="M6 6l12 12"></path>
                      </svg>
                      <span>Failed</span>
                    </>
                  ) : followUp.parentNotificationStatus === 'no_parent' ? (
                    <>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 9v2m0 4h.01"></path>
                      </svg>
                      <span>No Parent</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 2v6m0 0l-4 4m4-4l4 4m-4 4v6"></path>
                      </svg>
                      <span>Pending</span>
                    </>
                  )}
                </div>
                
                {followUp.parentNotificationTimestamp && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(followUp.parentNotificationTimestamp instanceof Date ? 
                      followUp.parentNotificationTimestamp : 
                      followUp.parentNotificationTimestamp.toDate()).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                  </div>
                )}
                
                {followUp.parentNotificationError && (
                  <div className="text-xs text-red-600 dark:text-red-400" title={followUp.parentNotificationError}>
                    Error: {followUp.parentNotificationError.substring(0, 30)}...
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-gray-500 dark:text-gray-400">Not sent</div>
            )}
          </div>
        </td>
        
        {/* Send Notification Column */}
        <td className="p-4">
          <button
            onClick={() => handleSendParentNotification(followUp)}
            disabled={sendingNotifications[`${followUp.studentId}-${followUp.date}`]}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-sm transform hover:scale-105 active:scale-95"
            title="Send notification to parent"
          >
            {sendingNotifications[`${followUp.studentId}-${followUp.date}`] ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="M22 2L11 13"></path>
                  <path d="M22 2L15 22 11 13 2 9 22 2z"></path>
                </svg>
                Send Notif
              </>
            )}
          </button>
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

  const ShiftSection: React.FC<{ 
    title: string; 
    followUps: AbsentFollowUpWithDetails[]; 
    icon: string; 
    color: string;
    shiftName: string;
  }> = ({ title, followUps, icon, color }) => {
    if (followUps.length === 0) return null;
    
    // Separate by priority within the shift
    const highPriorityInShift = followUps.filter(f => getPriorityLevel(f.student || {}, f.daysSinceAbsent, f.status, f.updatedAt) === 'high');
    const lowPriorityInShift = followUps.filter(f => getPriorityLevel(f.student || {}, f.daysSinceAbsent, f.status, f.updatedAt) === 'low');
    
    return (
      <div className="mb-8 overflow-visible">
        <div className={`flex items-center space-x-3 mb-4 px-4 py-3 rounded-xl ${color} shadow-sm`}>
          <div className="flex-shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-sm opacity-75">
              {highPriorityInShift.length > 0 && (
                <span className="text-red-600 dark:text-red-400 font-medium">
                  {highPriorityInShift.length} High Priority
                </span>
              )}
              {highPriorityInShift.length > 0 && lowPriorityInShift.length > 0 && ' • '}
              {lowPriorityInShift.length > 0 && (
                <span>
                  {lowPriorityInShift.length} Low Priority
                </span>
              )}
            </p>
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
                    Monthly Absent Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Follow-up Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Parent Notification
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Send Notif
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                {/* High Priority Students First */}
                {highPriorityInShift.length > 0 && (
                  <>
                    {highPriorityInShift.map((followUp) => (
                      <FollowUpRow key={`${followUp.studentId}-${followUp.date}`} followUp={followUp} />
                    ))}
                    {lowPriorityInShift.length > 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-2">
                          <div className="border-t border-gray-300 dark:border-slate-600"></div>
                        </td>
                      </tr>
                    )}
                  </>
                )}
                {/* Low Priority Students */}
                {lowPriorityInShift.map((followUp) => (
                  <FollowUpRow key={`${followUp.studentId}-${followUp.date}`} followUp={followUp} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
                    Monthly Absent Count
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Follow-up Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Priority
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Parent Notification
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Send Notif
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

      {/* Shift Sections */}
      <ShiftSection
        title="🌅 Morning Shift Students"
        followUps={groupedByShift.morning}
        icon="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
        color="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"
        shiftName="morning"
      />
      
      <ShiftSection
        title="☀️ Afternoon Shift Students"
        followUps={groupedByShift.afternoon}
        icon="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
        color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
        shiftName="afternoon"
      />
      
      <ShiftSection
        title="🌙 Evening Shift Students"
        followUps={groupedByShift.evening}
        icon="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
        color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300"
        shiftName="evening"
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
