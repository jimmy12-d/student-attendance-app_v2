"use client";

import React from "react";
import { mdiRestore, mdiAccountRemove, mdiCalendar, mdiEye } from "@mdi/js";
import Icon from "../../../_components/Icon";
import { Student } from "../../../_interfaces";
import { Timestamp } from "firebase/firestore";

interface DroppedStudentsSectionProps {
  droppedStudents: Student[];
  showDroppedStudents: boolean;
  onToggleShow: () => void;
  onRestoreStudent: (student: Student) => void;
  onViewDetails?: (student: Student) => void;
}

// Helper function to calculate time ago
const getTimeAgo = (date: Date | string | Timestamp | undefined): string => {
  if (!date) return "Unknown";
  
  const now = new Date();
  let droppedDate: Date;
  
  if (date instanceof Timestamp) {
    droppedDate = date.toDate();
  } else if (typeof date === 'string') {
    droppedDate = new Date(date);
  } else if (date instanceof Date) {
    droppedDate = date;
  } else {
    return "Unknown";
  }
  
  const diffInMs = now.getTime() - droppedDate.getTime();
  
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
const formatDroppedDate = (date: Date | string | Timestamp | undefined): string => {
  if (!date) return "Unknown date";
  
  let droppedDate: Date;
  
  if (date instanceof Timestamp) {
    droppedDate = date.toDate();
  } else if (typeof date === 'string') {
    droppedDate = new Date(date);
  } else if (date instanceof Date) {
    droppedDate = date;
  } else {
    return "Unknown date";
  }
  
  return droppedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const DroppedStudentsSection: React.FC<DroppedStudentsSectionProps> = ({
  droppedStudents,
  showDroppedStudents,
  onToggleShow,
  onRestoreStudent,
  onViewDetails,
}) => {
  if (droppedStudents.length === 0) {
    return null;
  }

  // Separate break students from dropped students
  const breakStudents = droppedStudents.filter(student => student.onBreak);
  const actuallyDroppedStudents = droppedStudents.filter(student => student.dropped && !student.onBreak);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-red-200 dark:border-red-800 mb-6">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        onClick={onToggleShow}
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <Icon 
              path={mdiAccountRemove} 
              size={20} 
              className="text-red-600 dark:text-red-400" 
            />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Inactive Students
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {breakStudents.length} on break, {actuallyDroppedStudents.length} dropped
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {droppedStudents.length > 0 && (
            <span className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded-full dark:bg-red-900 dark:text-red-300">
              {droppedStudents.length}
            </span>
          )}
          <Icon 
            path={showDroppedStudents ? "M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z" : "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z"} 
            size={20} 
            className="text-gray-400" 
          />
        </div>
      </div>
        
      {showDroppedStudents && (
        <div className="border-t border-red-200 dark:border-red-800">
          <div className="space-y-6 p-4">
            {/* Break Students Section */}
            {breakStudents.length > 0 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center space-x-2 mb-3">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-orange-800 dark:text-orange-300">
                    Students on Break ({breakStudents.length})
                  </span>
                </div>
                
                {/* Break Students Grid */}
                <div className="grid gap-4">
                  {breakStudents.map((student) => {
                    const breakStartDate = student.breakStartDate;
                    const timeAgo = getTimeAgo(breakStartDate);
                    const formattedDate = formatDroppedDate(breakStartDate);
                    
                    return (
                      <div
                        key={student.id}
                        className="backdrop-blur-sm bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex items-start justify-between">
                          {/* Student Info */}
                          <div className="flex-1">
                            {/* Student Details */}
                            <div className="grid grid-cols-2 md:grid-cols-[35%_1fr_1fr_1fr] gap-3 mb-3">
                              <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3 flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative group/avatar flex-shrink-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-lg">
                                    <span className="text-white font-semibold text-sm group-hover/avatar:opacity-0 transition-opacity duration-200">
                                      {student.fullName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  {onViewDetails && (
                                    <div
                                      className="absolute inset-0 bg-orange-600 bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer"
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
                                  Class
                                </p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {student.class}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Shift
                                </p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {student.shift}
                                </p>
                              </div>
                              {student.expectedReturnMonth && (
                                <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                                  <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                    Expected Return
                                  </p>
                                  <p className="font-semibold text-gray-800 dark:text-gray-200">
                                    {(() => {
                                      const [year, month] = student.expectedReturnMonth.split('-');
                                      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                      return `${monthNames[parseInt(month) - 1]} ${year}`;
                                    })()}
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Break Time Info */}
                            <div className="flex items-center space-x-2 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg border border-orange-200 dark:border-orange-700">
                              <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                                  On break since {timeAgo}
                                </p>
                                <p className="text-xs text-orange-600 dark:text-orange-400">
                                  {formattedDate}
                                </p>
                                {student.breakReason && (
                                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                    Reason: {student.breakReason}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
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
                              onClick={() => onRestoreStudent(student)}
                              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                              title="Restore Student"
                            >
                              <Icon path={mdiRestore} size={16} className="mr-2" />
                              Restore
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dropped Students Section */}
            {actuallyDroppedStudents.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
                <div className="flex items-center space-x-2 mb-3">
                  <Icon 
                    path={mdiAccountRemove} 
                    size={16} 
                    className="text-red-600 dark:text-red-400" 
                  />
                  <span className="text-sm font-medium text-red-800 dark:text-red-300">
                    Dropped Students ({actuallyDroppedStudents.length})
                  </span>
                </div>
                
                {/* Dropped Students Grid */}
                <div className="grid gap-4">
                  {actuallyDroppedStudents.map((student) => {
                    const droppedAt = student.droppedAt;
                    const timeAgo = getTimeAgo(droppedAt);
                    const formattedDate = formatDroppedDate(droppedAt);
                    
                    return (
                      <div
                        key={student.id}
                        className="backdrop-blur-sm bg-white/10 dark:bg-black/10 border border-white/20 dark:border-white/10 rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <div className="flex items-start justify-between">
                          {/* Student Info */}
                          <div className="flex-1">                           
                            {/* Student Details */}
                            <div className="grid grid-cols-2 md:grid-cols-[35%_1fr_1fr_1fr] gap-3 mb-3">
                              <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3 flex items-center gap-3">
                                {/* Avatar */}
                                <div className="relative group/avatar flex-shrink-0">
                                  <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-lg">
                                    <span className="text-white font-semibold text-sm group-hover/avatar:opacity-0 transition-opacity duration-200">
                                      {student.fullName.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  {onViewDetails && (
                                    <div
                                      className="absolute inset-0 bg-red-600 bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer"
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
                                  Class
                                </p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {student.class}
                                </p>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                  Shift
                                </p>
                                <p className="font-semibold text-gray-800 dark:text-gray-200">
                                  {student.shift}
                                </p>
                              </div>
                            </div>
                            
                            {/* Dropped Time Info */}
                            <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-700">
                              <Icon 
                                path={mdiCalendar} 
                                size={16} 
                                className="text-red-600 dark:text-red-400" 
                              />
                              <div>
                                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                                  Dropped {timeAgo}
                                </p>
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  Since: {formattedDate}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
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
                              onClick={() => onRestoreStudent(student)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center min-w-[100px]"
                              title="Restore Student"
                            >
                              <Icon path={mdiRestore} size={16} className="mr-2" />
                              Restore
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
        </div>
      )}
    </div>
  );
};

export default DroppedStudentsSection;
