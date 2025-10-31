"use client";

import React, { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { getStatusStyles } from "../_lib/statusStyles";
import { toast } from 'sonner';
import { 
  mdiFaceRecognition,
  mdiGestureTap,
  mdiBell,
  mdiHelpCircle,
  mdiPencil,
  mdiClockOutline,
  mdiQrcode
} from "@mdi/js";
import TimestampEditModal from "./components/TimestampEditModal";
import { Student } from "../../_interfaces";
import { AllClassConfigs } from "../_lib/configForAttendanceLogic";

const formatDateToDDMMYYYY = (dateInput: string | Date | Timestamp | undefined): string => {
    if (!dateInput) return 'N/A';
    let dateObj: Date;

    if (typeof dateInput === 'string') {
        const parts = dateInput.split('-');
        if (parts.length === 3 && !isNaN(parseInt(parts[0])) && !isNaN(parseInt(parts[1])) && !isNaN(parseInt(parts[2]))) {
            // Create date with explicit time to avoid timezone issues
            dateObj = new Date(`${parts[0]}-${parts[1]}-${parts[2]}T00:00:00`);
        } else {
            dateObj = new Date(dateInput); // Fallback
        }
    } else if (dateInput instanceof Timestamp) {
        dateObj = dateInput.toDate();
    } else if (dateInput instanceof Date) {
        dateObj = dateInput;
    } else {
        return 'Invalid Date Type';
    }

    if (isNaN(dateObj.getTime())) {
        return 'Invalid Date';
    }

    // Use Phnom Penh timezone for consistent date formatting
    try {
        const phnomPenhFormatter = new Intl.DateTimeFormat('en-CA', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            timeZone: 'Asia/Phnom_Penh'
        });
        
        const formatted = phnomPenhFormatter.format(dateObj); // This will produce YYYY-MM-DD
        const [year, month, day] = formatted.split('-');
        return `${day}-${month}-${year}`; // Convert to DD-MM-YYYY format
    } catch (error) {
        // Fallback to manual formatting if timezone fails
        const day = String(dateObj.getDate()).padStart(2, '0');
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const year = dateObj.getFullYear();
        return `${day}-${month}-${year}`;
    }
};
// Define an interface for your attendance records
export interface AttendanceRecord {
  id: string; // Firestore document ID
  studentName: string;
  studentId: string;
  class?: string;
  shift?: string;
  status: string; // e.g., "present"
  date: string;   // Your primary date field (likely "YYYY-MM-DD" string)
  timestamp?: Timestamp | Date; // The exact time of marking
  timeIn?: string; // 24-hour format time (HH:MM)
  method?: string; // e.g., "QR Code", "Manual", "Face Recognition"
  // Parent notification fields
  parentNotificationStatus?: 'success' | 'failed' | 'no_parent' | 'partial' | null;
  parentNotificationError?: string | null;
  parentNotificationTimestamp?: Timestamp | Date | null;
  parentNotificationsSent?: number;
}

// Interface for loading states
export interface LoadingRecord {
  id: string;
  isLoading: boolean;
  studentName?: string; // Optional for when we know the student name but still loading
}

export type Props = {
  records: AttendanceRecord[];
  onDeleteRecord: (record: AttendanceRecord, reason?: 'rejected' | 'deleted') => void;
  onApproveRecord: (record: AttendanceRecord) => void;
  onEditTimestamp?: (record: AttendanceRecord, newTimestamp: Date, newTimeIn: string) => Promise<void>; // Updated to include timeIn
  students?: Student[]; // Student data for class configs
  allClassConfigs?: AllClassConfigs | null; // Class configurations
  perPage?: number;
  loadingRecords?: LoadingRecord[]; // New prop for loading states
  isScanning?: boolean; // New prop to indicate when scanning is active
};


const TableAttendance = ({ records, onDeleteRecord, onApproveRecord, onEditTimestamp, students = [], allClassConfigs = null, perPage = 20, loadingRecords = [], isScanning = false }: Props) => {

  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  
  // State for timestamp edit modal
  const [isTimestampModalOpen, setIsTimestampModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecord | null>(null);

  // Function to copy student name to clipboard
  const copyStudentName = async (name: string) => {
    try {
      await navigator.clipboard.writeText(name);
      toast.success(`Copied "${name}" to clipboard!`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = name;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success(`Copied "${name}" to clipboard!`);
    }
  };

  // Function to handle opening timestamp edit modal
  const handleEditTimestamp = (record: AttendanceRecord) => {
    setSelectedRecord(record);
    setIsTimestampModalOpen(true);
  };

  // Function to get start time for a record based on class and shift
  const getStartTimeForRecord = (record: AttendanceRecord): string | null => {
    if (!allClassConfigs || !record.class || !record.shift) return null;
    
    // Extract class key by removing "Class " prefix
    const classKey = record.class.replace(/^Class\s+/i, '');
    const classConfig = allClassConfigs[classKey];
    
    if (!classConfig?.shifts) return null;
    
    const shiftConfig = classConfig.shifts[record.shift];
    return shiftConfig?.startTime || null;
  };

  // Function to calculate time difference in minutes between startTime and timeIn
  const calculateTimeDifference = (startTime: string, timeIn: string): number => {
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [timeInHour, timeInMinute] = timeIn.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMinute;
    const timeInMinutes = timeInHour * 60 + timeInMinute;
    
    return timeInMinutes - startMinutes;
  };

  // Check if any record has time difference > 90 minutes
  const hasLargeTimeDifference = records.some(record => {
    const startTime = getStartTimeForRecord(record);
    const timeIn = record.timeIn || (record.timestamp instanceof Timestamp
      ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : record.timestamp instanceof Date
      ? record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : null);
    
    if (!startTime || !timeIn) return false;
    
    const difference = Math.abs(calculateTimeDifference(startTime, timeIn));
    return difference > 90;
  });

  // Get records with large time differences for highlighting
  const recordsWithLargeDifferences = records.filter(record => {
    const startTime = getStartTimeForRecord(record);
    const timeIn = record.timeIn || (record.timestamp instanceof Timestamp
      ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : record.timestamp instanceof Date
      ? record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
      : null);
    
    if (!startTime || !timeIn) return false;
    
    const difference = Math.abs(calculateTimeDifference(startTime, timeIn));
    return difference > 90;
  });  // Function to find student data for the selected record
  const getStudentForRecord = (record: AttendanceRecord): Student | undefined => {
    return students.find(student => student.id === record.studentId);
  };

  // Function to handle saving edited timestamp
  const handleSaveTimestamp = async (newTimestamp: Date) => {
    if (!selectedRecord || !onEditTimestamp) {
      toast.error('Unable to save timestamp');
      return;
    }

    try {
      // Convert timestamp to 24-hour format for timeIn
      const newTimeIn = newTimestamp.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });
      
      await onEditTimestamp(selectedRecord, newTimestamp, newTimeIn);
      setIsTimestampModalOpen(false);
      setSelectedRecord(null);
    } catch (error) {
      console.error('Error saving timestamp:', error);
      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Determine a date to show in the table title. If multiple dates exist, show a summary.
  const uniqueDates = Array.from(new Set(records.map(r => r.date).filter(Boolean)));
  let tableDateDisplay = '';
  if (uniqueDates.length === 0) {
    tableDateDisplay = 'No date selected';
  } else if (uniqueDates.length === 1) {
    tableDateDisplay = formatDateToDDMMYYYY(uniqueDates[0]);
  } else {
    tableDateDisplay = `${uniqueDates.length} dates`;
  }

  // Filter records based on search term
  const filteredRecords = records.filter(record =>
    record.studentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort records to show large time differences at the top
  const sortedRecords = [...filteredRecords].sort((a, b) => {
    const aHasLargeDiff = recordsWithLargeDifferences.some(r => r.id === a.id);
    const bHasLargeDiff = recordsWithLargeDifferences.some(r => r.id === b.id);

    if (aHasLargeDiff && !bHasLargeDiff) return -1;
    if (!aHasLargeDiff && bHasLargeDiff) return 1;
    return 0; // Keep original order for records without large differences
  });

  const recordsPaginated = sortedRecords.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(sortedRecords.length / perPage);
  const pagesList: number[] = [];
  for (let i = 0; i < numPages; i++) {
    pagesList.push(i);
  }

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm]);

  // Helper function to render status badge with SVG
  const renderStatusBadge = (status: string) => {
    const styles = getStatusStyles(status, true);
    
    return (
      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${styles.badge}${status.toLowerCase() === 'requested' ? ' animate-pulse' : ''}`}>
        {styles.svg && (
          <svg 
            className="w-3 h-3 mr-1 mt-1" 
            fill={status.toLowerCase() === 'requested' ? "none" : "currentColor"} 
            stroke={status.toLowerCase() === 'requested' ? "currentColor" : "none"} 
            viewBox="0 0 22 22"
          >
            <path 
              fillRule={status.toLowerCase() === 'requested' ? undefined : "evenodd"} 
              clipRule={status.toLowerCase() === 'requested' ? undefined : "evenodd"}
              strokeLinecap={status.toLowerCase() === 'requested' ? "round" : undefined}
              strokeLinejoin={status.toLowerCase() === 'requested' ? "round" : undefined}
              strokeWidth={status.toLowerCase() === 'requested' ? 2 : undefined}
              d={styles.svg} 
            />
          </svg>
        )}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Shimmer loading effect component
  const ShimmerRow = ({ studentName }: { studentName?: string }) => (
    <tr className="loading-row border-l-4 border-blue-400 animate-slide-in-top">
      <td className="px-4 py-2 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm animate-pulse shadow-lg">
              {studentName ? studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
          </div>
          <div className="ml-4">
            {studentName ? (
              <div className="text-sm font-medium text-blue-700 dark:text-blue-300 animate-pulse">
                {studentName}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded w-32 animate-shimmer"></div>
                <div className="h-3 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded w-20 animate-shimmer"></div>
              </div>
            )}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
        <div className="h-6 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-full w-16 mx-auto animate-shimmer"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
        <div className="h-6 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-full w-16 mx-auto animate-shimmer"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
        <div className="h-6 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-full w-20 mx-auto animate-shimmer"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          <span className="text-sm text-blue-600 dark:text-blue-400 font-medium animate-pulse">Processing...</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
        <div className="flex items-center justify-center">
          <svg className="w-4 h-4 mr-2 text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="h-4 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded w-16 animate-shimmer"></div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
        <div className="h-6 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-full w-16 mx-auto animate-shimmer"></div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        <div className="h-8 w-8 bg-gradient-to-r from-blue-200 via-blue-300 to-blue-200 dark:from-blue-700 dark:via-blue-600 dark:to-blue-700 rounded-full mx-auto animate-shimmer"></div>
      </td>
    </tr>
  );

  // Warning Row Component
  const TimeDifferenceWarningRow = () => (
    <tr className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 animate-pulse">
      <td colSpan={8} className="px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              ⚠️ Large Time Differences Detected
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              {recordsWithLargeDifferences.length} record(s) have time differences greater than 90 minutes between scheduled start time and actual check-in time.
              This may indicate data entry errors or system timing issues.
            </p>
            <div className="mt-2 text-xs text-red-600 dark:text-red-400">
              Affected students: {recordsWithLargeDifferences.slice(0, 3).map(r => r.studentName).join(', ')}
              {recordsWithLargeDifferences.length > 3 && ` and ${recordsWithLargeDifferences.length - 3} more`}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );

  // Scanning indicator component
  const ScanningIndicator = () => (
    <div className="mb-4 flex items-center justify-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <div className="absolute inset-0 animate-ping rounded-full h-6 w-6 border border-blue-400 opacity-20"></div>
        </div>
        <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
          Scanning for student...
        </div>
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style jsx>{`
        @keyframes shimmer {
          0% { 
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% { 
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        @keyframes slideInFromTop {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes slideInFromRight {
          0% {
            opacity: 0;
            transform: translateX(20px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        
        @keyframes successGlow {
          0% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(34, 197, 94, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(34, 197, 94, 0);
          }
        }
        
        .animate-shimmer {
          position: relative;
          overflow: hidden;
        }
        
        .animate-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.6),
            transparent
          );
          animation: shimmer 2s infinite;
        }
        
        .dark .animate-shimmer::after {
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
        }
        
        .animate-slide-in-top {
          animation: slideInFromTop 0.5s ease-out;
        }
        
        .animate-slide-in-right {
          animation: slideInFromRight 0.5s ease-out;
        }
        
        .animate-success-glow {
          animation: successGlow 1s ease-out;
        }
        
        .loading-row {
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0.05),
            rgba(59, 130, 246, 0.1),
            rgba(59, 130, 246, 0.05)
          );
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        
        .dark .loading-row {
          background: linear-gradient(
            90deg,
            rgba(59, 130, 246, 0.1),
            rgba(59, 130, 246, 0.2),
            rgba(59, 130, 246, 0.1)
          );
          background-size: 200% 100%;
        }
      `}</style>
      
      {/* Scanning Indicator */}
      {isScanning && <ScanningIndicator />}

      {/* Search Filter (title moved to page header) */}
      <div className="mb-4 flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg 
              className="h-5 w-5 mt-4 ml-4 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search by student name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 mt-4 ml-4 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg 
                className="h-4 w-4 text-gray-400 hover:text-gray-600" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12" 
                />
              </svg>
            </button>
          )}
        </div>
        <div className="mr-4 flex items-center text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedRecords.length} of {records.length} records
          {recordsWithLargeDifferences.length > 0 && (
            <span className="ml-2 text-red-600 dark:text-red-400 font-medium">
              ({recordsWithLargeDifferences.length} with large time differences)
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Shift
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Method
              </th>
              {/* Date column removed - date displayed in the title */}
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Time
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Parent Notif
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {/* Loading rows - show at the top */}
            {loadingRecords.map((loadingRecord) => (
              <ShimmerRow 
                key={`loading-${loadingRecord.id}`} 
                studentName={loadingRecord.studentName}
              />
            ))}
            
            {/* Regular attendance records */}
            {recordsPaginated.map((record: AttendanceRecord, index) => {
              const hasLargeDiff = recordsWithLargeDifferences.some(r => r.id === record.id);
              return (
                <tr 
                  key={record.id} 
                  className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-300 animate-slide-in-right ${
                    record.status === 'requested' ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
                  } ${
                    hasLargeDiff ? 'bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500' : ''
                  }`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                <td className="px-4 py-2 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                        {record.studentName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div 
                        className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer hover:underline hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
                        onClick={() => copyStudentName(record.studentName)}
                        title="Click to copy student name"
                      >
                        {record.studentName}
                      </div>

                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                    {record.class || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                    record.shift?.toLowerCase() === 'morning' 
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                      : record.shift?.toLowerCase() === 'afternoon'
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700'
                      : record.shift?.toLowerCase() === 'evening'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {record.shift || 'N/A'}
                  </span>
                </td>

                <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                  {renderStatusBadge(record.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                  <div className="flex items-center justify-center">
                    {record.method?.toLowerCase() === 'qr-code' || record.method?.toLowerCase() === 'qr code' ? (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d={mdiQrcode} />
                        </svg>
                        <span className="text-xs font-medium">QR Code</span>
                      </div>
                    ) : record.method?.toLowerCase() === 'face-api' ? (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d={mdiFaceRecognition} />
                        </svg>
                        <span className="text-xs font-medium">Face</span>
                      </div>
                    ) : record.method?.toLowerCase() === 'manual' ? (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 border border-green-300 dark:border-green-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d={mdiGestureTap} />
                        </svg>
                        <span className="text-xs font-medium">Manual</span>
                      </div>
                    ) : record.method?.toLowerCase() === 'request' ? (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d={mdiBell} />
                        </svg>
                        <span className="text-xs font-medium">Request</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d={mdiHelpCircle} />
                        </svg>
                        <span className="text-xs font-medium">{record.method || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                </td>
                {/* Date cell removed - date displayed in the title */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-center align-middle">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-medium">
                        {record.timeIn || (record.timestamp instanceof Timestamp
                        ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                        : record.timestamp instanceof Date
                        ? record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                        : 'N/A')}
                      </span>
                    </div>
                    {/* Edit timestamp button - only show if onEditTimestamp is provided */}
                    {onEditTimestamp && (record.timestamp || record.timeIn) && (
                      <button
                        onClick={() => handleEditTimestamp(record)}
                        className="inline-flex items-center p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors duration-200 group"
                        title="Edit timestamp"
                      >
                        <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-200" fill="currentColor" viewBox="0 0 24 24">
                          <path d={mdiPencil} />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                  {/* Parent Notification Status */}
                  {record.parentNotificationStatus === 'success' ? (
                    <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" title={`Sent to ${record.parentNotificationsSent || 0} parent(s)`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                      <span className="text-xs font-medium">{record.parentNotificationsSent || 1}</span>
                    </div>
                  ) : record.parentNotificationStatus === 'no_parent' ? (
                    <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" title="No parent registered">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M12 9v2m0 4h.01"></path>
                      </svg>
                      <span className="text-xs">No Parent</span>
                    </div>
                  ) : record.parentNotificationStatus === 'failed' ? (
                    <div className="group relative inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 cursor-help" title={record.parentNotificationError || 'Failed to send notification'}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M18 6L6 18"></path>
                        <path d="M6 6l12 12"></path>
                      </svg>
                      <span className="text-xs font-medium">Failed</span>
                      {record.parentNotificationError && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-64 text-left">
                          <div className="font-semibold mb-1">Error Details:</div>
                          <div className="text-gray-200 dark:text-gray-300 break-words">{record.parentNotificationError}</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : record.parentNotificationStatus === 'partial' ? (
                    <div className="group relative inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 cursor-help" title={record.parentNotificationError || 'Some notifications failed'}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                      </svg>
                      <span className="text-xs font-medium">{record.parentNotificationsSent || 0}/{(record.parentNotificationsSent || 0) + 1}</span>
                      {record.parentNotificationError && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 w-64 text-left">
                          <div className="font-semibold mb-1">Partial Failure:</div>
                          <div className="text-gray-200 dark:text-gray-300 break-words">{record.parentNotificationError}</div>
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                            <div className="border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500" title="Notification status unknown">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <path d="M12 17h.01"></path>
                      </svg>
                      <span className="text-xs">N/A</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {record.status === 'requested' ? (
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => onApproveRecord(record)}
                        className="inline-flex items-center p-2 rounded-full bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-800/50 transition-colors duration-200"
                        title="Approve"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDeleteRecord(record, 'rejected')}
                        className="inline-flex items-center p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/50 transition-colors duration-200"
                        title="Reject"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onDeleteRecord(record, 'deleted')}
                      className="inline-flex items-center p-2 rounded-full bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-800/50 transition-colors duration-200"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* No results message */}
        {sortedRecords.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No students found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No attendance records match your search for "{searchTerm}".
            </p>
          </div>
        )}
        
        {filteredRecords.length === 0 && !searchTerm && records.length === 0 && (
          <div className="text-center py-12">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" 
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No attendance records</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No attendance records found for the selected date.
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {numPages > 1 && (
        <div className="bg-white dark:bg-gray-900 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  currentPage === 0 
                    ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' 
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(numPages - 1, currentPage + 1))}
                disabled={currentPage === numPages - 1}
                className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md ${
                  currentPage === numPages - 1 
                    ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' 
                    : 'text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{' '}
                  <span className="font-medium">{currentPage * perPage + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min((currentPage + 1) * perPage, records.length)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{records.length}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                      currentPage === 0 
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' 
                        : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                  
                  {Array.from({ length: Math.min(5, numPages) }, (_, i) => {
                    let pageNum = i;
                    if (numPages > 5) {
                      if (currentPage <= 2) {
                        pageNum = i;
                      } else if (currentPage >= numPages - 3) {
                        pageNum = numPages - 5 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-blue-600 border-blue-600 text-white'
                            : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum + 1}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(numPages - 1, currentPage + 1))}
                    disabled={currentPage === numPages - 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 text-sm font-medium ${
                      currentPage === numPages - 1 
                        ? 'text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 cursor-not-allowed' 
                        : 'text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timestamp Edit Modal */}
      {isTimestampModalOpen && selectedRecord && (
        <TimestampEditModal
          isOpen={isTimestampModalOpen}
          onClose={() => {
            setIsTimestampModalOpen(false);
            setSelectedRecord(null);
          }}
          onSave={handleSaveTimestamp}
          currentTimestamp={selectedRecord.timestamp || null}
          studentName={selectedRecord.studentName}
          recordId={selectedRecord.id}
          currentStatus={selectedRecord.status}
          student={getStudentForRecord(selectedRecord)}
          allClassConfigs={allClassConfigs}
          currentTimeIn={selectedRecord.timeIn}
        />
      )}
    </>
  );
};

export default TableAttendance;