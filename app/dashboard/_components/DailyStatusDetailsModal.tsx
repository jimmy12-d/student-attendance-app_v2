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
      
      // DON'T filter by shift in the query - let getStudentDailyStatus handle shift compatibility
      // This allows Morning/Afternoon flip-flop students to see all their records
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId),
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'asc')
      );
      
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

  // Calculate attendance status summary
  const statusSummary = useMemo(() => {
    const summary = {
      present: 0,
      late: 0,
      absent: 0,
      permission: 0,
      pending: 0,
      'send home': 0,
      'no school': 0,
      'not yet enrolled': 0,
      total: 0
    };

    calendarGrid.forEach(week => {
      week.forEach(cell => {
        if (cell.dayOfMonth && cell.status) {
          const status = cell.status.toLowerCase();
          if (status in summary) {
            summary[status as keyof typeof summary]++;
          }
          summary.total++;
        }
      });
    });

    return summary;
  }, [calendarGrid]);
  
  return (
    <CardBoxModal
      title={modalTitle}
      isActive={isActive}
     // onConfirm={onClose}
      onCancel={onClose}
      buttonLabel="Close"
      buttonColor="info"
      modalClassName="w-11/12 md:w-4/5 lg:w-3/5 xl:max-w-4xl py-6 pr-4"
    >
      {/* Modern Header with Navigation */}
      <div className="mb-6 flex justify-between items-center px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm relative">
        <Button 
          icon={mdiChevronLeft} 
          onClick={() => handleMonthChange('prev')} 
          small 
          outline 
          color="lightDark" 
          aria-label="Previous Month" 
          disabled={isPrevDisabled}
          className="hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200 rounded-lg"
        />
        <div className="relative group">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 tracking-wide">
            {currentModalMonthLabel}
          </h3>
          {/* Tooltip */}
          {!isLoading && calendarGrid.length > 0 && (
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-slate-800 dark:bg-slate-700 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-10 min-w-[200px]">
              <div className="font-semibold mb-2 text-center border-b border-slate-600 pb-1">Monthly Summary</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-300">Present:</span>
                  <span className="font-bold text-green-400">{statusSummary.present}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Late:</span>
                  <span className="font-bold text-amber-400">{statusSummary.late}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Absent:</span>
                  <span className="font-bold text-red-400">{statusSummary.absent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-300">Permission:</span>
                  <span className="font-bold text-purple-400">{statusSummary.permission}</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <Button 
          icon={mdiChevronRight} 
          onClick={() => handleMonthChange('next')} 
          small 
          outline 
          color="lightDark" 
          aria-label="Next Month" 
          disabled={isNextDisabled}
          className="hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors duration-200 rounded-lg"
        />
      </div>

      {isLoading ? ( 
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-slate-600 dark:text-slate-400">Loading attendance details...</span>
        </div>
      ) :
      calendarGrid.length === 0 ? ( 
        <div className="text-center py-12">
          <div className="text-slate-500 dark:text-slate-400 text-lg">No attendance details available</div>
        </div>
      ) : (
        <div className="px-2">
          {/* Calendar Grid */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Days of Week Header */}
            <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-700 border-b border-slate-200 dark:border-slate-600">
              {daysOfWeek.map(day => (
                <div key={day} className="py-3 px-2 text-center text-sm font-medium text-slate-600 dark:text-slate-300 border-r border-slate-200 dark:border-slate-600 last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Body */}
            <div className="grid grid-cols-7">
              {calendarGrid.map((week, weekIndex) => (
                week.map((cell, dayIndex) => (
                  <div 
                    key={`${weekIndex}-${dayIndex}`} 
                    className={`
                      min-h-[60px] md:min-h-[70px] p-2 border-r border-b border-slate-100 dark:border-slate-600 last:border-r-0
                      transition-all duration-200 ease-in-out
                      ${cell.dayOfMonth && cell.isPast && cell.isSchoolDayCell
                        ? `bg-slate-300 dark:bg-[rgb(25,35,55)] hover:bg-slate-400 dark:hover:bg-slate-800 ${cell.isToday ? 'ring-2 ring-blue-300 dark:ring-blue-500 shadow-lg' : ''}`
                        : cell.dayOfMonth
                          ? `bg-white dark:bg-slate-700/30 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${cell.isToday ? 'ring-2 ring-blue-300 dark:ring-blue-500 shadow-lg' : ''}`
                          : `bg-white dark:bg-slate-700/30 ${cell.isToday ? 'ring-2 ring-blue-300 dark:ring-blue-500 shadow-lg' : ''}`
                      }
                    `}
                  >
                    {cell.dayOfMonth && (
                      <div className="h-full flex flex-col">
                        {/* Day Number */}
                        <div className={`
                          text-sm font-semibold mb-1
                          ${cell.isToday 
                            ? 'text-blue-600 dark:text-blue-300' 
                            : (cell.isPast || cell.status) 
                              ? 'text-slate-800 dark:text-slate-100' 
                              : 'text-slate-400 dark:text-slate-500'
                          }
                        `}>
                          {cell.dayOfMonth}
                        </div>

                        {/* Status Badge */}
                        <div className="flex flex-col items-center justify-start">
                          {cell.status && ["Present", "Late", "Absent", "Pending", "Permission", "Absent (Config Missing)", "Unknown", "Send Home"].includes(cell.status) && (
                            <span className={`
                              px-2 py-1 text-xs font-medium rounded-full shadow-sm border transition-all duration-200
                              ${getStatusColor(cell.status)}
                              hover:shadow-md hover:scale-105
                            `}>
                              {cell.status === "Absent (Config Missing)" ? "Config Missing" : cell.status}
                            </span>
                          )}

                          {/* Time Display */}
                          {((cell.status === "Present" || cell.status === "Late" || cell.status === "Send Home") && cell.time) && (
                            <span className={`
                              text-xs mt-1 px-1.5 py-0.5 rounded-md font-medium
                              ${cell.isToday 
                                ? 'text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30' 
                                : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700'
                              }
                            `}>
                              {cell.time}
                            </span>
                          )}

                          {/* Non-School Days */}
                          {(cell.status === "No School" || cell.status === "Not Yet Enrolled") && (
                            <span className={`
                              text-xs px-2 py-1 rounded-full font-medium shadow-sm border transition-all duration-200
                              ${getStatusColor(cell.status)}
                              hover:shadow-md
                            `}>
                              {cell.status === "No School" ? "Non-School" : "Not Enrolled"}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ))}
            </div>
          </div>
        </div>
      )}
    </CardBoxModal>
  );
};

export default DailyStatusDetailsModal;