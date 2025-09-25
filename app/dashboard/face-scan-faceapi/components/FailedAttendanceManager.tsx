import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Icon from '../../../_components/Icon';
import Button from '../../../_components/Button';
import { mdiAlert, mdiRefresh, mdiCheck, mdiClose } from '@mdi/js';

interface FailedAttendanceRecord {
  studentName: string;
  studentId: string;
  shift: string;
  date: string;
  time: string;
  confidence: number;
  error: string;
  timestamp: number;
}

interface FailedAttendanceManagerProps {
  onRetryAttendance?: (studentId: string, studentName: string) => void;
}

const FailedAttendanceManager: React.FC<FailedAttendanceManagerProps> = ({
  onRetryAttendance
}) => {
  const [failedRecords, setFailedRecords] = useState<FailedAttendanceRecord[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Load failed records from localStorage
  const loadFailedRecords = () => {
    const records: FailedAttendanceRecord[] = [];
    
    // Scan localStorage for failed attendance records
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('failed_attendance_')) {
        try {
          const recordData = localStorage.getItem(key);
          if (recordData) {
            const record = JSON.parse(recordData);
            records.push({
              studentName: record.studentName,
              studentId: record.studentId,
              shift: record.shift,
              date: record.date,
              time: record.timeIn,
              confidence: record.confidence || 0,
              error: record.errorReason || 'Unknown error',
              timestamp: record.timestamp?.getTime() || Date.now()
            });
          }
        } catch (error) {
          console.error('Failed to parse failed attendance record:', error);
        }
      }
    }

    // Sort by timestamp (newest first)
    records.sort((a, b) => b.timestamp - a.timestamp);
    setFailedRecords(records);
    setIsVisible(records.length > 0);
  };

  // Clear a specific failed record
  const clearRecord = (studentId: string, date: string, shift: string) => {
    const key = `failed_attendance_${studentId}_${date}_${shift}`;
    localStorage.removeItem(key);
    loadFailedRecords();
    toast.success('Failed record cleared');
  };

  // Clear all failed records
  const clearAllRecords = () => {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('failed_attendance_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    loadFailedRecords();
    toast.success('All failed records cleared');
  };

  // Retry attendance for a specific student
  const retryAttendance = (studentId: string, studentName: string) => {
    if (onRetryAttendance) {
      onRetryAttendance(studentId, studentName);
    } else {
      toast.info('Please use the face scanner to re-mark attendance');
    }
  };

  // Listen for failed attendance events
  useEffect(() => {
    const handleFailedAttendance = (event: CustomEvent) => {
      setTimeout(loadFailedRecords, 1000); // Delay to allow localStorage write
    };

    window.addEventListener('attendanceMarkingFailed', handleFailedAttendance as EventListener);
    
    // Load records on mount
    loadFailedRecords();

    return () => {
      window.removeEventListener('attendanceMarkingFailed', handleFailedAttendance as EventListener);
    };
  }, []);

  if (!isVisible || failedRecords.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon path={mdiAlert} className="w-5 h-5 text-red-500" />
            <h3 className="text-sm font-semibold text-red-800 dark:text-red-200">
              Failed Attendance ({failedRecords.length})
            </h3>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          >
            <Icon path={mdiClose} className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {failedRecords.map((record, index) => (
            <div
              key={`${record.studentId}_${record.date}_${record.shift}_${index}`}
              className="bg-white dark:bg-gray-800 rounded-md p-3 border border-red-100 dark:border-red-800"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    {record.studentName}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {record.shift} shift • {record.time}
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {record.error}
                  </p>
                </div>
                
                <div className="flex space-x-1 ml-2">
                  <button
                    onClick={() => retryAttendance(record.studentId, record.studentName)}
                    className="p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    title="Retry attendance"
                  >
                    <Icon path={mdiRefresh} className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => clearRecord(record.studentId, record.date, record.shift)}
                    className="p-1 text-green-500 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                    title="Mark as resolved"
                  >
                    <Icon path={mdiCheck} className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 pt-2 border-t border-red-200 dark:border-red-800">
          <Button
            onClick={clearAllRecords}
            color="danger"
            outline
            className="w-full text-xs py-1"
          >
            Clear All Failed Records
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FailedAttendanceManager;