// app/dashboard/page.tsx
"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  mdiAccountMultiple, mdiChevronDown, mdiClockAlertOutline, mdiAccountOff, mdiTimerSand, mdiChartTimelineVariant, mdiAlertOctagonOutline, mdiReload, mdiTrendingUp,
  mdiSchool, mdiAccountGroup, mdiChevronRight, mdiAccount,
  // Add any other icons used by your new section titles
} from "@mdi/js";

import Button from "../_components/Button";
import SectionMain from "../_components/Section/Main";
import SectionTitleLineWithButton from "../_components/Section/TitleLineWithButton";
import NotificationBar from "../_components/NotificationBar";
import Icon from "../_components/Icon"; 

import { db } from "../../firebase-config";
import { collection, getDocs, query, orderBy, where } from "firebase/firestore";
import { Student, PermissionRecord } from "../_interfaces";

// Import the new section components
// Dynamically import the section components with SSR disabled
import dynamicImport from 'next/dynamic';

const MonthlyAbsencesSection = dynamicImport(() => import("./_components/MonthlyAbsencesSection"), { ssr: false, loading: () => <p>Loading monthly absences...</p> });
const MonthlyLatesSection = dynamicImport(() => import("./_components/MonthlyLatesSection"), { ssr: false, loading: () => <p>Loading monthly lates...</p> });
const ConsecutiveAbsencesSection = dynamicImport(() => import("./_components/ConsecutiveAbsencesSection"), { ssr: false, loading: () => <p>Loading consecutive absences...</p> });

// Import utils
import { AllClassConfigs, ClassShiftConfigs, getCurrentYearMonthString } from "./_lib/configForAttendanceLogic";
import { getStudentDailyStatus } from "./_lib/attendanceLogic";
import DashboardLoading from "../_components/DashboardLoading";

// Interface for processed student warning data - can move to _interfaces or attendanceUtils
export interface StudentAttendanceWarning {
  id: string;
  fullName: string;
  class?: string;
  shift?: string;
  warningType: "consecutiveAbsence" | "totalAbsence" | "totalLate";
  value: number;
  details?: string;
}

// Interface for class statistics
export interface ClassStats {
  className: string;
  shift: string;
  classShiftKey: string; // Combined key like "Class A - Morning"
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
  pendingToday: number;
  attendanceRate: number;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]); // Raw attendance records for a relevant period
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for Month Selection Dropdown
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentYearMonthString());// "YYYY-MM"
  const [monthOptions, setMonthOptions] = useState<{ value: string; label: string }[]>([]);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs | null>(null);
  const [loadingConfigs, setLoadingConfigs] = useState(true); // Specific loading for configs
  const [permissions, setPermissions] = useState<PermissionRecord[]>([]);
  
  // New state for enhanced UI
  const [showClassDetails, setShowClassDetails] = useState(false);
  const [selectedStatCard, setSelectedStatCard] = useState<string | null>(null);

  // Generate Month Options
  useEffect(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();
    for (let m = 0; m <= currentMonthIndex; m++) {
      const date = new Date(currentYear, m, 1);
      options.push({
        value: `${currentYear}-${String(m + 1).padStart(2, '0')}`,
        label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        
      });
    }
    setMonthOptions(options.reverse()); // Show most recent first
  }, []);

  // Click outside for month dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    if (isMonthDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMonthDropdownOpen]);


  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadingConfigs(true); // Also set this loading true
    setError(null);
    try {
      // Fetch all students from current academic year (same query as students page)
      const studentSnapshotPromise = getDocs(
        query(
          collection(db, "students"),
          where("ay", "==", "2026"),
          orderBy("fullName")
        )
      );

      const querySnapshot = await studentSnapshotPromise;

      // Filter to get only active students (same logic as students page)
      const activeStudents = querySnapshot.docs.filter(doc => {
        const data = doc.data();
        const isDropped = data.dropped === true;
        const isOnBreak = data.onBreak === true;
        const isOnWaitlist = data.onWaitlist === true;
        return !isDropped && !isOnBreak && !isOnWaitlist;
      });

      const sixtyDaysAgo = new Date();
      sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
      const sixtyDaysAgoStr = `${sixtyDaysAgo.getFullYear()}-${String(sixtyDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sixtyDaysAgo.getDate()).padStart(2, '0')}`;
      const attendanceSnapshotPromise = getDocs(
        query(collection(db, "attendance"), where("date", ">=", sixtyDaysAgoStr), orderBy("date", "desc"))
      );

      const classesSnapshotPromise = getDocs(query(collection(db, "classes"), orderBy("name"))); // Assuming 'name' field exists and you want to order
      const permissionsSnapshotPromise = getDocs(query(collection(db, "permissions"), where("status", "==", "approved")));
      
      const [studentSnapshot, attendanceSnapshot, classesSnapshot, permissionsSnapshot] = await Promise.all([
        studentSnapshotPromise,
        attendanceSnapshotPromise,
        classesSnapshotPromise,
        permissionsSnapshotPromise
      ]);

      // Use the filtered active students
      const studentList = activeStudents.map(docSnap => ({ 
        id: docSnap.id, 
        ...docSnap.data(), 
        createdAt: docSnap.data().createdAt 
      } as Student));
      
      setStudents(studentList);

      const attendanceList = attendanceSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setAttendance(attendanceList);

      const permsList = permissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PermissionRecord));
      setPermissions(permsList);
    console.log(`Dashboard: Fetched ${permsList.length} approved permissions.`);

      const configs: AllClassConfigs = {};
      if (classesSnapshot.empty) {
        console.warn("No documents found in 'classes' collection for dashboard.");
      }
      classesSnapshot.forEach(docSnap => {
        configs[docSnap.id] = docSnap.data() as { name?: string; shifts: ClassShiftConfigs };
      });
      setAllClassConfigs(configs);
      setLoadingConfigs(false); // Configs loaded

    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data.");
      if (err.code === 'failed-precondition' && err.message.includes('index')) {
        setError(`Query requires a new index. Check console for link.`);
      }
      setLoadingConfigs(false); // Also set to false on error
    }
    setLoading(false); // General loading false
  }, []); // Empty dependency array, runs once

  useEffect(() => {
    fetchData();
  }, [fetchData]); 

  // Calculate "Today's" stats for widgets
  const todayStrForWidgets = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);
  
  const presentTodayCount = useMemo(() => attendance.filter(a => a.date === todayStrForWidgets && a.status === 'present').length, [attendance, todayStrForWidgets]);
  const lateTodayCount = useMemo(() => attendance.filter(a => a.date === todayStrForWidgets && a.status === 'late').length, [attendance, todayStrForWidgets]);
  
  const absentTodayCount = useMemo(() => {
    if (!allClassConfigs || students.length === 0) return 0;

    const now = new Date(); // Current time to check against shift windows
    const todayStr = todayStrForWidgets; // Use string "YYYY-MM-DD"

    return students.filter(student => {
      // Find this student's attendance record for today matching BOTH studentId AND shift
      // This prevents students with multiple shifts from being counted incorrectly
      const attendanceRecord = attendance.find(
        att => att.studentId === student.id && 
               att.date === todayStr &&
               (!att.shift || !student.shift || att.shift.toLowerCase() === student.shift.toLowerCase())
      );
      
      // Find this student's approved permissions
      const approvedPermissionsForStudent = permissions.filter(
        p => p.studentId === student.id
      );

      // Get the definitive status using the centralized logic
      const result = getStudentDailyStatus(
        student,
        todayStr,
        attendanceRecord,
        allClassConfigs,
        approvedPermissionsForStudent
      );

      // Count as absent only if the final status is "Absent" or "Absent (Config Missing)"
      return result.status === "Absent" || result.status === "Absent (Config Missing)";
    }).length;

  }, [students, attendance, permissions, allClassConfigs, todayStrForWidgets]);

    const pendingTodayCount = useMemo(() => {
    if (!allClassConfigs || students.length === 0) return 0;

    const todayStr = todayStrForWidgets; // Use string "YYYY-MM-DD"

    return students.filter(student => {
      // Find attendance record matching BOTH studentId AND shift
      const attendanceRecord = attendance.find(
        att => att.studentId === student.id && 
               att.date === todayStr &&
               (!att.shift || !student.shift || att.shift.toLowerCase() === student.shift.toLowerCase())
      );
      
      // Skip if student already has attendance record
      if (attendanceRecord) {
        return false;
      }
      
      const approvedPermissionsForStudent = permissions.filter(
        p => p.studentId === student.id
      );

      const result = getStudentDailyStatus(
        student,
        todayStr,
        attendanceRecord,
        allClassConfigs,
        approvedPermissionsForStudent
      );

      // Count as pending only if the final status is "Pending"
      return result.status === "Pending";
    }).length;
    
  }, [students, attendance, permissions, allClassConfigs, todayStrForWidgets]);

  const currentSelectedMonthLabel = useMemo(() => {
    return monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth;
  }, [monthOptions, selectedMonth]);

  // Calculate class-wise statistics by class and shift
const classStats = useMemo((): ClassStats[] => {
    if (!allClassConfigs || students.length === 0) return [];

    const todayStr = todayStrForWidgets;
    const classShiftMap = new Map<string, ClassStats>();

    students.forEach(student => {
      const className = student.class || 'Unknown Class';
      const shift = student.shift || 'Unknown Shift';
      const classShiftKey = `${className} - ${shift}`;
      
      if (!classShiftMap.has(classShiftKey)) {
        classShiftMap.set(classShiftKey, {
          className,
          shift,
          classShiftKey,
          totalStudents: 0,
          presentToday: 0,
          lateToday: 0,
          absentToday: 0,
          pendingToday: 0,
          attendanceRate: 0
        });
      }

      const stats = classShiftMap.get(classShiftKey)!;
      stats.totalStudents++;

      // Find attendance record matching BOTH studentId AND shift
      const attendanceRecord = attendance.find(
        att => att.studentId === student.id && 
               att.date === todayStr &&
               (!att.shift || !student.shift || att.shift.toLowerCase() === student.shift.toLowerCase())
      );
      
      const approvedPermissionsForStudent = permissions.filter(
        p => p.studentId === student.id
      );

      const result = getStudentDailyStatus(
        student,
        todayStr,
        attendanceRecord,
        allClassConfigs,
        approvedPermissionsForStudent
      );

      switch (result.status) {
        case 'Present':
          stats.presentToday++;
          break;
        case 'Late':
          stats.lateToday++;
          break;
        case 'Absent':
        case 'Absent (Config Missing)':
          stats.absentToday++;
          break;
        case 'Pending':
          stats.pendingToday++;
          break;
      }
    });

    // Function to get a numerical value for the shift
    const getShiftOrder = (shift: string): number => {
      switch (shift) {
        case 'Morning':
          return 1;
        case 'Afternoon':
          return 2;
        case 'Evening':
          return 3;
        default:
          return 99; // For 'Unknown Shift' or other shifts
      }
    };

    return Array.from(classShiftMap.values()).map(stats => ({
      ...stats,
      attendanceRate: stats.totalStudents > 0 
        ? Math.round(((stats.presentToday + stats.lateToday) / stats.totalStudents) * 100)
        : 0
    })).sort((a, b) => {
      // 1. Extract and compare the numerical part of the class name
      const numA = parseInt(a.className.match(/\d+/)?.at(0) || "0");
      const numB = parseInt(b.className.match(/\d+/)?.at(0) || "0");
      
      if (numA !== numB) {
        return numA - numB;
      }
      
      // 2. If numbers are the same, compare by the full class name (e.g., 7A before 7E)
      const classNameCompare = a.className.localeCompare(b.className);
      if (classNameCompare !== 0) {
        return classNameCompare;
      }

      // 3. If class names are identical, sort by shift order
      const shiftOrderA = getShiftOrder(a.shift);
      const shiftOrderB = getShiftOrder(b.shift);
      return shiftOrderA - shiftOrderB;
    });
  }, [students, attendance, permissions, allClassConfigs, todayStrForWidgets]);

  if ((loading && students.length === 0) || loadingConfigs) { // Show full page loader only on initial load
    return <DashboardLoading />;
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiChartTimelineVariant} title="Dashboard Overview" main>        
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon path={mdiAccount} size={24} />
            <span>{students.length} Total Students</span>
          </div>
          <Button onClick={fetchData} icon={mdiReload} label="Refresh" color="info" small />
        </div>
      </SectionTitleLineWithButton>

      {/* Modern Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Students Card */}
        <div 
          className={`bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-l-4 border-blue-500 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${selectedStatCard === 'total' ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
          onClick={() => setSelectedStatCard(selectedStatCard === 'total' ? null : 'total')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Icon path={mdiAccountMultiple} size={24} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Students</span>
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{students.length}</div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-full">
              <Icon path={mdiTrendingUp} size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          {selectedStatCard === 'total' && (
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
              <div className="text-xs text-blue-600 dark:text-blue-400">
                Active across {classStats.length} classes
              </div>
            </div>
          )}
        </div>

        {/* Present Today Card */}
        <div 
          className={`bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-l-4 border-green-500 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${selectedStatCard === 'present' ? 'ring-2 ring-green-500 shadow-lg' : ''}`}
          onClick={() => setSelectedStatCard(selectedStatCard === 'present' ? null : 'present')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Icon path={mdiAccountMultiple} size={24} className="text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Present Today</span>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">{presentTodayCount}</div>
            </div>
            <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-full">
              <Icon path={mdiTrendingUp} size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
          {selectedStatCard === 'present' && (
            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-700">
              <div className="text-xs text-green-600 dark:text-green-400">
                {students.length > 0 ? Math.round((presentTodayCount / students.length) * 100) : 0}% attendance rate
              </div>
            </div>
          )}
        </div>

        {/* Late Today Card */}
        <div 
          className={`bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-l-4 border-yellow-500 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${selectedStatCard === 'late' ? 'ring-2 ring-yellow-500 shadow-lg' : ''}`}
          onClick={() => setSelectedStatCard(selectedStatCard === 'late' ? null : 'late')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Icon path={mdiClockAlertOutline} size={24} className="text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Late Today</span>
              </div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{lateTodayCount}</div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-800/50 p-3 rounded-full">
              <Icon path={mdiClockAlertOutline} size={24} className="text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          {selectedStatCard === 'late' && (
            <div className="mt-4 pt-4 border-t border-yellow-200 dark:border-yellow-700">
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                {students.length > 0 ? Math.round((lateTodayCount / students.length) * 100) : 0}% of total students
              </div>
            </div>
          )}
        </div>

        {/* Absent Today Card */}
        <div 
          className={`bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-l-4 border-red-500 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${selectedStatCard === 'absent' ? 'ring-2 ring-red-500 shadow-lg' : ''}`}
          onClick={() => setSelectedStatCard(selectedStatCard === 'absent' ? null : 'absent')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Icon path={mdiAccountOff} size={24} className="text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Absent Today</span>
              </div>
              <div className="text-3xl font-bold text-red-900 dark:text-red-100">{absentTodayCount}</div>
            </div>
            <div className="bg-red-100 dark:bg-red-800/50 p-3 rounded-full">
              <Icon path={mdiAccountOff} size={24} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
          {selectedStatCard === 'absent' && (
            <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-700">
              <div className="text-xs text-red-600 dark:text-red-400">
                {students.length > 0 ? Math.round((absentTodayCount / students.length) * 100) : 0}% absence rate
              </div>
            </div>
          )}
        </div>

        {/* Pending Today Card */}
        <div 
          className={`bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-l-4 border-purple-500 rounded-xl p-6 cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 ${selectedStatCard === 'pending' ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
          onClick={() => setSelectedStatCard(selectedStatCard === 'pending' ? null : 'pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Icon path={mdiTimerSand} size={24} className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Pending Today</span>
              </div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{pendingTodayCount}</div>
            </div>
            <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-full">
              <Icon path={mdiTimerSand} size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          {selectedStatCard === 'pending' && (
            <div className="mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
              <div className="text-xs text-purple-600 dark:text-purple-400">
                Shift windows still open
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Class-wise Statistics Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Icon path={mdiSchool} size={24} className="text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Class & Shift Overview</h2>
            <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {classStats.length} Class-Shift Combinations
            </span>
          </div>
          <Button
            onClick={() => setShowClassDetails(!showClassDetails)}
            icon={showClassDetails ? mdiChevronDown : mdiChevronRight}
            label={showClassDetails ? "Hide Details" : "Show Details"}
            color="info"
            small
            outline
          />
        </div>

        {/* Class Details with Smooth Transition */}
        <div className={`transition-all duration-700 ease-in-out overflow-hidden ${
          showClassDetails 
            ? 'max-h-[5000px] opacity-100 transform translate-y-0' 
            : 'max-h-0 opacity-0 transform -translate-y-4'
        }`}>
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-500 delay-200 ${
            showClassDetails 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`}>
            {classStats.map((classData, index) => (
              <div 
                key={classData.classShiftKey} 
                className={`group relative bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 hover:scale-[1.01] overflow-hidden ${
                  showClassDetails 
                    ? 'opacity-100 transform translate-y-0' 
                    : 'opacity-0 transform translate-y-12'
                }`}
                style={{
                  transitionDelay: showClassDetails ? `${index * 100}ms` : '0ms'
                }}
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Header Section */}
                <div className="relative flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-3 rounded-xl shadow-md group-hover:shadow-lg transition-shadow duration-200">
                      <Icon path={mdiAccountGroup} size={24} className="text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{classData.className}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <Icon path={mdiClockAlertOutline} size={14} />
                        <span>{classData.shift} Shift</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform duration-200">{classData.totalStudents}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Students</div>
                  </div>
                </div>

                {/* Attendance Rate Progress Bar */}
                <div className="relative mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Attendance Rate</span>
                    <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{classData.attendanceRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-600 rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${classData.attendanceRate}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Present */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200/50 dark:border-green-700/50 group-hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full shadow-sm"></div>
                      <span className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Present</span>
                    </div>
                    <div className="text-2xl font-black text-green-600 dark:text-green-400">{classData.presentToday}</div>
                  </div>

                  {/* Absent */}
                  <div className="bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/20 dark:to-rose-900/20 rounded-xl p-4 border border-red-200/50 dark:border-red-700/50 group-hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full shadow-sm"></div>
                      <span className="text-xs font-semibold text-red-700 dark:text-red-300 uppercase tracking-wide">Absent</span>
                    </div>
                    <div className="text-2xl font-black text-red-600 dark:text-red-400">{classData.absentToday}</div>
                  </div>

                  {/* Late - Uncommented and styled */}
                  <div className="bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-yellow-200/50 dark:border-yellow-700/50 group-hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full shadow-sm"></div>
                      <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300 uppercase tracking-wide">Late</span>
                    </div>
                    <div className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{classData.lateToday}</div>
                  </div>

                  {/* Pending */}
                  <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-purple-200/50 dark:border-purple-700/50 group-hover:shadow-sm transition-all duration-200">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full shadow-sm"></div>
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Pending</span>
                    </div>
                    <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{classData.pendingToday}</div>
                  </div>
                </div>

                {/* Footer with Enhanced Student Count */}
                <div className="relative pt-4 border-t border-gray-200/50 dark:border-gray-600/50">
                  <div className="bg-gradient-to-r from-gray-50 via-white to-gray-50 dark:from-gray-700 dark:via-gray-800 dark:to-gray-700 rounded-xl p-4 group-hover:shadow-sm transition-all duration-200">
                    <div className="text-center">
                      <div className="text-xl font-black text-gray-900 dark:text-white mb-1">{classData.totalStudents}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Total Students</div>
                      <div className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1">{classData.shift} Shift</div>
                    </div>
                  </div>
                </div>

                {/* Subtle Glow Effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-2xl opacity-0 group-hover:opacity-50 transition-opacity duration-300 -z-10 blur-lg"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Class Summary for collapsed view */}
        <div className={`transition-all duration-700 ease-in-out overflow-hidden ${
          !showClassDetails 
            ? 'max-h-[5000px] opacity-100 transform translate-y-0' 
            : 'max-h-0 opacity-0 transform -translate-y-4'
        }`}>
          <div className={`transition-all duration-500 delay-200 ${
            !showClassDetails 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`}>
            <div className="relative bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-800 dark:via-slate-900 dark:to-slate-800 rounded-2xl p-8 border border-slate-200/50 dark:border-slate-700/50 overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/3 via-transparent to-purple-500/3"></div>
              
              {/* Header */}
              <div className="relative mb-8">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Class Overview Summary</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Quick stats across all classes and shifts</p>
              </div>

              {/* Main Stats Grid */}
              <div className="relative grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                {/* Class-Shift Combinations */}
                <div className="group bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200/50 dark:border-blue-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-blue-500 p-2 rounded-lg">
                      <Icon path={mdiSchool} size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{classStats.length}</div>
                      <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Classes</div>
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Class-Shift Combinations</div>
                </div>

                {/* Total Students */}
                <div className="group bg-gradient-to-br from-emerald-50 to-green-100 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl p-6 border border-emerald-200/50 dark:border-emerald-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-emerald-500 p-2 rounded-lg">
                      <Icon path={mdiAccountMultiple} size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {classStats.reduce((sum, c) => sum + c.totalStudents, 0)}
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Students</div>
                    </div>
                  </div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">Total Enrollment</div>
                </div>

                {/* Present + Late */}
                <div className="group bg-gradient-to-br from-green-50 to-teal-100 dark:from-green-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-green-200/50 dark:border-green-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-green-500 p-2 rounded-lg">
                      <Icon path={mdiAccount} size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-green-600 dark:text-green-400">
                        {classStats.reduce((sum, c) => sum + c.presentToday + c.lateToday, 0)}
                      </div>
                      <div className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">Present</div>
                    </div>
                  </div>
                  <div className="text-xs text-green-600 dark:text-green-400">Present + Late Today</div>
                </div>

                {/* Pending */}
                <div className="group bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-6 border border-purple-200/50 dark:border-purple-700/50 hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-purple-500 p-2 rounded-lg">
                      <Icon path={mdiTimerSand} size={20} className="text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-black text-purple-600 dark:text-purple-400">
                        {classStats.reduce((sum, c) => sum + c.pendingToday, 0)}
                      </div>
                      <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Pending</div>
                    </div>
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400">Awaiting Check-in</div>
                </div>
              </div>

              {/* Class Breakdown Section */}
              <div className="relative pt-6 border-t border-slate-200/50 dark:border-slate-600/50">
                <div className="flex items-center space-x-2 mb-6">
                  <Icon path={mdiAccountGroup} size={20} className="text-indigo-600 dark:text-indigo-400" />
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">Student Distribution by Class</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {[...new Set(classStats.map(c => c.className))].map((className, index) => {
                    const classStudents = classStats.filter(c => c.className === className);
                    const totalInClass = classStudents.reduce((sum, c) => sum + c.totalStudents, 0);
                    const presentInClass = classStudents.reduce((sum, c) => sum + c.presentToday + c.lateToday, 0);
                    const attendanceRate = totalInClass > 0 ? Math.round((presentInClass / totalInClass) * 100) : 0;
                    
                    return (
                      <div 
                        key={className} 
                        className="group bg-gradient-to-br from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 rounded-xl p-5 border border-gray-200/50 dark:border-gray-600/50 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 hover:scale-[1.02]"
                        style={{
                          transitionDelay: !showClassDetails ? `${index * 50}ms` : '0ms'
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h5 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">{className}</h5>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{totalInClass} students</p>
                          </div>
                          <div className="text-right">
                            <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{attendanceRate}%</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Attendance</div>
                          </div>
                        </div>
                        
                        {/* Progress Bars by Shift */}
                        <div className="space-y-3 mb-4">
                          {classStudents.map(shiftData => {
                            const presentInShift = shiftData.presentToday + shiftData.lateToday;
                            const shiftAttendanceRate = shiftData.totalStudents > 0 ? Math.round((presentInShift / shiftData.totalStudents) * 100) : 0;
                            const hasAttendanceData = presentInShift > 0;
                            return (
                              <div key={shiftData.classShiftKey} className="text-start">
                                <div className="text-base text-gray-600 dark:text-gray-400 mb-1">{shiftData.shift}</div>
                                <div className={`w-full rounded-full h-2 mb-1 overflow-hidden border ${
                                  hasAttendanceData
                                    ? 'bg-gray-200 dark:bg-gray-600 border-gray-300 dark:border-gray-500'
                                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600 border-dashed'
                                }`}>
                                  <div
                                    className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 rounded-full transition-all duration-1000 ease-out"
                                    style={{ width: `${shiftAttendanceRate}%` }}
                                  ></div>
                                </div>
                                <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                  {presentInShift}/{shiftData.totalStudents}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        {/* Subtle Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-lg"></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Subtle Glow Effect for Main Container */}
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-500 -z-10 blur-2xl"></div>
            </div>
          </div>
        </div>
      </div>

      {error && <NotificationBar color="danger" icon={mdiAlertOctagonOutline}>{error}</NotificationBar>}

      {/* Pass data to the new section components */}
      {/* Note: ConsecutiveAbsencesSection might need its own way of determining 'recent' if not tied to selectedMonth */}
      {/* <ConsecutiveAbsencesSection 
        students={students} 
        attendanceRecords={attendance} 
        allClassConfigs={allClassConfigs} // Pass allClassConfigs
        approvedPermissions={permissions.filter(p => p.studentId && p.status === 'approved')} // Filter for approved permissions
      /> */}

      {/* Wrapper for Monthly Reports to include the Month Selector */}
      {/* <SectionTitleLineWithButton icon={mdiCalendarMonth} title="Monthly Reports" main>
        <div className="relative w-56" ref={monthDropdownRef}> 
          <button type="button" onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-slate-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm px-4 py-2 inline-flex justify-between items-center w-full hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-500 dark:focus:ring-offset-slate-800">
              <span>{monthOptions.find(m => m.value === selectedMonth)?.label || "Select Month"}</span>
              <Icon path={mdiChevronDown} w="h-4 w-4" className={`ml-2 text-gray-400 transform transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {isMonthDropdownOpen && monthOptions.length > 0 && (
          <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-slate-700 ring-1 ring-black dark:ring-gray-600 ring-opacity-5 focus:outline-none z-10">
              <ul className="py-1 max-h-60 overflow-y-auto" role="menu">
              {monthOptions.map(option => (
                  <li key={option.value}>
                  <button type="button"
                      className={`block w-full text-left px-4 py-2 text-sm ${selectedMonth === option.value ? 'bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-200'} hover:bg-gray-100 dark:hover:bg-gray-600`}
                      onClick={() => { setSelectedMonth(option.value); setIsMonthDropdownOpen(false); }}
                  >
                      {option.label}
                  </button>
                  </li>
              ))}
              </ul>
          </div>
          )}
        </div>
      </SectionTitleLineWithButton> */}

      
        {/* Pass selectedMonth to components that need it */}
        {/* {!loading && (
            <>
            <MonthlyAbsencesSection 
                students={students} 
                attendanceRecords={attendance} 
                selectedMonthValue={selectedMonth}
                approvedPermissions={permissions.filter(p => p.studentId && p.status === 'approved')}
                selectedMonthLabel={currentSelectedMonthLabel}
                allClassConfigs={allClassConfigs}
                // allClassConfigs is not directly needed by this version of MonthlyAbsencesSection's calculate function
            />
            <MonthlyLatesSection 
                students={students} 
                attendanceRecords={attendance} 
                selectedMonthValue={selectedMonth}
                approvedPermissions={permissions}
                selectedMonthLabel={currentSelectedMonthLabel}
                allClassConfigs={allClassConfigs}
                // allClassConfigs is not directly needed by this version of MonthlyLatesSection's calculate function
            />
            </>
        )} */}
    </SectionMain>
  );
}