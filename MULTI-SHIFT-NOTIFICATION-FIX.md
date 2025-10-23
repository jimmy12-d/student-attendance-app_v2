# Multi-Shift Student Notification Fix

## Problem
Students with multiple shifts (attending 2+ classes per day) were not receiving absent notifications correctly.

**Example Issue:**
- Student: Chea Sivmey
- Classes: 12B (Afternoon shift), 12BP (Evening shift)
- Scenario: Attends 12B at 1:01 PM, but is absent from 12BP
- **BUG**: No notification sent for Evening shift because she had attendance record (from Afternoon)
- **Expected**: Should receive notification for the specific shift she's absent from (Evening)

## Root Cause
In `functions/index.js` → `scheduledAbsentParentNotifications` function:

**Before Fix (Lines 6543-6553):**
```javascript
// STEP 2: Get all attendance records for today
const attendanceSnapshot = await db.collection('attendance')
    .where('date', '==', today)
    .get();

const attendedStudentIds = new Set();
attendanceSnapshot.docs.forEach(doc => {
    const record = doc.data();
    attendedStudentIds.add(record.studentId); // ❌ Adds student regardless of shift
});

// STEP 3: Find absent students
const absentStudents = allStudents.filter(s => 
    !attendedStudentIds.has(s.id) // ❌ Excludes student if they attended ANY shift
);
```

**The Problem:**
- `attendedStudentIds` was a Set containing ALL students who attended ANY shift today
- Logic excluded students from notification if they had ANY attendance record
- Didn't check if the attendance was for the SPECIFIC shift being processed

## Solution
Changed to track **which shifts each student attended**, then check shift-specific attendance:

**After Fix:**
```javascript
// STEP 2: Get all attendance records for today
const attendanceSnapshot = await db.collection('attendance')
    .where('date', '==', today)
    .get();

// Build a map of studentId -> array of shifts they attended
const studentAttendanceByShift = new Map();
attendanceSnapshot.docs.forEach(doc => {
    const record = doc.data();
    const studentId = record.studentId;
    const shift = record.shift ? record.shift.toLowerCase() : '';
    
    if (!studentAttendanceByShift.has(studentId)) {
        studentAttendanceByShift.set(studentId, []);
    }
    if (shift) {
        studentAttendanceByShift.get(studentId).push(shift);
    }
});

// STEP 3: Find students who are absent from THIS SPECIFIC SHIFT
const absentStudents = allStudents.filter(s => {
    // Skip if student has approved permission
    if (studentsWithPermission.has(s.id)) {
        return false;
    }
    
    // Check if student attended THIS specific shift
    const attendedShifts = studentAttendanceByShift.get(s.id) || [];
    const studentShift = s.shift ? s.shift.toLowerCase() : '';
    
    // If student attended this shift, they're not absent from it
    if (attendedShifts.includes(studentShift)) {
        return false;
    }
    
    // Student did not attend this shift - they are absent from THIS shift
    return true;
});
```

## How It Works Now

### Data Structure
- **Before**: `Set<studentId>` - binary yes/no for ANY attendance
- **After**: `Map<studentId, Array<shift>>` - tracks ALL shifts attended

### Logic Flow
1. Scheduler runs for specific shift (e.g., "Evening" at 18:00)
2. Gets all active students in Evening shift
3. Builds map: `{ studentId: ["afternoon", "evening"], ... }`
4. For each student, checks if they attended **their specific shift** (not just any shift)
5. Sends notifications only for students absent from THAT specific shift

### Example Scenarios

**Scenario 1: Student with 2 shifts, attends both**
- Student: Chea Sivmey
- Classes: 12B (Afternoon), 12BP (Evening)
- Attendance: ✅ 12B at 1:01 PM, ✅ 12BP at 6:15 PM
- Map: `{ sivmey_id: ["afternoon", "evening"] }`
- Afternoon scheduler: Checks "afternoon" in array → ✅ Present → No notification
- Evening scheduler: Checks "evening" in array → ✅ Present → No notification

**Scenario 2: Student with 2 shifts, attends only one**
- Student: Chea Sivmey
- Classes: 12B (Afternoon), 12BP (Evening)
- Attendance: ✅ 12B at 1:01 PM, ❌ Absent from 12BP
- Map: `{ sivmey_id: ["afternoon"] }`
- Afternoon scheduler: Checks "afternoon" in array → ✅ Present → No notification
- Evening scheduler: Checks "evening" in array → ❌ Not found → **Send notification for 12BP**

**Scenario 3: Student with 1 shift, absent**
- Student: John Doe
- Classes: 12A (Morning)
- Attendance: ❌ Absent
- Map: `{ }` (no entry for John)
- Morning scheduler: Checks "morning" in array → ❌ Not found → **Send notification**

## Testing Checklist
- [ ] Student with 1 shift, present → No notification
- [ ] Student with 1 shift, absent → Receives notification
- [ ] Student with 2 shifts, attends both → No notifications
- [ ] Student with 2 shifts, absent from both → Receives both notifications
- [ ] Student with 2 shifts, attends Afternoon, absent from Evening → Receives Evening notification only
- [ ] Student with approved permission → No notification (regardless of attendance)

## Deployment
```bash
firebase deploy --only functions:scheduledAbsentParentNotifications
```

## Related Files
- **Cloud Function**: `functions/index.js` (lines 6455-6664)
- **Frontend Logic**: `app/dashboard/_lib/attendanceLogic.ts`
- **Dashboard**: `app/dashboard/students/components/AbsentFollowUpDashboard.tsx`

## Related Fixes
This fix is part of a comprehensive update to handle shift-based attendance:
- [SHIFT-MISMATCH-FIX.md](./SHIFT-MISMATCH-FIX.md) - Frontend shift filtering
- [DASHBOARD-COUNT-MISMATCH-FIX.md](./DASHBOARD-COUNT-MISMATCH-FIX.md) - Dashboard statistics
- This document - Backend notification logic

## Logs to Verify
Check Cloud Function logs for these messages:
```
✅ X students have attendance records today
📋 Y students have approved permissions today
❌ Found Z students absent from [shift] shift (excluding those who attended this shift or have permissions)
```

The key is the updated message: "excluding those who attended **this shift**" (not just "attended")
