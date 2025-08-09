import React, { useState, useEffect } from 'react';
import { Student } from '../../../_interfaces';
import DailyStatusDetailsModal from '../../_components/DailyStatusDetailsModal';
import { Timestamp, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebase-config';
import { RawAttendanceRecord } from '../../_lib/attendanceLogic';
import { PermissionRecord } from '../../../_interfaces';
import { AllClassConfigs } from '../../_lib/configForAttendanceLogic';
import { toast } from 'sonner';

// Utility function to convert Google Drive share URL to thumbnail URL
const getDisplayableImageUrl = (url: string): string | null => {
  if (!url || typeof url !== 'string') {
    return null;
  }

  if (url.includes("drive.google.com")) {
    // Regex to find the file ID from various Google Drive URL formats
    // Handles /file/d/FILE_ID/, open?id=FILE_ID, and id=FILE_ID
    const regex = /(?:drive\.google\.com\/(?:file\/d\/([a-zA-Z0-9_-]+)|.*[?&]id=([a-zA-Z0-9_-]+)))/;
    const match = url.match(regex);
    
    if (match) {
      // The file ID could be in either capture group
      const fileId = match[1] || match[2];
      if (fileId) {
        // Return the preview URL for iframe embedding (same as AddStudentForm)
        const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;
        return previewUrl;
      }
    }
  }
  
  // If it's not a Google Drive link or no ID was found, return it as is
  return url;
};

interface StudentDetailsModalProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
  // Navigation props
  students?: Student[]; // List of students in the same class/context
  currentIndex?: number; // Current student index in the list
  onNavigate?: (student: Student, index: number) => void; // Navigation callback
  onBreak?: () => void; // Callback for when a student is put on break
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  student,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  students = [],
  currentIndex = -1,
  onNavigate,
  onBreak,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [expectedReturnMonth, setExpectedReturnMonth] = useState('');
  const [breakReason, setBreakReason] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  
  // Monthly attendance state
  const [attendanceRecords, setAttendanceRecords] = useState<RawAttendanceRecord[]>([]);
  const [approvedPermissions, setApprovedPermissions] = useState<PermissionRecord[]>([]);
  const [allClassConfigs, setAllClassConfigs] = useState<AllClassConfigs>({});
  const [isLoadingAttendance, setIsLoadingAttendance] = useState(true);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);

  // Navigation logic
  const canNavigatePrev = students.length > 1 && currentIndex > 0;
  const canNavigateNext = students.length > 1 && currentIndex < students.length - 1;

  const handleNavigatePrev = () => {
    if (canNavigatePrev && onNavigate && !isTransitioning && !showBreakConfirm) {
      setSlideDirection('left');
      setIsTransitioning(true);
      const prevIndex = currentIndex - 1;
      const prevStudent = students[prevIndex];
      setTimeout(() => {
        onNavigate(prevStudent, prevIndex);
        setTimeout(() => {
          setIsTransitioning(false);
          setSlideDirection(null);
        }, 50);
      }, 150);
    }
  };

  const handleNavigateNext = () => {
    if (canNavigateNext && onNavigate && !isTransitioning && !showBreakConfirm) {
      setSlideDirection('right');
      setIsTransitioning(true);
      const nextIndex = currentIndex + 1;
      const nextStudent = students[nextIndex];
      setTimeout(() => {
        onNavigate(nextStudent, nextIndex);
        setTimeout(() => {
          setIsTransitioning(false);
          setSlideDirection(null);
        }, 50);
      }, 150);
    }
  };

  // Fetch monthly attendance data
  const fetchAttendanceData = async (studentId: string) => {
    setIsLoadingAttendance(true);
    try {
      // Get current month
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Create start and end dates for the current month
      const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
      const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
      
      // Fetch attendance records
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', studentId),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendanceData: RawAttendanceRecord[] = [];
      attendanceSnapshot.forEach((doc) => {
        const data = doc.data();
        attendanceData.push({
          id: doc.id,
          studentId: data.studentId,
          date: data.date,
          status: data.status,
          timestamp: data.timestamp,
          // Add other fields as needed
        });
      });
      
      // Fetch all class configs from 'classes' collection
      const classConfigSnapshot = await getDocs(collection(db, 'classes'));
      
      const classConfigsData: AllClassConfigs = {};
      classConfigSnapshot.docs.forEach(doc => {
        const data = doc.data();

        if (data.shifts) { // Only add if shifts property exists
          classConfigsData[doc.id] = data as any;
        }
      });

      // Fetch permissions (simplified for now - you can adjust based on your actual data structure)
      const permissionsData: PermissionRecord[] = []; // Start with empty array for now
      
      setAttendanceRecords(attendanceData);
      setApprovedPermissions(permissionsData);
      setAllClassConfigs(classConfigsData);
  
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setAttendanceRecords([]);
      setApprovedPermissions([]);
      setAllClassConfigs({});
    } finally {
      setIsLoadingAttendance(false);
    }
  };

  // Fetch attendance when student changes
  useEffect(() => {
    if (student?.id && isOpen) {
      fetchAttendanceData(student.id);
    }
  }, [student?.id, isOpen]);

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      // If attendance modal or break confirmation modal is open, don't handle ESC here - let them close first
      if (showAttendanceModal && event.key === 'Escape') {
        event.preventDefault();
        setShowAttendanceModal(false);
        return;
      }
      
      if (showBreakConfirm && event.key === 'Escape') {
        event.preventDefault();
        cancelBreak();
        return;
      }
      
      // Disable arrow navigation when break confirmation modal is open
      if (showBreakConfirm) {
        return;
      }
      
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleNavigatePrev();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNavigateNext();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'Home' && students.length > 1) {
        event.preventDefault();
        if (onNavigate && currentIndex > 0 && !isTransitioning) {
          setSlideDirection('left');
          setIsTransitioning(true);
          setTimeout(() => {
            onNavigate(students[0], 0);
            setTimeout(() => {
              setIsTransitioning(false);
              setSlideDirection(null);
            }, 50);
          }, 150);
        }
      } else if (event.key === 'End' && students.length > 1) {
        event.preventDefault();
        if (onNavigate && currentIndex < students.length - 1 && !isTransitioning) {
          setSlideDirection('right');
          setIsTransitioning(true);
          const lastIndex = students.length - 1;
          setTimeout(() => {
            onNavigate(students[lastIndex], lastIndex);
            setTimeout(() => {
              setIsTransitioning(false);
              setSlideDirection(null);
            }, 50);
          }, 150);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, canNavigatePrev, canNavigateNext, isTransitioning, currentIndex, students, onNavigate, showAttendanceModal, showBreakConfirm]);

  if (!isOpen || !student) return null;

  const formatPhoneNumber = (phone: string | undefined | null): string => {
    if (!phone) return 'N/A';
    const cleaned = ('' + phone).replace(/\D/g, '');

    let digits = cleaned;
    // Standardize to 10 digits if it's a 9-digit number missing the leading 0
    if (digits.length === 9 && !digits.startsWith('0')) {
      digits = '0' + digits;
    }
    
    // Format 10-digit numbers (0XX-XXX-XXXX)
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }

    // Format 9-digit numbers (0XX-XXX-XXX)
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
    }
    
    return phone; // Return original if it doesn't match formats
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    setShowDeleteConfirm(false);
    onDelete(student);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  // Break functionality handlers
  const handleBreakClick = () => {
    // Set default expected return month to next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const defaultReturnMonth = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`;
    setExpectedReturnMonth(defaultReturnMonth);
    setBreakReason('');
    setShowBreakConfirm(true);
  };

  const confirmBreak = async () => {
    if (!expectedReturnMonth.trim()) {
      toast.error('Please select expected return month');
      return;
    }

    try {
      const studentRef = doc(db, 'students', student.id);
      await updateDoc(studentRef, {
        onBreak: true,
        breakStartDate: Timestamp.now(),
        expectedReturnMonth: expectedReturnMonth.trim(),
        breakReason: breakReason.trim() || 'Not specified'
      });

      toast.success(`${student.fullName} has been marked as on break`);
      setShowBreakConfirm(false);
      setExpectedReturnMonth('');
      setBreakReason('');
      
      // Call the onBreak callback to refresh data
      if (onBreak) {
        onBreak();
      }
      
      onClose(); // Close modal after successful break
    } catch (error) {
      toast.error('Failed to mark student as on break. Please try again.');
      console.error('Break error:', error);
    }
  };

  const cancelBreak = () => {
    setShowBreakConfirm(false);
    setExpectedReturnMonth('');
    setBreakReason('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 transition-opacity"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        <div className={`relative transform rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all duration-200 sm:my-8 sm:w-full sm:max-w-4xl ${
          isTransitioning 
            ? slideDirection === 'left' 
              ? 'translate-x-4 opacity-80' 
              : slideDirection === 'right'
              ? '-translate-x-4 opacity-80'
              : 'scale-95 opacity-75'
            : 'translate-x-0 scale-100 opacity-100'
        }`} style={{ transform: isTransitioning && slideDirection ? `translateX(${slideDirection === 'left' ? '8px' : '-8px'}) scale(0.98)` : undefined }}>
          {/* Header with Navigation */}
          <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4 rounded-t-lg">
            <div className="flex items-center justify-between mb-4">
              {/* Left Arrow */}
              <div className="relative group">
                <button
                  onClick={handleNavigatePrev}
                  disabled={!canNavigatePrev || isTransitioning || showBreakConfirm}
                  className={`p-3 rounded-full transition-all duration-200 transform ${
                    canNavigatePrev && !isTransitioning && !showBreakConfirm
                      ? 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  title={canNavigatePrev && !showBreakConfirm ? 'Previous student (←)' : 'Navigation disabled'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Hover preview for previous student */}
                {canNavigatePrev && students[currentIndex - 1] && !showBreakConfirm && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45"></div>
                    {students[currentIndex - 1].fullName}
                  </div>
                )}
              </div>

              {/* Title with Student Counter */}
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Student Details
                </h3>
                {students.length > 1 && (
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {currentIndex + 1} of {students.length} in {student.class} - {student.shift}
                    </p>
                    {/* Progress dots */}
                    <div className="flex space-x-1">
                      {students.slice(Math.max(0, currentIndex - 2), Math.min(students.length, currentIndex + 3)).map((_, idx) => {
                        const actualIndex = Math.max(0, currentIndex - 2) + idx;
                        return (
                          <div
                            key={actualIndex}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                              actualIndex === currentIndex
                                ? 'bg-blue-500 scale-125'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          />
                        );
                      })}
                    </div>
                    {/* Loading indicator during transition */}
                    {isTransitioning && (
                      <div className="flex items-center ml-2">
                        <div className="w-3 h-3 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Arrow */}
              <div className="relative group">
                <button
                  onClick={handleNavigateNext}
                  disabled={!canNavigateNext || isTransitioning || showBreakConfirm}
                  className={`p-3 rounded-full transition-all duration-200 transform ${
                    canNavigateNext && !isTransitioning && !showBreakConfirm
                      ? 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  title={canNavigateNext && !showBreakConfirm ? 'Next student (→)' : 'Navigation disabled'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {/* Hover preview for next student */}
                {canNavigateNext && students[currentIndex + 1] && !showBreakConfirm && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-100 rotate-45"></div>
                    {students[currentIndex + 1].fullName}
                  </div>
                )}
              </div>
            </div>

            {/* Close button moved to absolute position */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-md bg-white dark:bg-slate-700 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 z-10"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Content */}
            <div className={`flex flex-col sm:flex-row gap-6 transition-all duration-200 ${
              isTransitioning 
                ? slideDirection === 'left'
                  ? 'transform translate-x-2 opacity-70'
                  : slideDirection === 'right'
                  ? 'transform -translate-x-2 opacity-70'
                  : 'opacity-50'
                : 'transform translate-x-0 opacity-100'
            }`}>
              {/* Student Photo and Academic Info */}
              <div className="flex-shrink-0">
                {/* Status Badges - Moved above photo */}
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-4">
                  {/* On Break Badge */}
                  {student.onBreak && (
                    <div className="group relative">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800 cursor-help">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        On Break
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                        Expected return: {student.expectedReturnMonth ? (() => {
                          const [year, month] = student.expectedReturnMonth.split('-');
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return `${monthNames[parseInt(month) - 1]} ${year}`;
                        })() : 'Not specified'}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  )}

                  {/* Warning Badge */}
                  {student.warning && (
                    <div className="group relative">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 cursor-help">
                        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Warning
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                        Requires close monitoring
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  )}

                  {/* Scholarship Badge */}
                  {student.discount > 0 && (
                    <div className="group relative">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800 cursor-help">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                        Scholarship
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                        Scholarship Amount: ${student.discount.toFixed(2)}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  )}

                  {/* Last Payment Badge */}
                  {student.lastPaymentMonth && (
                    <div className="group relative">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 cursor-help">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {(() => {
                          const [year, month] = student.lastPaymentMonth.split('-');
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          return `${monthNames[parseInt(month) - 1]} ${year}`;
                        })()}
                      </span>
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                        Last Payment Month: {(() => {
                          const [year, month] = student.lastPaymentMonth.split('-');
                          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
                          return `${monthNames[parseInt(month) - 1]} ${year}`;
                        })()}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Student Photo */}
                <div className="w-58 h-58 rounded-lg overflow-hidden bg-gray-200 dark:bg-slate-600 mx-auto sm:mx-0 mb-4">
                  {student.photoUrl ? (
                    student.photoUrl.includes("drive.google.com") ? (
                      <iframe
                        src={getDisplayableImageUrl(student.photoUrl) || ''}
                        className="w-full h-full border-none"
                        title={`${student.fullName} photo`}
                        frameBorder="0"
                      />
                    ) : (
                      <img
                        src={getDisplayableImageUrl(student.photoUrl) || ''}
                        alt={student.fullName}
                        className="w-full h-full object-cover"
                        onLoad={(e) => {
                          console.log('Modal image loaded successfully:', e.currentTarget.src);
                          console.log('Original photoUrl was:', student.photoUrl);
                        }}
                        onError={(e) => {
                          console.error('Modal image failed to load:', e.currentTarget.src);
                          console.error('Original URL:', student.photoUrl);
                          console.error('Trying alternative approach...');
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const fallback = target.nextElementSibling as HTMLElement;
                          if (fallback) {
                            fallback.classList.remove('hidden');
                          }
                        }}
                      />
                    )
                  ) : null}
                  <div className={`w-full h-full flex items-center justify-center ${student.photoUrl ? 'hidden' : ''}`}>
                    <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </div>

                {/* Monthly Attendance Table */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    This Month's Attendance
                  </h4>
                  
                  {isLoadingAttendance ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading attendance...</span>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-slate-700 rounded-lg border border-gray-200 dark:border-slate-600 overflow-hidden">
                      <div className="px-2 py-2 text-start">
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => setShowAttendanceModal(true)}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m6 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7h16zM9 11h6m-6 4h6" />
                            </svg>
                            View Attendance
                          </button>
                          
                          <button
                            onClick={() => {
                              const baseUrl = window.location.origin;
                              const permissionUrl = `${baseUrl}/permission-request?studentId=${encodeURIComponent(student.id)}&studentName=${encodeURIComponent(student.fullName)}`;
                              navigator.clipboard.writeText(permissionUrl).then(() => {
                                toast.success('Permission link copied to clipboard!');
                              }).catch(() => {
                                // Fallback: show the URL in a modal or alert
                                alert(`Permission URL: ${permissionUrl}`);
                              });
                            }}
                            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-colors duration-200"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            Copy Permission Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Academic Information */}
                <div className="space-y-3">
                  {/* <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Academic Information</h4>
                  {student.ay && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Academic Year</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.ay}</p>
                    </div>
                  )}
                  {student.school && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">School</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.school}</p>
                    </div>
                  )} */}
                </div>
              </div>

              {/* Student Information */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Latin Name</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.fullName}</p>
                  </div>
                  {student.nameKhmer && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Khmer Name</label>
                      <p className="khmer-font mt-1 text-sm text-gray-900 dark:text-gray-100">{student.nameKhmer}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Class</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.class}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Shift</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.shift}</p>
                  </div>
                  {student.scheduleType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Schedule Type</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.scheduleType}</p>
                    </div>
                  )}
                </div>

                {/* Contact Information */}
                <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Contact Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {student.phone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatPhoneNumber(student.phone)}</p>
                      </div>
                    )}
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400"></label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100"></p>
                      </div>
                
                    {student.motherName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Mother's Name</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.motherName}</p>
                      </div>
                    )}
                    {student.motherPhone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Mother's Phone</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatPhoneNumber(student.motherPhone)}</p>
                      </div>
                    )}
                    {student.fatherName && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Father's Name</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.fatherName}</p>
                      </div>
                    )}
                    {student.fatherPhone && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Father's Phone</label>
                        <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{formatPhoneNumber(student.fatherPhone)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Note Section - Only show if note exists */}
                {student.note && (
                  <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Admin Note</h4>
                    <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3">
                      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{student.note}</p>
                    </div>
                  </div>
                )}

                {/* Break Information Section - Only show if student is on break */}
                {student.onBreak && (
                  <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Break Information
                    </h4>
                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                      <div className="grid grid-cols-1 gap-2">
                        {student.expectedReturnMonth && (
                          <div>
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Expected Return:</span>
                            <span className="ml-2 text-sm text-orange-900 dark:text-orange-100">
                              {(() => {
                                const [year, month] = student.expectedReturnMonth.split('-');
                                const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                                return `${monthNames[parseInt(month) - 1]} ${year}`;
                              })()}
                            </span>
                          </div>
                        )}
                        {student.breakReason && (
                          <div>
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Reason:</span>
                            <span className="ml-2 text-sm text-orange-900 dark:text-orange-100">{student.breakReason}</span>
                          </div>
                        )}
                        {student.breakStartDate && (
                          <div>
                            <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Break Started:</span>
                            <span className="ml-2 text-sm text-orange-900 dark:text-orange-100">
                              {(() => {
                                const date = student.breakStartDate;
                                if (date && typeof date === 'object' && 'toDate' in date) {
                                  return new Date(date.toDate()).toLocaleDateString();
                                }
                                return new Date(date as Date).toLocaleDateString();
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:flex sm:justify-between sm:px-6 gap-3 rounded-b-lg">
            {/* Delete and Break buttons on the left */}
            <div className="flex gap-3">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
                onClick={handleDeleteClick}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Drop
              </button>
              
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:w-auto"
                onClick={handleBreakClick}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Break
              </button>
            </div>

            {/* Edit and Close buttons on the right */}
            <div className="flex gap-3 sm:flex-row-reverse">
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 sm:mt-0 sm:w-auto"
                onClick={onClose}
              >
                Close
              </button>
              <button
                type="button"
                className="inline-flex w-full justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
                onClick={() => onEdit(student)}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
            onClick={cancelDelete}
          ></div>
          
          {/* Confirmation Modal */}
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                      Delete Student
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to drop <span className="font-semibold text-gray-900 dark:text-gray-100">{student.fullName}</span>? 
                        This action cannot be undone and will permanently remove all student data.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:ml-3 sm:w-auto"
                  onClick={confirmDelete}
                >
                  Drop
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 sm:mt-0 sm:w-auto"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Break Confirmation Modal */}
      {showBreakConfirm && (
        <div className="fixed inset-0 z-60 overflow-y-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 transition-opacity"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
            onClick={cancelBreak}
          ></div>
          
          {/* Confirmation Modal */}
          <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
              <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30 sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                    <h3 className="text-base font-semibold leading-6 text-gray-900 dark:text-gray-100">
                      Put Student on Break
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{student.fullName}</span> will be marked as on break. 
                        They can rejoin when ready.
                      </p>
                      
                      {/* Expected Return Month Input */}
                      <div className="mb-4">
                        <label htmlFor="expectedReturnMonth" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Expected Return Month <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="month"
                          id="expectedReturnMonth"
                          value={expectedReturnMonth}
                          onChange={(e) => setExpectedReturnMonth(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-slate-700 dark:text-gray-100"
                          min={new Date().toISOString().slice(0, 7)} // Current month as minimum
                        />
                      </div>
                      
                      {/* Break Reason Input */}
                      <div className="mb-4">
                        <label htmlFor="breakReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Reason (Optional)
                        </label>
                        <textarea
                          id="breakReason"
                          value={breakReason}
                          onChange={(e) => setBreakReason(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 dark:bg-slate-700 dark:text-gray-100 resize-none"
                          placeholder="Enter reason for break (optional)..."
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6 gap-3">
                <button
                  type="button"
                  className="inline-flex w-full justify-center rounded-md bg-orange-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 sm:ml-3 sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={confirmBreak}
                  disabled={!expectedReturnMonth.trim()}
                >
                  Put on Break
                </button>
                <button
                  type="button"
                  className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-slate-600 px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-500 hover:bg-gray-50 dark:hover:bg-slate-500 sm:mt-0 sm:w-auto"
                  onClick={cancelBreak}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Status Details Modal */}
      {showAttendanceModal && (
        <DailyStatusDetailsModal
          student={student}
          attendanceRecords={attendanceRecords}
          allClassConfigs={allClassConfigs}
          approvedPermissions={approvedPermissions}
          isActive={showAttendanceModal}
          onClose={() => setShowAttendanceModal(false)}
        />
      )}
    </div>
  );
};
