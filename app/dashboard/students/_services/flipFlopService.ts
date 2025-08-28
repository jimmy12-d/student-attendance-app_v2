import { db } from '../../../../firebase-config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { Student } from '../../../_interfaces';

export interface FlipFlopTrackingRecord {
  year: number;
  month: number; // 0-based (0 = January, 11 = December)
  monthName: string;
  isBaseline?: boolean;
  appliedAt: Timestamp;
  appliedBy: string;
  studentsAffected: number;
  description: string;
  students: {
    studentId: string;
    fullName: string;
    class: string;
    originalShift: string;
    newShift: string;
    wasFlipped: boolean;
  }[];
  settings: {
    autoApplyEnabled: boolean;
    gracePeriodDays: number;
    notificationEnabled: boolean;
  };
  nextScheduledFlip?: {
    year: number;
    month: number;
    monthName: string;
  };
}

export interface FlipFlopSettings {
  enabled: boolean;
  autoApplyEnabled: boolean;
  defaultCountdownSeconds: number;
  defaultGracePeriodDays: number;
  notificationsEnabled: boolean;
  systemVersion: string;
  lastUpdated: Timestamp;
  features: {
    previewMode: boolean;
    batchProcessing: boolean;
    historyTracking: boolean;
    autoDetection: boolean;
  };
  schedule: {
    targetDay: number;
    maxGracePeriod: number;
    minCountdown: number;
    maxCountdown: number;
  };
}

/**
 * Service class for managing flip-flop schedule tracking
 */
export class FlipFlopService {
  private static instance: FlipFlopService;
  
  static getInstance(): FlipFlopService {
    if (!FlipFlopService.instance) {
      FlipFlopService.instance = new FlipFlopService();
    }
    return FlipFlopService.instance;
  }

  /**
   * Get tracking record for a specific month
   */
  async getTrackingRecord(year: number, month: number): Promise<FlipFlopTrackingRecord | null> {
    try {
      const docId = `${year}_${month}`;
      const docRef = doc(db, 'flipFlopTracking', docId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as FlipFlopTrackingRecord;
      }
      return null;
    } catch (error) {
      console.error('Error getting tracking record:', error);
      throw error;
    }
  }

  /**
   * Check if flip-flop has been applied for current month
   */
  async isAppliedForMonth(year: number, month: number): Promise<boolean> {
    const record = await this.getTrackingRecord(year, month);
    return record !== null;
  }

  /**
   * Create a new tracking record
   */
  async createTrackingRecord(
    year: number,
    month: number,
    students: Student[],
    appliedBy: string,
    isBaseline: boolean = false
  ): Promise<void> {
    try {
      const docId = `${year}_${month}`;
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      // Get current settings from localStorage
      const settingsStr = localStorage.getItem('flipFlopSettings');
      const userSettings = settingsStr ? JSON.parse(settingsStr) : {
        autoApplyEnabled: true,
        gracePeriodDays: 7,
        notificationEnabled: true
      };

      const flipFlopStudents = students.filter(s => 
        s.scheduleType?.toLowerCase() === 'flip-flop'
      );

      const trackingData: FlipFlopTrackingRecord = {
        year,
        month,
        monthName: monthNames[month],
        isBaseline,
        appliedAt: serverTimestamp() as Timestamp,
        appliedBy,
        studentsAffected: flipFlopStudents.length,
        description: isBaseline 
          ? 'Initial baseline setup for flip-flop system. No schedule changes applied as this is the starting month.'
          : `Monthly flip-flop schedule update for ${monthNames[month]} ${year}`,
        students: flipFlopStudents.map(student => {
          const originalShift = student.shift;
          const newShift = isBaseline ? originalShift : this.toggleShift(originalShift);
          
          return {
            studentId: student.id,
            fullName: student.fullName,
            class: student.class,
            originalShift,
            newShift,
            wasFlipped: !isBaseline && originalShift !== newShift
          };
        }),
        settings: {
          autoApplyEnabled: userSettings.autoApplyEnabled,
          gracePeriodDays: userSettings.gracePeriodDays,
          notificationEnabled: userSettings.notificationEnabled
        },
        nextScheduledFlip: {
          year: month === 11 ? year + 1 : year, // Next year if December
          month: month === 11 ? 0 : month + 1, // January if December, otherwise next month
          monthName: monthNames[month === 11 ? 0 : month + 1]
        }
      };

      const docRef = doc(db, 'flipFlopTracking', docId);
      await setDoc(docRef, trackingData);
      
      console.log(`✅ Tracking record created for ${monthNames[month]} ${year}`);
    } catch (error) {
      console.error('Error creating tracking record:', error);
      throw error;
    }
  }

  /**
   * Get flip-flop history (recent records)
   */
  async getHistory(limitCount: number = 12): Promise<FlipFlopTrackingRecord[]> {
    try {
      const trackingRef = collection(db, 'flipFlopTracking');
      const q = query(
        trackingRef,
        orderBy('year', 'desc'),
        orderBy('month', 'desc'),
        limit(limitCount)
      );
      
      const querySnapshot = await getDocs(q);
      const records: FlipFlopTrackingRecord[] = [];
      
      querySnapshot.forEach(doc => {
        records.push(doc.data() as FlipFlopTrackingRecord);
      });
      
      return records;
    } catch (error) {
      console.error('Error getting flip-flop history:', error);
      throw error;
    }
  }

  /**
   * Get system settings
   */
  async getSystemSettings(): Promise<FlipFlopSettings | null> {
    try {
      const settingsRef = doc(db, 'systemSettings', 'flipFlopConfig');
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        return settingsSnap.data() as FlipFlopSettings;
      }
      return null;
    } catch (error) {
      console.error('Error getting system settings:', error);
      throw error;
    }
  }

  /**
   * Update system settings
   */
  async updateSystemSettings(settings: Partial<FlipFlopSettings>): Promise<void> {
    try {
      const settingsRef = doc(db, 'systemSettings', 'flipFlopConfig');
      await setDoc(settingsRef, {
        ...settings,
        lastUpdated: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ System settings updated');
    } catch (error) {
      console.error('Error updating system settings:', error);
      throw error;
    }
  }

  /**
   * Toggle shift helper
   */
  private toggleShift(shift: string): string {
    if (shift.toLowerCase() === 'morning') {
      return 'Afternoon';
    } else if (shift.toLowerCase() === 'afternoon') {
      return 'Morning';
    }
    return shift; // Return original if not morning/afternoon
  }

  /**
   * Generate month key for current date
   */
  static getCurrentMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}_${now.getMonth()}`;
  }

  /**
   * Check if we're in grace period for current month
   */
  static isInGracePeriod(gracePeriodDays: number = 7): boolean {
    const now = new Date();
    return now.getDate() <= gracePeriodDays;
  }

  /**
   * Get month name from month number (0-based)
   */
  static getMonthName(month: number): string {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month] || 'Unknown';
  }
}

// Export singleton instance
export const flipFlopService = FlipFlopService.getInstance();
