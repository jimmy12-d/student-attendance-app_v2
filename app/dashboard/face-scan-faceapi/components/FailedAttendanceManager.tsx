"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import Icon from '../../../_components/Icon';
import Button from '../../../_components/Button';
import { mdiAlert, mdiRefresh, mdiCheck, mdiClose, mdiWifi, mdiWifiOff, mdiCloudUpload } from '@mdi/js';
import { offlineAttendanceManager, OfflineAttendanceRecord } from '../utils/offlineAttendanceManager';

interface FailedAttendanceManagerProps {
  onRetryAttendance?: (studentId: string, studentName: string) => void;
}

const FailedAttendanceManager: React.FC<FailedAttendanceManagerProps> = ({
  onRetryAttendance
}) => {
  const [failedRecords, setFailedRecords] = useState<OfflineAttendanceRecord[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [stats, setStats] = useState({ total: 0, recentHour: 0, olderThan24h: 0 });

  // Load failed records from the offline manager
  const loadFailedRecords = () => {
    const records = offlineAttendanceManager.getFailedRecords();
    const recordStats = offlineAttendanceManager.getStats();
    
    setFailedRecords(records);
    setStats(recordStats);
    setIsVisible(records.length > 0);
  };

  // Check network status
  const checkNetworkStatus = () => {
    setIsOnline(offlineAttendanceManager.isNetworkOnline());
  };

  // Retry a specific record
  const retryRecord = async (record: OfflineAttendanceRecord) => {
    const success = await offlineAttendanceManager.retryRecord(record);
    if (success) {
      loadFailedRecords();
    }
  };

  // Clear old records
  const clearOldRecords = () => {
    offlineAttendanceManager.clearOldRecords();
    loadFailedRecords();
  };

  // Clear all records
  const clearAllRecords = () => {
    if (confirm('Are you sure you want to clear all pending attendance records? This action cannot be undone.')) {
      offlineAttendanceManager.clearAllFailedRecords();
      loadFailedRecords();
      toast.success('All pending records cleared');
    }
  };

  // Manually trigger sync
  const manualSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync - no internet connection');
      return;
    }
    
    toast.info('Syncing pending attendance...');
    await offlineAttendanceManager.checkAndRetryFailedRecords();
    loadFailedRecords();
  };

  // Listen for offline attendance events
  useEffect(() => {
    const handleOfflineSaved = () => {
      loadFailedRecords();
    };

    const handleOfflineSynced = () => {
      loadFailedRecords();
    };

    const handleOfflineCleared = () => {
      loadFailedRecords();
    };

    window.addEventListener('offlineAttendanceSaved', handleOfflineSaved);
    window.addEventListener('offlineAttendanceSynced', handleOfflineSynced);
    window.addEventListener('offlineAttendanceCleared', handleOfflineCleared);
    window.addEventListener('online', checkNetworkStatus);
    window.addEventListener('offline', checkNetworkStatus);
    
    // Load records and check network status on mount
    loadFailedRecords();
    checkNetworkStatus();

    // Refresh every 10 seconds
    const refreshInterval = setInterval(() => {
      loadFailedRecords();
      checkNetworkStatus();
    }, 10000);

    return () => {
      window.removeEventListener('offlineAttendanceSaved', handleOfflineSaved);
      window.removeEventListener('offlineAttendanceSynced', handleOfflineSynced);
      window.removeEventListener('offlineAttendanceCleared', handleOfflineCleared);
      window.removeEventListener('online', checkNetworkStatus);
      window.removeEventListener('offline', checkNetworkStatus);
      clearInterval(refreshInterval);
    };
  }, []);

  if (!isVisible || failedRecords.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      <div className={`${
        isOnline ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      } border rounded-lg p-4 shadow-lg`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Icon 
              path={isOnline ? mdiWifi : mdiWifiOff} 
              className={`w-5 h-5 ${isOnline ? 'text-yellow-500' : 'text-red-500'}`} 
            />
            <div>
              <h3 className={`text-sm font-semibold ${
                isOnline ? 'text-yellow-800 dark:text-yellow-200' : 'text-red-800 dark:text-red-200'
              }`}>
                Pending Attendance ({stats.total})
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {isOnline ? 'Will sync automatically' : 'Waiting for connection'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className={`${
              isOnline ? 'text-yellow-500 hover:text-yellow-700 dark:text-yellow-400' : 'text-red-500 hover:text-red-700 dark:text-red-400'
            }`}
          >
            <Icon path={mdiClose} className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2 max-h-64 overflow-y-auto">
          {failedRecords.map((record, index) => {
            const timestamp = new Date(record.timestamp);
            const hoursAgo = (new Date().getTime() - timestamp.getTime()) / (1000 * 60 * 60);
            const isOld = hoursAgo > 24;
            
            return (
              <div
                key={`${record.studentId}_${record.date}_${record.shift}_${record.timestamp}`}
                className={`bg-white dark:bg-gray-800 rounded-md p-3 border ${
                  isOld ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {record.studentName}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {record.shift} shift • {record.timeIn} • {record.date}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {hoursAgo < 1 
                          ? `${Math.floor(hoursAgo * 60)}m ago` 
                          : `${Math.floor(hoursAgo)}h ago`}
                      </p>
                      {record.networkStatus && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          record.networkStatus === 'offline' 
                            ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            : 'bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300'
                        }`}>
                          {record.networkStatus}
                        </span>
                      )}
                      {isOld && (
                        <span className="text-xs px-2 py-0.5 rounded bg-red-200 dark:bg-red-900 text-red-700 dark:text-red-300">
                          Old
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => retryRecord(record)}
                      disabled={!isOnline}
                      className={`p-1 ${
                        isOnline 
                          ? 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                          : 'text-gray-400 cursor-not-allowed'
                      }`}
                      title={isOnline ? 'Retry now' : 'Offline - will auto-retry when connected'}
                    >
                      <Icon path={mdiRefresh} className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {isOnline && stats.total > 0 && (
            <Button
              onClick={manualSync}
              color="info"
              outline
              className="w-full text-xs py-1 flex items-center justify-center space-x-1"
            >
              <Icon path={mdiCloudUpload} className="w-3 h-3" />
              <span>Sync Now ({stats.total})</span>
            </Button>
          )}
          
          {stats.olderThan24h > 0 && (
            <Button
              onClick={clearOldRecords}
              color="warning"
              outline
              className="w-full text-xs py-1"
            >
              Clear Old Records ({stats.olderThan24h})
            </Button>
          )}
          
          <Button
            onClick={clearAllRecords}
            color="danger"
            outline
            className="w-full text-xs py-1"
          >
            Clear All ({stats.total})
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FailedAttendanceManager;