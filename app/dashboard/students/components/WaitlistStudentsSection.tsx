"use client";

import React, { useState, useEffect } from "react";
import { mdiAccountPlus, mdiClockOutline, mdiAccountClock, mdiEye } from "@mdi/js";
import Icon from "../../../_components/Icon";
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
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-blue-200 dark:border-blue-800 mb-6">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        onClick={onToggleShow}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Icon 
              path={mdiAccountClock} 
              size={20} 
              className="text-blue-600 dark:text-blue-400" 
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Waitlist Students
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {waitlistStudents.length} student{waitlistStudents.length !== 1 ? 's' : ''} waiting for enrollment
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {waitlistStudents.length > 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-blue-900 dark:text-blue-300">
              {waitlistStudents.length}
            </span>
          )}
          <Icon 
            path={showWaitlistStudents ? "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" : "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"} 
            size={20} 
            className="text-gray-400" 
          />
        </div>
      </div>
        
      {showWaitlistStudents && (
        <div className="border-t border-blue-200 dark:border-blue-800">
          {waitlistStudents.length === 0 ? (
            <div className="p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
                <Icon path={mdiAccountClock} size={32} className="text-blue-400" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No Students on Waitlist
              </h4>
              <p className="text-gray-500 dark:text-gray-400">
                All waitlist students have been processed.
              </p>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-3">
                {waitlistStudents.map((student) => {
                  const waitlistDate = student.waitlistDate || student.createdAt;
                  const timeAgo = getTimeAgo(waitlistDate);
                  const formattedDate = formatWaitlistDate(waitlistDate);
                  
                  return (
                    <div 
                      key={student.id} 
                      className="backdrop-blur-sm bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {student.fullName}
                            </h4>
                            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded dark:bg-blue-900 dark:text-blue-300">
                              Waitlist
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600 dark:text-gray-400">
                            <div>
                              <span className="font-medium">Phone:</span> {student.phone || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Class:</span> {student.class || 'N/A'}
                            </div>
                            <div>
                              <span className="font-medium">Shift:</span> {student.shift || 'N/A'}
                            </div>
                          </div>
                          
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            Waitlisted: {formattedDate} ({timeAgo})
                          </div>
                          
                          {student.waitlistReason && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Reason: {student.waitlistReason}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-center ml-4">
                          {onViewDetails && (
                            <button
                              onClick={() => onViewDetails(student)}
                              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20 rounded-lg transition-colors mr-2"
                              title="View Details"
                            >
                              <Icon path={mdiEye} size={16} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => onActivateStudent(student)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                            title="Enroll Student"
                          >
                            <Icon path={mdiAccountPlus} size={16} className="mr-2" />
                            Enroll
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WaitlistStudentsSection;
