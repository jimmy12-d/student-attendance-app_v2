import { db } from '../../../../firebase-config';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';

/**
 * Get class capacity information and current enrollment
 * @param {string} className - The class name
 * @param {string} shift - The shift name
 * @param {string} excludeStudentId - Student ID to exclude from count (for edit mode)
 * @returns {Promise<{current: number, max: number, waitlist: number, isFull: boolean}>}
 */
export const getClassCapacityInfo = async (className, shift, excludeStudentId = null) => {
  if (!className || !shift) {
    return { current: 0, max: 15, waitlist: 0, isFull: false };
  }

  try {
    // Extract the actual class code from the display name
    // If className is "Class 12A", we want just "12A"
    const classCode = className.replace(/^Class\s+/, '');

    // Get class configuration to find max capacity using the class code as doc ID
    const classDocRef = doc(db, 'classes', classCode);
    const classDoc = await getDoc(classDocRef);
    
    let maxCapacity = 15; // Default capacity
    if (classDoc.exists()) {
      const classData = classDoc.data();

      // Check if this class has the requested shift
      if (!classData.shifts || !Object.keys(classData.shifts).some(key => key.toLowerCase() === shift.toLowerCase())) {
        return { current: 0, max: 0, waitlist: 0, isFull: true, hasShift: false };
      }
      
      // Try exact match first
      let shiftConfig = classData.shifts?.[shift];
      
      // If not found, try case-insensitive match
      if (!shiftConfig && classData.shifts) {
        const shiftKeys = Object.keys(classData.shifts);
        const matchingKey = shiftKeys.find(key => key.toLowerCase() === shift.toLowerCase());
        if (matchingKey) {
          shiftConfig = classData.shifts[matchingKey];
        }
      }
      
      if (shiftConfig?.maxStudents) {
        maxCapacity = shiftConfig.maxStudents;
      }
    } else {
      return { current: 0, max: 0, waitlist: 0, isFull: true, hasShift: false };
    }

    // Count current active students
    const studentsRef = collection(db, "students");
    const q = query(
      studentsRef, 
      where("class", "==", className),
      where("shift", "==", shift),
      where("ay", "==", "2026")
    );
    
    const querySnapshot = await getDocs(q);

    // Filter active students (exclude dropped, on-break, waitlisted)
    const activeStudents = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      const isActive = !data.dropped && !data.onBreak && !data.onWaitlist;
      
      // If excluding a student (edit mode), don't count them
      if (excludeStudentId && doc.id === excludeStudentId) {
        return false;
      }
      
      return isActive;
    });

    // Count waitlisted students
    const waitlistedStudents = querySnapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.dropped && !data.onBreak && data.onWaitlist;
    });

    const current = activeStudents.length;
    const waitlist = waitlistedStudents.length;
    const isFull = current >= maxCapacity;
    
    return {
      current,
      max: maxCapacity,
      waitlist,
      isFull,
      hasShift: true
    };
  } catch (error) {
    console.error("Error getting class capacity info:", error);
    return { current: 0, max: 15, waitlist: 0, isFull: false, hasShift: false };
  }
};

/**
 * Format class label with capacity information
 * @param {string} className - The class name
 * @param {object} capacityInfo - Capacity information object
 * @returns {string} - Formatted label
 */
export const formatClassLabelWithCapacity = (className, capacityInfo) => {
  // If class doesn't have this shift, just return the class name
  if (capacityInfo.hasShift === false) {
    return className;
  }
  
  const { current, max, isFull } = capacityInfo;
  const status = isFull ? ' (FULL)' : '';
  return `${className} (${current}/${max}${status})`;
};

/**
 * Format class label with capacity and schedule type information
 * @param {string} className - The class name
 * @param {object} capacityInfo - Capacity information object
 * @param {object} scheduleTypeStats - Schedule type statistics object
 * @returns {string} - Formatted label with schedule type
 */
export const formatClassLabelWithCapacityAndSchedule = (className, capacityInfo, scheduleTypeStats) => {
  // If class doesn't have this shift, just return the class name
  if (capacityInfo.hasShift === false) {
    return className;
  }
  
  const { current, max, isFull } = capacityInfo;
  const status = isFull ? ' (FULL)' : '';
  
  // Add schedule type information if available
  let scheduleInfo = '';
  if (scheduleTypeStats && scheduleTypeStats.dominantType) {
    if (scheduleTypeStats.dominantType === 'Equal') {
      scheduleInfo = ` (Fix: ${scheduleTypeStats.fixCount}, Flip-Flop: ${scheduleTypeStats.flipFlopCount})`;
    } else {
      scheduleInfo = ` (${scheduleTypeStats.dominantType})`;
    }
  }
  
  return `${className} (${current}/${max}${status})${scheduleInfo}`;
};

/**
 * Check if a student can be enrolled in a class
 * @param {string} className - The class name
 * @param {string} shift - The shift name
 * @param {boolean} isWaitlist - Whether student is being added to waitlist
 * @param {string} excludeStudentId - Student ID to exclude from count (for edit mode)
 * @returns {Promise<{canEnroll: boolean, message: string, capacityInfo: object}>}
 */
export const canEnrollInClass = async (className, shift, isWaitlist = false, excludeStudentId = null) => {
  const capacityInfo = await getClassCapacityInfo(className, shift, excludeStudentId);
  
  // Check if class doesn't have this shift
  if (capacityInfo.hasShift === false) {
    return {
      canEnroll: false,
      message: "", // Show nothing instead of error message
      capacityInfo
    };
  }
  
  // If adding to waitlist, always allow
  if (isWaitlist) {
    return {
      canEnroll: true,
      message: "Student will be added to waitlist",
      capacityInfo
    };
  }
  
  // Check if class is full
  if (capacityInfo.isFull) {
    return {
      canEnroll: false,
      message: `This class is full (${capacityInfo.current}/${capacityInfo.max}). Please choose another class or add the student to the waitlist.`,
      capacityInfo
    };
  }
  
  return {
    canEnroll: true,
    message: `✓ Available spots: ${capacityInfo.max - capacityInfo.current}`,
    capacityInfo
  };
};

/**
 * Get schedule type statistics for a class/shift combination
 * @param {string} className - The class name
 * @param {string} shift - The shift name
 * @returns {Promise<{fixCount: number, flipFlopCount: number, dominantType: string}>}
 */
export const getScheduleTypeStats = async (className, shift) => {
  if (!className || !shift) {
    return { fixCount: 0, flipFlopCount: 0, dominantType: '' };
  }

  try {
    // Count students by schedule type
    const studentsRef = collection(db, "students");
    const q = query(
      studentsRef, 
      where("class", "==", className),
      where("shift", "==", shift),
      where("ay", "==", "2026")
    );
    const querySnapshot = await getDocs(q);

    let fixCount = 0;
    let flipFlopCount = 0;

    querySnapshot.docs.forEach(doc => {
      const data = doc.data();
      // Only count active students (not dropped, on-break, or waitlisted)
      if (!data.dropped && !data.onBreak && !data.onWaitlist) {
        if (data.scheduleType === 'Fix') {
          fixCount++;
        } else if (data.scheduleType === 'Flip-Flop') {
          flipFlopCount++;
        }
      }
    });

    // Determine which type has more students
    let dominantType = '';
    if (fixCount > flipFlopCount) {
      dominantType = 'Fix';
    } else if (flipFlopCount > fixCount) {
      dominantType = 'Flip-Flop';
    } else if (fixCount > 0 && flipFlopCount > 0) {
      dominantType = 'Equal';
    }

    return { fixCount, flipFlopCount, dominantType };
  } catch (error) {
    console.error("Error getting schedule type stats:", error);
    return { fixCount: 0, flipFlopCount: 0, dominantType: '' };
  }
};
