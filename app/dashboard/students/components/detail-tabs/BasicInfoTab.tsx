import React from 'react';
import { Student } from '../../../../_interfaces';

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

// Helper function to format phone numbers
const formatPhoneNumber = (phone: string): string => {
  if (!phone) return '';
  
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's a Cambodian number (starts with 855)
  if (digits.startsWith('855')) {
    if (digits.length === 12) {
      // Format: +855 xx xxx xxx
      return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
    }
  }
  
  // If it's a local number (starts with 0)
  if (digits.startsWith('0') && digits.length === 10) {
    // Format: 0xx xxx xxx
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  
  // Return original if no pattern matches
  return phone;
};

interface BasicInfoTabProps {
  student: Student;
  showPhotoInContainer: boolean;
  setShowPhotoInContainer: (show: boolean) => void;
  isTransitioning: boolean;
  slideDirection: 'left' | 'right' | null;
}

export const BasicInfoTab: React.FC<BasicInfoTabProps> = ({
  student,
  showPhotoInContainer,
  setShowPhotoInContainer,
  isTransitioning,
  slideDirection,
}) => {
  return (
    <div className={`flex flex-col sm:flex-row gap-6 transition-all duration-200 ${
      isTransitioning 
        ? slideDirection === 'left'
          ? 'transform translate-x-2 opacity-70'
          : slideDirection === 'right'
          ? 'transform -translate-x-2 opacity-70'
          : 'opacity-50'
        : 'transform translate-x-0 opacity-100'
    }`}>
      {/* Student Photo and Status Badges */}
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

          {/* Face Enrollment Status Badge - Only show when not enrolled */}
          {!student.faceDescriptor && (
            <div className="group relative">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 cursor-help">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Face Not Enrolled
              </span>
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-[9999]">
                Face recognition not enrolled
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
              </div>
            </div>
          )}
        </div>

        {/* Student Photo */}
        <div className="relative group">
          <div className="w-58 h-58 rounded-xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700 dark:to-slate-800 mx-auto sm:mx-0 mb-4 shadow-lg border-2 border-gray-200 dark:border-slate-600 transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            {student.photoUrl ? (
              showPhotoInContainer ? (
                /* Show Actual Photo */
                <div className="relative w-full h-full">
                  {student.photoUrl.includes("drive.google.com") ? (
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
                    />
                  )}
                  
                  {/* Close button overlay */}
                  <div className="absolute top-2 left-2">
                    <button
                      onClick={() => setShowPhotoInContainer(false)}
                      className="p-1.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all duration-200 backdrop-blur-sm"
                      title="Hide photo (ESC)"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ) : (
                /* Photo Available - Show placeholder with Open button */
                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
                  <div className="flex flex-col items-center space-y-4 p-6 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Photo Available</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Click below to view student photo</p>
                    </div>
                    <button
                      onClick={() => setShowPhotoInContainer(true)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <span>Open Photo</span>
                    </button>
                  </div>
                </div>
              )
            ) : (
              /* No Photo State */
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 border-2 border-dashed border-gray-300 dark:border-slate-600">
                <div className="flex flex-col items-center space-y-4 p-6 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 dark:from-gray-600 dark:to-gray-700 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No Photo Available</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Student photo not uploaded yet</p>
                  </div>
                  <div className="w-12 h-1 bg-gradient-to-r from-gray-300 via-gray-400 to-gray-300 dark:from-gray-600 dark:via-gray-500 dark:to-gray-600 rounded-full"></div>
                </div>
              </div>
            )}
          </div>
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
          {student.createdAt && (
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Enrollment Date</label>
              <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                {(() => {
                  const date = student.createdAt;
                  if (date && typeof date === 'object' && 'toDate' in date) {
                    return new Date(date.toDate()).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                  }
                  return new Date(date as Date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  });
                })()}
              </p>
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
  );
};

export default BasicInfoTab;
