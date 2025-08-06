"use client";

import React from "react";
import { mdiRestore, mdiAccountRemove, mdiCalendar } from "@mdi/js";
import Icon from "../../../_components/Icon";
import Button from "../../../_components/Button";
import CardBox from "../../../_components/CardBox";
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
    hour: '2-digit',
    minute: '2-digit'
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
    <CardBox className="mb-6 border-l-4 border-l-orange-400">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Icon 
                path={mdiAccountRemove} 
                size={20} 
                className="text-orange-600 dark:text-orange-400" 
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-orange-700 dark:text-orange-400">
                Inactive Students
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {breakStudents.length} on break, {actuallyDroppedStudents.length} dropped
              </p>
            </div>
          </div>
          <Button
            onClick={onToggleShow}
            label={showDroppedStudents ? "Hide" : "Show"}
            color="info"
            small
            outline
          />
        </div>
        
        {/* Collapsible Content */}
        {showDroppedStudents && (
          <div className="space-y-6">
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
                        className="bg-white dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between">
                          {/* Student Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="relative group/avatar">
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-lg">
                                  <span className="text-white font-semibold text-sm group-hover/avatar:opacity-0 transition-opacity duration-200">
                                    {student.fullName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                
                                {/* Hover overlay with eye icon */}
                                {onViewDetails && (
                                  <div 
                                    className="absolute inset-0 bg-orange-600 bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer"
                                    onClick={() => onViewDetails(student)}
                                    title="View student details"
                                  >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
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
                            
                            {/* Student Details */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
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
                          <div className="ml-4 flex flex-col space-y-2">
                            <Button
                              onClick={() => onRestoreStudent(student)}
                              icon={mdiRestore}
                              label="Restore"
                              color="warning"
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
                        className="bg-white dark:bg-gray-700 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between">
                          {/* Student Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-3">
                              <div className="relative group/avatar">
                                <div className="w-10 h-10 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center transition-all duration-200 hover:shadow-lg">
                                  <span className="text-white font-semibold text-sm group-hover/avatar:opacity-0 transition-opacity duration-200">
                                    {student.fullName.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                
                                {/* Hover overlay with eye icon */}
                                {onViewDetails && (
                                  <div 
                                    className="absolute inset-0 bg-red-600 bg-opacity-90 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 cursor-pointer"
                                    onClick={() => onViewDetails(student)}
                                    title="View student details"
                                  >
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                              <div>
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
                            
                            {/* Student Details */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
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
                                  {formattedDate}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="ml-4 flex flex-col space-y-2">
                            <Button
                              onClick={() => onRestoreStudent(student)}
                              icon={mdiRestore}
                              label="Restore"
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
            )}
          </div>
        )}
      </div>
    </CardBox>
  );
};

export default DroppedStudentsSection;
