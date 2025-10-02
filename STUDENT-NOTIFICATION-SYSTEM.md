# Student Notification System

## Overview
The student notification system automatically sends in-app and push notifications to students for important events: attendance marking, permission request approvals/rejections, and leave early request approvals/rejections.

## Features

### 1. Attendance Notifications
When a student's attendance is marked (via face recognition or manual entry), they receive:
- **Real-time in-app notification** showing:
  - ✅ Present or ⚠️ Late status
  - Exact arrival time (HH:MM format)
  - Shift information
  - Date of attendance
- **Push notification** (if enabled on their device)

**Example Notifications:**
- "✅ Attendance Marked - You have been marked Present at 07:45 for Morning shift on 2025-10-01"
- "⚠️ Attendance Marked - You have been marked Late at 08:30 for Morning shift on 2025-10-01"

### 2. Permission Request Notifications
When an admin approves or rejects a permission request, the student receives:
- **Status update** (✅ Approved or ❌ Rejected)
- **Request details** including:
  - Reason for permission
  - Start and end dates
  - Permission ID for reference
- **Direct link** to attendance page to view full details

**Example Notifications:**
- "✅ Permission Request Approved - Your permission request (Medical appointment) for 2025-10-05 to 2025-10-07 has been approved."
- "❌ Permission Request Rejected - Your permission request (Family event) for 2025-10-10 to 2025-10-12 has been rejected."

### 3. Leave Early Request Notifications
When an admin approves or rejects a leave early request, the student receives:
- **Status update** (✅ Approved or ❌ Rejected)
- **Request details** including:
  - Leave time requested
  - Reason provided
  - Request ID for reference
- **Direct link** to attendance page

**Example Notifications:**
- "✅ Leave Early Request Approved - Your leave early request (Dental appointment) for 14:30 has been approved."
- "❌ Leave Early Request Rejected - Your leave early request (Personal matter) for 15:00 has been rejected."

## Technical Implementation

### Architecture

```
┌─────────────────────┐
│   Admin Action      │
│ (Approve/Reject)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Firestore Update   │
│ (status: pending    │
│  → approved/rejected)│
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Cloud Function     │
│  (Trigger on Write) │
└──────────┬──────────┘
           │
           ├──────────────────┐
           ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│  In-App         │  │  FCM Push       │
│  Notification   │  │  Notification   │
│  (users/{uid}/  │  │  (fcmTokens)    │
│   notifications)│  │                 │
└─────────────────┘  └─────────────────┘
           │                  │
           └────────┬─────────┘
                    ▼
           ┌─────────────────┐
           │ Student Portal  │
           │ (Bell Icon)     │
           └─────────────────┘
```

### Code Components

#### 1. Attendance Notification (Cloud Function)
Located in: `/functions/index.js`

**NEW APPROACH** - Server-side trigger (more secure):

```javascript
exports.notifyStudentAttendance = onDocumentCreated({
    document: "attendance/{attendanceId}",
    region: "asia-southeast1"
}, async (event) => {
    const attendanceData = event.data?.data();
    const { authUid, studentName, status, timeIn, shift, date } = attendanceData;
    
    // Skip if no authUid or if status is 'requested'
    if (status === 'requested' || !authUid) return;
    
    // Create in-app notification
    await db.collection(`users/${authUid}/notifications`).add({
        title: `${statusEmoji} Attendance Marked`,
        body: `You have been marked ${statusText} at ${timeIn}...`,
        type: 'attendance',
        // ... more fields
    });
    
    // Send FCM push notification
    await admin.messaging().sendEachForMulticast(message);
});
```

**Why Cloud Function?**
- More secure (runs with admin privileges)
- No authentication issues (client-side code needs proper auth)
- Automatic retry on failure
- Centralized notification logic

#### 2. Permission Approval Notification (Cloud Function)
Located in: `/functions/index.js`

```javascript
exports.notifyStudentPermissionStatus = onDocumentWritten({
    document: "permissions/{permissionId}",
    region: "asia-southeast1"
}, async (event) => {
    const beforeData = event.data?.before?.data();
    const afterData = event.data?.after?.data();
    
    // Trigger only when status changes from pending to approved/rejected
    const wasPending = beforeData?.status === 'pending';
    const newStatus = afterData?.status;
    
    if (wasPending && (newStatus === 'approved' || newStatus === 'rejected')) {
        // Create in-app notification
        await db.collection(`users/${authUid}/notifications`).add({
            title: notificationTitle,
            body: notificationBody,
            type: 'permission',
            status: newStatus,
            permissionId: permissionId,
            // ... more fields
        });
        
        // Send FCM push notification
        await admin.messaging().sendEachForMulticast(message);
    }
});
```

#### 3. Leave Early Approval Notification (Cloud Function)
Located in: `/functions/index.js`

```javascript
exports.notifyStudentLeaveEarlyStatus = onDocumentWritten({
    document: "leaveEarlyRequests/{requestId}",
    region: "asia-southeast1"
}, async (event) => {
    // Similar structure to permission notification
    // Triggers on status change from pending to approved/rejected
});
```

### Database Schema

#### Notification Document Structure
```javascript
{
  title: string,           // "✅ Attendance Marked"
  body: string,            // Full notification message
  type: string,            // "attendance" | "permission" | "leaveEarly"
  status: string,          // "present" | "late" | "approved" | "rejected"
  isRead: boolean,         // false by default
  createdAt: Timestamp,    // Server timestamp
  link: string,            // "/student/attendance"
  
  // Type-specific fields:
  // For attendance:
  arrivalTime: string,     // "07:45"
  shift: string,           // "Morning"
  date: string,            // "2025-10-01"
  
  // For permission:
  permissionId: string,
  startDate: string,
  endDate: string,
  reason: string,
  
  // For leave early:
  requestId: string,
  leaveTime: string,       // "14:30"
  reason: string
}
```

#### Collection Path
```
users/{authUid}/notifications/{notificationId}
```

### Cloud Functions Deployed

| Function Name | Trigger | Purpose |
|--------------|---------|---------|
| `notifyStudentAttendance` | Firestore write on `attendance/{attendanceId}` | Notify students when attendance is marked (face scan or manual) |
| `notifyStudentPermissionStatus` | Firestore write on `permissions/{permissionId}` | Notify students when permission is approved/rejected |
| `notifyStudentLeaveEarlyStatus` | Firestore write on `leaveEarlyRequests/{requestId}` | Notify students when leave early is approved/rejected |

**Region**: asia-southeast1  
**Runtime**: Node.js 20 (2nd Gen)

## How to Use

### For Students

1. **View Notifications**
   - Open student portal
   - Click bell icon (🔔) in top navigation
   - See all notifications with unread count badge

2. **Mark as Read**
   - Click on any notification
   - It will be marked as read automatically
   - Unread count decreases

3. **Navigate to Details**
   - Click notification to go to attendance page
   - View full context of the event

### For Admins

#### Approve/Reject Permission Request
1. Go to **Students** page
2. Open student details modal
3. Navigate to **Requests** tab
4. Click **Approve** or **Reject** on pending permissions
5. Student receives instant notification

#### Approve/Reject Leave Early Request
1. Go to **Students** page
2. Open student details modal
3. Navigate to **Requests** tab
4. Click **Approve** or **Reject** on pending leave requests
5. Student receives instant notification

## Notification Flow Examples

### Example 1: Attendance Marking
```
1. Student walks into school
2. Face recognition scans face at 07:45
3. markAttendance() function executes
4. Status calculated: "present" (arrived on time)
5. Attendance saved to Firestore (with authUid field)
6. Cloud Function 'notifyStudentAttendance' triggers automatically
7. Function creates notification in users/{authUid}/notifications
8. Function sends FCM push notification
9. Student opens portal, sees: "✅ Attendance Marked - You have been marked Present at 07:45"
```

### Example 2: Permission Approval
```
1. Student submits permission request (Medical appointment, Oct 5-7)
2. Admin reviews in Students → Requests tab
3. Admin clicks "Approve"
4. Firestore updates: status: 'pending' → 'approved'
5. notifyStudentPermissionStatus Cloud Function triggers
6. In-app notification created
7. FCM push notification sent to student's device
8. Student sees: "✅ Permission Request Approved - Your permission request (Medical appointment) for 2025-10-05 to 2025-10-07 has been approved."
```

### Example 3: Leave Early Rejection
```
1. Student submits leave early request (Personal matter, 15:00)
2. Admin reviews and clicks "Reject"
3. Firestore updates: status: 'pending' → 'rejected'
4. notifyStudentLeaveEarlyStatus Cloud Function triggers
5. Student receives: "❌ Leave Early Request Rejected - Your leave early request (Personal matter) for 15:00 has been rejected."
```

## Testing

### Test Attendance Notification
1. Go to **Face Scan** page
2. Mark attendance for a test student
3. Open student portal with that student's account
4. Check bell icon for new notification

### Test Permission Approval Notification
1. Create permission request as student
2. Login as admin
3. Approve the permission request
4. Check student portal for approval notification

### Test Leave Early Approval Notification
1. Create leave early request as student
2. Login as admin
3. Approve the request
4. Check student portal for approval notification

### Verify in Firebase Console

1. **Check Firestore**
   - Navigate to `users/{authUid}/notifications`
   - Verify notification document created
   - Check all fields populated correctly

2. **Check Cloud Function Logs**
   ```bash
   firebase functions:log --only notifyStudentPermissionStatus
   firebase functions:log --only notifyStudentLeaveEarlyStatus
   ```

3. **Check FCM Tokens**
   - Navigate to `fcmTokens` collection
   - Verify student has active FCM token
   - Check token is not expired

## Troubleshooting

### Notification Not Appearing

**Problem**: Student doesn't receive notification after approval

**Solution**:
1. Check student has `authUid` field in Firestore
2. Verify Cloud Function executed:
   ```bash
   firebase functions:log --only notifyStudentPermissionStatus
   ```
3. Check notification created in `users/{authUid}/notifications`
4. Verify student is logged in to portal app

### FCM Push Not Working

**Problem**: In-app notification works but no push notification

**Solution**:
1. Check student has FCM token in `fcmTokens` collection
2. Verify service worker registered (`firebase-messaging-sw.js`)
3. Check browser notification permissions granted
4. Review Cloud Function logs for FCM errors

### Wrong Student Receives Notification

**Problem**: Notification sent to wrong student

**Solution**:
1. Verify `authUid` matches between:
   - Student document
   - Permission/Leave Early request document
   - User authentication
2. Check admin selected correct student when approving

## Security Considerations

### Firestore Rules
Ensure proper security rules for notifications:

```javascript
match /users/{userId}/notifications/{notificationId} {
  // Students can only read their own notifications
  allow read: if request.auth != null && request.auth.uid == userId;
  
  // Students can mark their own notifications as read
  allow update: if request.auth != null && 
                   request.auth.uid == userId &&
                   request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead']);
  
  // Only Cloud Functions can create notifications
  allow create: if false;
}
```

## Performance Considerations

- Notifications are created asynchronously (non-blocking)
- If notification fails, attendance/approval still succeeds
- Cloud Functions have retry logic for transient failures
- FCM batch sending for multiple tokens (if available)

## Future Enhancements

1. **Email Notifications**: Send email alongside in-app notification
2. **SMS Notifications**: Critical alerts via SMS
3. **Notification Preferences**: Let students choose notification types
4. **Digest Notifications**: Daily summary of all notifications
5. **Rich Notifications**: Include images, action buttons
6. **Notification History**: Archive old notifications
7. **Parent Notifications**: Copy notifications to parent accounts

## Related Documentation

- [COMPLETE-NOTIFICATION-TEST-GUIDE.md](./COMPLETE-NOTIFICATION-TEST-GUIDE.md) - Testing admin notifications
- [DUPLICATE-NOTIFICATION-FIX.md](./DUPLICATE-NOTIFICATION-FIX.md) - Fixing duplicate notification issues
- [PARENT-TELEGRAM-NOTIFICATIONS.md](./PARENT-TELEGRAM-NOTIFICATIONS.md) - Parent Telegram bot notifications

## Change Log

### 2025-10-01
- ✅ Added attendance notifications in attendanceLogic.ts
- ✅ Created notifyStudentPermissionStatus Cloud Function
- ✅ Created notifyStudentLeaveEarlyStatus Cloud Function
- ✅ Deployed both Cloud Functions to asia-southeast1
- ✅ Tested with sample data
- ✅ **FIXED**: Moved attendance notification to Cloud Function (notifyStudentAttendance)
- ✅ Resolved authentication issues with client-side notification creation
- ✅ All three notification types now working via Cloud Functions

## Support

For issues or questions:
1. Check Cloud Function logs: `firebase functions:log`
2. Review Firestore `users/{uid}/notifications` collection
3. Check browser console for client-side errors
4. Verify student has `authUid` in database
