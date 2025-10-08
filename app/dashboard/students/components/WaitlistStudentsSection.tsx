"use client";

import React, { useState, useEffect } from "react";
import { mdiAccountPlus, mdiClockOutline, mdiAccountClock } from "@mdi/js";
import Icon from "../../../_components/Icon";
import Button from "../../../_components/Button";
import CardBox from "../../../_components/CardBox";
import { Student } from "../../../_interfaces";
import { Timestamp } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { collection, query, where, getDocs } from "firebase/firestore";

interface WaitlistStudentsSectionProps {
  waitlistStudents: Student[];
  showWaitlistStudents: boolean;
  onToggleShow: () => void;
  onActivateStudent: (student: Student) => void;
  onViewDetails?: (student: Student) => void;
}

// Helper function to calculate time ago
const getTimeAgo = (date: Date | string | Timestamp | undefined): string => {
  if (!date) return "Unknown";
  
  const now = new Date();
  let waitlistDate: Date;
  
  if (date instanceof Timestamp) {
    waitlistDate = date.toDate();
  } else if (typeof date === 'string') {
    waitlistDate = new Date(date);
  } else if (date instanceof Date) {
    waitlistDate = date;
  } else {
    return "Unknown";
  }
  
  const diffInMs = now.getTime() - waitlistDate.getTime();
  
  const seconds = Math.floor(diffInMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
  if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return "Just now";
};

// Helper function to format date
const formatWaitlistDate = (date: Date | string | Timestamp | undefined): string => {
  if (!date) return "Unknown date";
  
  let waitlistDate: Date;
  
  if (date instanceof Timestamp) {
    waitlistDate = date.toDate();
  } else if (typeof date === 'string') {
    waitlistDate = new Date(date);
  } else if (date instanceof Date) {
    waitlistDate = date;
  } else {
    return "Unknown date";
  }
  
  return waitlistDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const WaitlistStudentsSection: React.FC<WaitlistStudentsSectionProps> = ({
  waitlistStudents,
  showWaitlistStudents,
  onToggleShow,
  onActivateStudent,
  onViewDetails,
}) => {
  const [classCapacities, setClassCapacities] = useState<{[className: string]: {current: number, max: number}}>({});

  // Fetch class capacity information for waitlist students
  useEffect(() => {
    const fetchClassCapacities = async () => {
      if (waitlistStudents.length === 0) return;

      try {
        // Get unique classes from waitlist students
        const uniqueClasses = [...new Set(waitlistStudents.map(student => student.class))];
        
        // Fetch class configurations
        const classesCollection = collection(db, 'classes');
        const classesSnapshot = await getDocs(classesCollection);
        
        const capacities: {[key: string]: {current: number, max: number}} = {};
        
        for (const classDoc of classesSnapshot.docs) {
          const classData = classDoc.data();
          const className = classData.name;
          
          if (uniqueClasses.includes(className)) {
            // For each shift in this class, calculate capacity and current enrollment
            for (const [shiftName, shiftConfig] of Object.entries(classData.shifts || {})) {
              const shiftData = shiftConfig as {maxStudents?: number};
              const maxCapacity = shiftData.maxStudents || 25;
              
              // Count active students in this specific class/shift combination
              const activeStudentsQuery = query(
                collection(db, "students"),
                where("class", "==", className),
                where("shift", "==", shiftName),
                where("ay", "==", "2026")
              );
              const activeSnapshot = await getDocs(activeStudentsQuery);
              const activeStudents = activeSnapshot.docs.filter(doc => {
                const data = doc.data();
                return !data.dropped && !data.onBreak && !data.onWaitlist;
              });
              
              // Store by class-shift combination
              const key = `${className}-${shiftName}`;
              capacities[key] = {
                current: activeStudents.length,
                max: maxCapacity
              };
            }
          }
        }
        
        setClassCapacities(capacities);
      } catch (error) {
        console.error("Error fetching class capacities:", error);
      }
    };

    fetchClassCapacities();
  }, [waitlistStudents]);

  return (
    <CardBox className="mb-6 border-l-4 border-l-blue-400 ">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Icon 
                path={mdiAccountClock} 
                size={20} 
                className="text-blue-600 dark:text-blue-400" 
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-blue-700 dark:text-blue-400">
                Waitlist Students
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {waitlistStudents.length} student{waitlistStudents.length !== 1 ? 's' : ''} waiting for enrollment
              </p>
            </div>
          </div>
          <Button
            onClick={onToggleShow}
            label={showWaitlistStudents ? "Hide" : "Show"}
            color="info"
            small
            outline
          />
        </div>
        
        {/* Collapsible Content */}
        {showWaitlistStudents && (
          <div className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center space-x-2 mb-3">
                <Icon 
                  path={mdiClockOutline} 
                  size={16} 
                  className="text-blue-600 dark:text-blue-400" 
                />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Students on Waitlist ({waitlistStudents.length})
                </span>
              </div>
              
              {/* Waitlist Students Grid */}
              <div className="grid gap-4">
                {waitlistStudents.map((student) => {
                  const waitlistDate = student.waitlistDate || student.createdAt;
                  const timeAgo = getTimeAgo(waitlistDate);
                  const formattedDate = formatWaitlistDate(waitlistDate);
                  
                  return (
                    <div
                      key={student.id}
                      className="bg-white dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start justify-between">
                        {/* Student Info */}
                        <div className="flex-1">
                          {/* Student Details */}
                          <div className="grid grid-cols-1 md:grid-cols-[40%_1fr_1fr] gap-3 mb-3">
                            <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3 flex items-center gap-3">
                              {/* Avatar */}
                              <div className="relative group/avatar flex-shrink-0">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-lg">
                                  <span className="text-white font-semibold text-sm group-hover/avatar:opacity-0 transition-opacity duration-200">
                                    {student.fullName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                {onViewDetails && (
                                  <div
                                    className="absolute inset-0 bg-blue-600 bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer"
                                    onClick={() => onViewDetails(student)}
                                    title="View student details"
                                  >
                                    <svg
                                      className="w-5 h-5 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Names stacked vertically */}
                              <div className="flex flex-col">
                                <h3 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">
                                  {student.fullName}
                                </h3>
                                {student.nameKhmer && (
                                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                    {student.nameKhmer}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                Preferred Class & Shift
                              </p>
                              <p className="font-semibold text-gray-800 dark:text-gray-200">
                                {student.class} ({student.shift})
                              </p>
                              {classCapacities[`${student.class}-${student.shift}`] && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                    Status: {classCapacities[`${student.class}-${student.shift}`].current} / {classCapacities[`${student.class}-${student.shift}`].max} students
                                  </p>
                                  <div className="mt-1">
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                      <div 
                                        className={`h-1.5 rounded-full ${
                                          classCapacities[`${student.class}-${student.shift}`].current >= classCapacities[`${student.class}-${student.shift}`].max 
                                            ? 'bg-red-500' 
                                            : classCapacities[`${student.class}-${student.shift}`].current >= classCapacities[`${student.class}-${student.shift}`].max * 0.9 
                                            ? 'bg-orange-500' 
                                            : 'bg-green-500'
                                        }`}
                                        style={{ 
                                          width: `${Math.min((classCapacities[`${student.class}-${student.shift}`].current / classCapacities[`${student.class}-${student.shift}`].max) * 100, 100)}%` 
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {student.phone && (
                              <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Contact
                                </p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {student.phone}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          {/* Waitlist Time Info */}
                          <div className="flex items-center space-x-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-700">
                            <Icon 
                              path={mdiClockOutline} 
                              size={16} 
                              className="text-blue-600 dark:text-blue-400" 
                            />
                            <div>
                              <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                                On waitlist for {timeAgo}
                              </p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">
                                Since: {formattedDate}
                              </p>
                              {student.waitlistReason && (
                                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                  Reason: {student.waitlistReason}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="ml-4 flex flex-col space-y-2">
                          <Button
                            onClick={() => onActivateStudent(student)}
                            icon={mdiAccountPlus}
                            label="Activate"
                            color="success"
                            small
                            className="whitespace-nowrap"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </CardBox>
  );
};

export default WaitlistStudentsSection;
