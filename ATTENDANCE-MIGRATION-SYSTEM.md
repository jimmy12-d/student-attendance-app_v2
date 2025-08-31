# Attendance Data Migration System

## Overview

This system automatically migrates manual attendance records from teachers to students when they sign up for the first time. Manual attendance records are initially created with `authUid: "manual-entry"` and need to be linked to the student's actual authentication ID once they create their account.

## How it Works

### 1. Manual Attendance Records
When teachers manually mark attendance in the dashboard, records are created with:
- `authUid: "manual-entry"` (placeholder)
- `studentName: "Student Full Name"`
- `scannedBy: "Manual attendance by teacher"`
- Other standard attendance fields (date, class, status, etc.)

### 2. Automatic Migration
The migration happens automatically when students sign up through any of these methods:
- Phone number authentication (`authenticateStudentWithPhone`)
- Username authentication (`authenticateStudentWithUsername`)
- Profile linking (`linkStudentProfileWithVerifiedNumber`)

### 3. Migration Process
The `migrateManualAttendanceRecords()` function:
1. Searches for attendance records with `authUid: "manual-entry"` and matching `studentName`
2. Updates found records with the student's actual `authUid`
3. Adds migration metadata:
   - `migratedAt: timestamp`
   - `originalAuthUid: "manual-entry"`
   - `migratedBy: "automatic-migration"`

## Admin Functions

### Manual Migration
Admins can manually trigger migration for specific students:
```javascript
// Call this Firebase Function
manuallyMigrateAttendanceRecords({
  studentId: "student-doc-id", // OR
  studentName: "Khun Vensing"
})
```

### Check Migration Status
Admins can check what records need migration:
```javascript
// For specific student
checkAttendanceMigrationStatus({
  studentName: "Khun Vensing"
})

// For all students (overview)
checkAttendanceMigrationStatus({})
```

## Data Structure Examples

### Before Migration (Manual Entry)
```javascript
{
  authUid: "manual-entry",
  class: "Class 12I",
  date: "2025-08-13",
  scannedBy: "Manual attendance by teacher",
  shift: "Morning",
  status: "present",
  studentId: "fxzWt3UUl631phBfbpJq",
  studentName: "Khun Vensing",
  timestamp: "2025-08-13T10:03:02Z"
}
```

### After Migration
```javascript
{
  authUid: "student-actual-firebase-uid",
  class: "Class 12I",
  date: "2025-08-13",
  scannedBy: "Manual attendance by teacher",
  shift: "Morning",
  status: "present",
  studentId: "fxzWt3UUl631phBfbpJq",
  studentName: "Khun Vensing",
  timestamp: "2025-08-13T10:03:02Z",
  // Migration metadata
  migratedAt: "2025-08-31T15:30:00Z",
  originalAuthUid: "manual-entry",
  migratedBy: "automatic-migration"
}
```

## Error Handling

- Migration failures don't prevent student sign-up
- Failed migrations are logged for admin review
- Migration can be retried manually using admin functions
- Students can still access their attendance history even if migration fails

## Logging

The system logs:
- Migration attempts and results
- Number of records found and updated
- Any errors during migration
- Performance metrics for large migrations

## Benefits

1. **Seamless Experience**: Students automatically see their historical attendance
2. **Data Integrity**: All attendance records are properly linked to student accounts
3. **Teacher Workflow**: Teachers can mark attendance before students sign up
4. **Admin Control**: Admins can monitor and manually handle edge cases
5. **Audit Trail**: Migration metadata preserves the original state for auditing
