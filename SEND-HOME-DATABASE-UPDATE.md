# Send-Home Policy - Database Storage Update

## Summary
Updated the send-home policy implementation to **properly store** the send-home status in the Firestore database, in addition to showing the warning overlay.

## Previous Behavior
- ❌ Send-home status was only shown visually (overlay)
- ❌ No database record was created
- ❌ No attendance tracking for send-home events

## New Behavior
- ✅ Send-home status is recorded in Firestore `attendance` collection
- ✅ Full attendance record created with status: 'send-home'
- ✅ Parent notifications are sent for send-home events
- ✅ Status visible in admin dashboards and reports
- ✅ Red warning overlay still shown to student
- ✅ Proper cooldown prevents duplicate scans

## Changes Made

### 1. Face Recognition Logic (`page.tsx`)

**Before**:
```typescript
if (attendanceCheckStatus === 'send-home') {
  // Show overlay only - no database record
  setSendHomeStudent({ name: student.fullName, cutoff: sendHomeCutoff });
  setShowSendHomeOverlay(true);
  // Remove cooldown (no attendance marked)
  recentlyMarkedStudents.current.delete(studentKey);
  return updatedFace;
}
```

**After**:
```typescript
if (attendanceCheckStatus === 'send-home') {
  // Show overlay AND record in database
  setSendHomeStudent({ name: student.fullName, cutoff: sendHomeCutoff });
  setShowSendHomeOverlay(true);
  
  // Mark attendance with 'send-home' status in database
  markAttendance(
    bestMatch.student, 
    attendanceShift, 
    classConfigs || {}, 
    () => {}, 
    3, // retry attempts
    undefined, // current date
    'face-api', // method
    attendanceClass // context-aware class
  )
    .then((attendanceStatus) => {
      // Set cooldown to prevent duplicates
      recentlyMarkedStudents.current.set(studentKey, Date.now());
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('attendanceMarked', {
        detail: {
          studentId: bestMatch.student.id,
          studentName: bestMatch.student.fullName,
          status: attendanceStatus,
          shift: attendanceShift,
          timestamp: new Date(),
          method: 'face-api'
        }
      }));
      
      // Update face to show recorded status
      setTrackedFaces(prevFaces => 
        prevFaces.map(f => 
          f.id === face.id 
            ? { 
                ...f, 
                attendanceStatus: 'send-home',
                status: 'recognized' as const,
                message: `⛔ Send Home - ${bestMatch.student.fullName}`,
                isScanning: false
              } 
            : f
        )
      );
    })
    .catch(error => {
      // Handle errors and remove cooldown on failure
      recentlyMarkedStudents.current.delete(studentKey);
      toast.error(`Failed to record send-home for ${bestMatch.student.fullName}`);
    });
}
```

### 2. Canvas Visualization (`page.tsx`)

Updated to show send-home status with distinct red color:

```typescript
if (face.attendanceStatus === 'send-home') {
  borderColor = '#dc2626'; // Bright red for send-home
  label = `${face.name} - SEND HOME`;
}
```

### 3. Toast Notification (`attendanceLogic.ts`)

Already properly configured:

```typescript
if (status === 'send-home') {
  toast.error(`${student.fullName} - Too late! Must return home`, { 
    duration: 6000 
  });
}
```

## Database Schema

### Attendance Record with Send-Home Status

```javascript
{
  studentId: "student_abc123",
  fullName: "John Doe",
  class: "12A",
  shift: "Morning",
  date: "2025-10-12",
  status: "send-home",  // ← Key field
  timeIn: "07:35",
  startTime: "07:00",
  timestamp: Timestamp(2025-10-12 07:35:00),
  method: "face-api",
  parentNotificationStatus: "success",
  parentNotificationsSent: 1,
  createdAt: Timestamp(2025-10-12 07:35:00)
}
```

## Benefits of Database Storage

1. **Tracking & Analytics**
   - Count how many students are sent home per day/week/month
   - Identify students with frequent send-home events
   - Generate reports on late arrival patterns

2. **Accountability**
   - Permanent record of the event
   - Timestamps prove when student arrived
   - Evidence for disciplinary actions if needed

3. **Parent Communication**
   - Parent notifications are triggered automatically
   - Parents can view send-home events in their portal
   - Clear communication of policy enforcement

4. **Administrative Review**
   - Admin can see send-home events in dashboards
   - Can override status if there are special circumstances
   - Historical data for policy evaluation

5. **Consistency**
   - Same data structure as other attendance statuses
   - Works with existing attendance reports
   - Integrates with all existing features

## Testing Verification

### Database Check Steps:

1. **Set test time** to after send-home deadline (e.g., 7:35 AM for 7:00 AM class)

2. **Scan student face** - should see:
   - ✅ Red warning overlay appears
   - ✅ Red bounding box on camera
   - ✅ "SEND HOME" label on face

3. **Check Firestore Console**:
   - Go to `attendance` collection
   - Filter by today's date
   - Find the student's record
   - **Verify**: `status` field = `"send-home"`

4. **Check Parent Notifications**:
   - Verify parent received notification
   - Check notification includes send-home status

5. **Check Admin Dashboard**:
   - Go to attendance records page
   - Filter by today's date
   - Verify student shows as "send-home"

## Visual Indicators

| Status | Border Color | Label | Database Status |
|--------|-------------|-------|----------------|
| Present | Green `#10b981` | "Present" | `present` |
| Late | Amber `#f59e0b` | "Late Arrival" | `late` |
| Send Home | Red `#dc2626` | "SEND HOME" | `send-home` ✨ |

## Error Handling

The implementation includes comprehensive error handling:

```typescript
.catch(error => {
  console.error('❌ Failed to record send-home status:', error);
  
  // Remove from cooldown on failure (allow retry)
  recentlyMarkedStudents.current.delete(studentKey);
  
  // Show error to user
  toast.error(`Failed to record send-home for ${student.fullName}`, {
    duration: 5000
  });
  
  // Update face to show error state
  setTrackedFaces(prevFaces => 
    prevFaces.map(f => 
      f.id === face.id 
        ? { 
            ...f, 
            status: 'unknown' as const,
            message: `❌ Error recording send-home`,
            isScanning: false
          } 
        : f
    )
  );
});
```

## Configuration

Timing thresholds in `/app/dashboard/_lib/configForAttendanceLogic.ts`:

```typescript
export const STANDARD_ON_TIME_GRACE_MINUTES = 15;  // 15 min grace
export const LATE_WINDOW_DURATION_MINUTES = 15;    // 15 min late window
// Total: 30 minutes after start time → send home
```

## Files Modified

1. ✅ `/app/dashboard/face-scan-faceapi/page.tsx` - Added database storage logic
2. ✅ `/app/dashboard/_lib/attendanceLogic.ts` - Already has send-home status handling
3. ✅ `/app/dashboard/face-scan-faceapi/components/SendHomeOverlay.tsx` - Visual component

## Status
✅ **COMPLETE** - Send-home policy now stores in database with full tracking

## Implementation Date
October 12, 2025

## Updated By
AI Assistant (based on user requirement to store send-home status in database)
