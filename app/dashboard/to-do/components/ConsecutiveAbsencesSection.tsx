// app/dashboard/to-do/components/ConsecutiveAbsencesSection.tsx
"use client";

import React, { useEffect, useState } from "react";
import { Student, PermissionRecord } from "../../../_interfaces";
import { AllClassConfigs, StudentAttendanceWarning } from "../../_lib/configForAttendanceLogic";
import SectionTitleLineWithButton from "../../../_components/Section/TitleLineWithButton";
import CardBox from "../../../_components/CardBox";
import NotificationBar from "../../../_components/NotificationBar";
import { mdiCalendarRemoveOutline} from "@mdi/js";
import { calculateConsecutiveAbsences, RawAttendanceRecord } from "../../_lib/attendanceLogic";

interface Props {
  students: Student[];
  attendanceRecords: RawAttendanceRecord[]; // Raw attendance records (e.g., last 60-90 days)
  allClassConfigs: AllClassConfigs | null;
  approvedPermissions: PermissionRecord[]; // Optional, if you need to pass permissions
  onViewDetails?: (student: Student) => void; // Callback to view student details
}

const ConsecutiveAbsencesSection: React.FC<Props> = ({ students, attendanceRecords, allClassConfigs, approvedPermissions, onViewDetails }) => {
  const [consecutiveAbsenceWarningList, setConsecutiveAbsenceWarningList] = useState<StudentAttendanceWarning[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);

  useEffect(() => {
    if (!students || !attendanceRecords || !allClassConfigs) {
      setIsLoading(false);
      setConsecutiveAbsenceWarningList([]);
      return;
    }
    setIsLoading(true);
    const warnings: StudentAttendanceWarning[] = [];

    students.forEach(student => {
      // Pre-filter attendance for the current    student to pass to the calculation function
      const studentAttendance = attendanceRecords.filter(att => att.studentId === student.id);
      const studentPermissions = approvedPermissions.filter(p => p.studentId === student.id);
      const result = calculateConsecutiveAbsences(student, studentAttendance, allClassConfigs, studentPermissions,20); // Check last 20 days
      
      if (result.count >= 2) {
        warnings.push({
          id: student.id, fullName: student.fullName, class: student.class, shift: student.shift,
          warningType: "consecutiveAbsence", value: result.count, 
          details: result.details
        });
      }
    });

    setConsecutiveAbsenceWarningList(warnings.sort((a,b) => b.value - a.value).slice(0,5));
    setIsLoading(false);
  }, [students, attendanceRecords, allClassConfigs]);

  if (isLoading || !allClassConfigs) {
    return (
      <div className="">
        <SectionTitleLineWithButton icon={mdiCalendarRemoveOutline} title="Recent Consecutive Absences" />
        <p className="text-center p-4">Calculating...</p>
      </div>
    );
  }

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="">
      <div className="flex items-center justify-between">
        <SectionTitleLineWithButton 
          icon={mdiCalendarRemoveOutline} 
          title={`Recent Consecutive Absences ${consecutiveAbsenceWarningList.length > 0 ? `(${consecutiveAbsenceWarningList.length} Students)` : ''}`} 
        />
        {consecutiveAbsenceWarningList.length > 0 ? (
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
        {consecutiveAbsenceWarningList.length > 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
            {consecutiveAbsenceWarningList.map((studentWarning, index) => {
              const studentSpecificAttendance = attendanceRecords.filter(att => att.studentId === studentWarning.id);
              const studentObj = students.find(s => s.id === studentWarning.id);
              if (!studentObj) return null;
              return (
                <div
                  key={`${studentWarning.id}-consecutive`}
                  className={`transform transition-all duration-500 ease-out ${
                    isCollapsed ? 'translate-y-[-20px] opacity-0' : 'translate-y-0 opacity-100'
                  }`}
                  style={{
                    transitionDelay: isCollapsed ? '0ms' : `${index * 100}ms`
                  }}
                >
                  <CardBox
                    className="m-2 bg-gradient-to-br from-red-50/90 to-red-100/70 dark:from-red-900/40 dark:to-red-800/30 backdrop-blur-md border border-red-200/50 dark:border-red-700/30 shadow-lg shadow-red-500/10 hover:shadow-xl hover:shadow-red-500/15 transition-transform duration-300 hover:scale-[1.02] hover:-translate-y-1 transform-gpu will-change-transform"
                  >
                    <div className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="relative group/icon p-2 bg-gradient-to-br from-red-100/90 to-red-200/70 dark:from-red-900/50 dark:to-red-800/30 backdrop-blur-md rounded-xl border border-red-300/50 dark:border-red-600/30 shadow-md shadow-red-500/10 cursor-pointer hover:bg-gradient-to-br hover:from-blue-100/90 hover:to-blue-200/70 dark:hover:from-blue-900/50 dark:hover:to-blue-800/30 transition-all duration-300 hover:scale-105"
                            onClick={() => onViewDetails?.(studentObj)}
                            title={`View ${studentWarning.fullName} details`}
                          >
                            {/* Warning icon - shown by default */}
                            <svg className="w-5 h-5 text-red-600 dark:text-red-400 group-hover/icon:opacity-0 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
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
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{studentWarning.value}</div>
                          <div className="text-xs text-red-500 dark:text-red-400">consecutive days</div>
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
            <NotificationBar color="info" icon={mdiCalendarRemoveOutline}>
              No students with 2+ recent consecutive school day absences.
            </NotificationBar>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConsecutiveAbsencesSection;
