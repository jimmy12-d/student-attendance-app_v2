import { db } from '@/firebase-config';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs,
  query, 
  where, 
  updateDoc, 
  Timestamp,
  serverTimestamp,
  addDoc
} from 'firebase/firestore';
import { toast } from 'sonner';

export interface EventAttendanceRecord {
  id?: string;
  eventId: string;
  eventName: string;
  studentId: string;
  studentName: string;
  authUid?: string;
  clockInTime: Date | Timestamp;
  clockInMethod: 'face-scan' | 'manual';
  clockOutTime?: Date | Timestamp | null;
  clockOutMethod?: 'face-scan' | 'manual' | null;
  faceDescriptorAtClockIn?: number[];
  faceDescriptorAtClockOut?: number[];
  status: 'clocked-in' | 'clocked-out' | 'incomplete';
  totalDuration?: number; // Duration in minutes
  confidence?: number; // Face recognition confidence
  notes?: string;
  createdAt: Date | Timestamp;
  updatedAt?: Date | Timestamp;
}

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  photoUrl?: string;
  faceDescriptor?: number[];
  authUid?: string;
  shift?: string;
  class?: string;
}

/**
 * Clock in a student for an event using face recognition
 */
export async function clockInStudent(
  eventId: string,
  eventName: string,
  student: Student,
  faceDescriptor: Float32Array | number[],
  confidence: number
): Promise<'success' | 'already-clocked-in' | 'error'> {
  try {
    // Check if student is already clocked in for this event today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const eventAttendanceRef = collection(db, 'eventAttendance');
    const q = query(
      eventAttendanceRef,
      where('eventId', '==', eventId),
      where('studentId', '==', student.id),
      where('clockInTime', '>=', Timestamp.fromDate(todayStart))
    );
    
    const existingRecords = await getDocs(q);
    
    // Check if already clocked in (not clocked out yet)
    const activeClockIn = existingRecords.docs.find(doc => {
      const data = doc.data();
      return !data.clockOutTime; // No clock out time means still clocked in
    });
    
    if (activeClockIn) {
      toast.error(`${student.fullName} is already clocked in for this event`);
      return 'already-clocked-in';
    }
    
    // Create new clock-in record
    const attendanceData: Partial<EventAttendanceRecord> = {
      eventId,
      eventName,
      studentId: student.id,
      studentName: student.fullName,
      authUid: student.authUid,
      clockInTime: serverTimestamp() as any,
      clockInMethod: 'face-scan',
      clockOutTime: null,
      clockOutMethod: null,
      faceDescriptorAtClockIn: Array.from(faceDescriptor),
      status: 'clocked-in',
      confidence,
      createdAt: serverTimestamp() as any,
      updatedAt: serverTimestamp() as any
    };
    
    await addDoc(eventAttendanceRef, attendanceData);
    
    toast.success(`✅ ${student.fullName} clocked in successfully!`, {
      duration: 3000,
      icon: '🎉'
    });
    
    return 'success';
  } catch (error) {
    console.error('Error clocking in student:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to clock in ${student.fullName}: ${errorMessage}`);
    return 'error';
  }
}

/**
 * Clock out a student for an event using face recognition
 */
export async function clockOutStudent(
  eventId: string,
  student: Student,
  faceDescriptor: Float32Array | number[],
  confidence: number
): Promise<'success' | 'not-clocked-in' | 'already-clocked-out' | 'error'> {
  try {
    // Find active clock-in record for this student and event today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const eventAttendanceRef = collection(db, 'eventAttendance');
    const q = query(
      eventAttendanceRef,
      where('eventId', '==', eventId),
      where('studentId', '==', student.id),
      where('clockInTime', '>=', Timestamp.fromDate(todayStart))
    );
    
    const existingRecords = await getDocs(q);
    
    // Find the active clock-in (without clock-out)
    const activeRecord = existingRecords.docs.find(doc => {
      const data = doc.data();
      return !data.clockOutTime;
    });
    
    if (!activeRecord) {
      // Check if already fully clocked out
      const completedRecord = existingRecords.docs.find(doc => {
        const data = doc.data();
        return data.clockOutTime !== null;
      });
      
      if (completedRecord) {
        toast.error(`${student.fullName} has already clocked out`);
        return 'already-clocked-out';
      }
      
      toast.error(`${student.fullName} has not clocked in yet`);
      return 'not-clocked-in';
    }
    
    // Calculate duration
    const clockInTime = activeRecord.data().clockInTime.toDate();
    const clockOutTime = new Date();
    const durationMs = clockOutTime.getTime() - clockInTime.getTime();
    const durationMinutes = Math.round(durationMs / 60000);
    
    // Update record with clock-out information
    await updateDoc(doc(db, 'eventAttendance', activeRecord.id), {
      clockOutTime: serverTimestamp(),
      clockOutMethod: 'face-scan',
      faceDescriptorAtClockOut: Array.from(faceDescriptor),
      status: 'clocked-out',
      totalDuration: durationMinutes,
      updatedAt: serverTimestamp()
    });
    
    toast.success(`✅ ${student.fullName} clocked out successfully! Duration: ${durationMinutes} min`, {
      duration: 4000,
      icon: '👋'
    });
    
    return 'success';
  } catch (error) {
    console.error('Error clocking out student:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    toast.error(`Failed to clock out ${student.fullName}: ${errorMessage}`);
    return 'error';
  }
}

/**
 * Check if a student is currently clocked in for an event
 */
export async function checkClockInStatus(
  eventId: string,
  studentId: string
): Promise<'clocked-in' | 'clocked-out' | 'not-started'> {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const eventAttendanceRef = collection(db, 'eventAttendance');
    const q = query(
      eventAttendanceRef,
      where('eventId', '==', eventId),
      where('studentId', '==', studentId),
      where('clockInTime', '>=', Timestamp.fromDate(todayStart))
    );
    
    const records = await getDocs(q);
    
    if (records.empty) {
      return 'not-started';
    }
    
    // Check latest record
    const latestRecord = records.docs[records.docs.length - 1];
    const data = latestRecord.data();
    
    return data.clockOutTime ? 'clocked-out' : 'clocked-in';
  } catch (error) {
    console.error('Error checking clock-in status:', error);
    return 'not-started';
  }
}

/**
 * Get all attendance records for a specific event
 */
export async function getEventAttendanceRecords(
  eventId: string
): Promise<EventAttendanceRecord[]> {
  try {
    const eventAttendanceRef = collection(db, 'eventAttendance');
    const q = query(eventAttendanceRef, where('eventId', '==', eventId));
    
    const snapshot = await getDocs(q);
    
    const records: EventAttendanceRecord[] = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      records.push({
        id: doc.id,
        ...data,
        clockInTime: data.clockInTime?.toDate(),
        clockOutTime: data.clockOutTime?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate()
      } as EventAttendanceRecord);
    });
    
    // Sort by clock-in time (most recent first)
    records.sort((a, b) => {
      const timeA = a.clockInTime instanceof Date ? a.clockInTime.getTime() : 0;
      const timeB = b.clockInTime instanceof Date ? b.clockInTime.getTime() : 0;
      return timeB - timeA;
    });
    
    return records;
  } catch (error) {
    console.error('Error fetching event attendance records:', error);
    return [];
  }
}

/**
 * Manually clock in/out a student (admin override)
 */
export async function manualClockInOut(
  eventId: string,
  eventName: string,
  student: Student,
  action: 'clock-in' | 'clock-out',
  notes?: string
): Promise<boolean> {
  try {
    if (action === 'clock-in') {
      const attendanceData: Partial<EventAttendanceRecord> = {
        eventId,
        eventName,
        studentId: student.id,
        studentName: student.fullName,
        authUid: student.authUid,
        clockInTime: serverTimestamp() as any,
        clockInMethod: 'manual',
        status: 'clocked-in',
        notes,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any
      };
      
      await addDoc(collection(db, 'eventAttendance'), attendanceData);
      toast.success(`Manually clocked in ${student.fullName}`);
    } else {
      // Find active clock-in record
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const q = query(
        collection(db, 'eventAttendance'),
        where('eventId', '==', eventId),
        where('studentId', '==', student.id),
        where('clockInTime', '>=', Timestamp.fromDate(todayStart))
      );
      
      const records = await getDocs(q);
      const activeRecord = records.docs.find(doc => !doc.data().clockOutTime);
      
      if (!activeRecord) {
        toast.error('No active clock-in record found');
        return false;
      }
      
      const clockInTime = activeRecord.data().clockInTime.toDate();
      const clockOutTime = new Date();
      const durationMinutes = Math.round((clockOutTime.getTime() - clockInTime.getTime()) / 60000);
      
      await updateDoc(doc(db, 'eventAttendance', activeRecord.id), {
        clockOutTime: serverTimestamp(),
        clockOutMethod: 'manual',
        status: 'clocked-out',
        totalDuration: durationMinutes,
        notes: notes || activeRecord.data().notes,
        updatedAt: serverTimestamp()
      });
      
      toast.success(`Manually clocked out ${student.fullName}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error with manual clock-in/out:', error);
    toast.error('Failed to complete manual action');
    return false;
  }
}
