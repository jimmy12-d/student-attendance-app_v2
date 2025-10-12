# ClassTable Context Wrapper Fix

## Problem
The attendance status column showed "Absent" for students even when they had attendance records in the database. This happened because:

1. **TableStudents.tsx** defined `getTodayAttendanceStatus` with context parameters:
   ```tsx
   getTodayAttendanceStatus(student, classContext?, shiftContext?)
   ```

2. **ClassTable.tsx** had an outdated interface that didn't include context parameters:
   ```tsx
   getTodayAttendanceStatus?: (student: Student) => { status?: string; time?: string };
   ```

3. **StudentRow.tsx** was trying to pass `student.class` and `student.shift` as context:
   ```tsx
   getTodayAttendanceStatus(student, student.class, student.shift)
   ```

4. However, ClassTable was passing the function directly to StudentRow without any context, so the context parameters were undefined.

## Root Cause
The data flow was:
- TableStudents → ClassTable → StudentRow
- Context (className, shift) was available in ClassTable props
- But ClassTable wasn't using that context when passing functions to StudentRow
- Result: StudentRow received undefined for classContext and shiftContext

## Solution
Implemented **wrapper functions** in ClassTable to inject the context parameters:

### 1. Updated ClassTable Interface
```tsx
// Added context parameters to the function signature
getTodayAttendanceStatus?: (student: Student, classContext?: string, shiftContext?: string) => { status?: string; time?: string };
```

### 2. Created Wrapper Functions in ClassTable
```tsx
// Wrapper function to pass class and shift context to getTodayAttendanceStatus
const wrappedGetTodayAttendanceStatus = (student: Student) => {
  if (getTodayAttendanceStatus) {
    // CRITICAL: Pass className and shift as context parameters
    return getTodayAttendanceStatus(student, className, shift);
  }
  return { status: 'Unknown' };
};

// Wrapper function to pass class and shift context to isStudentCurrentlyPresent
const wrappedIsStudentCurrentlyPresent = (student: Student) => {
  if (isStudentCurrentlyPresent) {
    // CRITICAL: Pass className and shift as context parameters
    return isStudentCurrentlyPresent(student, className, shift);
  }
  return false;
};
```

### 3. Updated StudentRow Rendering
```tsx
<StudentRow
  getTodayAttendanceStatus={wrappedGetTodayAttendanceStatus}
  isStudentCurrentlyPresent={wrappedIsStudentCurrentlyPresent}
  onAttendanceChange={handleAttendanceChange}
  // ... other props
/>
```

### 4. Simplified StudentRow Implementation
Since the functions are now pre-wrapped with context, StudentRow just calls them directly:
```tsx
// Before: Trying to pass context that would arrive as undefined
const todayStatus = getTodayAttendanceStatus ? getTodayAttendanceStatus(student, student.class, student.shift) : { status: 'Unknown' };

// After: Context already baked into the function
const todayStatus = getTodayAttendanceStatus ? getTodayAttendanceStatus(student) : { status: 'Unknown' };
```

### 5. Updated Attendance Statistics Calculation
Also fixed the statistics calculation in ClassTable to use context:
```tsx
const attendedCount = studentList.filter(student => {
  // CRITICAL: Use className and shift context when checking attendance
  const status = getTodayAttendanceStatus(student, className, shift);
  return status.status === 'Present' || status.status === 'Late';
}).length;
```

## Key Files Modified
1. **app/dashboard/students/components/ClassTable.tsx**
   - Updated interface to include context parameters
   - Added wrapper functions for getTodayAttendanceStatus and isStudentCurrentlyPresent
   - Updated statistics calculation to use context
   - Updated StudentRow rendering to use wrapped functions

2. **app/dashboard/students/components/StudentRow.tsx**
   - Simplified interface (functions no longer need context parameters)
   - Updated function calls to not pass context (already wrapped)
   - Updated checkbox onChange handlers

## Architecture Pattern
This follows the **Higher-Order Function** pattern:
- Parent component (ClassTable) has the context
- Parent wraps the function to inject context
- Child component (StudentRow) receives a pre-configured function
- Child doesn't need to know about or pass context

## Benefits
✓ Context is guaranteed to be correct (from ClassTable props)
✓ StudentRow is simpler (doesn't handle context)
✓ Type-safe (TypeScript interfaces enforced)
✓ Follows single responsibility principle
✓ Easier to debug (context injection in one place)

## Testing
To verify the fix works:
1. Check student "Test Testing" on October 11, 2025
2. Should show "Late" in Class 12A Afternoon table
3. Should show correct status in Class 12BP Evening table
4. Both tables should display independently correct statuses

## Related Fixes
This completes the BP class two-class system fixes:
1. ✓ Attendance data saving with correct class
2. ✓ Duplicate detection allowing multiple classes
3. ✓ Display showing correct records for each table
4. ✓ Context-aware status functions
5. ✓ Class name normalization
6. ✓ **Context parameter injection via wrappers** ← This fix
