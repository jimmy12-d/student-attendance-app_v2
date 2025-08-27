import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../../../firebase-config';
import { toast } from 'sonner';

export interface Student {
  id: string;
  studentId: string;
  fullName: string;
  photoUrl?: string;
  faceDescriptor?: number[];
  shift?: string;
}

// Helper function to filter students by shift
export const filterStudentsByShift = (studentsList: Student[], shift: string, enrolledOnly: boolean = false) => {
  if (shift === 'All' || shift === '') {
    return enrolledOnly ? studentsList.filter(s => s.faceDescriptor) : studentsList;
  }
  
  return studentsList.filter(s => {
    // Since we confirmed the field name is "shift", let's focus on that
    const studentShift = (s as any).shift;
    
    if (!studentShift || studentShift.trim() === '') {
      return false; // Students without shift data are not included in specific shift filters
    }
    
    // Handle both single shift and comma-separated multiple shifts
    const shifts = studentShift.toString().split(',').map((s: string) => s.trim().toLowerCase());
    const inShift = shifts.includes(shift.toLowerCase());
    
    const meetsEnrollmentCriteria = enrolledOnly ? !!s.faceDescriptor : true;
    return inShift && meetsEnrollmentCriteria;
  });
};

// Advanced late marking logic using class configurations
export const determineAttendanceStatus = (student: any, selectedShift: string, classConfigs: any): { status: string; cutoffTime: string } => {
  const now = new Date();
  
  // Default to present
  let attendanceStatus = 'present';
  let cutoffTime = '';

  try {
    // Handle class name mismatch: student.class = "Class 12B" but doc ID = "12B"
    const studentClassKey = student.class ? student.class.replace(/^Class\s+/, '') : null;
    const classConfig = studentClassKey && classConfigs ? classConfigs[studentClassKey] : null;
    const shiftConfig = (student.shift && classConfig?.shifts) ? classConfig.shifts[student.shift] : null;

    console.log('Late calculation debug:', {
      studentName: student.fullName,
      studentClass: student.class,
      studentShift: student.shift,
      studentClassKey,
      hasClassConfig: !!classConfig,
      hasShiftConfig: !!shiftConfig,
      shiftConfig: shiftConfig
    });

    if (shiftConfig && shiftConfig.startTime) {
      const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
      
      // Create shift start time for today
      const shiftStartTimeDate = new Date();
      shiftStartTimeDate.setHours(startHour, startMinute, 0, 0);
      
      // Use student-specific grace period with fallback to default
      let graceMinutes = 15; // Default grace period
      const studentGracePeriod = student.gracePeriodMinutes ?? student.gradePeriodMinutes;
      
      if (typeof studentGracePeriod === 'number' && !isNaN(studentGracePeriod)) {
        graceMinutes = studentGracePeriod;
      } else if (typeof studentGracePeriod === 'string' && studentGracePeriod.trim() !== '' && !isNaN(Number(studentGracePeriod))) {
        graceMinutes = Number(studentGracePeriod);
      }
      
      // Calculate on-time deadline
      const onTimeDeadline = new Date(shiftStartTimeDate);
      onTimeDeadline.setMinutes(shiftStartTimeDate.getMinutes() + graceMinutes);
      
      // Store cutoff time for display
      cutoffTime = onTimeDeadline.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: true 
      });
      
      // Determine status
      if (now > onTimeDeadline) {
        attendanceStatus = 'late';
      }
      
      console.log('Advanced late calculation:', {
        studentName: student.fullName,
        shiftStartTime: shiftStartTimeDate.toLocaleTimeString(),
        graceMinutes,
        onTimeDeadline: onTimeDeadline.toLocaleTimeString(),
        currentTime: now.toLocaleTimeString(),
        isLate: now > onTimeDeadline,
        finalStatus: attendanceStatus
      });
    } else {
      console.warn(`No shift config found for ${student.fullName}. Using fallback logic.`);
      
      // Fallback to simple shift-based cutoffs if no class config
      const fallbackCutoffs = {
        'Morning': { hour: 8, minute: 30 },
        'Afternoon': { hour: 13, minute: 30 },
        'Evening': { hour: 18, minute: 30 }
      };
      
      const fallbackCutoff = fallbackCutoffs[selectedShift as keyof typeof fallbackCutoffs];
      if (fallbackCutoff) {
        const cutoffDate = new Date();
        cutoffDate.setHours(fallbackCutoff.hour, fallbackCutoff.minute, 0, 0);
        
        cutoffTime = cutoffDate.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit', 
          hour12: true 
        });
        
        if (now > cutoffDate) {
          attendanceStatus = 'late';
        }
      }
    }
  } catch (error) {
    console.error('Error in late calculation:', error);
  }

  return { status: attendanceStatus, cutoffTime };
};

// Mark attendance for recognized student
export const markAttendance = async (student: Student, selectedShift: string, classConfigs: any, playSuccessSound: () => void) => {
  try {
    // Check if already marked today for this shift
    const today = new Date().toDateString();
    const attendanceRef = collection(db, 'attendance');
    const attendanceQuery = query(
      attendanceRef,
      where('studentId', '==', student.id),
      where('date', '==', today),
      where('shift', '==', selectedShift) // Check for specific shift
    );
    
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    if (!attendanceSnapshot.empty) {
      const existingRecord = attendanceSnapshot.docs[0].data();
      toast.warning(`${student.fullName} already marked ${existingRecord.status} for ${selectedShift} shift today`);
      return;
    }

    // Use advanced late marking logic
    const { status, cutoffTime } = determineAttendanceStatus(student as any, selectedShift, classConfigs);
    
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: true 
    });

    // Create attendance record with advanced logic
    const attendanceRecord = {
      studentId: student.id,
      studentName: student.fullName,
      date: today,
      timeIn: timeString,
      status: status,
      shift: selectedShift,
      method: 'face-api',
      timestamp: new Date(),
      cutoffTime: cutoffTime,
      // Additional fields for advanced tracking
      class: (student as any).class || null,
      gracePeriodMinutes: (student as any).gracePeriodMinutes || 15
    };

    // Save to Firestore
    await addDoc(collection(db, 'attendance'), attendanceRecord);

    // Show success message with shift information
    const message = `${student.fullName} marked ${status} for ${selectedShift} shift at ${timeString}`;
    
    if (status === 'late') {
      toast.warning(message);
    } else {
      toast.success(message);
    }
    
    playSuccessSound();
  } catch (error) {
    console.error('Failed to mark attendance:', error);
    toast.error('Failed to mark attendance');
  }
};
