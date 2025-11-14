// app/dashboard/to-do/components/WarningStudentsSection.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Student, PermissionRecord } from "../../../_interfaces";
import { AllClassConfigs, StudentAttendanceWarning } from "../../_lib/configForAttendanceLogic";
import SectionTitleLineWithButton from "../../../_components/Section/TitleLineWithButton";
import CardBox from "../../../_components/CardBox";
import NotificationBar from "../../../_components/NotificationBar";
import { mdiAlertOctagram } from "@mdi/js";
import { getStudentDailyStatus, RawAttendanceRecord } from "../../_lib/attendanceLogic";

interface Props {
  students: Student[];
  attendanceRecords: RawAttendanceRecord[]; // Raw attendance records
  allClassConfigs: AllClassConfigs | null;
  approvedPermissions: PermissionRecord[];
  onViewDetails?: (student: Student) => void; // Callback to view student details
}

const WarningStudentsSection: React.FC<Props> = ({ students, attendanceRecords, allClassConfigs, approvedPermissions, onViewDetails }) => {
  const [warningStudentsList, setWarningStudentsList] = useState<StudentAttendanceWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const getStatusColors = (status?: string): {
    cardBg: string;
    cardBorder: string;
    cardShadow: string;
    iconBg: string;
    iconBorder: string;
    iconShadow: string;
    hoverIconBg: string;
    textColor: string;
    statusBg: string;
    statusText: string;
    statusLabel: string;
    avatarBg: string;
    avatarText: string;
  } => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return {
          cardBg: 'from-gray-50/90 to-gray-100/70 dark:from-gray-900/40 dark:to-gray-800/30',
          cardBorder: 'border-gray-200/50 dark:border-gray-700/30',
          cardShadow: 'shadow-gray-500/10 hover:shadow-gray-500/15',
          iconBg: 'from-gray-100/90 to-gray-200/70 dark:from-gray-900/50 dark:to-gray-800/30',
          iconBorder: 'border-gray-300/50 dark:border-gray-600/30',
          iconShadow: 'shadow-gray-500/10',
          hoverIconBg: 'hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30',
          textColor: 'text-gray-600 dark:text-gray-400',
          statusBg: 'bg-gray-500',
          statusText: 'text-gray-800 dark:text-gray-200',
          statusLabel: 'text-gray-500 dark:text-gray-400',
          avatarBg: 'from-gray-400 to-gray-500',
          avatarText: 'text-white'
        };
      case 'present':
        return {
          cardBg: 'from-green-50/90 to-green-100/70 dark:from-green-900/40 dark:to-green-800/30',
          cardBorder: 'border-green-200/50 dark:border-green-700/30',
          cardShadow: 'shadow-green-500/10 hover:shadow-green-500/15',
          iconBg: 'from-green-100/90 to-green-200/70 dark:from-green-900/50 dark:to-green-800/30',
          iconBorder: 'border-green-300/50 dark:border-green-600/30',
          iconShadow: 'shadow-green-500/10',
          hoverIconBg: 'hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30',
          textColor: 'text-green-600 dark:text-green-400',
          statusBg: 'bg-green-500',
          statusText: 'text-green-800 dark:text-green-200',
          statusLabel: 'text-green-500 dark:text-green-400',
          avatarBg: 'from-green-400 to-green-500',
          avatarText: 'text-white'
        };
      case 'absent':
        return {
          cardBg: 'from-red-50/90 to-red-100/70 dark:from-red-900/40 dark:to-red-800/30',
          cardBorder: 'border-red-200/50 dark:border-red-700/30',
          cardShadow: 'shadow-red-500/10 hover:shadow-red-500/15',
          iconBg: 'from-red-100/90 to-red-200/70 dark:from-red-900/50 dark:to-red-800/30',
          iconBorder: 'border-red-300/50 dark:border-red-600/30',
          iconShadow: 'shadow-red-500/10',
          hoverIconBg: 'hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30',
          textColor: 'text-red-600 dark:text-red-400',
          statusBg: 'bg-red-500',
          statusText: 'text-red-800 dark:text-red-200',
          statusLabel: 'text-red-500 dark:text-red-400',
          avatarBg: 'from-red-400 to-red-500',
          avatarText: 'text-white'
        };
      case 'permission':
        return {
          cardBg: 'from-purple-50/90 to-purple-100/70 dark:from-purple-900/40 dark:to-purple-800/30',
          cardBorder: 'border-purple-200/50 dark:border-purple-700/30',
          cardShadow: 'shadow-purple-500/10 hover:shadow-purple-500/15',
          iconBg: 'from-purple-100/90 to-purple-200/70 dark:from-purple-900/50 dark:to-purple-800/30',
          iconBorder: 'border-purple-300/50 dark:border-purple-600/30',
          iconShadow: 'shadow-purple-500/10',
          hoverIconBg: 'hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30',
          textColor: 'text-purple-600 dark:text-purple-400',
          statusBg: 'bg-purple-500',
          statusText: 'text-purple-800 dark:text-purple-200',
          statusLabel: 'text-purple-500 dark:text-purple-400',
          avatarBg: 'from-purple-400 to-purple-500',
          avatarText: 'text-white'
        };
      case 'late':
        return {
          cardBg: 'from-amber-50/90 to-amber-100/70 dark:from-amber-900/40 dark:to-amber-800/30',
          cardBorder: 'border-amber-200/50 dark:border-amber-700/30',
          cardShadow: 'shadow-amber-500/10 hover:shadow-amber-500/15',
          iconBg: 'from-amber-100/90 to-amber-200/70 dark:from-amber-900/50 dark:to-amber-800/30',
          iconBorder: 'border-amber-300/50 dark:border-amber-600/30',
          iconShadow: 'shadow-amber-500/10',
          hoverIconBg: 'hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30',
          textColor: 'text-amber-600 dark:text-amber-400',
          statusBg: 'bg-amber-500',
          statusText: 'text-amber-800 dark:text-amber-200',
          statusLabel: 'text-amber-500 dark:text-amber-400',
          avatarBg: 'from-amber-400 to-amber-500',
          avatarText: 'text-white'
        };
      default:
        // Default to orange for unknown/other statuses
        return {
          cardBg: 'from-orange-50/90 to-orange-100/70 dark:from-orange-900/40 dark:to-orange-800/30',
          cardBorder: 'border-orange-200/50 dark:border-orange-700/30',
          cardShadow: 'shadow-orange-500/10 hover:shadow-orange-500/15',
          iconBg: 'from-orange-100/90 to-orange-200/70 dark:from-orange-900/50 dark:to-orange-800/30',
          iconBorder: 'border-orange-300/50 dark:border-orange-600/30',
          iconShadow: 'shadow-orange-500/10',
          hoverIconBg: 'hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30',
          textColor: 'text-orange-600 dark:text-orange-400',
          statusBg: 'bg-orange-500',
          statusText: 'text-orange-800 dark:text-orange-200',
          statusLabel: 'text-orange-500 dark:text-orange-400',
          avatarBg: 'from-orange-400 to-orange-500',
          avatarText: 'text-white'
        };
    }
  };

  const getStudentInitials = (fullName: string) => {
    return fullName
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  useEffect(() => {
    if (!students || !attendanceRecords || !allClassConfigs) {
      setIsLoading(false);
      setWarningStudentsList([]);
      return;
    }

    setIsLoading(true);
    const warnings: StudentAttendanceWarning[] = [];
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    students.forEach(student => {
      // Only process students with warning flag set to true
      if (student.warning !== true) return;

      // Get student's attendance records and permissions
      const studentAttendance = attendanceRecords.filter(att => att.studentId === student.id);
      const studentPermissions = approvedPermissions.filter(p => p.studentId === student.id);
      
      // Get today's attendance status to add context
      const todayAttendance = studentAttendance.find(att => att.date === today);
      const todayStatus = getStudentDailyStatus(
        student, 
        today, 
        todayAttendance, 
        allClassConfigs, 
        studentPermissions
      );

      // Skip students with "Permission", "No School", or "Config Missing" status
      if (todayStatus.status === "Permission" || 
          todayStatus.status === "No School" || 
          todayStatus.status === "Absent (Config Missing)") {
        return;
      }

      // Create warning entry with current status context
      warnings.push({
        id: student.id,
        fullName: student.fullName,
        class: student.class,
        shift: student.shift,
        warningType: "flaggedStudent",
        value: 1, // All flagged students have value 1
        details: `${todayStatus.status || 'Unknown'}${todayStatus.time ? ` at ${todayStatus.time}` : ''}`,
        note: student.note, // Add note for additional context
        status: todayStatus.status // Add today's status
      });
    });

    // Sort by shift (morning, afternoon, evening) then by name for consistent display
    const shiftOrder = { 'morning': 1, 'afternoon': 2, 'evening': 3 };
    setWarningStudentsList(warnings.sort((a, b) => {
      const shiftA = shiftOrder[a.shift?.toLowerCase() as keyof typeof shiftOrder] || 4;
      const shiftB = shiftOrder[b.shift?.toLowerCase() as keyof typeof shiftOrder] || 4;
      
      if (shiftA !== shiftB) {
        return shiftA - shiftB;
      }
      
      // If same shift, sort by name
      return a.fullName.localeCompare(b.fullName);
    }));
    setIsLoading(false);
  }, [students, attendanceRecords, allClassConfigs, approvedPermissions]);

  const handleStudentClick = (studentWarning: StudentAttendanceWarning) => {
    if (onViewDetails) {
      // Find the full student object to pass to the callback
      const studentObj = students.find(s => s.id === studentWarning.id);
      if (studentObj) {
        onViewDetails(studentObj);
      }
    }
  };

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (isLoading) {
    return (
      <CardBox className="mb-6 bg-gradient-to-br from-white/80 via-white/60 to-white/40 dark:from-gray-800/80 dark:via-gray-800/60 dark:to-gray-800/40 backdrop-blur-2xl border border-white/30 dark:border-gray-600/30 shadow-2xl shadow-black/5 rounded-3xl">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gradient-to-r from-orange-200 via-orange-300 to-orange-200 dark:from-orange-700 dark:via-orange-600 dark:to-orange-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-gradient-to-r from-orange-200 via-orange-300 to-orange-200 dark:from-orange-700 dark:via-orange-600 dark:to-orange-700 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </CardBox>
    );
  }

  return (
    <div>
        <div className="flex items-center justify-between">
          <SectionTitleLineWithButton 
            icon={mdiAlertOctagram} 
            title={`Warning Absences ${warningStudentsList.length > 0 ? `(${warningStudentsList.length} Students)` : ''}`} 
          />
          
          {warningStudentsList.length > 0 ? (
            <button
              onClick={toggleCollapse}
              className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-gray-100/90 to-gray-200/70 dark:from-gray-700/90 dark:to-gray-600/70 backdrop-blur-md rounded-lg border border-gray-300/50 dark:border-gray-600/50 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-103"
              title={isCollapsed ? "Expand section" : "Collapse section"}
            >
              <svg 
                className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1 bg-gray-100/50 dark:bg-gray-700/50 rounded">
              No warnings
            </div>
          )}
        </div>

        <div 
          className={`transition-all duration-500 ease-in-out overflow-hidden ${
            isCollapsed 
              ? 'max-h-0 opacity-0' 
              : 'max-h-screen opacity-100'
          }`}
          style={{
            transitionProperty: 'max-height, opacity',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {warningStudentsList.length > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              {warningStudentsList.map((studentWarning, index) => {
                const studentObj = students.find(s => s.id === studentWarning.id);
                if (!studentObj) return null;
                
                const colors = getStatusColors(studentWarning.status);
                
                return (
                  <div
                    key={`${studentWarning.id}-warning`}
                    className={`transform transition-all duration-500 ease-out ${
                      isCollapsed ? 'translate-y-[-20px] opacity-0' : 'translate-y-0 opacity-100'
                    }`}
                    style={{
                      transitionDelay: isCollapsed ? '0ms' : `${index * 100}ms`
                    }}
                  >
                    <CardBox
                      className={`m-2 bg-gradient-to-br ${colors.cardBg} backdrop-blur-md border ${colors.cardBorder} shadow-lg ${colors.cardShadow} hover:shadow-xl hover:${colors.cardShadow} transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1 transform-gpu will-change-transform group cursor-pointer overflow-hidden`}
                      onClick={() => handleStudentClick(studentWarning)}
                    >
                      <div className="px-4 py-3 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors duration-300 rounded-2xl">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              {/* Student Avatar */}
                              <div className={`relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br ${colors.avatarBg} flex items-center justify-center shadow-md border-2 border-white/50 dark:border-gray-700/50 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                                <span className={`text-xs sm:text-sm font-bold ${colors.avatarText}`}>
                                  {getStudentInitials(studentWarning.fullName)}
                                </span>
                                {/* Subtle glow effect */}
                                <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.avatarBg} opacity-0 group-hover:opacity-20 transition-opacity duration-300`}></div>
                              </div>
                              
                              <div className="flex-1 min-w-0 overflow-hidden">
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">{studentWarning.fullName}</h3>
                                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300 truncate">{studentWarning.class} • {studentWarning.shift}</p>
                                {studentWarning.details && (
                                  <p className={`text-xs ${colors.textColor} mt-1 truncate`}>{studentWarning.details}</p>
                                )}
                                {studentWarning.note && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic truncate max-w-[150px] sm:max-w-none hidden sm:block">{studentWarning.note}</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Status Badge - Always visible */}
                            <div className="flex-shrink-0 text-right">
                              {studentWarning.status?.toLowerCase() === 'absent' && (
                                <div className="flex items-center justify-center mb-2">
                                  <div className="relative">
                                    <svg className="w-5 h-5 text-red-500 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                                  </div>
                                </div>
                              )}
                              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors.statusBg} ${colors.statusText} bg-opacity-20 border border-current border-opacity-30 group-hover:bg-opacity-30 transition-all duration-300 truncate max-w-full ${studentWarning.status?.toLowerCase() === 'absent' ? 'ring-2 ring-red-400 ring-opacity-50 animate-pulse' : ''}`}>
                                <span className="truncate">{studentWarning.status?.toUpperCase() || 'UNKNOWN'}</span>
                              </div>
                            </div>
                          </div>
                      </div>
                    </CardBox>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`transition-all duration-500 ease-in-out ${isCollapsed ? 'opacity-0 transform translate-y-[-10px]' : 'opacity-100 transform translate-y-0'}`}>
              <NotificationBar color="info" icon={mdiAlertOctagram}>
                🎉 Great news! No students are currently flagged for attention.
              </NotificationBar>
            </div>
          )}
        </div>
</div>
  );
};

export default WarningStudentsSection;
