"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  mdiChartLine, 
  mdiAccountGroup,
  mdiTrophy,
  mdiMedal,
  mdiStar,
  mdiClockAlert,
  mdiAccountCheck,
  mdiAccountRemove,
  mdiFileDocumentCheckOutline,
  mdiViewGrid,
  mdiViewList,
  mdiChevronLeft,
  mdiChevronRight,
  mdiSortAscending,
  mdiSortDescending,
  mdiCalendar,
  mdiChevronDown,
  mdiFilter,
  mdiCalculator,
  mdiTrendingUp,
  mdiTrendingDown
} from "@mdi/js";
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import DashboardLoading from "../../_components/DashboardLoading";
import Icon from "../../_components/Icon";
import { Student } from "../../_interfaces";
import { toast } from 'sonner';

// Auth Context
import { useAuthContext } from "../../_contexts/AuthContext";

import { db } from "../../../firebase-config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  where,
} from "firebase/firestore";

import { getStudentDailyStatus } from "../_lib/attendanceLogic";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";
import { PermissionRecord } from "../../_interfaces";
import { RawAttendanceRecord } from "../_lib/attendanceLogic";
import { StudentDetailsModal } from "../students/components/StudentDetailsModal";

// Scoring system interface
interface AttendanceScore {
  studentId: string;
  studentName: string;
  class: string;
  shift: string;
  totalScore: number;
  breakDown: {
    earlyArrivals: number; // +2 points each
    onTimeArrivals: number; // +1 point each
    lateArrivals: number; // 0 points each
    permissions: number; // -1 point each
    lateOver30min: number; // -1 point each
    absentDays: number; // -3 points each
  };
  averageScore: number;
  averagePercentage: number; // Percentage based on full score = 100%
  averageArrivalTime: string;
  averageArrivalTimeMinutes: number; // Numeric value for sorting (negative = early, positive = late)
  rank: number;
}

// Scoring logic based on requirements
const calculateAttendanceScore = (
  student: Student,
  attendanceRecords: RawAttendanceRecord[],
  allClassConfigs: AllClassConfigs | null,
  permissions: PermissionRecord[],
  startDate: string,
  endDate: string
): AttendanceScore => {
  const studentAttendance = attendanceRecords.filter(record => 
    record.studentId === student.id &&
    record.date >= startDate &&
    record.date <= endDate
  );

  const approvedPermissionsForStudent = permissions.filter(p => 
    p.studentId === student.id && p.status?.toLowerCase() === 'approved'
  );

  // Extract class config for this student
  const studentClassKey = student.class?.replace(/^Class\s+/i, '') || '';
  const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;

  let earlyArrivals = 0;
  let onTimeArrivals = 0;
  let lateArrivals = 0;
  let permissionDays = 0;
  let lateOver30minDays = 0;
  let absentDays = 0;

  // Generate all dates in the range to check each day
  const currentDate = new Date(startDate);
  const endDateObj = new Date(endDate);
  
  while (currentDate <= endDateObj) {
    const dateStr = currentDate.toISOString().split('T')[0];
    const attendanceRecord = studentAttendance.find(record => record.date === dateStr);
    
    const dailyStatus = getStudentDailyStatus(
      student,
      dateStr,
      attendanceRecord,
      allClassConfigs,
      approvedPermissionsForStudent
    );

    // Skip non-school days and not-yet-enrolled days (these shouldn't count towards scoring)
    if (dailyStatus.status === "No School" || dailyStatus.status === "Not Yet Enrolled") {
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }

    if (dailyStatus.status === "Present" && attendanceRecord) {
      // Calculate if early, on time, or late
      const timeIn = attendanceRecord.timeIn;
      const startTime = attendanceRecord.startTime;
      
      if (timeIn && startTime) {
        const [timeInHour, timeInMinute] = timeIn.split(':').map(Number);
        const [startHour, startMinute] = startTime.split(':').map(Number);
        
        const timeInMinutes = timeInHour * 60 + timeInMinute;
        const startTimeMinutes = startHour * 60 + startMinute;
        const differenceMinutes = timeInMinutes - startTimeMinutes;
        
        if (differenceMinutes < 0) {
          // Arrived before start time
          earlyArrivals++;
        } else if (differenceMinutes <= 15) {
          // Arrived within 15 minutes of start time
          onTimeArrivals++;
        } else {
          // Arrived more than 15 minutes late
          lateArrivals++;
        }
      } else {
        // Default to on time if time data is missing
        onTimeArrivals++;
      }
    } else if (dailyStatus.status === "Late") {
      // Check if it's over 30 minutes late
      if (attendanceRecord && attendanceRecord.timeIn && attendanceRecord.startTime) {
        const [timeInHour, timeInMinute] = attendanceRecord.timeIn.split(':').map(Number);
        const [startHour, startMinute] = attendanceRecord.startTime.split(':').map(Number);
        
        const timeInMinutes = timeInHour * 60 + timeInMinute;
        const startTimeMinutes = startHour * 60 + startMinute;
        const differenceMinutes = timeInMinutes - startTimeMinutes;
        
        if (differenceMinutes > 30) {
          lateOver30minDays++;
        } else {
          lateArrivals++;
        }
      } else {
        lateArrivals++;
      }
    } else if (dailyStatus.status === "Permission") {
      permissionDays++;
    } else if (dailyStatus.status === "Absent") {
      absentDays++;
    }
    
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const totalScore = (earlyArrivals * 3) + (onTimeArrivals * 2) + (lateArrivals * 1) + (permissionDays * -1) + (lateOver30minDays * 0) + (absentDays * -5);
  const totalDays = earlyArrivals + onTimeArrivals + lateArrivals + permissionDays + lateOver30minDays + absentDays;
  const averageScore = totalDays > 0 ? totalScore / totalDays : 0;
  
  // Calculate percentage where +3 = 100% and -5 = -100% (scaled down for negatives)
  const rawPercentage = (averageScore / 3) * 100;
  const averagePercentage = totalDays > 0 ? (rawPercentage < 0 ? rawPercentage * (3 / 5) : rawPercentage) : 0;

  // Calculate average arrival time for the interval
  const calculateAverageArrivalTime = (): { timeString: string; timeInMinutes: number } => {
    const validArrivalTimes: number[] = [];
    
    studentAttendance.forEach(record => {
      if (record.timeIn && record.startTime) {
        const arrivalTime = new Date(`1970-01-01T${record.timeIn}`);
        const startTime = new Date(`1970-01-01T${record.startTime}`);
        
        if (!isNaN(arrivalTime.getTime()) && !isNaN(startTime.getTime())) {
          const differenceInMinutes = (arrivalTime.getTime() - startTime.getTime()) / (1000 * 60);
          validArrivalTimes.push(differenceInMinutes);
        }
      }
    });

    if (validArrivalTimes.length === 0) {
      return { timeString: 'N/A', timeInMinutes: 999999 }; // Large number so N/A sorts last
    }

    const averageDifference = validArrivalTimes.reduce((sum, diff) => sum + diff, 0) / validArrivalTimes.length;
    
    let timeString: string;
    if (averageDifference < 0) {
      const absMinutes = Math.abs(averageDifference);
      const hours = Math.floor(absMinutes / 60);
      const minutes = Math.round(absMinutes % 60);
      timeString = hours > 0 ? `${hours}h ${minutes}m early` : `${minutes}m early`;
    } else if (averageDifference > 0) {
      const hours = Math.floor(averageDifference / 60);
      const minutes = Math.round(averageDifference % 60);
      timeString = hours > 0 ? `${hours}h ${minutes}m late` : `${minutes}m late`;
    } else {
      timeString = 'On time';
    }
    
    return { timeString, timeInMinutes: averageDifference };
  };

  const averageArrivalTimeData = calculateAverageArrivalTime();

  return {
    studentId: student.id!,
    studentName: student.fullName,
    class: student.class || 'Unknown',
    shift: student.shift || 'Unknown',
    totalScore,
    breakDown: {
      earlyArrivals,
      onTimeArrivals,
      lateArrivals,
      permissions: permissionDays,
      lateOver30min: lateOver30minDays,
      absentDays
    },
    averageScore,
    averagePercentage,
    averageArrivalTime: averageArrivalTimeData.timeString,
    averageArrivalTimeMinutes: averageArrivalTimeData.timeInMinutes,
    rank: 0 // Will be set after sorting
  };
};

// Helper function to get current date in Phnom Penh timezone (UTC+7)
const getPhnomPenhDateString = (): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

export default function AttendanceScorePage() {
  const { isAuthenticated, isAuthorizedAdmin, isLoading: isAuthLoading } = useAuthContext();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<RawAttendanceRecord[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Date range state
  const [startDate, setStartDate] = useState(() => {
    // Get first day of current month in Phnom Penh timezone
    const now = new Date();
    const phnomPenhTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);
    const [year, month] = phnomPenhTime.split('-');
    return `${year}-${month}-01`;
  });
  
  const [endDate, setEndDate] = useState(() => {
    return getPhnomPenhDateString(); // Use Phnom Penh timezone
  });

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [currentStartMonth, setCurrentStartMonth] = useState(new Date().getMonth());
  const [currentStartYear, setCurrentStartYear] = useState(new Date().getFullYear());
  const [currentEndMonth, setCurrentEndMonth] = useState(new Date().getMonth());
  const [currentEndYear, setCurrentEndYear] = useState(new Date().getFullYear());
  const startDatePickerRef = useRef<HTMLDivElement>(null);
  const endDatePickerRef = useRef<HTMLDivElement>(null);

  // Filter states
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedShift, setSelectedShift] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table'); // New view mode state
  
  // Column sorting states
  const [sortColumn, setSortColumn] = useState<string>('totalScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState<{ [shift: string]: number }>({});
  const [itemsPerPage] = useState(15);
  
  // Sorting state (true = worst first, false = best first)
  const [sortWorstFirst, setSortWorstFirst] = useState(false);

  // Student details modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load data from Firestore
  useEffect(() => {
    // Only set up listeners if user is authenticated and authorized
    if (!isAuthenticated || !isAuthorizedAdmin || isAuthLoading) {
      setLoading(false);
      return;
    }

    const unsubscribes: (() => void)[] = [];

    // Load students - exclude onbreak, waitlist, and dropped students
    const studentsQuery = query(collection(db, 'students'), orderBy('fullName'));
    const unsubscribeStudents = onSnapshot(studentsQuery, (snapshot) => {
      const studentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];
      
      // Filter out students with unwanted statuses
      const filteredStudents = studentsData.filter(student => {
        const isDropped = student.dropped === true;
        const isOnBreak = student.onBreak === true;
        const isOnWaitlist = student.onWaitlist === true;
        return !isDropped && !isOnBreak && !isOnWaitlist;
      });
      
      setStudents(filteredStudents);
    }, (error) => {
      console.error("Error fetching students:", error);
      toast.error("Failed to load students data");
    });
    unsubscribes.push(unsubscribeStudents);

    // Load attendance records for the date range
    const attendanceQuery = query(
      collection(db, 'attendance'), 
      where('date', '>=', startDate),
      where('date', '<=', endDate),
      orderBy('date', 'desc')
    );
    const unsubscribeAttendance = onSnapshot(attendanceQuery, (snapshot) => {
      const attendanceData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as RawAttendanceRecord[];
      setAttendanceRecords(attendanceData);
    }, (error) => {
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance data");
    });
    unsubscribes.push(unsubscribeAttendance);

    // Load permissions
    const permissionsQuery = query(collection(db, 'permissions'));
    const unsubscribePermissions = onSnapshot(permissionsQuery, (snapshot) => {
      const permissionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PermissionRecord[];
      setPermissions(permissionsData);
    }, (error) => {
      console.error("Error fetching permissions:", error);
      toast.error("Failed to load permissions data");
    });
    unsubscribes.push(unsubscribePermissions);

    // Load class configurations
    const classConfigsQuery = query(collection(db, 'classes'));
    const unsubscribeClassConfigs = onSnapshot(
      classConfigsQuery, 
      (snapshot) => {
        const configs: AllClassConfigs = {};
        const classesWithMissingStudyDays: string[] = [];
        
        snapshot.docs.forEach(doc => {
          const configData = doc.data() as any;
          configs[doc.id] = configData;
          
          // Check if studyDays is missing or empty
          if (!configData.studyDays || configData.studyDays.length === 0) {
            classesWithMissingStudyDays.push(doc.id);
          }
        });
        
        setAllClassConfigs(configs);
        
        // Warn admin if some classes are missing studyDays configuration
        if (classesWithMissingStudyDays.length > 0) {
          toast.warning(
            `Missing studyDays config for: ${classesWithMissingStudyDays.join(', ')}. These classes will default to Mon-Sat schedule.`,
            { duration: 8000 }
          );
        }
        
        setLoading(false);
      }, 
      (error) => {
        console.error("Error fetching class configs:", error);
        toast.error("Failed to load class configurations");
        setLoading(false);
      }
    );
    unsubscribes.push(unsubscribeClassConfigs);

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }, [startDate, endDate, isAuthenticated, isAuthorizedAdmin, isAuthLoading]);

  // Date picker functionality
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startDatePickerRef.current && !startDatePickerRef.current.contains(event.target as Node)) {
        setShowStartDatePicker(false);
      }
      if (endDatePickerRef.current && !endDatePickerRef.current.contains(event.target as Node)) {
        setShowEndDatePicker(false);
      }
    };

    if (showStartDatePicker || showEndDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStartDatePicker, showEndDatePicker]);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleColumnSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Default to descending for most columns
    }
  };

  const handleStartDateSelect = (day: number) => {
    const year = currentStartYear;
    const month = String(currentStartMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    setStartDate(dateString);
    setShowStartDatePicker(false);
  };

  const handleEndDateSelect = (day: number) => {
    const year = currentEndYear;
    const month = String(currentEndMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    setEndDate(dateString);
    setShowEndDatePicker(false);
  };

  const navigateStartMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentStartMonth === 0) {
        setCurrentStartMonth(11);
        setCurrentStartYear(currentStartYear - 1);
      } else {
        setCurrentStartMonth(currentStartMonth - 1);
      }
    } else {
      if (currentStartMonth === 11) {
        setCurrentStartMonth(0);
        setCurrentStartYear(currentStartYear + 1);
      } else {
        setCurrentStartMonth(currentStartMonth + 1);
      }
    }
  };

  const navigateEndMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentEndMonth === 0) {
        setCurrentEndMonth(11);
        setCurrentEndYear(currentEndYear - 1);
      } else {
        setCurrentEndMonth(currentEndMonth - 1);
      }
    } else {
      if (currentEndMonth === 11) {
        setCurrentEndMonth(0);
        setCurrentEndYear(currentEndYear + 1);
      } else {
        setCurrentEndMonth(currentEndMonth + 1);
      }
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Asia/Phnom_Penh'
    });
  };

  const renderStartCalendar = () => {
    const daysInMonth = getDaysInMonth(currentStartMonth, currentStartYear);
    const firstDay = getFirstDayOfMonth(currentStartMonth, currentStartYear);
    const days: React.ReactElement[] = [];
    const todayDate = new Date();
    const selectedDateObj = startDate ? new Date(startDate + 'T00:00:00') : null;

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentStartYear, currentStartMonth, day);
      const isToday = date.toDateString() === todayDate.toDateString();
      const isSelected = selectedDateObj && date.toDateString() === selectedDateObj.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleStartDateSelect(day)}
          className={`w-8 h-8 text-sm rounded-xl transition-all duration-300 backdrop-blur-sm ${
            isSelected
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 scale-105'
              : isToday
              ? 'bg-gradient-to-br from-blue-100/80 to-blue-200/60 dark:from-blue-900/60 dark:to-blue-800/40 text-blue-600 dark:text-blue-400 font-medium shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20'
              : 'hover:bg-white/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:shadow-md hover:shadow-black/5'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const renderEndCalendar = () => {
    const daysInMonth = getDaysInMonth(currentEndMonth, currentEndYear);
    const firstDay = getFirstDayOfMonth(currentEndMonth, currentEndYear);
    const days: React.ReactElement[] = [];
    const todayDate = new Date();
    const selectedDateObj = endDate ? new Date(endDate + 'T00:00:00') : null;

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentEndYear, currentEndMonth, day);
      const isToday = date.toDateString() === todayDate.toDateString();
      const isSelected = selectedDateObj && date.toDateString() === selectedDateObj.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleEndDateSelect(day)}
          className={`w-8 h-8 text-sm rounded-xl transition-all duration-300 backdrop-blur-sm ${
            isSelected
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 scale-105'
              : isToday
              ? 'bg-gradient-to-br from-blue-100/80 to-blue-200/60 dark:from-blue-900/60 dark:to-blue-800/40 text-blue-600 dark:text-blue-400 font-medium shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/20'
              : 'hover:bg-white/60 dark:hover:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:shadow-md hover:shadow-black/5'
          }`}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // Calculate attendance scores grouped by shift
  const attendanceScoresByShift = useMemo(() => {
    if (!students.length || !allClassConfigs) return {};

    const scoresByShift: { [shift: string]: AttendanceScore[] } = {};
    
    // Get all unique shifts from students, or filter by selected shift
    const allShifts = Array.from(new Set(students.map(s => s.shift).filter(Boolean)));
    const shiftsToProcess = selectedShift === 'All' ? allShifts : [selectedShift];

    shiftsToProcess.forEach(shift => {
      const shiftStudents = students.filter(student => student.shift === shift);

      const scores = shiftStudents.map(student => 
        calculateAttendanceScore(
          student,
          attendanceRecords,
          allClassConfigs,
          permissions,
          startDate,
          endDate
        )
      );

      // Filter by class if needed
      const filteredScores = scores.filter(score => {
        const classMatch = selectedClass === 'All' || score.class.includes(selectedClass);
        return classMatch;
      });

      // Sort by selected column and assign ranks
      const sortedScores = filteredScores.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortColumn) {
          case 'rank':
            aValue = a.rank;
            bValue = b.rank;
            break;
          case 'studentName':
            aValue = a.studentName.toLowerCase();
            bValue = b.studentName.toLowerCase();
            break;
          case 'class':
            aValue = a.class.toLowerCase();
            bValue = b.class.toLowerCase();
            break;
          case 'totalScore':
            aValue = a.totalScore;
            bValue = b.totalScore;
            break;
          case 'averagePercentage':
            aValue = a.averagePercentage;
            bValue = b.averagePercentage;
            break;
          case 'averageArrivalTime':
            aValue = a.averageArrivalTime.toLowerCase();
            bValue = b.averageArrivalTime.toLowerCase();
            break;
          case 'earlyArrivals':
            aValue = a.breakDown.earlyArrivals;
            bValue = b.breakDown.earlyArrivals;
            break;
          case 'onTimeArrivals':
            aValue = a.breakDown.onTimeArrivals;
            bValue = b.breakDown.onTimeArrivals;
            break;
          case 'lateArrivals':
            aValue = a.breakDown.lateArrivals;
            bValue = b.breakDown.lateArrivals;
            break;
          case 'lateOver30min':
            aValue = a.breakDown.lateOver30min;
            bValue = b.breakDown.lateOver30min;
            break;
          case 'permissions':
            aValue = a.breakDown.permissions;
            bValue = b.breakDown.permissions;
            break;
          case 'absentDays':
            aValue = a.breakDown.absentDays;
            bValue = b.breakDown.absentDays;
            break;
          default:
            aValue = a.totalScore;
            bValue = b.totalScore;
        }
        
        let result: number;
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          result = sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        } else {
          result = sortDirection === 'asc' 
            ? (aValue as number) - (bValue as number) 
            : (bValue as number) - (aValue as number);
        }
        
        // If primary sort values are equal, use average arrival time as tie-breaker
        // Earlier arrival times should rank higher (lower minutes = better)
        if (result === 0) {
          return a.averageArrivalTimeMinutes - b.averageArrivalTimeMinutes;
        }
        
        return result;
      });
      
      sortedScores.forEach((score, index) => {
        score.rank = index + 1;
      });

      if (sortedScores.length > 0) {
        scoresByShift[shift] = sortedScores;
      }
    });

    return scoresByShift;
  }, [students, attendanceRecords, permissions, allClassConfigs, startDate, endDate, selectedClass, selectedShift, sortColumn, sortDirection]);

  // Get unique classes and shifts for filters
  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.class).filter(Boolean));
    return ['All', ...Array.from(classes).sort()];
  }, [students]);

  const uniqueShifts = useMemo(() => {
    const shifts = new Set(students.map(s => s.shift).filter(Boolean));
    return ['All', ...Array.from(shifts).sort()];
  }, [students]);

  // Chart data for top performers (combined from all shifts)
  const chartData = useMemo(() => {
    const allScores = Object.values(attendanceScoresByShift).flat();
    const topScores = allScores.sort((a, b) => {
      const scoreDiff = b.totalScore - a.totalScore;
      // Use average arrival time as tie-breaker if scores are equal
      return scoreDiff !== 0 ? scoreDiff : a.averageArrivalTimeMinutes - b.averageArrivalTimeMinutes;
    }).slice(0, 5);
    
    return {
      labels: topScores.map(score => score.studentName),
      datasets: [
        {
          label: 'Attendance Score',
          data: topScores.map(score => score.totalScore),
          backgroundColor: topScores.map((_, index) => {
            if (index === 0) return '#FFD700'; // Gold
            if (index === 1) return '#C0C0C0'; // Silver
            if (index === 2) return '#CD7F32'; // Bronze
            return '#3B82F6'; // Blue
          }),
          borderColor: topScores.map((_, index) => {
            if (index === 0) return '#FFA500';
            if (index === 1) return '#A0A0A0';
            if (index === 2) return '#8B4513';
            return '#1E40AF';
          }),
          borderWidth: 1,
        },
      ],
    };
  }, [attendanceScoresByShift]);

  // Top 5 worst performers data
  const worstPerformersData = useMemo(() => {
    const allScores = Object.values(attendanceScoresByShift).flat();
    const worstScores = allScores.sort((a, b) => {
      const scoreDiff = a.totalScore - b.totalScore;
      // Use average arrival time as tie-breaker if scores are equal
      return scoreDiff !== 0 ? scoreDiff : a.averageArrivalTimeMinutes - b.averageArrivalTimeMinutes;
    }).slice(0, 5);
    
    return {
      labels: worstScores.map(score => score.studentName),
      datasets: [
        {
          label: 'Attendance Score',
          data: worstScores.map(score => score.totalScore),
          backgroundColor: worstScores.map((_, index) => {
            if (index < 2) return '#EF4444'; // Red for worst 2
            if (index < 4) return '#F97316'; // Orange for 3-4
            return '#EAB308'; // Yellow for 5th
          }),
          borderColor: worstScores.map((_, index) => {
            if (index < 2) return '#DC2626';
            if (index < 4) return '#EA580C';
            return '#CA8A04';
          }),
          borderWidth: 1,
        },
      ],
    };
  }, [attendanceScoresByShift]);

  // Shift-specific top performers data
  const shiftTopPerformersData = useMemo(() => {
    const shiftCharts: { [shift: string]: any } = {};
    
    Object.entries(attendanceScoresByShift).forEach(([shift, scores]) => {
      const topScores = scores.slice(0, 3); // Top 3 for each shift
      
      shiftCharts[shift] = {
        labels: topScores.map(score => score.studentName),
        datasets: [
          {
            label: 'Attendance Score',
            data: topScores.map(score => score.totalScore),
            backgroundColor: topScores.map((_, index) => {
              if (index === 0) return '#FFD700'; // Gold
              if (index === 1) return '#C0C0C0'; // Silver
              if (index === 2) return '#CD7F32'; // Bronze
              return '#3B82F6'; // Blue
            }),
            borderColor: topScores.map((_, index) => {
              if (index === 0) return '#FFA500';
              if (index === 1) return '#A0A0A0';
              if (index === 2) return '#8B4513';
              return '#1E40AF';
            }),
            borderWidth: 1,
          },
        ],
      };
    });
    
    return shiftCharts;
  }, [attendanceScoresByShift]);

  if (loading || isAuthLoading) {
    return <DashboardLoading />;
  }

  // Check if user is authorized
  if (!isAuthenticated || !isAuthorizedAdmin) {
    return (
      <SectionMain>
        <CardBox>
          <div className="text-center py-8">
            <Icon path={mdiAccountGroup} className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-500">
              You need admin privileges to view attendance scoring data.
            </p>
          </div>
        </CardBox>
      </SectionMain>
    );
  }

  // Handler to open student details modal
  const handleStudentClick = (studentId: string) => {
    const student = students.find(s => s.id === studentId);
    if (student) {
      setSelectedStudent(student);
      setIsModalOpen(true);
    }
  };

  // Handler to close student details modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  // Render function for each shift section
  const renderShiftSection = (shift: string, scores: AttendanceScore[]) => {
    const currentShiftPage = currentPage[shift] || 1;
    const totalPages = Math.ceil(scores.length / itemsPerPage);
    const startIndex = (currentShiftPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedScores = viewMode === 'table' ? scores.slice(startIndex, endIndex) : scores;

    const handlePageChange = (page: number) => {
      setCurrentPage(prev => ({ ...prev, [shift]: page }));
    };

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-6">
          {/* Minimal Student Count Badge */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3 bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl px-4 py-2">
              <Icon path={mdiAccountGroup} size={18} className="text-slate-400" />
              <div className="flex flex-col">
                <span className="text-lg font-semibold text-white leading-none">
                  {scores.length}
                </span>
                <span className="text-xs text-slate-400 leading-none">
                  {scores.length === 1 ? 'Student' : 'Students'}
                </span>
              </div>
            </div>
            
            {/* Positive and Negative Count Badges */}
            <div className="flex items-center space-x-2">
              <div className="bg-slate-700/30 backdrop-blur-sm border border-slate-600/30 rounded-xl px-3 py-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 bg-green-500/10 backdrop-blur-sm border border-green-500/20 rounded-lg px-3 py-1">
                    <Icon path={mdiTrendingUp} size={14} className="text-green-400" />
                    <span className="text-sm font-medium text-green-300">
                      {scores.filter(score => score.totalScore > 0).length}
                    </span>
                    <span className="text-xs text-green-400/80">Positive</span>
                  </div>
                  
                  <div className="flex items-center space-x-2 bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg px-3 py-1">
                    <Icon path={mdiTrendingDown} size={14} className="text-red-400" />
                    <span className="text-sm font-medium text-red-300">
                      {scores.filter(score => score.totalScore <= 0).length}
                    </span>
                    <span className="text-xs text-red-400/80">Negative</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* View Mode Indicator */}
          <div className="flex items-center space-x-2 bg-slate-700/50 backdrop-blur-sm border border-slate-600/50 rounded-xl px-3 py-2">
            <Icon path={viewMode === 'cards' ? mdiViewGrid : mdiViewList} size={16} className="text-slate-400" />
            <span className="text-sm text-slate-300 capitalize">{viewMode} View</span>
          </div>
        </div>

        {viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {scores.map((score) => (
              <div
                key={score.studentId}
                onClick={() => handleStudentClick(score.studentId)}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 cursor-pointer hover:scale-105 ${
                  score.rank === 1 ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' :
                  score.rank === 2 ? 'border-gray-400 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20' :
                  score.rank === 3 ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20' :
                  'border-blue-400'
                }`}
                title="Click to view student details"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    {score.rank <= 3 && (
                      <Icon 
                        path={score.rank === 1 ? mdiTrophy : mdiMedal} 
                        className={`mr-2 ${
                          score.rank === 1 ? 'text-yellow-500' : 
                          score.rank === 2 ? 'text-gray-400' : 'text-orange-400'
                        }`} 
                        size={20} 
                      />
                    )}
                    <span className="text-lg font-bold text-gray-900 dark:text-white">#{score.rank}</span>
                  </div>
                  <div className={`text-lg font-bold ${
                    score.totalScore > 0 ? 'text-green-600 dark:text-green-400' : 
                    score.totalScore < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {score.totalScore > 0 ? '+' : ''}{score.totalScore}
                  </div>
                </div>
                
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{score.studentName}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{score.class} • {score.shift}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Percentage</span>
                    <span className={`font-medium ${
                      score.averagePercentage > 0 ? 'text-green-600 dark:text-green-400' : 
                      score.averagePercentage < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {score.averagePercentage > 0 ? '+' : ''}{score.averagePercentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Avg Arrival</span>
                    <span className={`font-medium ${
                      score.averageArrivalTime.includes('early') ? 'text-green-600 dark:text-green-400' :
                      score.averageArrivalTime.includes('late') ? 'text-red-600 dark:text-red-400' :
                      score.averageArrivalTime === 'On time' ? 'text-blue-600 dark:text-blue-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {score.averageArrivalTime}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-green-100 dark:bg-green-900/30 p-1 rounded text-center">
                      <div className="text-green-800 dark:text-green-200 font-medium">{score.breakDown.earlyArrivals}</div>
                      <div className="text-green-600 dark:text-green-400">Early</div>
                    </div>
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded text-center">
                      <div className="text-blue-800 dark:text-blue-200 font-medium">{score.breakDown.onTimeArrivals}</div>
                      <div className="text-blue-600 dark:text-blue-400">On Time</div>
                    </div>
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-1 rounded text-center">
                      <div className="text-yellow-800 dark:text-yellow-200 font-medium">{score.breakDown.lateArrivals}</div>
                      <div className="text-yellow-600 dark:text-yellow-400">Late</div>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/30 p-1 rounded text-center">
                      <div className="text-red-800 dark:text-red-200 font-medium">{score.breakDown.absentDays}</div>
                      <div className="text-red-600 dark:text-red-400">Absent</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gradient-to-br from-slate-800/95 via-slate-700/90 to-slate-800/95 backdrop-blur-xl border border-slate-600/50 rounded-2xl shadow-2xl shadow-black/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-700/80 to-slate-600/80 border-b border-slate-500/30">
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('rank')}>
                      <div className="flex items-center space-x-1">
                        <span>Rank</span>
                        {sortColumn === 'rank' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('studentName')}>
                      <div className="flex items-center space-x-1">
                        <span>Student</span>
                        {sortColumn === 'studentName' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('class')}>
                      <div className="flex items-center space-x-1">
                        <span>Class</span>
                        {sortColumn === 'class' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('totalScore')}>
                      <div className="flex items-center space-x-1">
                        <span>Total Score</span>
                        {sortColumn === 'totalScore' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('averagePercentage')}>
                      <div className="flex items-center space-x-1">
                        <span>Percentage</span>
                        {sortColumn === 'averagePercentage' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('averageArrivalTime')}>
                      <div className="flex items-center space-x-1">
                        <span>Avg Arrival</span>
                        {sortColumn === 'averageArrivalTime' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('earlyArrivals')}>
                      <div className="flex items-center space-x-1">
                        <span>Early</span>
                        {sortColumn === 'earlyArrivals' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('onTimeArrivals')}>
                      <div className="flex items-center space-x-1">
                        <span>On Time</span>
                        {sortColumn === 'onTimeArrivals' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('lateArrivals')}>
                      <div className="flex items-center space-x-1">
                        <span>Late (15-30min)</span>
                        {sortColumn === 'lateArrivals' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('lateOver30min')}>
                      <div className="flex items-center space-x-1">
                        <span>Late &gt;30min</span>
                        {sortColumn === 'lateOver30min' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('permissions')}>
                      <div className="flex items-center space-x-1">
                        <span>Permission</span>
                        {sortColumn === 'permissions' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-4 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors" onClick={() => handleColumnSort('absentDays')}>
                      <div className="flex items-center space-x-1">
                        <span>Absent</span>
                        {sortColumn === 'absentDays' && (
                          <Icon path={sortDirection === 'asc' ? mdiSortAscending : mdiSortDescending} size={14} className="text-blue-400" />
                        )}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800/50 divide-y divide-slate-600/30">
                  {paginatedScores.map((score) => (
                    <tr 
                      key={score.studentId} 
                      className="hover:bg-slate-700/30 transition-all duration-200 cursor-pointer"
                      onClick={() => handleStudentClick(score.studentId)}
                      title="Click to view student details"
                    >
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {score.rank <= 3 && (
                            <Icon
                              path={score.rank === 1 ? mdiTrophy : mdiMedal}
                              className={`mr-2 ${
                                score.rank === 1 ? 'text-yellow-400' :
                                score.rank === 2 ? 'text-slate-400' : 'text-orange-400'
                              }`}
                              size={16}
                            />
                          )}
                          <span className="text-sm font-medium text-white">#{score.rank}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{score.studentName}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{score.class}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${
                          score.totalScore > 0 ? 'text-green-400' :
                          score.totalScore < 0 ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {score.totalScore > 0 ? '+' : ''}{score.totalScore}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`text-sm font-semibold ${
                          score.averagePercentage > 0 ? 'text-green-400' :
                          score.averagePercentage < 0 ? 'text-red-400' : 'text-slate-400'
                        }`}>
                          {score.averagePercentage > 0 ? '+' : ''}{score.averagePercentage.toFixed(1)}%
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          score.averageArrivalTime.includes('early') ? 'text-green-400' :
                          score.averageArrivalTime.includes('late') ? 'text-red-400' :
                          score.averageArrivalTime === 'On time' ? 'text-blue-400' :
                          'text-slate-400'
                        }`}>
                          {score.averageArrivalTime}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-center text-green-400">{score.breakDown.earlyArrivals}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-center text-blue-400">{score.breakDown.onTimeArrivals}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-center text-yellow-400">{score.breakDown.lateArrivals}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-center text-orange-400">{score.breakDown.lateOver30min}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-center text-purple-400">{score.breakDown.permissions}</div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-sm text-center text-red-400">{score.breakDown.absentDays}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Table */}
            {viewMode === 'table' && totalPages > 1 && (
              <div className="px-6 py-4 border-t border-slate-600/50 bg-slate-800/30">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">
                    Showing {startIndex + 1} to {Math.min(endIndex, scores.length)} of {scores.length} results
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Previous Button */}
                    <button
                      onClick={() => handlePageChange(currentShiftPage - 1)}
                      disabled={currentShiftPage === 1}
                      className="px-3 py-2 text-sm font-medium text-slate-400 bg-slate-700/50 border border-slate-600/50 rounded-lg hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1 hover:border-slate-500/50"
                    >
                      <Icon path={mdiChevronLeft} size={16} />
                      Previous
                    </button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentShiftPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentShiftPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentShiftPage - 2 + i;
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                              currentShiftPage === pageNum
                                ? 'bg-blue-500 text-white border-blue-500 shadow-lg shadow-blue-500/25'
                                : 'text-slate-400 bg-slate-700/50 border border-slate-600/50 hover:bg-slate-600/50 hover:border-slate-500/50'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <button
                      onClick={() => handlePageChange(currentShiftPage + 1)}
                      disabled={currentShiftPage === totalPages}
                      className="px-3 py-2 text-sm font-medium text-slate-400 bg-slate-700/50 border border-slate-600/50 rounded-lg hover:bg-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-1 hover:border-slate-500/50"
                    >
                      Next
                      <Icon path={mdiChevronRight} size={16} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <SectionMain>

      <SectionTitleLineWithButton
        icon={mdiChartLine}
        title="Attendance Scoring System"
        main
      >
        {/* View Mode Toggle */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon path={mdiViewGrid} size={18} />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md transition-all ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon path={mdiViewList} size={18} />
            </button>
          </div>
        </div>
      </SectionTitleLineWithButton>

      {/* Date Range and Filters */}
      <CardBox className="mb-6 bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800 border border-slate-600/50 shadow-2xl backdrop-blur-xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Attendance Filters</h2>
              <p className="text-slate-300 text-sm">Configure date range and filters for attendance analysis</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-400">Live Data</span>
            </div>
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-6">
            {/* Start Date */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Start Date
              </label>
              <div className="relative" ref={startDatePickerRef}>
                <button
                  type="button"
                  onClick={() => setShowStartDatePicker(!showStartDatePicker)}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500/50 rounded-xl hover:border-slate-400/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-slate-900/20 w-full text-left group"
                >
                  <Icon path={mdiCalendar} size={20} className="text-blue-400 group-hover:text-blue-300" />
                  <span className="text-sm font-medium text-slate-200">
                    {formatDisplayDate(startDate)}
                  </span>
                  <Icon path={mdiChevronDown} size={16} className="text-slate-400 ml-auto group-hover:text-slate-300" />
                </button>

                {/* Start Date Picker */}
                {showStartDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-800/95 backdrop-blur-2xl border border-slate-600/50 rounded-2xl shadow-2xl shadow-black/50 z-[150] p-4 min-w-[320px]">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateStartMonth('prev')}
                        className="flex items-center justify-center w-10 h-10 hover:bg-slate-700/50 border border-slate-500/50 bg-slate-800/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-slate-900/20"
                      >
                        <Icon path={mdiChevronLeft} size={20} className="text-blue-400" />
                      </button>
                      <h3 className="text-lg font-semibold text-white">
                        {months[currentStartMonth]} {currentStartYear}
                      </h3>
                      <button
                        onClick={() => navigateStartMonth('next')}
                        className="flex items-center justify-center w-10 h-10 hover:bg-slate-700/50 border border-slate-500/50 bg-slate-800/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-slate-900/20"
                      >
                        <Icon path={mdiChevronRight} size={20} className="text-blue-400" />
                      </button>
                    </div>

                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {renderStartCalendar()}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-600/50 flex justify-between">
                      <button
                        onClick={() => setShowStartDatePicker(false)}
                        className="px-3 py-1 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const today = getPhnomPenhDateString();
                          setStartDate(today);
                          setShowStartDatePicker(false);
                        }}
                        className="px-3 py-1 text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* End Date */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                End Date
              </label>
              <div className="relative" ref={endDatePickerRef}>
                <button
                  type="button"
                  onClick={() => setShowEndDatePicker(!showEndDatePicker)}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500/50 rounded-xl hover:border-slate-400/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-slate-900/20 w-full text-left group"
                >
                  <Icon path={mdiCalendar} size={20} className="text-blue-400 group-hover:text-blue-300" />
                  <span className="text-sm font-medium text-slate-200">
                    {formatDisplayDate(endDate)}
                  </span>
                  <Icon path={mdiChevronDown} size={16} className="text-slate-400 ml-auto group-hover:text-slate-300" />
                </button>

                {/* End Date Picker */}
                {showEndDatePicker && (
                  <div className="absolute top-full left-0 mt-2 bg-slate-800/95 backdrop-blur-2xl border border-slate-600/50 rounded-2xl shadow-2xl shadow-black/50 z-50 p-4 min-w-[320px]">
                    {/* Calendar Header */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => navigateEndMonth('prev')}
                        className="flex items-center justify-center w-10 h-10 hover:bg-slate-700/50 border border-slate-500/50 bg-slate-800/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-slate-900/20"
                      >
                        <Icon path={mdiChevronLeft} size={20} className="text-blue-400" />
                      </button>
                      <h3 className="text-lg font-semibold text-white">
                        {months[currentEndMonth]} {currentEndYear}
                      </h3>
                      <button
                        onClick={() => navigateEndMonth('next')}
                        className="flex items-center justify-center w-10 h-10 hover:bg-slate-700/50 border border-slate-500/50 bg-slate-800/50 rounded-xl transition-all duration-300 shadow-lg hover:shadow-slate-900/20"
                      >
                        <Icon path={mdiChevronRight} size={20} className="text-blue-400" />
                      </button>
                    </div>

                    {/* Days of Week Header */}
                    <div className="grid grid-cols-7 mb-2">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-slate-400 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {renderEndCalendar()}
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-3 border-t border-slate-600/50 flex justify-between">
                      <button
                        onClick={() => setShowEndDatePicker(false)}
                        className="px-3 py-1 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          const today = getPhnomPenhDateString();
                          setEndDate(today);
                          setShowEndDatePicker(false);
                        }}
                        className="px-3 py-1 text-sm bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
                      >
                        Today
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Class Filter */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Class
              </label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500/50 rounded-xl hover:border-slate-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-lg text-slate-200"
              >
                {uniqueClasses.map(cls => (
                  <option key={cls} value={cls} className="bg-slate-700 text-white">{cls}</option>
                ))}
              </select>
            </div>

            {/* Shift Filter */}
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                Shift
              </label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 border border-slate-500/50 rounded-xl hover:border-slate-400/70 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 shadow-lg text-slate-200"
              >
                {uniqueShifts.map(shift => (
                  <option key={shift} value={shift} className="bg-slate-700 text-white">{shift}</option>
                ))}
              </select>
            </div>

            {/* Apply Filters Button */}
            <div className="lg:col-span-1 flex items-end">
              <button
                onClick={() => {
                  toast.success('Filters updated successfully');
                }}
                className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-300 shadow-lg font-semibold flex items-center justify-center gap-2"
              >
                <Icon path={mdiFilter} size={18} />
                Apply Filters
              </button>
            </div>
          </div>

          {/* Scoring Legend */}
          <div className="border-t border-slate-600/50 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Scoring System</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-slate-400">Real-time Calculation</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-6">
              <div className="flex items-center space-x-3 bg-green-500/10 border border-green-500/20 p-3 rounded-xl hover:bg-green-500/15 transition-all duration-300">
                <Icon path={mdiAccountCheck} className="text-green-400" size={18} />
                <div>
                  <div className="text-green-300 font-semibold">+3 Points</div>
                  <div className="text-green-400/80 text-xs">Early arrival</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl hover:bg-blue-500/15 transition-all duration-300">
                <Icon path={mdiStar} className="text-blue-400" size={18} />
                <div>
                  <div className="text-blue-300 font-semibold">+2 Points</div>
                  <div className="text-blue-400/80 text-xs">On time (≤15min)</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-yellow-500/10 border border-yellow-500/20 p-3 rounded-xl hover:bg-yellow-500/15 transition-all duration-300">
                <Icon path={mdiClockAlert} className="text-yellow-400" size={18} />
                <div>
                  <div className="text-yellow-300 font-semibold">+1 Point</div>
                  <div className="text-yellow-400/80 text-xs">Late (15-30min)</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-purple-500/10 border border-purple-500/20 p-3 rounded-xl hover:bg-purple-500/15 transition-all duration-300">
                <Icon path={mdiFileDocumentCheckOutline} className="text-purple-400" size={18} />
                <div>
                  <div className="text-purple-300 font-semibold">-1 Point</div>
                  <div className="text-purple-400/80 text-xs">Permission/Late &gt;30min</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 bg-red-500/10 border border-red-500/20 p-3 rounded-xl hover:bg-red-500/15 transition-all duration-300">
                <Icon path={mdiAccountRemove} className="text-red-400" size={18} />
                <div>
                  <div className="text-red-300 font-semibold">-5 Points</div>
                  <div className="text-red-400/80 text-xs">Absent</div>
                </div>
              </div>
            </div>

            {/* Percentage Explanation */}
            <div className="bg-slate-700/50 border border-slate-600/50 rounded-xl p-4 hover:bg-slate-600/50 transition-all duration-300">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-md font-semibold text-white">Percentage Calculation</h4>
                <Icon path={mdiCalculator} size={16} className="text-slate-400" />
              </div>
              <p className="text-sm text-slate-300 mb-3">
                The percentage is calculated as (Average Score ÷ 3) × 100. For negative scores, the percentage is scaled down by multiplying by (3/5) to make it less extreme.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                <div className="bg-green-500/10 border border-green-500/20 p-2 rounded-lg text-center">
                  <div className="text-green-300 font-semibold">+100%</div>
                  <div className="text-green-400/80">Early (+3)</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded-lg text-center">
                  <div className="text-blue-300 font-semibold">+66.7%</div>
                  <div className="text-blue-400/80">On time (+2)</div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded-lg text-center">
                  <div className="text-yellow-300 font-semibold">+33.3%</div>
                  <div className="text-yellow-400/80">Late (+1)</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 p-2 rounded-lg text-center">
                  <div className="text-purple-300 font-semibold">-33.3%</div>
                  <div className="text-purple-400/80">Permission (-1)</div>
                </div>
                <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg text-center">
                  <div className="text-red-300 font-semibold">-100%</div>
                  <div className="text-red-400/80">Absent (-5)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardBox>

      {/* Morning & Afternoon Section */}
      {(attendanceScoresByShift['Morning'] || attendanceScoresByShift['Afternoon']) && (
        <div className="space-y-6 mb-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Day Shifts
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Morning & Afternoon Classes</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Morning Shift */}
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg mb-4">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-semibold">Morning Shift</span>
              </div>
              
              {attendanceScoresByShift['Morning'] && (
                <div className="text-left">
                  {renderShiftSection('Morning', attendanceScoresByShift['Morning'])}
                </div>
              )}
            </div>
            
            {/* Afternoon Shift */}
            <div className="text-center">
              <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-400 text-white rounded-full shadow-lg mb-4">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="font-semibold">Afternoon Shift</span>
              </div>
              
              {attendanceScoresByShift['Afternoon'] && (
                <div className="text-left">
                  {renderShiftSection('Afternoon', attendanceScoresByShift['Afternoon'])}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evening Section */}
      {attendanceScoresByShift['Evening'] && (
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

          <div className="grid grid-cols-1 gap-6">
            {renderShiftSection('Evening', attendanceScoresByShift['Evening'])}
          </div>
        </div>
      )}

      {Object.keys(attendanceScoresByShift).length === 0 && (
        <CardBox className="bg-white dark:bg-gray-800 border-none shadow-lg">
          <div className="text-center py-12">
            <Icon path={mdiAccountGroup} className="mx-auto text-gray-400 dark:text-gray-600 mb-4" size={64} />
            <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-2">No data available</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              No attendance data found for the selected date range and filters. Try adjusting your filters or check if students have attendance records.
            </p>
          </div>
        </CardBox>
      )}

      {/* Student Details Modal */}
      <StudentDetailsModal
        student={selectedStudent}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onEdit={() => {}}
        onDelete={() => {}}
        hideActions={true}
      />
    </SectionMain>
  );
}