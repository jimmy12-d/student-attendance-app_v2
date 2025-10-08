// app/dashboard/record/page.tsx (REAL-TIME ATTENDANCE DASHBOARD)
"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { 
  mdiClipboardListOutline, 
  mdiAlertCircleOutline, 
  mdiAccountGroup,
  mdiAccountCheck,
  mdiAccountClock,
  mdiAccountRemove,
  mdiChartPie,
  mdiChartBar,
  mdiCalendar,
  mdiChevronLeft,
  mdiChevronRight,
  mdiCheckCircle,
  mdiClockAlert,
  mdiAccountMultiple
} from "@mdi/js";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import SectionMain from "../../_components/Section/Main";
import SectionTitleLineWithButton from "../../_components/Section/TitleLineWithButton";
import CardBox from "../../_components/CardBox";
import CardBoxModal from "../../_components/CardBox/Modal";
import NotificationBar from "../../_components/NotificationBar";
import LoadingSpinner from "../../_components/LoadingSpinner";
import Icon from "../../_components/Icon";
import TableAttendance, { AttendanceRecord, LoadingRecord } from "./TableAttendance";
import { Student, ColorButtonKey } from "../../_interfaces";
import { toast } from 'sonner';
import ConsecutiveAbsencesSection from "./components/ConsecutiveAbsencesSection";
import WarningStudentsSection from "./components/WarningStudentsSection";
import { StudentDetailsModal } from "../students/components/StudentDetailsModal";

import { db } from "../../../firebase-config";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  deleteDoc,
  updateDoc,
  getDocs,
  serverTimestamp,
  where,
  Timestamp
} from "firebase/firestore";
import { determineAttendanceStatus } from "../_lib/attendanceLogic";

// Import attendance logic
import { getStudentDailyStatus } from "../_lib/attendanceLogic";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";
import { PermissionRecord } from "../../_interfaces";
import { RawAttendanceRecord } from "../_lib/attendanceLogic";

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

// Types for dashboard stats
interface AttendanceStats {
  totalStudents: number;
  checkedIn: number;
  present: number;
  late: number;
  absent: number;
  pending: number;
  requested: number;
  permission: number;
  expectedStudents: number; // New field for shift-specific expected students
}

// Define typical shift time ranges
const morningStart = 6 * 60; // 6:00 AM
const morningEnd = 11 * 60; // 11:00 AM
const afternoonEnd = 15 * 60; // 3:00 PM

// Helper function to determine current shift based on time
const getCurrentShift = (): 'Morning' | 'Afternoon' | 'Evening' => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  if (currentMinutes >= morningStart && currentMinutes < morningEnd) {
    return 'Morning';
  } else if (currentMinutes >= morningEnd && currentMinutes < afternoonEnd) {
    return 'Afternoon';
  } else {
    return 'Evening';
  }
};

export default function AttendanceRecordPage() {
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [rawAttendanceRecords, setRawAttendanceRecords] = useState<RawAttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isUpdating, setIsUpdating] = useState(false);

  // State for modal
  const [isModalActive, setIsModalActive] = useState(false);
  const [recordInModal, setRecordInModal] = useState<AttendanceRecord | null>(null);
  const [modalAction, setModalAction] = useState<'approve' | 'reject' | 'delete' | null>(null);
  
  // State for student detail modal
  const [isDetailModalActive, setIsDetailModalActive] = useState(false);
  const [studentForDetailModal, setStudentForDetailModal] = useState<Student | null>(null);

  // Loading states for table
  const [loadingRecords, setLoadingRecords] = useState<LoadingRecord[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Chart view toggle
  const [chartView, setChartView] = useState<'pie' | 'bar'>('pie');

  // Current shift state
  const [currentShift, setCurrentShift] = useState<'Morning' | 'Afternoon' | 'Evening'>(getCurrentShift());

  // Date filter state
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Get today's date string for filtering
  const today = useMemo(() => {
    const now = new Date();
    return now.toISOString().split('T')[0]; // YYYY-MM-DD format
  }, []);

  // Date picker functionality
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };

    if (showDatePicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDatePicker]);

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

  const handleDateSelect = (day: number) => {
    const year = currentYear;
    const month = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    setSelectedDate(dateString);
    setShowDatePicker(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const formatDisplayDate = (dateString: string) => {
    if (!dateString) return 'Select date';
    const date = new Date(dateString + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      timeZone: 'Asia/Phnom_Penh'
    });
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    const todayDate = new Date();
    const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = date.toDateString() === todayDate.toDateString();
      const isSelected = selectedDateObj && date.toDateString() === selectedDateObj.toDateString();

      days.push(
        <button
          key={day}
          onClick={() => handleDateSelect(day)}
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

  // Filter attendance records by selected date
  const filteredAttendanceRecords = useMemo(() => {
    const filtered = attendanceRecords.filter(record => {
      if (!record.date) {
        return false;
      }
      
      // Handle both date formats: "2025-09-01" and "Mon Sep 01 2025"
      const recordDate = record.date.split('T')[0]; // Handle ISO with time
      
      // Check if it matches ISO format (YYYY-MM-DD)
      if (recordDate === selectedDate) {
        return true;
      }
      
      // Check if it matches JS toDateString format (e.g., "Mon Sep 01 2025")
      // Convert selected date to compare with JS toDateString format
      try {
        const selectedDateObj = new Date(selectedDate + 'T00:00:00');
        const selectedDateString = selectedDateObj.toDateString();
        if (record.date === selectedDateString) {
          return true;
        }
      } catch (error) {
        console.warn('Date parsing error in filter:', error, { recordDate: record.date, selectedDate });
      }
      
      return false;
    });
        
    return filtered;
  }, [attendanceRecords, selectedDate]);

  // Compute a display string for the table title.
  const tableDateDisplay = useMemo(() => {
    const uniqueDates = Array.from(new Set(filteredAttendanceRecords.map(r => r.date).filter(Boolean)));

    if (uniqueDates.length === 0) return '';

    if (uniqueDates.length === 1) {
      const raw = uniqueDates[0];
      
      try {
        // Handle ISO like '2025-09-01' or '2025-09-01T12:00:00'
        let dateObj: Date;
        if (raw.includes('-')) {
          dateObj = new Date(raw.split('T')[0] + 'T00:00:00');
        } else {
          dateObj = new Date(raw);
        }
        
        if (!isNaN(dateObj.getTime())) {
          // Use Phnom Penh timezone for consistent display
          const phnomPenhDate = dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            timeZone: 'Asia/Phnom_Penh'
          });
          return `· ${phnomPenhDate}`;
        }
      } catch (e) {
        console.warn('Date parsing error:', e, 'for raw date:', raw);
      }

      return `· ${raw}`;
    }

    // Handle multiple unique dates - show them all for debugging
    const datesList = uniqueDates.map(raw => {
      try {
        let dateObj: Date;
        if (raw.includes('-')) {
          dateObj = new Date(raw.split('T')[0] + 'T00:00:00');
        } else {
          dateObj = new Date(raw);
        }
        
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric',
            timeZone: 'Asia/Phnom_Penh'
          });
        }
      } catch (e) {
        console.warn('Date parsing error for multiple dates:', e, 'for raw date:', raw);
      }
      return raw;
    }).join(', ');

    return `· ${datesList}`;
  }, [filteredAttendanceRecords]);
  const attendanceStats = useMemo((): AttendanceStats => {
    if (!allClassConfigs || students.length === 0) {
      // Return basic counts if configs not loaded yet
      // Note: This fallback doesn't exclude "No School" students since configs aren't available yet
      const selectedDateRecords = attendanceRecords.filter(record => {
        if (!record.date) return false;
        
        // Handle both date formats: "2025-09-01" and "Mon Sep 01 2025"
        const recordDate = record.date.split('T')[0]; // Handle ISO with time
        
        // Check if it matches ISO format (YYYY-MM-DD)
        if (recordDate === selectedDate) {
          return true;
        }
        
        // Check if it matches JS toDateString format (e.g., "Mon Sep 01 2025")
        try {
          const selectedDateObj = new Date(selectedDate + 'T00:00:00');
          const selectedDateString = selectedDateObj.toDateString();
          if (record.date === selectedDateString) {
            return true;
          }
        } catch (error) {
          // Ignore date parsing errors
        }
        
        return false;
      });

      // Filter students by current shift
      const shiftStudents = students.filter(student => student.shift === currentShift);
      const shiftStudentIds = new Set(shiftStudents.map(student => student.id));

      // Filter attendance records for students in the current shift
      const shiftAttendanceRecords = selectedDateRecords.filter(record => 
        shiftStudentIds.has(record.studentId)
      );

      const present = shiftAttendanceRecords.filter(r => r.status === 'present').length;
      const late = shiftAttendanceRecords.filter(r => r.status === 'late').length;
      const requested = shiftAttendanceRecords.filter(r => r.status === 'requested').length;
      const checkedIn = present + late;
      const absent = Math.max(0, shiftStudents.length - checkedIn - requested);

      return {
        totalStudents: students.length,
        expectedStudents: shiftStudents.length,
        checkedIn,
        present,
        late,
        absent,
        pending: 0, // No complex logic available without configs
        requested,
        permission: 0
      };
    }

    // Use proper attendance logic when configs are available
    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let pendingCount = 0;
    let requestedCount = 0;
    let permissionCount = 0;

    // Filter students by current shift for expected count, excluding "No School" students
    const shiftStudents = students.filter(student => {
      if (student.shift !== currentShift) return false;
      
      // Check if student has "No School" status for this date
      const result = getStudentDailyStatus(
        student,
        selectedDate,
        undefined, // We're just checking for "No School" status
        allClassConfigs,
        []
      );
      
      return result.status !== "No School";
    });

    students.forEach(student => {
      // Only process students for the current shift
      if (student.shift !== currentShift) return;

      // Find this student's attendance record for selected date
      const attendanceRecord = attendanceRecords.find(att => {
        if (att.studentId !== student.id) return false;
        if (!att.date) return false;
        
        // Handle both date formats: "2025-09-01" and "Mon Sep 01 2025"
        const recordDate = att.date.split('T')[0]; // Handle ISO with time
        
        // Check if it matches ISO format (YYYY-MM-DD)
        if (recordDate === selectedDate) {
          return true;
        }
        
        // Check if it matches JS toDateString format (e.g., "Mon Sep 01 2025")
        try {
          const selectedDateObj = new Date(selectedDate + 'T00:00:00');
          const selectedDateString = selectedDateObj.toDateString();
          if (att.date === selectedDateString) {
            return true;
          }
        } catch (error) {
          // Ignore date parsing errors
        }
        
        return false;
      });
      
      // Find this student's approved permissions
      const approvedPermissionsForStudent = permissions.filter(
        p => p.studentId === student.id && p.status === 'approved'
      );

      // If student has a 'requested' status, count it separately from system pending
      if (attendanceRecord?.status === 'requested') {
        requestedCount++;
        return;
      }

      // Get the definitive status using the centralized logic
      const result = getStudentDailyStatus(
        student,
        selectedDate,
        attendanceRecord ? {
          studentId: student.id,
          date: selectedDate,
          status: attendanceRecord.status as any,
          timestamp: attendanceRecord.timestamp instanceof Date 
            ? Timestamp.fromDate(attendanceRecord.timestamp)
            : attendanceRecord.timestamp,
        } : undefined,
        allClassConfigs,
        approvedPermissionsForStudent
      );

      // Count based on the calculated status
      switch (result.status) {
        case "Present":
          presentCount++;
          break;
        case "Late":
          lateCount++;
          break;
        case "Absent":
        case "Absent (Config Missing)":
          absentCount++;
          break;
        case "Pending":
          pendingCount++;
          break;
        case "Permission":
          permissionCount++;
          break;
        case "No School":
          // Don't count these in any category for attendance stats
          break;
      }
    });

    const checkedIn = presentCount + lateCount;

    return {
      totalStudents: students.length,
      expectedStudents: shiftStudents.length,
      checkedIn,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      pending: pendingCount,
      requested: requestedCount,
      permission: permissionCount
    };
  }, [attendanceRecords, students, permissions, allClassConfigs, selectedDate, currentShift]);

  // Prepare chart data
  const pieChartData = {
    labels: ['Present', 'Late', 'Absent', 'Permission'],
    datasets: [{
      data: [attendanceStats.present, attendanceStats.late, attendanceStats.absent, attendanceStats.permission],
      backgroundColor: [
        '#10B981', // green for present
        '#F59E0B', // yellow for late  
        '#EF4444', // red for absent
        '#8B5CF6', // purple for permission
      ],
      borderColor: [
        '#059669',
        '#D97706', 
        '#DC2626',
        '#7C3AED',
      ],
      borderWidth: 2
    }]
  };

  const barChartData = {
    labels: ['Present', 'Late', 'Absent', 'Permission'],
    datasets: [{
      label: 'Number of Students',
      data: [attendanceStats.present, attendanceStats.late, attendanceStats.absent, attendanceStats.permission],
      backgroundColor: [
        '#10B981',
        '#F59E0B',
        '#EF4444', 
        '#8B5CF6',
      ],
      borderColor: [
        '#059669',
        '#D97706',
        '#DC2626',
        '#7C3AED',
      ],
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
      title: {
        display: true,
        text: `Attendance - Students (${selectedDate})`,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    }
  };

  const barChartOptions = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };


  useEffect(() => {
    setLoading(true);
    setIsUpdating(true);

    const fetchAndListen = async () => {
      try {
        // Fetch students data first - only active students (same logic as main dashboard)
        const studentsSnapshot = await getDocs(
          query(
            collection(db, "students"),
            where("ay", "==", "2026"),
            orderBy("fullName")
          )
        );
        
        // Filter to get only active students (exclude dropped, on break, and waitlisted students)
        const activeStudentsData: Student[] = studentsSnapshot.docs
          .filter(doc => {
            const data = doc.data();
            const isDropped = data.dropped === true;
            const isOnBreak = data.onBreak === true;
            const isOnWaitlist = data.onWaitlist === true;
            const isActive = !isDropped && !isOnBreak && !isOnWaitlist;
            
            return isActive;
          })
          .map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as Student));
        
        setStudents(activeStudentsData);

        // Fetch permissions and class configs in parallel
        const [permissionsSnapshot, classesSnapshot] = await Promise.all([
          getDocs(query(collection(db, "permissions"), where("status", "==", "approved"))),
          getDocs(query(collection(db, "classes"), orderBy("name")))
        ]);

        // Set permissions
        const permsList = permissionsSnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as PermissionRecord));
        setPermissions(permsList);

        // Set class configs
        const configs: AllClassConfigs = {};
        classesSnapshot.forEach(docSnap => {
          configs[docSnap.id] = docSnap.data() as { name?: string; shifts: any };
        });
        setAllClassConfigs(configs);

        // Create students map for quick lookup (only active students)
        const studentsMap = new Map<string, Student>();
        activeStudentsData.forEach(student => {
          studentsMap.set(student.id, student);
        });
        
        // Listen to attendance records
        const recordsCollection = collection(db, "attendance");
        const q = query(recordsCollection, orderBy("timestamp", "desc"));

        const unsubscribe = onSnapshot(q, (querySnapshot) => {          
          // Store raw attendance records for consecutive absences calculation
          const rawRecords: RawAttendanceRecord[] = querySnapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              studentId: data.studentId,
              date: data.date,
              status: data.status,
              timestamp: data.timestamp,
              class: data.class,
              shift: data.shift,
            } as RawAttendanceRecord;
          });
          
          const fetchedRecords: AttendanceRecord[] = querySnapshot.docs
            .map(docSnap => {
              const data = docSnap.data();
              const student = studentsMap.get(data.studentId);
              // Debug logging for missing students
              if (!student) {
                // For debugging: include the record with basic info from the attendance data
                // This will show records even if the student is not in the active students list
                return {
                  id: docSnap.id,
                  studentName: data.studentName || `Unknown (${data.studentId})`,
                  studentId: data.studentId,
                  class: data.class || 'N/A',
                  shift: data.shift || 'N/A',
                  status: data.status || 'Unknown',
                  date: data.date,
                  timestamp: data.timestamp,
                  timeIn: data.timeIn,
                  method: data.method,
                  // Parent notification fields
                  parentNotificationStatus: data.parentNotificationStatus || null,
                  parentNotificationError: data.parentNotificationError || null,
                  parentNotificationTimestamp: data.parentNotificationTimestamp || null,
                  parentNotificationsSent: data.parentNotificationsSent || 0,
                } as AttendanceRecord;
              }

              return {
                id: docSnap.id,
                studentName: student.fullName,
                studentId: data.studentId,
                class: student.class || 'N/A',
                shift: student.shift || 'N/A',
                status: data.status || 'Unknown',
                date: data.date,
                timestamp: data.timestamp,
                timeIn: data.timeIn,
                method: data.method,
                // Parent notification fields
                parentNotificationStatus: data.parentNotificationStatus || null,
                parentNotificationError: data.parentNotificationError || null,
                parentNotificationTimestamp: data.parentNotificationTimestamp || null,
                parentNotificationsSent: data.parentNotificationsSent || 0,
              } as AttendanceRecord;
            })
            .filter((record): record is AttendanceRecord => record !== null && record.status !== 'Unknown');
          
          // Separate requested records and put them at the top
          const requestedRecords = fetchedRecords.filter(r => r.status === 'requested');
          const otherRecords = fetchedRecords.filter(r => r.status !== 'requested');
          
          // Debug: Log parent notification status
          const recordsWithNotification = fetchedRecords.filter(r => r.parentNotificationStatus);
          const recordsWithoutNotification = fetchedRecords.filter(r => !r.parentNotificationStatus);
          console.log(`📊 Attendance Records Summary:`);
          console.log(`   Total: ${fetchedRecords.length}`);
          console.log(`   With notification status: ${recordsWithNotification.length}`);
          console.log(`   Without notification status: ${recordsWithoutNotification.length}`);
          if (recordsWithNotification.length > 0) {
            console.log(`   Sample with status:`, recordsWithNotification[0]);
          }
          
          setRawAttendanceRecords(rawRecords);
          setAttendanceRecords([...requestedRecords, ...otherRecords]);
          setLastUpdated(new Date());
          setLoading(false);
          setIsUpdating(false);
          
          // Debug logging
          console.log('🔍 Record Page - Raw records:', rawRecords.length);
          console.log('🔍 Record Page - Students:', students.length);
          console.log('🔍 Record Page - Sample raw record:', rawRecords[0]);
          console.log('🔍 Record Page - Sample student:', students[0]);
        }, (error) => {
          console.error("Error with real-time listener: ", error);
          setError("Failed to listen for attendance updates.");
          setLoading(false);
          setIsUpdating(false);
        });

        return unsubscribe;
      } catch (error) {
        console.error("Error setting up listeners:", error);
        setError("Failed to initialize dashboard.");
        setLoading(false);
        setIsUpdating(false);
      }
    };

    const unsubscribePromise = fetchAndListen();

    return () => {
      unsubscribePromise.then(unsubscribe => unsubscribe && unsubscribe());
    };
  }, []);

  const handleApproveRecord = (record: AttendanceRecord) => {
    setRecordInModal(record);
    setModalAction('approve');
    setIsModalActive(true);
  };
  
  const handleDeleteOrRejectRecord = (record: AttendanceRecord, reason: 'rejected' | 'deleted') => {
    setRecordInModal(record);
    setModalAction(reason === 'rejected' ? 'reject' : 'delete');
    setIsModalActive(true);
  };

  const handleOpenDetailsModal = (student: Student) => {
    setStudentForDetailModal(student);
    setIsDetailModalActive(true);
  };

  const handleEditStudent = (student: Student) => {
    // Close the detail modal
    setIsDetailModalActive(false);
    setStudentForDetailModal(null);
    
    // Show toast message to indicate the user should navigate to students page for editing
    toast.info(`To edit ${student.fullName}, please go to the Students page.`);
  };

  const handleDeleteStudent = (student: Student) => {
    // Close the detail modal
    setIsDetailModalActive(false);
    setStudentForDetailModal(null);
    
    // Show toast message to indicate the user should navigate to students page for deletion
    toast.info(`To delete ${student.fullName}, please go to the Students page.`);
  };

  const handleConfirmAction = async () => {
    if (!recordInModal || !modalAction) return;
    
    setIsUpdating(true);
    const recordId = recordInModal.id;

    try {
      if (modalAction === 'approve') {
        const recordRef = doc(db, "attendance", recordId);
        
        // Find the student to get their class and shift information
        const student = students.find(s => s.studentId === recordInModal.studentId || s.id === recordInModal.studentId);
        
        let finalStatus = 'present'; // Default fallback
        
        if (student && allClassConfigs) {
          // Use the original timestamp when the student made the request to determine late/present
          const requestTimestamp = recordInModal.timestamp;
          let requestTime: Date;
          
          if (requestTimestamp instanceof Timestamp) {
            requestTime = requestTimestamp.toDate();
          } else if (requestTimestamp instanceof Date) {
            requestTime = requestTimestamp;
          } else {
            // Fallback to current time if timestamp is not available
            requestTime = new Date();
          }
          
          // Create a mock student object for the determineAttendanceStatus function
          const studentForCalculation = {
            ...student,
            fullName: student.fullName,
            class: student.class,
            shift: student.shift || recordInModal.shift,
            gracePeriodMinutes: (student as any).gracePeriodMinutes || 15
          };
          
          // Temporarily override the current time to use the request timestamp
          const originalNow = Date.now;
          Date.now = () => requestTime.getTime();
          
          try {
            const { status } = determineAttendanceStatus(
              studentForCalculation,
              recordInModal.shift || student.shift || 'Morning',
              allClassConfigs
            );
            finalStatus = status;
          } catch (error) {
            console.error('Error determining attendance status:', error);
            // Keep default 'present' status
          } finally {
            // Restore original Date.now
            Date.now = originalNow;
          }
        }
        
        await updateDoc(recordRef, {
          status: finalStatus,
          approvedAt: serverTimestamp(),
          approvedBy: 'Admin' // Replace with actual admin user
        });
        
        toast.success(`Approved attendance for ${recordInModal.studentName} as ${finalStatus}.`);
      } else if (modalAction === 'reject') {
        await deleteDoc(doc(db, "attendance", recordId));
        toast.warning(`Rejected and deleted attendance request for ${recordInModal.studentName}.`);
      } else if (modalAction === 'delete') {
        await deleteDoc(doc(db, "attendance", recordId));
        toast.success("Record deleted successfully.");
      }
    } catch (err) {
      console.error(`Error processing action: ${modalAction}`, err);
      toast.error(`Failed to ${modalAction} record.`);
    } finally {
      setIsUpdating(false);
    }
    
    setIsModalActive(false);
    setRecordInModal(null);
    setModalAction(null);
  };

  // Handle timestamp editing
  const handleEditTimestamp = async (record: AttendanceRecord, newTimestamp: Date, newTimeIn: string) => {
    try {
      setIsUpdating(true);
      const recordRef = doc(db, "attendance", record.id);
      
      // Find the student data to get proper status calculation
      // Note: students have 'id' field, attendance records have 'studentId' field
      const student = students.find(s => s.id === record.studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      // Use the same logic as getStudentDailyStatus for consistent status calculation
      const dateStr = newTimestamp.toISOString().split('T')[0]; // Get YYYY-MM-DD format
      let newStatus = 'present'; // Default status
      
      // Extract class and shift configuration using the same approach as attendanceLogic
      const studentClassKey = student.class?.replace(/^Class\s+/i, '') || '';
      const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
      const studentShiftKey = student.shift;
      const shiftConfig = (studentClassKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;
      
      if (shiftConfig && shiftConfig.startTime) {
        const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
        const shiftStartTime = new Date(newTimestamp);
        shiftStartTime.setHours(startHour, startMinute, 0, 0);
        
        // Use the same grace period logic as getStudentDailyStatus
        const studentGrace = (student as any).gracePeriodMinutes ?? 15; // Use same fallback as attendanceLogic
        const onTimeDeadline = new Date(shiftStartTime);
        onTimeDeadline.setMinutes(shiftStartTime.getMinutes() + studentGrace);
        
        if (newTimestamp > onTimeDeadline) {
          newStatus = 'late';
        }
      } else {
        // Fallback logic consistent with the modal
        const timeOfDay = newTimestamp.getHours() * 60 + newTimestamp.getMinutes();
        const defaultLateThreshold = 8 * 60 + 30; // 8:30 AM
        if (timeOfDay > defaultLateThreshold) {
          newStatus = 'late';
        }
      }

      // Update timestamp, timeIn, and status in Firestore
      await updateDoc(recordRef, {
        timestamp: Timestamp.fromDate(newTimestamp),
        timeIn: newTimeIn, // Add timeIn field update
        status: newStatus,
        lastModified: serverTimestamp(),
        modifiedBy: 'Admin' // Replace with actual admin user if available
      });

      toast.success(`Timestamp updated for ${record.studentName}. Status: ${newStatus}`);
    } catch (error) {
      console.error('Error updating timestamp:', error);
      toast.error('Failed to update timestamp');
      throw error; // Re-throw to let the modal handle the error
    } finally {
      setIsUpdating(false);
    }
  };

  // Loading management functions
  const addLoadingRecord = (studentId: string, studentName?: string) => {
    const loadingRecord: LoadingRecord = {
      id: studentId,
      isLoading: true,
      studentName
    };
    setLoadingRecords(prev => [...prev, loadingRecord]);
  };

  const removeLoadingRecord = (studentId: string) => {
    setLoadingRecords(prev => prev.filter(record => record.id !== studentId));
  };

  // Listen for face scanning events
  useEffect(() => {
    const handleFaceScanDetection = (event: CustomEvent) => {
      const { studentName } = event.detail;
      console.log('📋 Adding loading record for:', studentName);
      setIsScanning(true);
      const scanId = `face-scan-${Date.now()}`;
      
      const loadingRecord: LoadingRecord = {
        id: scanId,
        isLoading: true,
        studentName
      };
      
      console.log('📋 Loading record created:', loadingRecord);
      setLoadingRecords(prev => {
        const newRecords = [...prev, loadingRecord];
        console.log('📋 Updated loading records:', newRecords);
        return newRecords;
      });
      
      // Store the scan ID for cleanup
      const timeoutId = setTimeout(() => {
        removeLoadingRecord(scanId);
        setIsScanning(false);
      }, 5000); // 5 second timeout in case attendance marking fails
      
      // Listen for attendance marked event
      const handleAttendanceMarked = (event: CustomEvent) => {
        const { studentName: markedStudentName } = event.detail;
        if (markedStudentName === studentName) {
          clearTimeout(timeoutId);
          removeLoadingRecord(scanId);
          setIsScanning(false);
          window.removeEventListener('attendanceMarked', handleAttendanceMarked as EventListener);
        }
      };
      
      window.addEventListener('attendanceMarked', handleAttendanceMarked as EventListener);
    };

    const handleFaceDetected = (event: CustomEvent) => {
      console.log('🎯 Attendance table received faceDetected event:', event.detail);
      const { studentName } = event.detail;
      handleFaceScanDetection(event as CustomEvent);
    };

    window.addEventListener('faceDetected', handleFaceDetected as EventListener);
    
    return () => {
      window.removeEventListener('faceDetected', handleFaceDetected as EventListener);
    };
  }, []);

  const simulateStudentScan = (studentName: string) => {
    setIsScanning(true);
    const studentId = `scan-${Date.now()}`;
    
    // Add loading record immediately with correct interface
    const loadingRecord: LoadingRecord = {
      id: studentId,
      isLoading: true,
      studentName
    };
    setLoadingRecords(prev => [...prev, loadingRecord]);
    
    // Simulate processing time
    setTimeout(() => {
      removeLoadingRecord(studentId);
      setIsScanning(false);
      toast.success(`Successfully processed attendance for ${studentName}`);
    }, 2000 + Math.random() * 1000); // Random delay between 2-3 seconds
  };

  const clearAllLoadingRecords = () => {
    setLoadingRecords([]);
    setIsScanning(false);
  };

  const getModalContent = () => {
    if (!modalAction || !recordInModal) return { title: '', buttonColor: 'info' as ColorButtonKey, buttonLabel: '', content: '' };
    switch(modalAction) {
      case 'approve':
        return {
          title: "Confirm Approval",
          buttonColor: 'success' as ColorButtonKey,
          buttonLabel: "Approve",
          content: `Are you sure you want to mark ${recordInModal.studentName} as present?`
        };
      case 'reject':
        return {
          title: "Confirm Rejection",
          buttonColor: 'danger' as ColorButtonKey,
          buttonLabel: "Reject & Delete",
          content: `Are you sure you want to reject and delete the attendance request for ${recordInModal.studentName}? This action cannot be undone.`
        };
      case 'delete':
        return {
          title: "Confirm Deletion",
          buttonColor: 'danger' as ColorButtonKey,
          buttonLabel: "Delete",
          content: `Are you sure you want to permanently delete this record for ${recordInModal.studentName}? This cannot be undone.`
        };
      default:
        return { title: 'Confirm Action', buttonColor: 'info' as ColorButtonKey, buttonLabel: 'Confirm', content: 'Are you sure?' };
    }
  };

  const refreshData = () => {
    setIsUpdating(true);
    setLastUpdated(new Date());
    // The real-time listener will automatically update the data
    setTimeout(() => setIsUpdating(false), 1000);
  };

  return (
    <SectionMain>
      <SectionTitleLineWithButton
        icon={mdiClipboardListOutline}
        title={`Live Attendance`}
        main
      >
        <div className="flex items-center gap-4">
     
          {/* Shift Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 ml-2">
            <div className="flex items-center space-x-2 bg-gradient-to-r from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-2xl p-1 shadow-xl shadow-black/5">
              {(['Morning', 'Afternoon', 'Evening'] as const).map((shift) => (
                <button
                  key={shift}
                  onClick={() => setCurrentShift(shift)}
                  className={`px-4 py-2 text-sm font-medium rounded-xl transition-all duration-300 backdrop-blur-sm ${
                    currentShift === shift
                      ? 'bg-gradient-to-r from-white/80 to-white/60 dark:from-gray-700/80 dark:to-gray-600/60 text-blue-600 dark:text-blue-400 shadow-lg shadow-black/10 hover:shadow-xl hover:shadow-black/15 scale-105'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700/60 hover:shadow-md hover:shadow-black/5'
                  }`}
                >
                  {shift}
                </button>
              ))}
            </div>
          </div>
        </div>
          <div className="relative" ref={datePickerRef}>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-800/60 backdrop-blur-xl border border-white/30 dark:border-gray-600/30 rounded-xl hover:bg-white/90 dark:hover:bg-gray-700/90 transition-all duration-300 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10"
            >
              <Icon path={mdiCalendar} size={20} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatDisplayDate(selectedDate)}
              </span>
            </button>
             {/* Date Filter */}
            {showDatePicker && (
              <div className="absolute top-full right-0 mt-2 bg-gradient-to-br from-white/90 via-white/70 to-white/50 dark:from-gray-800/90 dark:via-gray-800/70 dark:to-gray-800/50 backdrop-blur-2xl border border-white/30 dark:border-gray-600/30 rounded-2xl shadow-2xl shadow-black/10 z-50 p-4 min-w-[320px]">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="flex items-center justify-center w-10 h-10 hover:bg-white/80 dark:hover:bg-gray-700/80 backdrop-blur-md rounded-xl transition-all duration-300 border border-white/30 dark:border-gray-600/30 bg-white/60 dark:bg-gray-800/60 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10"
                  >
                    <Icon path={mdiChevronLeft} size={20} className="text-blue-600 dark:text-blue-400" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {months[currentMonth]} {currentYear}
                  </h3>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="flex items-center justify-center w-10 h-10 hover:bg-white/80 dark:hover:bg-gray-700/80 backdrop-blur-md rounded-xl transition-all duration-300 border border-white/30 dark:border-gray-600/30 bg-white/60 dark:bg-gray-800/60 shadow-lg shadow-black/5 hover:shadow-xl hover:shadow-black/10"
                  >
                    <Icon path={mdiChevronRight} size={20} className="text-blue-600 dark:text-blue-400" />
                  </button>
                </div>

                {/* Days of Week Header */}
                <div className="grid grid-cols-7 mb-2">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {renderCalendar()}
                </div>

                {/* Footer */}
                <div className="mt-4 pt-3 border-t border-white/30 dark:border-gray-600/30 flex justify-between">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-700/80 backdrop-blur-sm rounded-lg transition-all duration-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setSelectedDate(today);
                      setShowDatePicker(false);
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
      </SectionTitleLineWithButton>

      {error && (
        <NotificationBar color="danger" icon={mdiAlertCircleOutline} className="mb-4">
          {error}
        </NotificationBar>
      )}

      {/* Consecutive Absences Section */}
      <ConsecutiveAbsencesSection
        students={students}
        attendanceRecords={rawAttendanceRecords}
        allClassConfigs={allClassConfigs}
        approvedPermissions={permissions}
        onViewDetails={handleOpenDetailsModal}
      />

      {/* Warning Students Section */}
      <WarningStudentsSection
        students={students}
        attendanceRecords={rawAttendanceRecords}
        allClassConfigs={allClassConfigs}
        approvedPermissions={permissions}
        onViewDetails={handleOpenDetailsModal}
      />

      <div className="flex flex-col items-center mb-6 mt-8">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-gradient-to-br from-blue-100/80 to-indigo-100/80 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-md">
            <Icon path={mdiChartPie} size={28} className="text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-2xl font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 dark:from-blue-400 dark:via-purple-400 dark:to-indigo-400">
            Attendance Dashboard
          </h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Overview & live statistics for {selectedDate}</p>
        <div className="mt-3 h-0.5 w-24 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-60"></div>
      </div>
      {/* Modern Shift-Based Statistics Cards */}
      <div className="mb-8 mt-6">
        {/* Modern Minimal Cards Grid */}
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          
          {/* Expected Students Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-slate-700/70 dark:via-slate-600/50 dark:to-slate-500/30 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 dark:border-slate-400/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-blue-50/90 to-blue-100/70 dark:from-blue-900/40 dark:to-blue-800/30 backdrop-blur-md rounded-2xl border border-blue-200/50 dark:border-blue-700/30 shadow-lg shadow-blue-500/10">
                  <Icon path={mdiAccountMultiple} size={24} className="text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Expected
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {attendanceStats.expectedStudents}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Students for this shift
              </div>
            </div>
          </div>

          {/* Present Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-slate-700/70 dark:via-slate-600/50 dark:to-slate-500/30  backdrop-blur-2xl rounded-3xl p-6 border border-white/30 dark:border-slate-400/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-green-50/90 to-green-100/70 dark:from-green-900/40 dark:to-green-800/30 backdrop-blur-md rounded-2xl border border-green-200/50 dark:border-green-700/30 shadow-lg shadow-green-500/10">
                  <Icon path={mdiCheckCircle} size={24} className="text-green-600 dark:text-green-400" />
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Present
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {attendanceStats.present}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                On time arrivals
              </div>
            </div>
          </div>

          {/* Late Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/70 via-white/50 to-white/30  dark:from-slate-700/70 dark:via-slate-600/50 dark:to-slate-500/30  backdrop-blur-2xl rounded-3xl p-6 border border-white/30 dark:border-slate-400/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-50/90 to-amber-100/70 dark:from-amber-900/40 dark:to-amber-800/30 backdrop-blur-md rounded-2xl border border-amber-200/50 dark:border-amber-700/30 shadow-lg shadow-amber-500/10">
                  <Icon path={mdiClockAlert} size={24} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Late
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {attendanceStats.late}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {attendanceStats.expectedStudents > 0 
                  ? Math.round((attendanceStats.late / attendanceStats.expectedStudents) * 100) 
                  : 0}% of expected
              </div>
            </div>
          </div>

          {/* Absent Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/70 via-white/50 to-white/30 dark:from-slate-700/70 dark:via-slate-600/50 dark:to-slate-500/30 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 dark:border-slate-400/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-rose-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-red-50/90 to-red-100/70 dark:from-red-900/40 dark:to-red-800/30 backdrop-blur-md rounded-2xl border border-red-200/50 dark:border-red-700/30 shadow-lg shadow-red-500/10">
                  <Icon path={mdiAccountRemove} size={24} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Absent
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {attendanceStats.absent}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {attendanceStats.expectedStudents > 0 
                  ? Math.round((attendanceStats.absent / attendanceStats.expectedStudents) * 100) 
                  : 0}% absence rate
              </div>
            </div>
          </div>

          {/* Permission Card */}
          <div className="group relative overflow-hidden bg-gradient-to-br from-white/70 via-white/50 to-white/30  dark:from-slate-700/70 dark:via-slate-600/50 dark:to-slate-500/30 backdrop-blur-2xl rounded-3xl p-6 border border-white/30 dark:border-slate-400/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-gradient-to-br from-purple-50/90 to-purple-100/70 dark:from-purple-900/40 dark:to-purple-800/30 backdrop-blur-md rounded-2xl border border-purple-200/50 dark:border-purple-700/30 shadow-lg shadow-purple-500/10">
                  <Icon path={mdiAccountCheck} size={24} className="text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Permission
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {attendanceStats.permission}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Approved absences
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Requested Approvals Alert */}
      {attendanceStats.requested > 0 && (
        <div className="bg-gradient-to-br from-yellow-50/90 via-yellow-100/70 to-orange-50/50 dark:from-yellow-900/40 dark:via-yellow-800/30 dark:to-orange-900/30 backdrop-blur-2xl border border-yellow-200/50 dark:border-yellow-700/30 rounded-3xl p-6 mb-6 shadow-2xl shadow-yellow-500/10 hover:shadow-3xl hover:shadow-yellow-500/15 transition-all duration-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-yellow-100/90 to-yellow-200/70 dark:from-yellow-800/50 dark:to-yellow-700/30 backdrop-blur-md rounded-2xl border border-yellow-300/50 dark:border-yellow-600/30 shadow-lg shadow-yellow-500/10">
                <Icon path={mdiAlertCircleOutline} size={20} className="text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                  Requested Approvals Required
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300">
                  <strong>{attendanceStats.requested}</strong> attendance record{attendanceStats.requested > 1 ? 's are' : ' is'} waiting for your approval
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{attendanceStats.requested}</div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">requested</div>
              </div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-100/80 to-yellow-200/60 dark:from-yellow-800/40 dark:to-yellow-700/30 backdrop-blur-md px-3 py-2 rounded-xl border border-yellow-300/50 dark:border-yellow-600/30 shadow-lg shadow-yellow-500/10">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Real-time</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CardBox className="py-2 px-6 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-2xl border border-white/30 dark:border-gray-600/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Today's Attendance Overview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChartView('pie')}
                className={`p-2 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-md hover:shadow-lg ${
                  chartView === 'pie' 
                    ? 'bg-gradient-to-br from-blue-100/90 to-blue-200/70 dark:from-blue-900/60 dark:to-blue-800/40 text-blue-700 dark:text-blue-300 shadow-blue-500/20 border border-blue-300/50 dark:border-blue-600/30' 
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-600/70'
                }`}
              >
                <Icon path={mdiChartPie} size={20} />
              </button>
              <button
                onClick={() => setChartView('bar')}
                className={`p-2 rounded-xl transition-all duration-300 backdrop-blur-sm shadow-md hover:shadow-lg ${
                  chartView === 'bar' 
                    ? 'bg-gradient-to-br from-blue-100/90 to-blue-200/70 dark:from-blue-900/60 dark:to-blue-800/40 text-blue-700 dark:text-blue-300 shadow-blue-500/20 border border-blue-300/50 dark:border-blue-600/30' 
                    : 'bg-white/50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 hover:bg-white/70 dark:hover:bg-gray-600/70'
                }`}
              >
                <Icon path={mdiChartBar} size={20} />
              </button>
            </div>
          </div>
          
          <div className="h-80">
            {chartView === 'pie' ? (
              <Pie data={pieChartData} options={chartOptions} />
            ) : (
              <Bar data={barChartData} options={barChartOptions} />
            )}
          </div>
        </CardBox>

        <CardBox className="py-4 px-4 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-2xl border border-white/30 dark:border-gray-600/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-50/90 to-blue-100/70 dark:from-blue-900/40 dark:to-blue-800/30 backdrop-blur-md rounded-xl border border-blue-200/50 dark:border-blue-700/30 shadow-lg shadow-blue-500/10">
                <Icon path={mdiAccountGroup} size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Status</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Real-time monitoring dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-green-100/80 to-green-200/60 dark:from-green-900/40 dark:to-green-800/30 px-3 py-2 rounded-xl backdrop-blur-md border border-green-200/50 dark:border-green-700/30 shadow-lg shadow-green-500/10">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Live</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-white/60 to-white/40 dark:from-gray-700/60 dark:to-gray-600/40 backdrop-blur-md rounded-xl p-4 border border-white/30 dark:border-gray-600/30 shadow-lg shadow-black/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Connection Status</span>
                </div>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">Connected</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-white/60 to-white/40 dark:from-gray-700/60 dark:to-gray-600/40 backdrop-blur-md rounded-xl p-4 border border-white/30 dark:border-gray-600/30 shadow-lg shadow-black/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Last Updated</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-white/60 to-white/40 dark:from-gray-700/60 dark:to-gray-600/40 backdrop-blur-md rounded-xl p-4 border border-white/30 dark:border-gray-600/30 shadow-lg shadow-black/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Selected Date</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{selectedDate}</span>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50/80 via-blue-100/60 to-indigo-100/40 dark:from-blue-900/30 dark:via-blue-800/20 dark:to-indigo-900/20 border border-blue-200/50 dark:border-blue-700/30 rounded-xl p-4 backdrop-blur-md shadow-lg shadow-blue-500/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-100/90 to-blue-200/70 dark:from-blue-800/50 dark:to-blue-700/30 backdrop-blur-sm rounded-lg border border-blue-300/50 dark:border-blue-600/30 shadow-md shadow-blue-500/10">
                    <Icon path={mdiClipboardListOutline} size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium text-blue-800 dark:text-blue-200">Total Records Today</span>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-blue-800 dark:text-blue-200">
                    {attendanceRecords.filter(record => {
                      const recordDate = record.date.split('T')[0];
                      return recordDate === selectedDate;
                    }).length}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">records</div>
                </div>
              </div>
            </div>

            {attendanceStats.requested > 0 && (
              <div className="bg-gradient-to-r from-yellow-50/80 via-yellow-100/60 to-orange-100/40 dark:from-yellow-900/30 dark:via-yellow-800/20 dark:to-orange-900/20 border border-yellow-200/50 dark:border-yellow-700/30 rounded-xl p-4 backdrop-blur-md shadow-lg shadow-yellow-500/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-yellow-100/90 to-yellow-200/70 dark:from-yellow-800/50 dark:to-yellow-700/30 backdrop-blur-sm rounded-lg border border-yellow-300/50 dark:border-yellow-600/30 shadow-md shadow-yellow-500/10">
                      <Icon path={mdiAccountClock} size={20} className="text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <span className="font-medium text-yellow-800 dark:text-yellow-200">Requested Approvals</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xl font-bold text-yellow-800 dark:text-yellow-200">{attendanceStats.requested}</div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400">awaiting</div>
                    </div>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardBox>
      </div>

      {/* Enhanced Attendance Records Table */}
      <CardBox className="mb-6 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-2xl border border-white/30 dark:border-gray-600/30 shadow-2xl shadow-black/5 hover:shadow-3xl hover:shadow-black/10 transition-all duration-500 rounded-3xl" hasTable>
        <div className="bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-2xl p-6 border-b border-white/30 dark:border-gray-600/30 rounded-t-3xl shadow-2xl shadow-black/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-gradient-to-br from-blue-50/90 to-blue-100/70 dark:from-blue-900/40 dark:to-blue-800/30 backdrop-blur-md rounded-2xl border border-blue-200/50 dark:border-blue-700/30 shadow-lg shadow-blue-500/10">
                <Icon path={mdiClipboardListOutline} size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Attendance Records {tableDateDisplay}
                  {isUpdating && <LoadingSpinner size="sm" />}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                  Real-time attendance data
                  {selectedDate !== today && (
                    <span className="bg-gradient-to-r from-blue-100/80 to-blue-200/60 dark:from-blue-900/40 dark:to-blue-800/30 backdrop-blur-md text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-xs font-medium border border-blue-200/50 dark:border-blue-700/30 shadow-md shadow-blue-500/10">
                      Filtered by {selectedDate}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isUpdating && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100/80 to-blue-200/60 dark:from-blue-900/40 dark:to-blue-800/30 backdrop-blur-md px-3 py-2 rounded-xl border border-blue-200/50 dark:border-blue-700/30 shadow-lg shadow-blue-500/10">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Syncing...</span>
                </div>
              )}
              
              {/* Test Scanning Button removed for production */}
              
              {/* Clear Loading Button */}
              {loadingRecords.length > 0 && (
                <button
                  onClick={clearAllLoadingRecords}
                  className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-gray-500/80 to-gray-600/60 dark:from-gray-700/40 dark:to-gray-600/30 backdrop-blur-md hover:from-gray-600/90 hover:to-gray-700/70 text-white rounded-xl transition-all duration-300 text-sm font-medium shadow-lg shadow-gray-500/25 hover:shadow-xl hover:shadow-gray-500/30 border border-gray-400/30 dark:border-gray-600/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>Clear</span>
                </button>
              )}

              {/* Test Face Detection removed for production */}
              
              <div className="flex items-center gap-2 bg-gradient-to-r from-green-100/80 to-green-200/60 dark:from-green-900/40 dark:to-green-800/30 backdrop-blur-md px-3 py-2 rounded-xl border border-green-200/50 dark:border-green-700/30 shadow-lg shadow-green-500/10">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Live Updates</span>
              </div>
              
              {/* Debug: Show loading records count */}
              {loadingRecords.length > 0 && (
                <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100/80 to-purple-200/60 dark:from-purple-900/40 dark:to-purple-800/30 backdrop-blur-md px-3 py-2 rounded-xl border border-purple-200/50 dark:border-purple-700/30 shadow-lg shadow-purple-500/10">
                  <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                    Loading: {loadingRecords.length}
                  </span>
                </div>
              )}
            </div>
          </div>
          

        </div>
        
        {loading ? (
          <div className="p-12 text-center bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-xl rounded-b-3xl border-t border-white/30 dark:border-gray-600/30">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Attendance Records</h4>
            <p className="text-gray-600 dark:text-gray-400">Fetching real-time attendance data...</p>
          </div>
        ) : (
          <TableAttendance
            records={filteredAttendanceRecords}
            onApproveRecord={handleApproveRecord}
            onDeleteRecord={handleDeleteOrRejectRecord}
            onEditTimestamp={handleEditTimestamp}
            students={students}
            allClassConfigs={allClassConfigs}
            loadingRecords={loadingRecords}
            isScanning={isScanning}
          />
        )}
      </CardBox>

      {/* Confirmation Modal */}
      {isModalActive && recordInModal && (
        <CardBoxModal
          title={getModalContent().title}
          buttonColor={getModalContent().buttonColor}
          buttonLabel={getModalContent().buttonLabel}
          isActive={isModalActive}
          onConfirm={handleConfirmAction}
          onCancel={() => setIsModalActive(false)}
        >
          <p>{getModalContent().content}</p>
        </CardBoxModal>
      )}

      {/* Student Details Modal */}
      {isDetailModalActive && studentForDetailModal && (
        <StudentDetailsModal
          student={studentForDetailModal}
          isOpen={isDetailModalActive}
          onClose={() => {
            setIsDetailModalActive(false);
            setStudentForDetailModal(null);
          }}
          onEdit={handleEditStudent}
          onDelete={handleDeleteStudent}
          hideActions={true}
        />
      )}
    </SectionMain>
  );
}