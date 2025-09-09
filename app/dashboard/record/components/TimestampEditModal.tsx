import React, { useState, useEffect } from 'react';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { AttendanceRecord } from '../TableAttendance';
import { getStudentDailyStatus } from '../../_lib/attendanceLogic';
import { AllClassConfigs, STANDARD_ON_TIME_GRACE_MINUTES, LATE_WINDOW_DURATION_MINUTES } from '../../_lib/configForAttendanceLogic';

interface TimestampEditModalProps {
  record: AttendanceRecord;
  isOpen: boolean;
  onClose: () => void;
  onSave: (recordId: string, newTimestamp: Date, newStatus: string) => Promise<void>;
  allClassConfigs: AllClassConfigs | null;
}

const TimestampEditModal: React.FC<TimestampEditModalProps> = ({
  record,
  isOpen,
  onClose,
  onSave,
  allClassConfigs
}) => {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [predictedStatus, setPredictedStatus] = useState<string>('');
  const [shiftConfig, setShiftConfig] = useState<any>(null);

  // Initialize form values when modal opens
  useEffect(() => {
    if (isOpen && record) {
      const timestamp = record.timestamp instanceof Timestamp 
        ? record.timestamp.toDate() 
        : record.timestamp instanceof Date 
        ? record.timestamp 
        : new Date();
      
      // Format date for input (YYYY-MM-DD)
      const dateStr = timestamp.toISOString().split('T')[0];
      setDate(dateStr);
      
      // Format time for input (HH:MM)
      const timeStr = timestamp.toTimeString().split(' ')[0].substring(0, 5);
      setTime(timeStr);

      // Get shift configuration
      const studentClassKey = record.class?.replace(/^Class\s+/i, '') || '';
      const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
      const studentShiftConfig = (classConfig?.shifts && record.shift) ? classConfig.shifts[record.shift] : undefined;
      setShiftConfig(studentShiftConfig);
    }
  }, [isOpen, record, allClassConfigs]);

  // Calculate predicted status based on timestamp
  useEffect(() => {
    if (date && time && shiftConfig?.startTime) {
      const newTimestamp = new Date(`${date}T${time}:00`);
      const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
      
      // Create shift start time for the selected date
      const shiftStartTime = new Date(date);
      shiftStartTime.setHours(startHour, startMinute, 0, 0);
      
      // Calculate grace period and late cutoff
      const gracePeriod = STANDARD_ON_TIME_GRACE_MINUTES;
      const onTimeDeadline = new Date(shiftStartTime);
      onTimeDeadline.setMinutes(shiftStartTime.getMinutes() + gracePeriod);
      
      const lateCutoff = new Date(onTimeDeadline);
      lateCutoff.setMinutes(onTimeDeadline.getMinutes() + LATE_WINDOW_DURATION_MINUTES);
      
      // Determine status
      let status = 'present';
      if (newTimestamp > lateCutoff) {
        status = 'absent';
      } else if (newTimestamp > onTimeDeadline) {
        status = 'late';
      }
      
      setPredictedStatus(status);
    }
  }, [date, time, shiftConfig]);

  const handleSave = async () => {
    if (!date || !time) {
      toast.error('Please fill in both date and time');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create new timestamp
      const newTimestamp = new Date(`${date}T${time}:00`);
      
      // Validate timestamp
      if (newTimestamp > new Date()) {
        toast.error('Cannot set future timestamp');
        return;
      }
      
      // Save the updated record
      await onSave(record.id, newTimestamp, predictedStatus);
      
      toast.success('Timestamp updated successfully');
      onClose();
      
    } catch (error) {
      console.error('Error updating timestamp:', error);
      toast.error('Failed to update timestamp');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-2xl sm:max-w-lg">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Edit Timestamp
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {record.studentName} - {record.class}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Current Status */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Status:</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  record.status === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  record.status === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                  record.status === 'requested' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                </span>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label htmlFor="timestamp-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date
              </label>
              <input
                id="timestamp-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Time Input */}
            <div>
              <label htmlFor="timestamp-time" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Time
              </label>
              <input
                id="timestamp-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            {/* Shift Information */}
            {shiftConfig && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                  {record.shift} Shift Information
                </h4>
                <div className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                  <div>Start Time: {shiftConfig.startTime}</div>
                  <div>Grace Period: {STANDARD_ON_TIME_GRACE_MINUTES} minutes</div>
                  <div>Late Window: {LATE_WINDOW_DURATION_MINUTES} minutes</div>
                </div>
              </div>
            )}

            {/* Predicted Status */}
            {predictedStatus && (
              <div className="p-4 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-blue-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Predicted Status: 
                      <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${
                        predictedStatus === 'present' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                        predictedStatus === 'late' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {predictedStatus.charAt(0).toUpperCase() + predictedStatus.slice(1)}
                      </span>
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                      Status will be automatically calculated based on shift timing
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isLoading || !date || !time}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimestampEditModal;
