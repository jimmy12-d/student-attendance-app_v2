import { toast } from 'sonner';

export interface FailedAttendanceRecord {
  studentId: string;
  studentName: string;
  authUid: string | null;
  date: string;
  timeIn: string;
  status: string;
  shift: string;
  method: string;
  timestamp: Date;
  startTime: string;
  class: string | null;
  gracePeriodMinutes: number;
  errorReason: string;
  requiresManualReview: boolean;
  failedAttempts: number;
}

export class FailedAttendanceRetryManager {
  private retryInterval: NodeJS.Timeout | null = null;
  private isEnabled = false;
  private retryCallback: ((record: FailedAttendanceRecord) => Promise<boolean>) | null = null;

  constructor() {
    // Auto-start retry manager on instantiation
    this.startRetryManager();
  }

  // Start the automatic retry manager
  startRetryManager() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
    }

    this.isEnabled = true;
    
    // Check for failed records every 30 seconds
    this.retryInterval = setInterval(() => {
      this.checkAndRetryFailedRecords();
    }, 30000);

    console.log('🔄 Failed attendance retry manager started');
  }

  // Stop the retry manager
  stopRetryManager() {
    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = null;
    }
    this.isEnabled = false;
    console.log('⏹️ Failed attendance retry manager stopped');
  }

  // Set callback for retry attempts
  setRetryCallback(callback: (record: FailedAttendanceRecord) => Promise<boolean>) {
    this.retryCallback = callback;
  }

  // Get all failed records from localStorage
  private getFailedRecords(): FailedAttendanceRecord[] {
    const records: FailedAttendanceRecord[] = [];
    
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

    return records;
  }

  // Check and retry failed records automatically
  private async checkAndRetryFailedRecords() {
    if (!this.isEnabled || !this.retryCallback) {
      return;
    }

    const failedRecords = this.getFailedRecords();
    if (failedRecords.length === 0) {
      return;
    }

    console.log(`🔄 Checking ${failedRecords.length} failed attendance records for retry...`);

    for (const record of failedRecords) {
      try {
        // Only retry records that are not too old (within 1 hour)
        const recordTime = new Date(record.timestamp);
        const now = new Date();
        const hoursSinceFailure = (now.getTime() - recordTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceFailure > 1) {
          // Too old - remove from retry queue
          const key = `failed_attendance_${record.studentId}_${record.date}_${record.shift}`;
          localStorage.removeItem(key);
          continue;
        }

        // Attempt retry
        const success = await this.retryCallback(record);
        
        if (success) {
          // Remove from localStorage on successful retry
          const key = `failed_attendance_${record.studentId}_${record.date}_${record.shift}`;
          localStorage.removeItem(key);
          
          toast.success(`✅ Attendance successfully marked for ${record.studentName} (auto-retry)`);
          console.log(`✅ Auto-retry successful for ${record.studentName}`);
        }
      } catch (error) {
        console.error(`❌ Auto-retry failed for ${record.studentName}:`, error);
      }
    }
  }

  // Manually retry a specific record
  async retryRecord(record: FailedAttendanceRecord): Promise<boolean> {
    if (!this.retryCallback) {
      console.error('No retry callback set');
      return false;
    }

    try {
      const success = await this.retryCallback(record);
      
      if (success) {
        // Remove from localStorage on successful retry
        const key = `failed_attendance_${record.studentId}_${record.date}_${record.shift}`;
        localStorage.removeItem(key);
        
        toast.success(`✅ Attendance successfully marked for ${record.studentName}`);
      }
      
      return success;
    } catch (error) {
      console.error(`❌ Manual retry failed for ${record.studentName}:`, error);
      toast.error(`Failed to retry attendance for ${record.studentName}`);
      return false;
    }
  }

  // Get count of pending failed records
  getFailedRecordsCount(): number {
    return this.getFailedRecords().length;
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
  }
}

// Global instance
export const failedAttendanceRetryManager = new FailedAttendanceRetryManager();