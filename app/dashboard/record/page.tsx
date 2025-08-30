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
import TableAttendance, { AttendanceRecord } from "./TableAttendance";
import { Student, ColorButtonKey } from "../../_interfaces";
import { toast } from 'sonner';

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

// Import attendance logic
import { getStudentDailyStatus } from "../_lib/attendanceLogic";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";
import { PermissionRecord } from "../../_interfaces";

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
const afternoonEnd = 16 * 60; // 4:00 PM

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
      day: 'numeric' 
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
          className={`w-8 h-8 text-sm rounded-lg transition-all duration-200 ${
            isSelected
              ? 'bg-blue-500 text-white font-semibold shadow-lg'
              : isToday
              ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-medium'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
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
    return attendanceRecords.filter(record => {
      const recordDate = record.date.split('T')[0];
      return recordDate === selectedDate;
    });
  }, [attendanceRecords, selectedDate]);
  const attendanceStats = useMemo((): AttendanceStats => {
    if (!allClassConfigs || students.length === 0) {
      // Return basic counts if configs not loaded yet
      // Note: This fallback doesn't exclude "No School" students since configs aren't available yet
      const selectedDateRecords = attendanceRecords.filter(record => {
        if (!record.date) return false;
        const recordDate = record.date.split('T')[0];
        return recordDate === selectedDate;
      });

      // Filter students by current shift
      const shiftStudents = students.filter(student => student.shift === currentShift);
      const shiftStudentIds = new Set(shiftStudents.map(student => student.id));

      // Debug logging
      console.log('Shift calculation debug:', {
        currentShift,
        totalStudents: students.length,
        shiftStudents: shiftStudents.length,
        selectedDate,
        totalRecords: selectedDateRecords.length,
        shiftRecords: selectedDateRecords.filter(record => shiftStudentIds.has(record.studentId)).length
      });

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
      const attendanceRecord = attendanceRecords.find(
        att => att.studentId === student.id && att.date.split('T')[0] === selectedDate
      );
      
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
            return !isDropped && !isOnBreak && !isOnWaitlist;
          })
          .map(docSnap => ({
            id: docSnap.id,
            ...docSnap.data()
          } as Student));
        
        setStudents(activeStudentsData);
        console.log(`Dashboard: Filtered to ${activeStudentsData.length} students (excluded dropped, on break, and waitlisted)`);

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
          const fetchedRecords: AttendanceRecord[] = querySnapshot.docs
            .map(docSnap => {
              const data = docSnap.data();
              const student = studentsMap.get(data.studentId);

              // Only include records for active students
              if (!student) {
                return null;
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
              } as AttendanceRecord;
            })
            .filter((record): record is AttendanceRecord => record !== null && record.status !== 'Unknown');
          
          // Separate requested records and put them at the top
          const requestedRecords = fetchedRecords.filter(r => r.status === 'requested');
          const otherRecords = fetchedRecords.filter(r => r.status !== 'requested');
          
          setAttendanceRecords([...requestedRecords, ...otherRecords]);
          setLastUpdated(new Date());
          setLoading(false);
          setIsUpdating(false);
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

  const handleConfirmAction = async () => {
    if (!recordInModal || !modalAction) return;
    
    setIsUpdating(true);
    const recordId = recordInModal.id;

    try {
      if (modalAction === 'approve') {
        const recordRef = doc(db, "attendance", recordId);
        await updateDoc(recordRef, {
          status: 'present', // Or logic to determine 'late'
          approvedAt: serverTimestamp(),
          approvedBy: 'Admin' // Replace with actual admin user
        });
        toast.success(`Approved attendance for ${recordInModal.studentName}.`);
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
        title={`Attendance Records`}
        main
      >
        <div className="flex items-center gap-4">
     
          {/* Shift Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 ml-2">
            <div className="flex items-center space-x-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg border border-white/20 dark:border-gray-700/50 rounded-xl p-1 shadow-lg">
              {(['Morning', 'Afternoon', 'Evening'] as const).map((shift) => (
                <button
                  key={shift}
                  onClick={() => setCurrentShift(shift)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    currentShift === shift
                      ? 'bg-white/80 dark:bg-gray-700/80 text-blue-600 dark:text-blue-400 shadow-md backdrop-blur-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-gray-700/40'
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
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-white/20 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <Icon path={mdiCalendar} size={20} className="text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatDisplayDate(selectedDate)}
              </span>
            </button>
             {/* Date Filter */}
            {showDatePicker && (
              <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-2xl z-50 p-4 min-w-[320px]">
                {/* Calendar Header */}
                <div className="flex items-center justify-between mb-4">
                  <button
                    onClick={() => navigateMonth('prev')}
                    className="flex items-center justify-center w-10 h-10 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm"
                  >
                    <Icon path={mdiChevronLeft} size={20} className="text-blue-600 dark:text-blue-400" />
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {months[currentMonth]} {currentYear}
                  </h3>
                  <button
                    onClick={() => navigateMonth('next')}
                    className="flex items-center justify-center w-10 h-10 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-lg transition-colors border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm"
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
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600 flex justify-between">
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      setSelectedDate(today);
                      setShowDatePicker(false);
                    }}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
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

      {/* Modern Shift-Based Statistics Cards */}
      <div className="mb-8">
        {/* Modern Minimal Cards Grid */}
      
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Expected Students Card */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-700/80 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50/80 dark:bg-blue-900/30 backdrop-blur-sm rounded-xl border border-blue-100/50 dark:border-blue-800/50">
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

          {/* Present Card */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50/80 dark:bg-green-900/30 backdrop-blur-sm rounded-xl border border-green-100/50 dark:border-green-800/50">
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

          {/* Late Card */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50/80 dark:bg-amber-900/30 backdrop-blur-sm rounded-xl border border-amber-100/50 dark:border-amber-800/50">
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

          {/* Absent Card */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50/80 dark:bg-red-900/30 backdrop-blur-sm rounded-xl border border-red-100/50 dark:border-red-800/50">
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

          {/* Permission Card */}
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 dark:border-gray-700/50 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50/80 dark:bg-purple-900/30 backdrop-blur-sm rounded-xl border border-purple-100/50 dark:border-purple-800/50">
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

      {/* Enhanced Requested Approvals Alert */}
      {attendanceStats.requested > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-yellow-100 dark:bg-yellow-800/50 p-3 rounded-full">
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
              <div className="flex items-center gap-2 bg-yellow-100 dark:bg-yellow-800/30 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Real-time</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CardBox className="py-2 px-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Today's Attendance Overview</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setChartView('pie')}
                className={`p-2 rounded-lg transition-colors ${
                  chartView === 'pie' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                <Icon path={mdiChartPie} size={20} />
              </button>
              <button
                onClick={() => setChartView('bar')}
                className={`p-2 rounded-lg transition-colors ${
                  chartView === 'bar' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
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

        <CardBox className="py-4 px-4">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <Icon path={mdiAccountGroup} size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">System Status</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Real-time monitoring dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900 px-3 py-2 rounded-lg">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700 dark:text-green-300">Live</span>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Connection Status</span>
                </div>
                <span className="text-sm font-bold text-green-600 dark:text-green-400">Connected</span>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
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
            
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-indigo-500 rounded-full"></div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Selected Date</span>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">{selectedDate}</span>
              </div>
            </div>

            <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 dark:bg-blue-800/50 p-2 rounded-lg">
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
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-yellow-100 dark:bg-yellow-800/50 p-2 rounded-lg">
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
      <CardBox className="mb-6 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700" hasTable>
        <div className="bg-gray-50 dark:bg-gray-800/50 p-6 border-b border-gray-200 dark:border-gray-700 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-lg">
                <Icon path={mdiClipboardListOutline} size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  Attendance Records
                  {isUpdating && <LoadingSpinner size="sm" />}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-2">
                  Real-time attendance data
                  {selectedDate !== today && (
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
                      Filtered by {selectedDate}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {isUpdating && (
                <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900 px-3 py-2 rounded-lg">
                  <LoadingSpinner size="sm" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Syncing...</span>
                </div>
              )}
              <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900 px-3 py-2 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Live Updates</span>
              </div>
            </div>
          </div>
          
   
        </div>
        
        {loading ? (
          <div className="p-12 text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Loading Attendance Records</h4>
            <p className="text-gray-600 dark:text-gray-400">Fetching real-time attendance data...</p>
          </div>
        ) : (
          <TableAttendance
            records={filteredAttendanceRecords}
            onApproveRecord={handleApproveRecord}
            onDeleteRecord={handleDeleteOrRejectRecord}
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
    </SectionMain>
  );
}