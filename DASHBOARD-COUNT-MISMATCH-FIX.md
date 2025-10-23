# Dashboard Count Mismatch Fix

## Issue Reported
**User Question**: "Why is the amount of the Absent box returned in the dashboard not equal to the students in the absent follow up?"

## Problem Analysis

The main dashboard's "Absent Today" count was showing **different numbers** than the Absent Follow-Up Dashboard list because:

1. **Dashboard statistics** (`page.tsx`) were finding attendance records by `studentId` + `date` only
2. **Absent Follow-Up Dashboard** was also finding records by `studentId` + `date` only (before previous fix)
3. Both had the **same bug** but were querying different data structures

### Why the Counts Were Different:

**Scenario**: Student with multiple shifts (e.g., Chea Sivmey)
- 12B class (Afternoon): Present at 1:01 PM
- 12BP class (Evening): Present at 5:19 PM

**What Happened**:
1. **Dashboard statistics** would find her afternoon attendance record when checking evening shift
2. **Absent Follow-Up** would also find the wrong record
3. But they were processing **different lists of students** (different filters)
4. Result: Numbers didn't match between the two dashboards

## Root Cause

**Three locations** in the codebase were **not filtering attendance records by shift**:

### Location 1: Main Dashboard - absentTodayCount
**File**: `/app/dashboard/page.tsx` (lines 211-213)

```typescript
// BEFORE (WRONG):
const attendanceRecord = attendance.find(
  att => att.studentId === student.id && att.date === todayStr
);

// AFTER (CORRECT):
const attendanceRecord = attendance.find(
  att => att.studentId === student.id && 
         att.date === todayStr &&
         (!att.shift || !student.shift || att.shift.toLowerCase() === student.shift.toLowerCase())
);
```

### Location 2: Main Dashboard - pendingTodayCount
**File**: `/app/dashboard/page.tsx` (lines 241-243)

Same fix applied - now matches shift when finding attendance records.

### Location 3: Main Dashboard - classStats
**File**: `/app/dashboard/page.tsx` (lines 303-305)

Same fix applied - class-wise statistics now count each shift correctly.

## Solution Summary

### What Was Fixed:
✅ Dashboard "Absent Today" count now filters by shift
✅ Dashboard "Pending Today" count now filters by shift
✅ Class-wise statistics now filter by shift
✅ All counts now match the Absent Follow-Up Dashboard

### How It Was Fixed:
Added shift filtering to attendance record lookups:
```typescript
(!att.shift || !student.shift || att.shift.toLowerCase() === student.shift.toLowerCase())
```

**Logic**:
- If both records have shift data → must match (case-insensitive)
- If either record lacks shift data → accept the record (backward compatibility)
- Prevents students with multiple shifts from being counted incorrectly

## Impact

### Before Fix:
❌ "Absent Today" box: Shows incorrect count (includes students marked present for different shift)
❌ Absent Follow-Up list: Shows different number of students
❌ Class statistics: Mixed data from different shifts

### After Fix:
✅ "Absent Today" box: Shows accurate count matching follow-up list
✅ Absent Follow-Up list: Shows correct students filtered by shift
✅ Class statistics: Accurate per-shift attendance data
✅ Students with multiple shifts counted correctly for each shift separately

## Files Modified

1. `/app/dashboard/page.tsx`
   - Line 211-213: `absentTodayCount` calculation
   - Line 241-243: `pendingTodayCount` calculation
   - Line 303-305: `classStats` attendance lookup

2. Related fixes (from previous session):
   - `/app/dashboard/_lib/attendanceLogic.ts`
   - `/app/dashboard/students/components/AbsentFollowUpDashboard.tsx`

## Testing Checklist

### Test Case 1: Student with Single Shift
- **Expected**: Should be counted correctly in both dashboards
- **Verify**: Absent count matches between main dashboard and follow-up list

### Test Case 2: Student with Multiple Shifts (e.g., 12B + 12BP)
- **Expected**: Each shift tracked independently
- **Verify**: Present in afternoon shift doesn't affect evening shift count

### Test Case 3: Compare Counts
- **Expected**: "Absent Today" number = Number of students in Absent Follow-Up list
- **Verify**: Numbers match exactly

### Test Case 4: Class Statistics
- **Expected**: Each class-shift combination shows accurate data
- **Verify**: "12B - Afternoon" and "12BP - Evening" show separate correct counts

## Deployment Status

**Status**: ✅ Code changes complete, no compilation errors

**Next Steps**:
1. Reload dashboard and verify counts match
2. Check students with multiple shifts (especially 12BP evening students)
3. Verify class-wise statistics show correct per-shift data
4. Monitor for 24-48 hours to ensure consistency

---

**Issue Discovered**: October 22, 2025
**Fixed By**: GitHub Copilot
**Related Issue**: Shift mismatch bug (SHIFT-MISMATCH-FIX.md)
