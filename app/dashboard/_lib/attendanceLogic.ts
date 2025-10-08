import { Timestamp, collection, query, where, getDocs, addDoc, doc, updateDoc } from "firebase/firestore";
import { Student, PermissionRecord } from "../../_interfaces";
import { 
    AllClassConfigs, 
    STANDARD_ON_TIME_GRACE_MINUTES, // This will be needed by getStudentDailyStatus
    LATE_WINDOW_DURATION_MINUTES,
    cambodianHolidaysSet
} from "./configForAttendanceLogic";
import { db, functions } from '../../../firebase-config';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';

// Interface for raw attendance data structure from Firestore
export interface RawAttendanceRecord {
  studentId: string;
  date: string,
  status?: 'present' | 'late' | 'requested' | string; // Make status optional since some records might not have it
  timestamp?: Timestamp;
  class?: string;
  shift?: string;
  id?: string; // Firestore document ID, optional
  timeIn?: string; // Time in 12-hour format (e.g., "03:36 PM")
  startTime?: string; // Start time in 24-hour format (e.g., "07:00")
}

// Interfaces (can be moved to a shared file later)
export interface CalculatedStatus {
  status?: "Present" | "Late" | "Absent" | "Permission" | "No School" | "Not Yet Enrolled" | "Pending" | "Unknown" | "Absent (Config Missing)";
  time?: string;
}

// --- Primary Logic Functions (as before, no changes needed here) ---
export const isSchoolDay = (date: Date, classStudyDays?: number[] | null): boolean => {
  const dayOfWeek = date.getDay();
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (cambodianHolidaysSet.has(dateString)) return false;
  if (classStudyDays && classStudyDays.length > 0) return classStudyDays.includes(dayOfWeek);
  return dayOfWeek !== 0; 
};

export const getMonthDetailsForLogic = (year: number, month: number) => { // month is 0-indexed
  const today = new Date();
  let daysInMonthToConsider: number;
  let effectiveEndDateString: string;

  if (year === today.getFullYear() && month === today.getMonth()) {
    daysInMonthToConsider = today.getDate();
    effectiveEndDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  } else {
    const lastDay = new Date(year, month + 1, 0).getDate();
    daysInMonthToConsider = lastDay;
    effectiveEndDateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }
  const monthStartDateString = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  return { year, month, monthStartDateString, monthEndDateStringUsedForQuery: effectiveEndDateString, daysInMonthToConsider };
};

// --- The Authoritative Status Calculation Function ---
export const getStudentDailyStatus = (
    student: Student,
    checkDateStr: string,
    attendanceRecord: RawAttendanceRecord | undefined,
    allClassConfigs: AllClassConfigs | null,
    approvedPermissionsForStudent?: PermissionRecord[]
): CalculatedStatus => {
    const checkDate = new Date(checkDateStr);
    checkDate.setHours(0,0,0,0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const studentCreatedAt = student.createdAt instanceof Timestamp ? student.createdAt.toDate() : student.createdAt instanceof Date ? student.createdAt : null;
    if (studentCreatedAt) studentCreatedAt.setHours(0,0,0,0);

    // Extract class ID by removing "Class " prefix (e.g., "Class 12A" -> "12A")
    const studentClassKey = student.class?.replace(/^Class\s+/i, '') || '';
    const classConfig = studentClassKey && allClassConfigs ? allClassConfigs[studentClassKey] : undefined;
    const classStudyDays = classConfig?.studyDays;

    if (studentCreatedAt && checkDate <= studentCreatedAt && (!attendanceRecord || !attendanceRecord.status || attendanceRecord.status !== "present")) return { status: "Not Yet Enrolled" };
    if (!isSchoolDay(checkDate, classStudyDays)) return { status: "No School" };

    // Check for permissions first - permissions take precedence over attendance records
    if (approvedPermissionsForStudent && approvedPermissionsForStudent.some(p => checkDateStr >= p.permissionStartDate && checkDateStr <= p.permissionEndDate)) {
        return { status: "Permission" };
    }

    if (attendanceRecord) {
        // Check if the attendance record has a valid status property
        if (!attendanceRecord.status) {
            console.warn(`Attendance record missing status for student ${student.studentId} on ${checkDateStr}:`, attendanceRecord);
            return { status: "Unknown" };
        }
        
        const status = attendanceRecord.status === 'present' ? "Present" :
                       attendanceRecord.status === 'late'    ? "Late"    : "Unknown";
        let time;
        if (attendanceRecord.timestamp) {
            const recordTime = attendanceRecord.timestamp instanceof Timestamp ? attendanceRecord.timestamp.toDate() : attendanceRecord.timestamp as Date;
            time = recordTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        return { status, time };
    } else { // No attendance record
        if (checkDate.getTime() === today.getTime()) {
            const studentShiftKey = student.shift;
            const shiftConfig = (studentClassKey && classConfig?.shifts) ? classConfig.shifts[studentShiftKey] : undefined;
            if (shiftConfig && shiftConfig.startTime) {
                const [startHour, startMinute] = shiftConfig.startTime.split(':').map(Number);
                // Use Phnom Penh timezone for current time comparison
                const shiftStartTimeForToday = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
                shiftStartTimeForToday.setHours(startHour, startMinute, 0, 0);
                
                // Use Phnom Penh timezone for current time
                const currentTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
                
                // If current time is before shift start time, it's pending
                if (currentTime < shiftStartTimeForToday) {
                    return { status: "Pending" };
                } else {
                    // If current time is past shift start time, check grace period and late window
                    const studentGrace = (student as any).gracePeriodMinutes ?? STANDARD_ON_TIME_GRACE_MINUTES;
                    const onTimeDeadlineForToday = new Date(shiftStartTimeForToday);
                    onTimeDeadlineForToday.setMinutes(shiftStartTimeForToday.getMinutes() + studentGrace);
                    const lateCutOffForToday = new Date(onTimeDeadlineForToday);
                    lateCutOffForToday.setMinutes(onTimeDeadlineForToday.getMinutes() + LATE_WINDOW_DURATION_MINUTES);
                    
                    if (currentTime > lateCutOffForToday) {
                        return { status: "Absent" };
                    } else {
                        return { status: "Pending" };
                    }
                }
            } else return { status: "Absent (Config Missing)" };
        } else if (checkDate < today) return { status: "Absent" };
        else return { status: undefined };
    }
};

// VVVV REFACTORED CALCULATION FUNCTIONS VVVV
export const calculateConsecutiveAbsences = (
  student: Student,
  allAttendanceRecordsForStudent: RawAttendanceRecord[],
  allClassConfigs: AllClassConfigs | null,
  approvedPermissions: PermissionRecord[],
  lookBackDays: number = 20 // Let's default to a 7-day lookback for recent streaks
): { count: number; details: string } => {
    
    let consecutiveAbsences = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const attendanceMap = new Map(allAttendanceRecordsForStudent.map(att => [att.date, att]));

    // Iterate backwards from today
    for (let i = 0; i < lookBackDays; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        
        const attendanceRecord = attendanceMap.get(dateStr);
        
        // Get the definitive status for the day using your central logic function
        const result = getStudentDailyStatus(
          student, 
          dateStr, 
          attendanceRecord, 
          allClassConfigs, 
          approvedPermissions
        );

        if (result.status === "Absent") {
            consecutiveAbsences++;
            // Continue the loop to check the previous day
        } else if (result.status === "Present" || result.status === "Late" || result.status === "Permission") {
            // A "Present", "Late", or "Permission" day definitively BREAKS the streak.
            break; 
        }
        // If the status is "No School" or "Not Yet Enrolled", we skip counting those days
    }

    return { 
      count: consecutiveAbsences, 
      details: `${consecutiveAbsences} consecutive day absences` 
    };
};

export const calculateMonthlyAbsencesLogic = (
  student: Student,
  attendanceForStudentInMonth: RawAttendanceRecord[],
  selectedMonthValue: string,
  allClassConfigs: AllClassConfigs | null,
  approvedPermissions: PermissionRecord[]
): { count: number; details: string } => {
    const [year, monthIndex] = selectedMonthValue.split('-').map(Number).map((n, i) => i === 1 ? n - 1 : n);
    const { daysInMonthToConsider } = getMonthDetailsForLogic(year, monthIndex);
    const monthLabel = new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });

    let absentCount = 0;
    const attendanceMap = new Map(attendanceForStudentInMonth.map(att => [att.date, att]));

    for (let day = 1; day <= daysInMonthToConsider; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const attendanceRecord = attendanceMap.get(dateStr);
        const result = getStudentDailyStatus(student, dateStr, attendanceRecord, allClassConfigs, approvedPermissions);

        if (result.status === "Absent") {
            absentCount++;
        }
    }
    return { count: absentCount, details: `${absentCount} absences in ${monthLabel}` };
};

export const calculateMonthlyLates = (
  student: Student,
  attendanceForStudentInMonth: RawAttendanceRecord[],
  selectedMonthValue: string
): { count: number; details: string } => {
    const monthLabel = new Date(parseInt(selectedMonthValue.split('-')[0]), parseInt(selectedMonthValue.split('-')[1]) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    let lateCount = 0;
    attendanceForStudentInMonth.forEach(record => {
        if (record.status === 'late') {
            lateCount++;
        }
    });
    return { count: lateCount, details: `${lateCount} lates in ${monthLabel}` };
};

// Function to parse timeIn string (24-hour format like "07:15") to minutes since midnight
function parseTimeInToMinutes(timeInString: string): number | null {
  if (!timeInString) return null;

  try {
    const [hours, minutes] = timeInString.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error(`Error parsing timeIn: ${timeInString}`, error);
    return null;
  }
}

// Function to parse startTime string (24-hour format like "07:00") to minutes since midnight
function parseStartTimeToMinutes(startTimeString: string): number | null {
  if (!startTimeString) return null;

  try {
    const [hours, minutes] = startTimeString.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error(`Error parsing startTime: ${startTimeString}`, error);
    return null;
  }
}

// Function to format minutes as HH:MM
function formatMinutesAsTime(minutes: number): string {
  if (minutes === null || minutes === undefined) return 'N/A';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Calculate average arrival time for a student in the current month only
export const calculateAverageArrivalTime = (
  student: Student,
  attendanceForStudentInMonth: RawAttendanceRecord[],
  selectedMonthValue: string
): { averageTime: string; details:string; averageDifference: number | null } => {
    
    const [year, monthIndex] = selectedMonthValue.split('-').map(Number).map((n, i) => i === 1 ? n - 1 : n);
    const monthLabel = new Date(year, monthIndex).toLocaleString('default', { month: 'long', year: 'numeric' });
    
    // Get current date for current month validation
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    
    // Only process if this is the current month
    if (year !== currentYear || monthIndex !== currentMonth) {
        return { 
            averageTime: 'N/A', 
            details: `Only current month data is calculated (${new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })})`,
            averageDifference: null
        };
    }
    
    // Filter records that have both timeIn and startTime for current month only
    // Skip absent or permission records - only count present or late
    const validRecords = attendanceForStudentInMonth.filter(record => {
        // Only include records where the student actually arrived (present or late)
        // Skip absent, permission, and any other status
        return (record.status === 'present' || record.status === 'late') && 
               record.timeIn && 
               record.startTime;
    });
    
    if (validRecords.length === 0) {
        return { 
            averageTime: 'N/A', 
            details: `No valid arrival times in current month (${monthLabel})`,
            averageDifference: null
        };
    }

    // Calculate arrival time differences in minutes
    const arrivalDifferences: number[] = [];
    
    validRecords.forEach(record => {
        const timeInMinutes = parseTimeInToMinutes(record.timeIn!);
        const startTimeMinutes = parseStartTimeToMinutes(record.startTime!);
        
        if (timeInMinutes !== null && startTimeMinutes !== null) {
            // Calculate difference: positive = late, negative = early
            let difference = timeInMinutes - startTimeMinutes;
            
            // Cap early arrivals at 30 minutes early maximum
            // If difference is more negative than -30 (e.g., -45), set it to -30
            if (difference < -30) {
                difference = -30;
            }
            
            arrivalDifferences.push(difference);
        }
    });

    if (arrivalDifferences.length === 0) {
        return { 
            averageTime: 'N/A', 
            details: `No parseable arrival times in current month (${monthLabel})`,
            averageDifference: null
        };
    }

    // Calculate average difference
    const averageDifference = arrivalDifferences.reduce((sum, diff) => sum + diff, 0) / arrivalDifferences.length;
    
    // Format the result
    const averageTimeFormatted = formatAverageDifference(averageDifference);
    const details = `Avg arrival: ${averageTimeFormatted} (${arrivalDifferences.length} days in current month)`;
    
    return { 
        averageTime: averageTimeFormatted, 
        details,
        averageDifference
    };
};

// Helper function to format average difference
function formatAverageDifference(minutes: number): string {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = Math.round(absMinutes % 60);
    
    let timeStr = '';
    if (hours > 0) {
        timeStr = `${hours}h ${mins}m`;
    } else {
        timeStr = `${mins}m`;
    }
    
    if (minutes > 0) {
        return `-${timeStr} late`;
    } else if (minutes < 0) {
        return `+${timeStr} early`;
    } else {
        return 'on time';
    }
}

// Helper function to validate and debug attendance records
export const validateAttendanceRecords = (records: RawAttendanceRecord[]): { 
  valid: RawAttendanceRecord[], 
  invalid: RawAttendanceRecord[], 
  summary: string 
} => {
    const valid: RawAttendanceRecord[] = [];
    const invalid: RawAttendanceRecord[] = [];
    
    records.forEach(record => {
        if (!record.status || (record.status !== 'present' && record.status !== 'late' && record.status !== 'absent')) {
            invalid.push(record);
        } else {
            valid.push(record);
        }
    });
    
    const summary = `Found ${valid.length} valid and ${invalid.length} invalid attendance records`;
    if (invalid.length > 0) {
        console.warn(summary, { invalid });
    }
    
    return { valid, invalid, summary };
};

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

// Advanced late marking logic using class configurations with special case for 12NKGS on Saturday
export const determineAttendanceStatus = (student: any, selectedShift: string, classConfigs: any): { status: string; cutoffTime: string; startTime: string } => {
  const now = new Date();
  
  // Default to present
  let attendanceStatus = 'present';
  let cutoffTime = '';
  let startTime = '';

  try {
    // Handle class name mismatch: student.class = "Class 12B" but doc ID = "12B"
    const studentClassKey = student.class ? student.class.replace(/^Class\s+/, '') : null;
    const classConfig = studentClassKey && classConfigs ? classConfigs[studentClassKey] : null;
    let shiftConfig = (student.shift && classConfig?.shifts) ? classConfig.shifts[student.shift] : null;

    // Special handling for Class 12NKGS on Saturday - override start time to 13:00
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    if (studentClassKey === '12NKGS' && dayOfWeek === 6) {
      shiftConfig = { startTime: '13:00' };
    }

    if (shiftConfig && shiftConfig.startTime) {
      // Set the startTime in 24-hour format
      startTime = shiftConfig.startTime;
      
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

    } else {
      console.warn(`No shift config found for ${student.fullName}. Using fallback logic.`);
      
      // Fallback to simple shift-based cutoffs if no class config
      const fallbackCutoffs = {
        'Morning': { hour: 8, minute: 30, startTime: '07:00' },
        'Afternoon': { hour: 13, minute: 30, startTime: '13:00' },
        'Evening': { hour: 18, minute: 30, startTime: '17:30' }
      };
      
      const fallbackCutoff = fallbackCutoffs[selectedShift as keyof typeof fallbackCutoffs];
      if (fallbackCutoff) {
        // Set startTime from fallback
        startTime = fallbackCutoff.startTime;
        
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

  return { status: attendanceStatus, cutoffTime, startTime };
};

// Calculate shift rankings for leaderboard (top 3 earliest and latest per shift)
export const calculateShiftRankings = (
  students: Student[],
  monthlyAttendance: RawAttendanceRecord[],
  allClassConfigs: AllClassConfigs | null
): { earliest: { [studentId: string]: number }, latest: { [studentId: string]: number } } => {
  if (!allClassConfigs || !monthlyAttendance.length || !students.length) {
    return { earliest: {}, latest: {} };
  }

  const shiftData: { [shift: string]: { studentId: string; avgDiff: number; student: Student; dataPoints: number }[] } = {};
  
  // Group students by shift and calculate their average differences
  students.forEach(student => {
    if (!student.shift) return;
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    const studentAttendance = monthlyAttendance.filter(record => 
      record.studentId === student.id && 
      record.date && 
      record.date.startsWith(currentMonth) &&
      record.timeIn && 
      (record.status === 'present' || record.status === 'late')
    );

    // Require at least 5 data points to be eligible for leaderboard
    if (studentAttendance.length < 5) return;

    const classId = student.class?.replace(/^Class\s+/i, '') || '';
    const classConfig = allClassConfigs[classId];
    const shiftConfig = classConfig?.shifts?.[student.shift];
    
    if (!shiftConfig?.startTime) return;

    const differences: number[] = [];
    studentAttendance.forEach(record => {
      if (record.timeIn && record.startTime) {
        const [timeInHour, timeInMinute] = record.timeIn.split(':').map(Number);
        const [startHour, startMinute] = record.startTime.split(':').map(Number);
        
        const timeInMinutes = timeInHour * 60 + timeInMinute;
        const startMinutes = startHour * 60 + startMinute;
        
        // Cap early arrivals at 30 minutes early maximum
        let difference = timeInMinutes - startMinutes;
        if (difference < -30) {
          difference = -30;
        }
        
        differences.push(difference);
      }
    });

    if (differences.length >= 5) { // Double-check minimum data points
      const avgDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
      
      if (!shiftData[student.shift]) {
        shiftData[student.shift] = [];
      }
      
      shiftData[student.shift].push({ 
        studentId: student.id, 
        avgDiff, 
        student, 
        dataPoints: differences.length 
      });
    }
  });

  // Calculate top 3 earliest and latest for each shift
  const rankings = { earliest: {} as { [studentId: string]: number }, latest: {} as { [studentId: string]: number } };
  
  Object.keys(shiftData).forEach(shift => {
    const students = shiftData[shift];
    
    // Sort by avg difference (earliest = most negative, latest = most positive)
    const sortedEarliest = [...students].sort((a, b) => a.avgDiff - b.avgDiff).slice(0, 3);
    const sortedLatest = [...students].sort((a, b) => b.avgDiff - a.avgDiff).slice(0, 3);
    
    // Assign rankings
    sortedEarliest.forEach((item, index) => {
      // Always rank top 3 earliest in shift (with minimum 5 data points)
      rankings.earliest[item.studentId] = index + 1;
    });
    
    sortedLatest.forEach((item, index) => {
      // Always rank top 3 latest in shift (with minimum 5 data points)
      rankings.latest[item.studentId] = index + 1;
    });
  });

  return rankings;
};

// Mark attendance for recognized student with enhanced error handling and retry logic
export const markAttendance = async (
  student: Student, 
  selectedShift: string, 
  classConfigs: any, 
  playSuccessSound: () => void,
  maxRetries: number = 3,
  selectedDate?: string,
  method: string = 'face-api'
): Promise<string> => {
  // Use Phnom Penh timezone for attendance date
  const dateStr = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Phnom_Penh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const [month, day, year] = dateStr.split('/');
  const attendanceDate = selectedDate || `${year}-${month}-${day}`;
  
  // Retry logic wrapper
  const attemptMarkAttendance = async (attempt: number): Promise<string> => {
    try {
      
      // Check if already marked today for this shift
      const attendanceRef = collection(db, 'attendance');
      const attendanceQuery = query(
        attendanceRef,
        where('studentId', '==', student.id),
        where('date', '==', attendanceDate),
        where('shift', '==', selectedShift) // Check for specific shift
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      
      if (!attendanceSnapshot.empty) {
        const existingRecord = attendanceSnapshot.docs[0].data();
        toast.warning(`${student.fullName} already marked ${existingRecord.status} for ${selectedShift} shift on ${attendanceDate}`);
        return existingRecord.status; // Return the existing status
      }

      // Use advanced late marking logic
      const { status, cutoffTime, startTime } = determineAttendanceStatus(student as any, selectedShift, classConfigs);
      
      const now = new Date();
      const timeString = now.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false 
      });

      // Create attendance record with advanced logic
      const attendanceRecord = {
        studentId: student.id,
        studentName: student.fullName,
        authUid: (student as any).authUid || null, // Add authUid for student portal access
        date: attendanceDate,
        timeIn: timeString,
        status: status,
        shift: selectedShift,
        method: method,
        timestamp: new Date(),
        startTime: startTime, // Add startTime in 24-hour format instead of cutoffTime
        // Additional fields for advanced tracking
        class: (student as any).class || null,
        gracePeriodMinutes: (student as any).gracePeriodMinutes || 15,
        // Add retry tracking
        attemptNumber: attempt,
        ...(attempt > 1 && { retryReason: 'Previous attempt failed' })
      };

      // Save to Firestore with enhanced error handling
      
      const docRef = await addDoc(collection(db, 'attendance'), attendanceRecord);
      
      if (!docRef.id) {
        throw new Error('Failed to save attendance - no document ID returned');
      }
      
      // Verify the record was actually saved by reading it back with a small delay
      await new Promise(resolve => setTimeout(resolve, 300)); // 300ms delay for Firestore consistency
      
      const verifyQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', student.id),
        where('date', '==', attendanceDate),
        where('shift', '==', selectedShift)
      );
      
      const verifySnapshot = await getDocs(verifyQuery);
      if (verifySnapshot.empty) {
        throw new Error('Attendance record verification failed - record not found after save');
      }
      
      // Get the document ID from verification
      const attendanceDocId = verifySnapshot.docs[0].id;
      
      // Send parent notification after successful attendance marking
      let parentNotificationStatus: 'success' | 'failed' | 'no_parent' | 'partial' = 'no_parent';
      let parentNotificationError: string | null = null;
      let parentNotificationsSent = 0;
      
      try {
        const notifyParentAttendance = httpsCallable(functions, 'notifyParentAttendance');
        const result = await notifyParentAttendance({
          studentId: student.id,
          studentName: student.fullName,
          timestamp: now.toISOString(),
          method: 'attendance-system'
        });
        
        // Extract notification result
        const data = result.data as any;
        parentNotificationStatus = data.status || 'failed';
        parentNotificationError = data.error || data.errors || null;
        parentNotificationsSent = data.notificationsSent || 0;
        
        console.log('✅ Parent notification result:', data);
      } catch (notificationError: any) {
        parentNotificationStatus = 'failed';
        parentNotificationError = notificationError.message || 'Unknown error occurred';
        console.warn('Failed to send parent notification:', notificationError);
      }
      
      // Update the attendance record with notification status
      try {
        const attendanceDocRef = doc(db, 'attendance', attendanceDocId);
        await updateDoc(attendanceDocRef, {
          parentNotificationStatus,
          parentNotificationError,
          parentNotificationTimestamp: new Date(),
          parentNotificationsSent
        });
        console.log('✅ Updated attendance record with notification status');
      } catch (updateError) {
        console.error('Failed to update attendance record with notification status:', updateError);
        // Don't throw - this is not critical
      }

      // Note: Student in-app notification is now handled by Cloud Function
      // triggered automatically when attendance document is created

      // Show success message with shift information
      const message = `${student.fullName} marked ${status} for ${selectedShift} shift at ${timeString}`;
      
      if (status === 'late') {
        toast.warning(message);
      } else {
        toast.success(message);
      }
      
      playSuccessSound();
      
      return status; // Return the attendance status
      
    } catch (error: any) {
      console.error(`❌ Attendance marking failed for ${student.fullName} (attempt ${attempt}):`, error);
      
      // Log more detailed error information
      if (error.code) {
        console.error(`   Error code: ${error.code}`);
      }
      if (error.message) {
        console.error(`   Error message: ${error.message}`);
      }
      
      // Analyze error type for better user feedback
      let errorType = 'unknown';
      if (!navigator.onLine) {
        errorType = 'offline';
      } else if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        errorType = 'timeout';
      } else if (error.code === 'permission-denied') {
        errorType = 'permission';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorType = 'network';
      }
      
      console.error(`   Classified as: ${errorType}`);
      
      // If this is not the last attempt, wait and retry
      if (attempt < maxRetries) {
        const retryDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        
        // Show retry notification to user
        toast.info(`Retrying attendance for ${student.fullName}... (${attempt}/${maxRetries})`, {
          duration: retryDelay
        });
        
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return attemptMarkAttendance(attempt + 1);
      } else {
        // Final attempt failed - save to offline queue
        console.error(`💥 Final attempt failed for ${student.fullName}:`, error);
        
        // Determine network status from error
        let networkStatus: 'offline' | 'timeout' | 'error' = 'error';
        let errorDetails = error.message || 'Unknown error';
        
        if (!navigator.onLine) {
          networkStatus = 'offline';
          errorDetails = 'No internet connection';
        } else if (error.code === 'unavailable' || error.code === 'deadline-exceeded' || error.message?.includes('timeout')) {
          networkStatus = 'timeout';
          errorDetails = 'Firestore timeout - server may be slow';
        } else if (error.code === 'permission-denied') {
          networkStatus = 'error';
          errorDetails = 'Permission denied - check Firestore rules';
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          networkStatus = 'timeout';
          errorDetails = 'Network connection unstable';
        }
        
        console.error(`💥 Final failure details: Status=${networkStatus}, Error=${errorDetails}`);
        
        // Determine the status using the advanced logic
        const { status: attendanceStatus } = determineAttendanceStatus(student as any, selectedShift, classConfigs);
        
        // Create comprehensive offline record
        const offlineRecord = {
          studentId: student.id,
          studentName: student.fullName,
          authUid: (student as any).authUid || null,
          date: attendanceDate,
          timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          status: attendanceStatus, // Use calculated status
          shift: selectedShift,
          method: 'face-api',
          timestamp: new Date().toISOString(),
          startTime: classConfigs?.[student.class?.replace(/^Class\s+/i, '')]?.shifts?.[selectedShift]?.startTime || '',
          class: (student as any).class || null,
          gracePeriodMinutes: (student as any).gracePeriodMinutes || 15,
          errorReason: errorDetails, // Use detailed error message
          requiresManualReview: networkStatus !== 'offline', // Auto-retry for offline, manual review for other errors
          failedAttempts: maxRetries,
          networkStatus: networkStatus,
          errorCode: error.code || 'unknown',
          failedAt: new Date().toISOString(),
          retryCount: 0,
          synced: false
        };
        
        // 🔥 DUAL FALLBACK SYSTEM - 100% Guarantee
        // 1. Save to localStorage (immediate, works offline)
        // 2. Save to Firestore backup collection (persistent, accessible from anywhere)
        
        try {
          // PRIMARY FALLBACK: Store in localStorage for automatic retry
          const offlineKey = `failed_attendance_${student.id}_${attendanceDate}_${selectedShift}_${Date.now()}`;
          localStorage.setItem(offlineKey, JSON.stringify({
            ...offlineRecord,
            savedAt: new Date().toISOString()
          }));
        } catch (localStorageError) {
          console.error('⚠️ localStorage save failed:', localStorageError);
        }
        
        // SECONDARY FALLBACK: Save to Firestore backup collection (100% guarantee)
        try {
          const backupRef = await addDoc(collection(db, 'attendance_failed_backup'), {
            ...offlineRecord,
            backupCreatedAt: new Date(),
            source: 'face-recognition-failure',
            deviceInfo: {
              userAgent: navigator.userAgent,
              online: navigator.onLine,
              timestamp: new Date().toISOString()
            }
          });
          
          toast.success(`🛡️ Attendance safely backed up for ${student.fullName}`, {
            duration: 5000,
            description: 'Will be automatically processed when possible'
          });
        } catch (backupError: any) {
          console.error('⚠️ Firestore backup ALSO failed:', backupError);
          // This should be extremely rare - both main save and backup failed
          toast.error(`⚠️ Critical: Unable to save backup for ${student.fullName}. Please report this.`, {
            duration: 15000
          });
        }
        
        // Show appropriate message based on network status
        if (networkStatus === 'offline') {
          toast.warning(`📴 Offline: ${student.fullName}'s attendance saved. Will sync when online.`, {
            duration: 8000
          });
        } else if (networkStatus === 'timeout') {
          toast.error(`⏱️ Timeout: ${student.fullName}'s attendance saved for retry. Check internet connection.`, {
            duration: 10000
          });
        } else {
          toast.error(`⚠️ Error: ${student.fullName}'s attendance saved for retry. ${errorDetails}`, {
            duration: 10000
          });
        }
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('offlineAttendanceSaved', {
          detail: { 
            studentName: student.fullName,
            networkStatus: networkStatus
          }
        }));
        
        throw error; // Re-throw the original error
      }
    }
  };

  try {
    return await attemptMarkAttendance(1);
  } catch (error) {
    console.error('All attendance marking attempts failed:', error);
    toast.error(`Critical error: Unable to mark attendance for ${student.fullName}`);
    return 'present'; // Default fallback
  }
};