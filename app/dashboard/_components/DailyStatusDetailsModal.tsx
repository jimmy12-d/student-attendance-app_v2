// app/dashboard/_components/DailyStatusDetailsModal.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react"; // Ensure useMemo is imported if used for displayMonthLabel
import { Student, DailyStatusInfo } from "../../_interfaces";
import { Timestamp, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import CardBoxModal from "../../_components/CardBox/Modal";
import {getStudentDailyStatus} from "../_lib/attendanceLogic";
import {
  AllClassConfigs,
  getCurrentYearMonthString, // Assuming you moved this to config or utils
} from "../_lib/configForAttendanceLogic"; // Or your utils path
import { RawAttendanceRecord } from "../_lib/attendanceLogic";
import { PermissionRecord } from "../../_interfaces";
import Button from "../../_components/Button";
import { mdiChevronLeft, mdiChevronRight } from "@mdi/js";
import { getStatusStyles } from "../_lib/statusStyles";
import { db } from "../../../firebase-config";

// This interface is for the internal state of the calendar grid
interface CalendarCell {
  dayOfMonth: number | null;
  fullDateStr?: string;
  status?: DailyStatusInfo['status'];
  time?: string;
  isSchoolDayCell?: boolean;
  isToday?: boolean;
  isPast?: boolean;
}

// Props that this component accepts
interface Props {
  student: Student;
  attendanceRecords?: RawAttendanceRecord[]; // Make this optional since we'll fetch our own
  allClassConfigs: AllClassConfigs;
  approvedPermissions: PermissionRecord[];
  isActive: boolean;
  onClose: () => void;
  initialMonthValue?: string;
  viewContext?: 'regular' | '12BP'; // Optional context to indicate which class view this is from
}

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DailyStatusDetailsModal: React.FC<Props> = ({
  student,
  attendanceRecords, // This is now optional - we'll fetch our own
  allClassConfigs,
  approvedPermissions,
  isActive,
  onClose,
  initialMonthValue,
  viewContext, // Context: 'regular' or '12BP'
}) => {
  const [calendarGrid, setCalendarGrid] = useState<CalendarCell[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalSelectedMonth, setModalSelectedMonth] = useState<string>(
    initialMonthValue || getCurrentYearMonthString()
  );
  const [monthlyAttendanceRecords, setMonthlyAttendanceRecords] = useState<RawAttendanceRecord[]>([]);
  
  // Create a context-aware student object for BP students
  // If viewContext is '12BP' or student has BP overrides, use Evening shift and 12BP class
  const contextualStudent = React.useMemo(() => {
    // If the student object already has 12BP class (from bpStudents array), use it as-is
    if (student.class === '12BP') {
      return student;
    }
    
    // If viewContext is explicitly '12BP', apply the overrides
    if (viewContext === '12BP' && student.inBPClass) {
      return {
        ...student,
        class: '12BP',
        shift: 'Evening'
      };
    }
    
    // Otherwise, use the student as-is (regular class view)
    return student;
  }, [student, viewContext]);
  
  // Function to fetch attendance records for a specific month
  const fetchAttendanceForMonth = async (studentId: string, yearMonth: string, targetShift?: string) => {
    try {      
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-31`;
      
      // Build query with shift filter if viewing from 12BP context
      let attendanceQuery;
      if (targetShift) {
        attendanceQuery = query(
          collection(db, 'attendance'),
          where('studentId', '==', studentId),
          where('shift', '==', targetShift),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'asc')
        );
      } else {
        attendanceQuery = query(
          collection(db, 'attendance'),
          where('studentId', '==', studentId),
          where('date', '>=', startDate),
          where('date', '<=', endDate),
          orderBy('date', 'asc')
        );
      }
      
      const snapshot = await getDocs(attendanceQuery);
      const records: RawAttendanceRecord[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data() as any; // Type assertion for Firestore data
        records.push({
          id: doc.id,
          studentId: data.studentId,
          date: data.date,
          status: data.status,
          timestamp: data.timestamp,
          shift: data.shift, // Include shift in the record
        });
      });
      return records;
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      return [];
    }
  };
  
  const handleMonthChange = (direction: 'prev' | 'next') => {
    const [yearStr, monthStr] = modalSelectedMonth.split('-');
    let currentYear = parseInt(yearStr);
    let currentMonth = parseInt(monthStr) - 1;

    if (direction === 'prev') {
      currentMonth--;
      if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    } else {
      currentMonth++;
      if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    }
    const newProposedMonthDate = new Date(currentYear, currentMonth, 1);
    const now = new Date();
    const currentActualMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (newProposedMonthDate > currentActualMonthDate) return;

    if (student.createdAt) {
      const createdAtDate = student.createdAt instanceof Timestamp ? student.createdAt.toDate() : student.createdAt;
      const studentEnrollmentMonthDate = new Date(createdAtDate.getFullYear(), createdAtDate.getMonth(), 1);
      if (newProposedMonthDate < studentEnrollmentMonthDate) return;
    }
    
    setModalSelectedMonth(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`);
  };
  useEffect(() => {
    if (!isActive || !student || !allClassConfigs || !modalSelectedMonth) {
      setCalendarGrid([]);
      setMonthlyAttendanceRecords([]);
      if (isActive) setIsLoading(false);
      return;
    }
    
    // Fetch attendance records for the selected month
    const loadMonthData = async () => {
      setIsLoading(true);
      
      // Determine which shift to filter by based on context
      const targetShift = contextualStudent.shift;
      
      const records = await fetchAttendanceForMonth(
        student.id, 
        modalSelectedMonth, 
        targetShift // Pass the shift to filter attendance records
      );
      setMonthlyAttendanceRecords(records);
      
      // Continue with calendar generation
      generateCalendar(records);
    };
    
    loadMonthData();
  }, [isActive, student?.id, allClassConfigs, approvedPermissions, modalSelectedMonth, viewContext, contextualStudent.shift]);
  
  const generateCalendar = (records: RawAttendanceRecord[]) => {
    const [yearStr, monthNumStr] = modalSelectedMonth.split('-');
    const year = parseInt(yearStr);
    const month = parseInt(monthNumStr) - 1;

    const todayForComparison = new Date();
    todayForComparison.setHours(0, 0, 0, 0);

    const attendanceMap = new Map<string, RawAttendanceRecord>();
    const filteredRecords = records.filter(att => att.date?.startsWith(modalSelectedMonth));

    filteredRecords.forEach(att => attendanceMap.set(att.date, att));

    const firstDayOfMonthOfWeek = new Date(year, month, 1).getDay();
    const daysInTargetMonth = new Date(year, month + 1, 0).getDate();
    const grid: CalendarCell[][] = [];
    let week: CalendarCell[] = [];
    let dayCounter = 1;

    for (let i = 0; i < firstDayOfMonthOfWeek; i++) { week.push({ dayOfMonth: null }); }

    while (dayCounter <= daysInTargetMonth) {
      if (week.length === 7) {
        grid.push(week);
        week = [];
      }
      
      const currentDate = new Date(year, month, dayCounter);
      currentDate.setHours(0,0,0,0);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
      
      const attendanceRecord = attendanceMap.get(dateStr);

      const calculatedStatus = getStudentDailyStatus(
        contextualStudent, // Use context-aware student object
        dateStr,
        attendanceRecord,
        allClassConfigs,
        approvedPermissions
      );
      const cellData: CalendarCell = {
        dayOfMonth: dayCounter,
        fullDateStr: dateStr,
        isToday: currentDate.getTime() === todayForComparison.getTime(),
        isPast: currentDate < todayForComparison,
        status: calculatedStatus.status,
        time: calculatedStatus.time,
        isSchoolDayCell: !["No School", "Not Yet Enrolled"].includes(calculatedStatus.status || ""),
      };
      
      week.push(cellData);
      dayCounter++;
    }
    while (week.length > 0 && week.length < 7) { week.push({ dayOfMonth: null }); }
    if (week.length > 0) grid.push(week);

    setCalendarGrid(grid);
    setIsLoading(false);
  };

  const getStatusColor = (status?: DailyStatusInfo['status']): string => {
    if (!status) return "text-transparent";
    
    const styles = getStatusStyles(status);
    return styles.badge;
  };

  const currentModalMonthLabel = useMemo(() => {
    if (modalSelectedMonth) {
      const [year, monthNum] = modalSelectedMonth.split('-');
      if (year && monthNum) {
        return new Date(parseInt(year), parseInt(monthNum) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      }
    }
    return "Details";
  }, [modalSelectedMonth]);

  const { isPrevDisabled, isNextDisabled } = useMemo(() => {
    const now = new Date();
    const currentActualYear = now.getFullYear();
    const currentActualMonthIndex = now.getMonth();
    const [selectedYear, selectedMonthNum] = modalSelectedMonth.split('-').map(Number);
    const selectedMonthIndex = selectedMonthNum - 1;

    const nextDisabled = selectedYear > currentActualYear || (selectedYear === currentActualYear && selectedMonthIndex >= currentActualMonthIndex);
    
    let prevDisabled = false;
    if (student.createdAt) {
        const createdAtDate = student.createdAt instanceof Timestamp ? student.createdAt.toDate() : student.createdAt;
        const studentEnrollmentYear = createdAtDate.getFullYear();
        const studentEnrollmentMonthIndex = createdAtDate.getMonth();
        if (selectedYear < studentEnrollmentYear || (selectedYear === studentEnrollmentYear && selectedMonthIndex <= studentEnrollmentMonthIndex)) {
            prevDisabled = true;
        }
    } else if (selectedYear < currentActualYear - 2) { // Fallback: limit to 2 years back
        prevDisabled = true;
    }
    return { isPrevDisabled: prevDisabled, isNextDisabled: nextDisabled };
  }, [modalSelectedMonth, student.createdAt]); 
  
  // Create modal title with class context
  const modalTitle = React.useMemo(() => {
    const baseTitle = `Attendance: ${student.fullName}`;
    // Check if viewing from BP context by comparing contextual vs original student
    if (contextualStudent.class !== student.class || contextualStudent.shift !== student.shift) {
      // Get the BP class display name from allClassConfigs
      const bpClassConfig = allClassConfigs?.[contextualStudent.class || ''];
      const bpClassName = bpClassConfig?.name || contextualStudent.class;
      return `${baseTitle} (${bpClassName} - Evening Shift)`;
    }
    return baseTitle;
  }, [student.fullName, student.class, student.shift, contextualStudent.class, contextualStudent.shift, allClassConfigs]);
  
  return (
    <CardBoxModal
      title={modalTitle}
      isActive={isActive}
     // onConfirm={onClose}
      onCancel={onClose}
      buttonLabel="Close"
      buttonColor="info"
      modalClassName="w-11/12 md:w-4/5 lg:w-3/5 xl:max-w-4xl"
    >
      <div className="mb-4 flex justify-between items-center px-2 sm:px-4 py-2 border-b dark:border-slate-700">
        <Button icon={mdiChevronLeft} onClick={() => handleMonthChange('prev')} small outline color="lightDark" aria-label="Previous Month" disabled={isPrevDisabled} />
        <h3 className="text-md sm:text-lg text-gray-700 dark:text-gray-200">{currentModalMonthLabel}</h3>
        <Button icon={mdiChevronRight} onClick={() => handleMonthChange('next')} small outline color="lightDark" aria-label="Next Month" disabled={isNextDisabled} />
      </div>

      {isLoading ? ( <p className="p-4 text-center">Loading details...</p> ) :
      calendarGrid.length === 0 ? ( <p className="p-4 text-center">No attendance details to display.</p> ) : (
        <div className="text-sm p-1 md:p-2">
          <table className="w-full table-fixed border-collapse text-center">
            <thead>
              <tr>
                {daysOfWeek.map(day => (
                  <th key={day} className="py-2 px-1 border dark:border-slate-700 text-xs text-center">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calendarGrid.map((week, weekIndex) => (
                <tr key={weekIndex}>
                  {week.map((cell, dayIndex) => (
                    <td key={dayIndex} className={`py-1 px-1 border dark:border-slate-700 h-16 md:h-20 relative align-top text-left transition-colors duration-150 ease-in-out
                      ${cell.isToday ? 'bg-sky-100 dark:bg-sky-700/60' : !cell.isSchoolDayCell && cell.dayOfMonth ? 'bg-gray-100 dark:bg-slate-800 opacity-70' : cell.dayOfMonth && cell.isPast ? 'bg-white dark:bg-slate-700/50' : cell.dayOfMonth && !cell.isPast ? 'bg-slate-50 dark:bg-slate-800/80' : 'bg-gray-50 dark:bg-slate-900'}`}>
                      {cell.dayOfMonth && (
                        <>
                          <div className={`absolute top-1 left-1 text-s p-0.5 
                            ${cell.isToday ? 'font-bold text-sky-600 dark:text-sky-200' : (cell.isPast || cell.status) ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-slate-500'}`}>
                            {cell.dayOfMonth}
                          </div>
                          <div className="absolute inset-0 top-5 md:top-6 flex flex-col items-center justify-start pt-1 px-0.5 text-center">
                            {cell.status && ["Present", "Late", "Absent", "Pending", "Permission", "Absent (Config Missing)", "Unknown", "Send Home"].includes(cell.status) && (
                              <span className={`px-1.5 py-0.5 text-xs sm:text-xs rounded-full leading-tight whitespace-nowrap border ${getStatusColor(cell.status)}`}>
                                {cell.status === "Absent (Config Missing)" ? "Absent_@" : cell.status}
                              </span>
                            )}
                            {(cell.status === "Present" || cell.status === "Late") && cell.time && (
                              <span className={`block text-xxs mt-0.5 pt-1 leading-tight ${cell.isToday ? 'text-sky-700 dark:text-sky-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                {cell.time ? `(${cell.time})` : ''}
                              </span>
                            )}
                            {(cell.status === "No School" || cell.status === "Not Yet Enrolled") && (
                               <span className={`text-[0.65rem] leading-tight px-1.5 py-0.5 rounded-full ${getStatusColor(cell.status)} ${cell.isToday ? 'font-medium' : ''}`}>
                                   {cell.status === "No School" ? "Non-School" : "Not Enrolled"}
                               </span>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardBoxModal>
  );
};

export default DailyStatusDetailsModal;