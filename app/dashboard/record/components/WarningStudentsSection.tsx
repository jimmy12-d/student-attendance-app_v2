// app/dashboard/record/components/WarningStudentsSection.tsx
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

      // Skip students with "Permission" or "No School" status
      if (todayStatus.status === "Permission" || todayStatus.status === "No School") {
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
        details: `Flagged student - Today: ${todayStatus.status || 'Unknown'}${todayStatus.time ? ` at ${todayStatus.time}` : ''}`,
        note: student.note // Add note for additional context
      });
    });

    // Sort by name for consistent display
    setWarningStudentsList(warnings.sort((a, b) => a.fullName.localeCompare(b.fullName)));
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
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {warningStudentsList.map((studentWarning, index) => {
                const studentObj = students.find(s => s.id === studentWarning.id);
                if (!studentObj) return null;
                
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
                      className="m-2 bg-gradient-to-br from-orange-50/90 to-orange-100/70 dark:from-orange-900/40 dark:to-orange-800/30 backdrop-blur-md border border-orange-200/50 dark:border-orange-700/30 shadow-lg shadow-orange-500/10 hover:shadow-xl hover:shadow-orange-500/15 transition-transform duration-300 hover:scale-[1.02] hover:-translate-y-1 transform-gpu will-change-transform"
                    >
                      <div className="px-4 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="relative group/icon p-2 bg-gradient-to-br from-orange-100/90 to-orange-200/70 dark:from-orange-900/50 dark:to-orange-800/30 backdrop-blur-md rounded-xl border border-orange-300/50 dark:border-orange-600/30 shadow-md shadow-orange-500/10 cursor-pointer hover:bg-gradient-to-br hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30 transition-all duration-300 hover:scale-105"
                              onClick={() => handleStudentClick(studentWarning)}
                              title={`View ${studentWarning.fullName} details`}
                            >
                              {/* Warning icon - shown by default */}
                              <svg className="w-5 h-5 text-orange-600 dark:text-orange-400 group-hover/icon:opacity-0 transition-all duration-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d={mdiAlertOctagram} />
                              </svg>
                              {/* Eye icon - shown on hover */}
                              <svg className="absolute inset-0 w-5 h-5 text-blue-600 dark:text-blue-400 opacity-0 group-hover/icon:opacity-100 transition-all duration-300 m-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{studentWarning.fullName}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">{studentWarning.class} • {studentWarning.shift}</p>
                              {studentWarning.details && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">{studentWarning.details}</p>
                              )}
                              {studentWarning.note && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">Note: {studentWarning.note}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <div className="flex items-center space-x-2">
                                <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></div>
                                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">FLAGGED</span>
                              </div>
                              <div className="text-xs text-orange-500 dark:text-orange-400">Requires attention</div>
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
