import React, { useState } from 'react';
import { Student } from '../../../_interfaces';

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
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);

  // Navigation logic
  const canNavigatePrev = students.length > 1 && currentIndex > 0;
  const canNavigateNext = students.length > 1 && currentIndex < students.length - 1;

  const handleNavigatePrev = () => {
    if (canNavigatePrev && onNavigate && !isTransitioning) {
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
    if (canNavigateNext && onNavigate && !isTransitioning) {
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

  // Handle keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
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
  }, [isOpen, canNavigatePrev, canNavigateNext, isTransitioning, currentIndex, students, onNavigate]);

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
        <div className={`relative transform overflow-hidden rounded-lg bg-white dark:bg-slate-800 text-left shadow-xl transition-all duration-200 sm:my-8 sm:w-full sm:max-w-2xl ${
          isTransitioning 
            ? slideDirection === 'left' 
              ? 'translate-x-4 opacity-80' 
              : slideDirection === 'right'
              ? '-translate-x-4 opacity-80'
              : 'scale-95 opacity-75'
            : 'translate-x-0 scale-100 opacity-100'
        }`} style={{ transform: isTransitioning && slideDirection ? `translateX(${slideDirection === 'left' ? '8px' : '-8px'}) scale(0.98)` : undefined }}>
          {/* Header with Navigation */}
          <div className="bg-white dark:bg-slate-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              {/* Left Arrow */}
              <div className="relative group">
                <button
                  onClick={handleNavigatePrev}
                  disabled={!canNavigatePrev || isTransitioning}
                  className={`p-3 rounded-full transition-all duration-200 transform ${
                    canNavigatePrev && !isTransitioning
                      ? 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  title={canNavigatePrev ? 'Previous student (←)' : 'No previous student'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                
                {/* Hover preview for previous student */}
                {canNavigatePrev && students[currentIndex - 1] && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
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
                  disabled={!canNavigateNext || isTransitioning}
                  className={`p-3 rounded-full transition-all duration-200 transform ${
                    canNavigateNext && !isTransitioning
                      ? 'text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 hover:scale-110 active:scale-95'
                      : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  title={canNavigateNext ? 'Next student (→)' : 'No next student'}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                
                {/* Hover preview for next student */}
                {canNavigateNext && students[currentIndex + 1] && (
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
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

                {/* Academic Information */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Academic Information</h4>
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
                  )}
                  {student.lastPaymentMonth && (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Last Payment Month</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                        {(() => {
                          const [year, month] = student.lastPaymentMonth.split('-');
                          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                            'July', 'August', 'September', 'October', 'November', 'December'];
                          return `${monthNames[parseInt(month) - 1]} ${year}`;
                        })()}
                      </p>
                    </div>
                  )}
                  {student.discount > 0 ? ( // Condition now explicitly yields true or false
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400">Scholarship Amount</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">${student.discount.toFixed(2)}</p>
                    </div>
                  ) : null} {/* If student.discount is 0 or less, render null (which means nothing) */}
                </div>
              </div>

              {/* Student Information */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.fullName}</p>
                  </div>
                  {student.nameKhmer && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Khmer Name</label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">{student.nameKhmer}</p>
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

                {/* Warning Section - Only show if warning is true */}
                {student.warning && (
                  <div className="border-t border-gray-200 dark:border-slate-600 pt-4">
                    <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-3 flex items-center">
                      <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Student Requires Special Attention
                    </h4>
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                        ⚠️ This student has been flagged for special attention or close monitoring
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-slate-700 px-4 py-3 sm:flex sm:justify-between sm:px-6 gap-3">
            {/* Delete button on the left */}
            <button
              type="button"
              className="inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:w-auto"
              onClick={handleDeleteClick}
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>

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
                        Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">{student.fullName}</span>? 
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
                  Delete
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
    </div>
  );
};
