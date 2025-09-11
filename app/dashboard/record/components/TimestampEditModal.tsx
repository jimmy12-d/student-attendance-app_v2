"use client";

import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { 
  mdiCalendarClock,
  mdiCheck,
  mdiClockAlert,
  mdiClockCheck
} from '@mdi/js';
import { Student } from '../../../_interfaces';
import { AllClassConfigs, STANDARD_ON_TIME_GRACE_MINUTES } from '../../_lib/configForAttendanceLogic';
import { getStudentDailyStatus, RawAttendanceRecord } from '../../_lib/attendanceLogic';

interface TimestampEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (newTimestamp: Date) => Promise<void>;
  currentTimestamp: Timestamp | Date | null;
  studentName: string;
  recordId: string;
  currentStatus: string;
  student?: Student;
  allClassConfigs?: AllClassConfigs | null;
  currentTimeIn?: string; // Add timeIn prop
}

export const TimestampEditModal: React.FC<TimestampEditModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentTimestamp,
  studentName,
  recordId,
  currentStatus,
  student,
  allClassConfigs,
  currentTimeIn
}) => {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<'present' | 'late'>('present');

  // Initialize form with current timestamp or timeIn
  useEffect(() => {
    if (isOpen) {
      let date: Date;
      
      // If we have currentTimeIn, use it to set the time
      if (currentTimeIn && currentTimestamp) {
        // Use the timestamp for the date and currentTimeIn for the time
        date = currentTimestamp instanceof Timestamp 
          ? currentTimestamp.toDate() 
          : currentTimestamp instanceof Date 
          ? currentTimestamp 
          : new Date();
      } else if (currentTimestamp) {
        // Fallback to timestamp only
        date = currentTimestamp instanceof Timestamp 
          ? currentTimestamp.toDate() 
          : currentTimestamp instanceof Date 
          ? currentTimestamp 
          : new Date();
      } else {
        // Default to current time
        date = new Date();
      }
      
      // Format date for input (YYYY-MM-DD) - but we won't allow changing it
      const dateStr = date.toISOString().split('T')[0];
      setSelectedDate(dateStr);
      
      // Use currentTimeIn if available, otherwise extract from timestamp
      if (currentTimeIn) {
        setSelectedTime(currentTimeIn);
      } else {
        // Format time for input (HH:MM) from timestamp
        const timeStr = date.toTimeString().slice(0, 5);
        setSelectedTime(timeStr);
      }
      
      // Set initial preview status
      setPreviewStatus(currentStatus === 'late' ? 'late' : 'present');
    }
  }, [isOpen, currentTimestamp, currentTimeIn, currentStatus]);

  // Helper function for fallback status calculation
  const calculateStatusFromTimestamp = (timestamp: Date, dateStr: string): 'present' | 'late' => {
    // Fallback logic when no student/config data available
    const timeInMinutes = timestamp.getHours() * 60 + timestamp.getMinutes();
    return timeInMinutes > (8 * 60 + 30) ? 'late' : 'present';
  };

  // Calculate preview status using the official getStudentDailyStatus function
  useEffect(() => {
    if (selectedTime && selectedDate && student && allClassConfigs) {
      // Create a new timestamp from the selected time
      const newTimestamp = new Date(`${selectedDate}T${selectedTime}:00`);
      
      // Get student's class and shift configuration
      const studentClassKey = student.class?.replace(/^Class\s+/i, '') || '';
      const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
      const studentShiftKey = student.shift;
      const shiftConfig = (studentClassKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;
      
      let calculatedStatus: 'present' | 'late' = 'present';
      
      if (shiftConfig && shiftConfig.startTime) {
        // Parse the start time
        const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
        const startTimeMinutes = startHour * 60 + startMinute;
        
        // Get the grace period (default to standard if not available)
        const gracePeriod = (student as any).gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES;
        
        // Calculate the selected time in minutes
        const selectedTimeMinutes = newTimestamp.getHours() * 60 + newTimestamp.getMinutes();
        
        // Determine if late based on start time + grace period
        const lateThreshold = startTimeMinutes + gracePeriod;
        calculatedStatus = selectedTimeMinutes > lateThreshold ? 'late' : 'present';
      } else {
        // Fallback to time comparison if no shift config
        calculatedStatus = calculateStatusFromTimestamp(newTimestamp, selectedDate);
      }
      
      setPreviewStatus(calculatedStatus);
    } else {
      // Fallback when no student/config data available
      if (selectedTime && selectedDate) {
        const newTimestamp = new Date(`${selectedDate}T${selectedTime}:00`);
        const status = calculateStatusFromTimestamp(newTimestamp, selectedDate);
        setPreviewStatus(status);
      }
    }
  }, [selectedTime, selectedDate, student, allClassConfigs]);

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    setIsLoading(true);
    try {
      const newTimestamp = new Date(`${selectedDate}T${selectedTime}:00`);
      await onSave(newTimestamp);
      toast.success(`Timestamp updated for ${studentName}`);
      onClose();
    } catch (error) {
      console.error('Error updating timestamp:', error);
      toast.error('Failed to update timestamp');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickTimeSet = (timeString: string) => {
    setSelectedTime(timeString);
  };

  // Generate quick times based on student's actual shift start time
  const getQuickTimes = () => {
    let baseStartTime = '08:00'; // Default start time
    let gracePeriod = 15; // Default grace period
    
    if (student && allClassConfigs) {
      const studentClassKey = student.class?.replace(/^Class\s+/i, '') || '';
      const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
      const studentShiftKey = student.shift;
      const shiftConfig = (studentClassKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;
      
      if (shiftConfig && shiftConfig.startTime) {
        baseStartTime = shiftConfig.startTime;
      }
      
      gracePeriod = (student as any).gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES;
    }
    
    // Parse base start time
    const [startHour, startMinute] = baseStartTime.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + startMinute;
    
    // Generate times relative to the actual start time
    const times = [
      {
        label: 'Very Early',
        time: formatTime(startTimeMinutes - 15), // 15 minutes before
        color: 'bg-blue-50 dark:bg-blue-900/20'
      },
      {
        label: 'Early',
        time: formatTime(startTimeMinutes - 5), // 5 minutes before
        color: 'bg-green-50 dark:bg-green-900/20'
      },
      {
        label: 'On Time',
        time: formatTime(startTimeMinutes), // Exact start time
        color: 'bg-emerald-50 dark:bg-emerald-900/20'
      },
      {
        label: 'Late +15',
        time: formatTime(startTimeMinutes + gracePeriod + 0), // Grace period 
        color: 'bg-yellow-50 dark:bg-yellow-900/20'
      },
      {
        label: 'Very Late +30',
        time: formatTime(startTimeMinutes + gracePeriod + 15), // Grace period + 15 minutes
        color: 'bg-red-50 dark:bg-red-900/20'
      }
    ];
    
    return times;
  };

  // Helper function to format minutes to HH:MM
  const formatTime = (totalMinutes: number): string => {
    // Handle negative times and times past midnight
    const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalizedMinutes / 60);
    const minutes = normalizedMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  const quickTimes = getQuickTimes();

  return (
    <div className="fixed inset-0 z-50 flex justify-center p-4 backdrop-blur-sm" style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl h-fit border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiCalendarClock} />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Timestamp
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {studentName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Current Status Display */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Current Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                currentStatus === 'late' 
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                  : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
              }`}>
                {currentStatus === 'late' ? 'Late' : 'Present'}
              </span>
            </div>
          </div>

          {/* Time Input */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Time
            </label>
            <div className="relative">
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
                className="w-full px-4 py-4 text-lg font-mono border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all duration-200 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 dark:[&::-webkit-calendar-picker-indicator]:filter:invert(1)"
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-white flex items-center space-x-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6Z" />
              </svg>
              <span>Date: {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>

          {/* Quick Time Selection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Quick Time Selection
            </label>

            {/* Clean grid layout */}
            <div className="grid grid-cols-3 gap-3">
              {quickTimes.map((quickTime, index) => {
                const isSelected = selectedTime === quickTime.time;
                const isCenter = index === 2; // "On Time" is the center

                return (
                  <button
                    key={index}
                    onClick={() => handleQuickTimeSet(quickTime.time)}
                    className={`group relative p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${
                      isSelected
                        ? 'bg-blue-500 text-white border-blue-500 shadow-lg'
                        : `${quickTime.color} hover:shadow-md border-transparent`
                    } ${isCenter ? 'ring-2 ring-emerald-200 dark:ring-emerald-700' : ''}`}
                  >
                    {/* Subtle background pattern for unselected */}
                    {!isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                    )}

                    <div className="relative flex flex-col items-center space-y-2">
                      {/* Label */}
                      <span className={`text-xs font-medium text-center leading-tight ${
                        isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {quickTime.label}
                      </span>

                      {/* Time */}
                      <span className={`text-sm font-mono font-semibold ${
                        isSelected ? 'text-white' : 'text-gray-900 dark:text-white'
                      }`}>
                        {quickTime.time}
                      </span>
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview New Status */}
          {selectedDate && selectedTime && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700 dark:text-blue-300">New Status Preview:</span>
                <div className="flex items-center space-x-2">
                  <svg className={`w-4 h-4 ${previewStatus === 'late' ? 'text-yellow-500' : 'text-green-500'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d={previewStatus === 'late' ? mdiClockAlert : mdiClockCheck} />
                  </svg>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    previewStatus === 'late' 
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                  }`}>
                    {previewStatus === 'late' ? 'Late' : 'Present'}
                  </span>
                </div>
              </div>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                New timestamp: {selectedDate} at {selectedTime}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading || !selectedDate || !selectedTime}
            className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiCheck} />
                </svg>
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimestampEditModal;
