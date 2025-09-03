"use client";

import React, { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { getStatusStyles } from "../_lib/statusStyles";
import { toast } from 'sonner';

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
}

type Props = {
  records: AttendanceRecord[];
  onDeleteRecord: (record: AttendanceRecord, reason?: 'rejected' | 'deleted') => void;
  onApproveRecord: (record: AttendanceRecord) => void;
  perPage?: number;
};


const TableAttendance = ({ records, onDeleteRecord, onApproveRecord, perPage = 20 }: Props) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

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

  const recordsPaginated = filteredRecords.slice(
    perPage * currentPage,
    perPage * (currentPage + 1)
  );

  const numPages = Math.ceil(filteredRecords.length / perPage);
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

  return (
    <>
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
          Showing {filteredRecords.length} of {records.length} records
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Student Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Class
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Shift
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              {/* Date column removed - date displayed in the title */}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <div className="flex items-center">
                  Time
                  <span title="Ordered by time" className="ml-1 text-xs text-gray-400 dark:text-gray-500">▼</span>
                </div>
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {recordsPaginated.map((record: AttendanceRecord, index) => (
              <tr key={record.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200 ${
                record.status === 'requested' ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''
              }`}>
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
                      ? 'dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 borde'
                      : record.shift?.toLowerCase() === 'afternoon'
                      ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                      : record.shift?.toLowerCase() === 'evening'
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {record.shift || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center align-middle">
                  {renderStatusBadge(record.status)}
                </td>
                {/* Date cell removed - date displayed in the title */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100 text-center align-middle">
                  <div className="flex items-center justify-center">
                    <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">
                      {record.timestamp instanceof Timestamp
                      ? record.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : record.timestamp instanceof Date
                      ? record.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : 'N/A'}
                    </span>
                  </div>
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
            ))}
          </tbody>
        </table>
        
        {/* No results message */}
        {filteredRecords.length === 0 && searchTerm && (
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
    </>
  );
};

export default TableAttendance;