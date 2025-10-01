import { toast } from 'sonner';

export interface OfflineAttendanceRecord {
  studentId: string;
  studentName: string;
  authUid: string | null;
  date: string;
  timeIn: string;
  status: string;
  shift: string;
  method: string;
  timestamp: string; // ISO string for storage
  startTime: string;
  class: string | null;
  gracePeriodMinutes: number;
  errorReason: string;
  requiresManualReview: boolean;
  failedAttempts: number;
  confidence?: number; // Face recognition confidence
  networkStatus?: 'offline' | 'timeout' | 'error';
}

export class OfflineAttendanceManager {
  private retryInterval: NodeJS.Timeout | null = null;
  private isEnabled = false;
  private retryCallback: ((record: OfflineAttendanceRecord) => Promise<boolean>) | null = null;
  private isOnline = true;
  private onlineListenerAttached = false;
  private retryInProgress = false;

  constructor() {
    this.checkInitialNetworkStatus();
    this.attachNetworkListeners();
    this.startRetryManager();
  }

  // Check initial network status
  private checkInitialNetworkStatus() {
    this.isOnline = navigator.onLine;
    console.log(`🌐 Initial network status: ${this.isOnline ? 'Online' : 'Offline'}`);
  }

  // Attach network status listeners
  private attachNetworkListeners() {
    if (this.onlineListenerAttached) return;

    window.addEventListener('online', () => {
      console.log('🟢 Network connection restored');
      this.isOnline = true;
      toast.success('Internet connection restored. Syncing pending attendance...');
      
      // Immediately try to sync when connection is restored
      this.checkAndRetryFailedRecords();
    });

    window.addEventListener('offline', () => {
      console.log('🔴 Network connection lost');
      this.isOnline = false;
      toast.warning('Operating in offline mode. Attendance will be synced when connection is restored.');
    });

    this.onlineListenerAttached = true;
  }

  // Check if online
  public isNetworkOnline(): boolean {
    return navigator.onLine && this.isOnline;
  }

  // Start the automatic retry manager
  startRetryManager() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.isEnabled = true;
    
    // Check for failed records every 30 seconds if online
    this.retryInterval = setInterval(() => {
      if (this.isNetworkOnline() && !this.retryInProgress) {
        this.checkAndRetryFailedRecords();
      }
    }, 30000);

    console.log('🔄 Offline attendance retry manager started');
  }

  // Stop the retry manager
  stopRetryManager() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    this.isEnabled = false;
    console.log('⏹️ Offline attendance retry manager stopped');
  }

  // Set callback for retry attempts
  setRetryCallback(callback: (record: OfflineAttendanceRecord) => Promise<boolean>) {
    this.retryCallback = callback;
  }

  // Save failed attendance to localStorage
  saveFailedAttendance(record: OfflineAttendanceRecord): string {
    try {
      const key = `failed_attendance_${record.studentId}_${record.date}_${record.shift}_${Date.now()}`;
      
      // Ensure timestamp is stored as ISO string
      const storageRecord = {
        ...record,
        timestamp: typeof record.timestamp === 'string' ? record.timestamp : new Date(record.timestamp).toISOString(),
        savedAt: new Date().toISOString(),
        synced: false
      };
      
      localStorage.setItem(key, JSON.stringify(storageRecord));
      console.log(`💾 Saved failed attendance to localStorage: ${key}`);
      
      // Dispatch event to update UI
      window.dispatchEvent(new CustomEvent('offlineAttendanceSaved', {
        detail: { count: this.getFailedRecordsCount() }
      }));
      
      return key;
    } catch (error) {
      console.error('Failed to save attendance to localStorage:', error);
      throw error;
    }
  }

  // Get all failed records from localStorage
  getFailedRecords(): OfflineAttendanceRecord[] {
    const records: OfflineAttendanceRecord[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('failed_attendance_')) {
        try {
          const recordData = localStorage.getItem(key);
          if (recordData) {
            const record = JSON.parse(recordData);
            records.push(record);
          }
        } catch (error) {
          console.error('Failed to parse failed attendance record:', error);
        }
      }
    }

    return records.sort((a, b) => {
      // Sort by timestamp, oldest first
      return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    });
  }

  // Check and retry failed records automatically
  async checkAndRetryFailedRecords() {
    if (!this.isEnabled || !this.retryCallback || this.retryInProgress) {
      return;
    }

    // Don't retry if offline
    if (!this.isNetworkOnline()) {
      console.log('⏸️ Skipping retry - network is offline');
      return;
    }

    const failedRecords = this.getFailedRecords();
    if (failedRecords.length === 0) {
      return;
    }

    this.retryInProgress = true;
    console.log(`🔄 Checking ${failedRecords.length} failed attendance records for retry...`);

    let successCount = 0;
    let failCount = 0;

    for (const record of failedRecords) {
      try {
        // Only retry records that are not too old (within 24 hours)
        const recordTime = new Date(record.timestamp);
        const now = new Date();
        const hoursSinceFailure = (now.getTime() - recordTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceFailure > 24) {
          // Too old - mark for manual review but keep in storage
          console.log(`⏰ Record too old (${hoursSinceFailure.toFixed(1)}h): ${record.studentName}`);
          failCount++;
          continue;
        }

        // Check if still online before each retry
        if (!this.isNetworkOnline()) {
          console.log('⏸️ Network went offline during retry');
          break;
        }

        // Attempt retry
        const success = await this.retryCallback(record);
        
        if (success) {
          // Remove from localStorage on successful retry
          this.removeFailedRecord(record);
          successCount++;
          
          toast.success(`✅ Synced attendance for ${record.studentName}`, {
            duration: 3000
          });
          console.log(`✅ Auto-retry successful for ${record.studentName}`);
        } else {
          failCount++;
        }
      } catch (error) {
        console.error(`❌ Auto-retry failed for ${record.studentName}:`, error);
        failCount++;
      }
    }

    this.retryInProgress = false;

    // Summary notification
    if (successCount > 0) {
      toast.success(`✅ Successfully synced ${successCount} attendance record${successCount > 1 ? 's' : ''}`, {
        duration: 5000
      });
    }

    if (failCount > 0) {
      const remaining = this.getFailedRecordsCount();
      if (remaining > 0) {
        toast.warning(`⚠️ ${remaining} attendance record${remaining > 1 ? 's' : ''} pending sync`, {
          duration: 5000
        });
      }
    }

    console.log(`🔄 Retry completed: ${successCount} success, ${failCount} failed`);
  }

  // Manually retry a specific record
  async retryRecord(record: OfflineAttendanceRecord): Promise<boolean> {
    if (!this.retryCallback) {
      console.error('No retry callback set');
      return false;
    }

    if (!this.isNetworkOnline()) {
      toast.error('Cannot retry - no internet connection');
      return false;
    }

    try {
      const success = await this.retryCallback(record);
      
      if (success) {
        // Remove from localStorage on successful retry
        this.removeFailedRecord(record);
        toast.success(`✅ Attendance successfully synced for ${record.studentName}`);
      } else {
        toast.error(`Failed to sync attendance for ${record.studentName}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Manual retry failed for ${record.studentName}:`, error);
      toast.error(`Failed to sync attendance for ${record.studentName}`);
      return false;
    }
  }

  // Remove a specific failed record
  private removeFailedRecord(record: OfflineAttendanceRecord) {
    // Find and remove the record by matching key properties
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('failed_attendance_')) {
        try {
          const recordData = localStorage.getItem(key);
          if (recordData) {
            const storedRecord = JSON.parse(recordData);
            if (
              storedRecord.studentId === record.studentId &&
              storedRecord.date === record.date &&
              storedRecord.shift === record.shift &&
              storedRecord.timestamp === record.timestamp
            ) {
              localStorage.removeItem(key);
              console.log(`🗑️ Removed synced record: ${key}`);
              
              // Dispatch event to update UI
              window.dispatchEvent(new CustomEvent('offlineAttendanceSynced', {
                detail: { 
                  studentName: record.studentName,
                  count: this.getFailedRecordsCount() 
                }
              }));
              
              return;
            }
          }
        } catch (error) {
          console.error('Error removing failed record:', error);
        }
      }
    }
  }

  // Get count of pending failed records
  getFailedRecordsCount(): number {
    return this.getFailedRecords().length;
  }

  // Get detailed stats about pending records
  getStats(): { total: number; recentHour: number; olderThan24h: number } {
    const records = this.getFailedRecords();
    const now = new Date();
    
    let recentHour = 0;
    let olderThan24h = 0;
    
    records.forEach(record => {
      const recordTime = new Date(record.timestamp);
      const hoursSinceFailure = (now.getTime() - recordTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceFailure <= 1) {
        recentHour++;
      } else if (hoursSinceFailure > 24) {
        olderThan24h++;
      }
    });
    
    return {
      total: records.length,
      recentHour,
      olderThan24h
    };
  }

  // Clear all failed records
  clearAllFailedRecords() {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('failed_attendance_')) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`🗑️ Cleared ${keysToRemove.length} failed attendance records`);
    
    // Dispatch event to update UI
    window.dispatchEvent(new CustomEvent('offlineAttendanceCleared', {
      detail: { count: 0 }
    }));
  }

  // Clear old records (older than 24 hours)
  clearOldRecords() {
    const records = this.getFailedRecords();
    const now = new Date();
    let clearedCount = 0;
    
    records.forEach(record => {
      const recordTime = new Date(record.timestamp);
      const hoursSinceFailure = (now.getTime() - recordTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursSinceFailure > 24) {
        this.removeFailedRecord(record);
        clearedCount++;
      }
    });
    
    if (clearedCount > 0) {
      console.log(`🗑️ Cleared ${clearedCount} old records (>24h)`);
      toast.info(`Cleared ${clearedCount} old pending record${clearedCount > 1 ? 's' : ''}`);
    }
  }

  // Export records for manual processing
  exportRecords(): string {
    const records = this.getFailedRecords();
    return JSON.stringify(records, null, 2);
  }
}

// Global instance
export const offlineAttendanceManager = new OfflineAttendanceManager();
