// app/dashboard/page.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  mdiAccountMultiple, mdiChevronDown, mdiClockAlertOutline, mdiAccountOff, mdiTimerSand,
  mdiCalendarMonth, mdiChartTimelineVariant, mdiAlertOctagonOutline, mdiReload, mdiTrendingUp,
  mdiSchool, mdiAccountGroup, mdiChartPie, mdiEye, mdiChevronRight, mdiAccount,
  // Add any other icons used by your new section titles
} from "@mdi/js";
import Button from "../_components/Button";
import SectionMain from "../_components/Section/Main";
import SectionTitleLineWithButton from "../_components/Section/TitleLineWithButton";
import CardBoxWidget from "../_components/CardBox/Widget";
import NotificationBar from "../_components/NotificationBar";
import Icon from "../_components/Icon"; 

import { db } from "../../firebase-config";
import { collection, getDocs, query, orderBy, where, Timestamp } from "firebase/firestore";
import { Student, PermissionRecord } from "../_interfaces";

// Import the new section components
// Dynamically import the section components with SSR disabled
import dynamic from 'next/dynamic';

const MonthlyAbsencesSection = dynamic(() => import("./_components/MonthlyAbsencesSection"), { ssr: false, loading: () => <p>Loading monthly absences...</p> });
const MonthlyLatesSection = dynamic(() => import("./_components/MonthlyLatesSection"), { ssr: false, loading: () => <p>Loading monthly lates...</p> });
const ConsecutiveAbsencesSection = dynamic(() => import("./_components/ConsecutiveAbsencesSection"), { ssr: false, loading: () => <p>Loading consecutive absences...</p> });

// Import utils
import { AllClassConfigs, ClassShiftConfigs, getCurrentYearMonthString,LATE_WINDOW_DURATION_MINUTES } from "./_lib/configForAttendanceLogic";
import { isSchoolDay, getStudentDailyStatus } from "./_lib/attendanceLogic";

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
      const studentSnapshotPromise = getDocs(query(collection(db, "students"), where("ay", "==", "2026"), orderBy("fullName")));

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

      const studentList = studentSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data(), createdAt: docSnap.data().createdAt } as Student));
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
      // Find this student's attendance record for today, if any
      const attendanceRecord = attendance.find(
        att => att.studentId === student.id && att.date === todayStr
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
      const attendanceRecord = attendance.find(
        att => att.studentId === student.id && att.date === todayStr
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

      // Find this student's attendance record for today
      const attendanceRecord = attendance.find(
        att => att.studentId === student.id && att.date === todayStr
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

      // Update counts based on status
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

    // Calculate attendance rates and convert to array
    return Array.from(classShiftMap.values()).map(stats => ({
      ...stats,
      attendanceRate: stats.totalStudents > 0 
        ? Math.round(((stats.presentToday + stats.lateToday) / stats.totalStudents) * 100)
        : 0
    })).sort((a, b) => {
      // Sort by class name first, then by shift
      if (a.className !== b.className) {
        return a.className.localeCompare(b.className);
      }
      return a.shift.localeCompare(b.shift);
    });
  }, [students, attendance, permissions, allClassConfigs, todayStrForWidgets]);

  if ((loading && students.length === 0) || loadingConfigs) { // Show full page loader only on initial load
    return <SectionMain><p className="text-center p-6">Loading dashboard data...</p></SectionMain>;
  }

  return (
    <SectionMain>
      <SectionTitleLineWithButton icon={mdiChartTimelineVariant} title="Dashboard Overview" main>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Icon path={mdiAccount} size={0.8} />
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
                <Icon path={mdiAccountMultiple} size={1.2} className="text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Students</span>
              </div>
              <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{students.length}</div>
            </div>
            <div className="bg-blue-100 dark:bg-blue-800/50 p-3 rounded-full">
              <Icon path={mdiTrendingUp} size={1} className="text-blue-600 dark:text-blue-400" />
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
                <Icon path={mdiAccountMultiple} size={1.2} className="text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Present Today</span>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">{presentTodayCount}</div>
            </div>
            <div className="bg-green-100 dark:bg-green-800/50 p-3 rounded-full">
              <Icon path={mdiTrendingUp} size={1} className="text-green-600 dark:text-green-400" />
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
                <Icon path={mdiClockAlertOutline} size={1.2} className="text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Late Today</span>
              </div>
              <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{lateTodayCount}</div>
            </div>
            <div className="bg-yellow-100 dark:bg-yellow-800/50 p-3 rounded-full">
              <Icon path={mdiClockAlertOutline} size={1} className="text-yellow-600 dark:text-yellow-400" />
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
                <Icon path={mdiAccountOff} size={1.2} className="text-red-600 dark:text-red-400" />
                <span className="text-sm font-medium text-red-700 dark:text-red-300">Absent Today</span>
              </div>
              <div className="text-3xl font-bold text-red-900 dark:text-red-100">{absentTodayCount}</div>
            </div>
            <div className="bg-red-100 dark:bg-red-800/50 p-3 rounded-full">
              <Icon path={mdiAccountOff} size={1} className="text-red-600 dark:text-red-400" />
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
                <Icon path={mdiTimerSand} size={1.2} className="text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Pending Today</span>
              </div>
              <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{pendingTodayCount}</div>
            </div>
            <div className="bg-purple-100 dark:bg-purple-800/50 p-3 rounded-full">
              <Icon path={mdiTimerSand} size={1} className="text-purple-600 dark:text-purple-400" />
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
            <Icon path={mdiSchool} size={1.2} className="text-gray-700 dark:text-gray-300" />
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

        {showClassDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classStats.map((classData) => (
              <div key={classData.classShiftKey} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="bg-indigo-100 dark:bg-indigo-900 p-2 rounded-lg">
                      <Icon path={mdiAccountGroup} size={1} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">{classData.className}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{classData.shift} • {classData.totalStudents} students</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{classData.totalStudents}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">students</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Present</span>
                    </div>
                    <span className="font-medium text-green-600 dark:text-green-400">{classData.presentToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Late</span>
                    </div>
                    <span className="font-medium text-yellow-600 dark:text-yellow-400">{classData.lateToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Absent</span>
                    </div>
                    <span className="font-medium text-red-600 dark:text-red-400">{classData.absentToday}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                      <span className="text-sm text-gray-600 dark:text-gray-400">Pending</span>
                    </div>
                    <span className="font-medium text-purple-600 dark:text-purple-400">{classData.pendingToday}</span>
                  </div>
                </div>

                {/* Student Count Display - More prominent */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div className="text-center">
                      <div className="text-lg font-bold text-gray-900 dark:text-gray-100">{classData.totalStudents}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Total Students in {classData.shift}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Class Summary for collapsed view */}
        {!showClassDetails && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{classStats.length}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Class-Shift Combinations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {classStats.reduce((sum, c) => sum + c.totalStudents, 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {classStats.reduce((sum, c) => sum + c.presentToday + c.lateToday, 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Present + Late</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {classStats.reduce((sum, c) => sum + c.pendingToday, 0)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Pending</div>
              </div>
            </div>
            
            {/* Show breakdown by unique classes */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Student Count by Class:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {[...new Set(classStats.map(c => c.className))].map(className => {
                  const classStudents = classStats.filter(c => c.className === className);
                  const totalInClass = classStudents.reduce((sum, c) => sum + c.totalStudents, 0);
                  return (
                    <div key={className} className="bg-white dark:bg-gray-700 rounded-lg p-3 text-center">
                      <div className="font-semibold text-gray-900 dark:text-gray-100">{className}</div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">{totalInClass} students</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {classStudents.map(c => `${c.shift}: ${c.totalStudents}`).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
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