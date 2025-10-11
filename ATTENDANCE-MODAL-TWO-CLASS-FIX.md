# Attendance Modal Two-Class System Fix

## Problem Description

The "View Attendance" modal from the Actions tab was not adapted to the two-class system where students with `inBPClass: true` appear in both their regular class AND the 12BP Bridge Program class.

### Issue Details

- Students with `inBPClass: true` appear in two locations:
  1. Their regular class (e.g., "Class 12A", shift "Morning")
  2. The 12BP section (class "12BP", shift "Evening")
  
- When viewing attendance from the Actions tab, the modal used the student's original class/shift configuration instead of the context-aware configuration
- For 12BP students viewed from the 12BP section, the modal should use the Evening shift configuration for attendance checking

## Solution Implemented

### 1. Added View Context Support

**File: `app/dashboard/_components/DailyStatusDetailsModal.tsx`**

- Added `viewContext?: 'regular' | '12BP'` prop to the `Props` interface
- Created `contextualStudent` memo that determines the correct student object based on context:
  - If `student.class === '12BP'` → Use student as-is (already has BP overrides)
  - If `viewContext === '12BP'` and `student.inBPClass === true` → Apply overrides (`class: '12BP'`, `shift: 'Evening'`)
  - Otherwise → Use student as-is (regular class view)

```typescript
const contextualStudent = React.useMemo(() => {
  // If the student object already has 12BP class (from bpStudents array), use it as-is
  if (student.class === '12BP') {
    return student;
  }
  
  // If viewContext is explicitly '12BP', apply the overrides
  if (viewContext === '12BP' && student.inBPClass) {
    return {
      ...student,
      class: '12BP',
      shift: 'Evening'
    };
  }
  
  // Otherwise, use the student as-is (regular class view)
  return student;
}, [student, viewContext]);
```

- Updated `getStudentDailyStatus` call to use `contextualStudent` instead of `student`
- Added context to modal title: Shows "(12BP - Evening Shift)" when viewing BP student from 12BP section

### 2. Propagated View Context Through Components

**File: `app/dashboard/students/components/StudentDetailsModal.tsx`**

- Added `viewContext?: 'regular' | '12BP'` prop to `StudentDetailsModalProps`
- Passed `viewContext` to `DailyStatusDetailsModal` component

**File: `app/dashboard/students/TableStudents.tsx`**

- Automatically determined `viewContext` based on `selectedStudent.class`:
  - If `class === '12BP'` → `viewContext = '12BP'`
  - Otherwise → `viewContext = 'regular'`

```typescript
<StudentDetailsModal
  student={selectedStudent}
  isOpen={isModalOpen}
  onClose={handleCloseModal}
  onEdit={onEdit}
  onDelete={handleDeleteWithToast}
  students={currentStudentList}
  currentIndex={selectedIndex}
  onNavigate={handleNavigate}
  defaultTab={defaultModalTab}
  viewContext={selectedStudent?.class === '12BP' ? '12BP' : 'regular'}
/>
```

## How It Works

### Flow Diagram

```
User clicks "View Details" on a student
  ↓
TableStudents.handleViewDetails(student, studentList)
  ↓
If student is from 12BP section:
  - student.class = '12BP' (from bpStudents array)
  - student.shift = 'Evening' (from bpStudents array)
  ↓
StudentDetailsModal receives:
  - student (with BP overrides if from 12BP section)
  - viewContext ('12BP' if student.class === '12BP', else 'regular')
  ↓
User clicks "View Attendance" in Actions tab
  ↓
DailyStatusDetailsModal opens:
  - Receives student and viewContext
  - Creates contextualStudent with correct class/shift
  - Uses contextualStudent in getStudentDailyStatus()
  ↓
Attendance is checked using:
  - Regular class config if viewContext = 'regular'
  - 12BP (Evening) config if viewContext = '12BP'
```

### Key Points

1. **Dual Appearance**: Students with `inBPClass: true` still appear in BOTH sections
2. **Context-Aware**: The attendance modal now respects which section the student was clicked from
3. **Automatic Detection**: No manual selection needed - the system automatically detects the context
4. **Visual Indicator**: Modal title shows "(12BP - Evening Shift)" when viewing from 12BP context

## Testing

To verify the fix works correctly:

1. **Find a student with `inBPClass: true`**
   - They should appear in both their regular class and 12BP section

2. **Test from Regular Class**
   - Click "View Details" on the student from their regular class
   - Click "View Attendance" in Actions tab
   - Modal title should be: "Attendance: [Student Name]"
   - Attendance should be checked against their regular class config

3. **Test from 12BP Section**
   - Click "View Details" on the same student from the 12BP section
   - Click "View Attendance" in Actions tab
   - Modal title should be: "Attendance: [Student Name] (12BP - Evening Shift)"
   - Attendance should be checked against the 12BP (Evening) class config

## Benefits

✅ **Correct Attendance Tracking**: BP students' attendance is now checked against the correct shift configuration
✅ **Clear Context**: Modal title indicates which class context is being viewed
✅ **Seamless UX**: Automatic context detection - no extra steps for users
✅ **Type-Safe**: All changes are TypeScript-compatible with proper type definitions

## Files Modified

1. `app/dashboard/_components/DailyStatusDetailsModal.tsx`
   - Added `viewContext` prop
   - Added `contextualStudent` memo
   - Updated modal title with context
   - Updated `getStudentDailyStatus` call

2. `app/dashboard/students/components/StudentDetailsModal.tsx`
   - Added `viewContext` prop to interface
   - Passed `viewContext` to attendance modal

3. `app/dashboard/students/TableStudents.tsx`
   - Added automatic `viewContext` determination
   - Passed `viewContext` to student details modal

## Related Documentation

- [12BP Class Implementation](./IMPLEMENTATION-SUMMARY.md) - Original 12BP feature
- [Shift Filter Feature](./SHIFT-FILTER-DOCUMENTATION.md) - Related shift filtering
- [Two-Class System](./BP-CLASS-DOCUMENTATION.md) - Overall BP class system design
