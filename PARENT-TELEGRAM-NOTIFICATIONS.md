# Parent Telegram Notifications System

## Overview
This document describes the implementation of a comprehensive Telegram notification system that alerts parents when their children arrive at school, request permissions, or leave early. The system is designed to be scalable and handles multiple notification types through a single Telegram bot.

## Features

### 1. Attendance Notifications
- **Automatic alerts** when students are detected via face recognition
- **Real-time notifications** sent immediately after attendance is marked
- **Details included**: Student name, class, arrival time, and detection method

### 2. Permission Request Notifications
- **Instant alerts** when students submit permission requests
- **Status updates** when permissions are approved or denied
- **Complete details**: Request type, reason, timestamp, and approval status

### 3. Parent Registration System
- **Secure token-based registration** linking parents to students
- **One-click registration** via Telegram bot links
- **Multi-student support** for parents with multiple children

## Technical Implementation

### Firebase Collections

#### `parentNotifications` Collection
Stores the relationship between parents (Telegram chat IDs) and students.

```javascript
// Document ID: {studentId}_{chatId}
{
  chatId: "123456789",              // Telegram chat ID (string)
  telegramUserId: "987654321",      // Telegram user ID (string)
  studentId: "student_doc_id",      // Student's Firestore document ID
  studentName: "John Doe",          // Student's full name
  studentClass: "Grade 10A",        // Student's class
  studentShift: "Morning",          // Student's shift
  registeredAt: Timestamp,          // Registration timestamp
  isActive: true,                   // Whether notifications are active
  deactivatedAt: Timestamp|null     // When notifications were deactivated (if applicable)
}
```

### Firebase Functions

#### `notifyParentAttendance`
**Type**: Callable Function  
**Region**: asia-southeast1  
**Purpose**: Send attendance notifications to registered parents

**Parameters**:
```javascript
{
  studentId: string,      // Required: Student's Firestore ID
  studentName: string,    // Required: Student's full name
  timestamp: string,      // Optional: ISO timestamp (defaults to now)
  method: string         // Optional: Detection method (defaults to 'face-scan')
}
```

**Usage Example**:
```javascript
const notifyParentAttendance = httpsCallable(functions, 'notifyParentAttendance');
await notifyParentAttendance({
  studentId: 'student123',
  studentName: 'John Doe',
  timestamp: new Date().toISOString(),
  method: 'face-scan'
});
```

#### `notifyParentPermissionRequest`
**Type**: Callable Function  
**Region**: asia-southeast1  
**Purpose**: Send permission request notifications to registered parents

**Parameters**:
```javascript
{
  studentId: string,          // Required: Student's Firestore ID
  studentName: string,        // Required: Student's full name
  permissionType: string,     // Optional: Type of permission (default: 'leave early')
  reason: string,            // Optional: Reason for permission request
  requestTime: string,       // Optional: ISO timestamp (defaults to now)
  status: string            // Optional: 'pending', 'approved', 'denied' (default: 'pending')
}
```

**Usage Example**:
```javascript
const notifyParentPermissionRequest = httpsCallable(functions, 'notifyParentPermissionRequest');
await notifyParentPermissionRequest({
  studentId: 'student123',
  studentName: 'John Doe',
  permissionType: 'leave early',
  reason: 'Medical appointment',
  status: 'pending'
});
```

### Telegram Bot Integration

#### Parent Registration Flow
1. **Teacher/Admin Action**: Click "Parent Telegram" button in student's Actions tab
2. **Link Generation**: System generates unique registration token and Telegram bot link
3. **Parent Registration**: Parent clicks link → Opens Telegram → Starts bot with token
4. **Verification**: Bot validates token and links parent's chat ID to student
5. **Confirmation**: Parent receives welcome message with student details

#### Registration Token Format
```
https://t.me/{BotUsername}?start=parent_{base64Token}
```

Where `base64Token` contains: `parent_{studentId}_{timestamp}`

#### Bot Commands for Parents
- `/start parent_{token}` - Register for student notifications
- `/help` - Show available commands and information
- Automatic deactivation when bot is blocked by user

## Integration Points

### 1. Face Recognition System
The system automatically sends notifications when attendance is marked via face recognition in `/app/dashboard/face-scan-faceapi/page.tsx`.

**Integration Code**:
```javascript
// After successful attendance marking
try {
  const notifyParentAttendance = httpsCallable(functions, 'notifyParentAttendance');
  await notifyParentAttendance({
    studentId: bestMatch.student.id,
    studentName: bestMatch.student.fullName,
    timestamp: new Date().toISOString(),
    method: 'face-scan'
  });
} catch (error) {
  console.warn('Failed to send parent notification:', error);
}
```

### 2. Permission Request System
To be integrated with the existing permission request functionality.

**Example Integration**:
```javascript
// When permission request is created
await notifyParentPermissionRequest({
  studentId: student.id,
  studentName: student.fullName,
  permissionType: 'leave early',
  reason: requestReason,
  status: 'pending'
});

// When permission is approved/denied
await notifyParentPermissionRequest({
  studentId: student.id,
  studentName: student.fullName,
  permissionType: 'leave early',
  status: 'approved' // or 'denied'
});
```

### 3. Student Actions Tab
The "Parent Telegram" button in `/app/dashboard/students/components/detail-tabs/ActionsTab.tsx` generates registration links.

## Setup Instructions

### 1. Environment Variables
Ensure your Firebase Functions have the following secret configured:

```bash
firebase functions:secrets:set TELEGRAM_PARENT_BOT_TOKEN
```

### 2. Bot Configuration
1. Create a new Telegram bot via [@BotFather](https://t.me/BotFather)
2. Get the bot token and set it as a Firebase secret
3. Update the bot username in `ActionsTab.tsx`:

```javascript
const botUsername = 'YourSchoolBot'; // Replace with your actual bot username
```

### 3. Firestore Security Rules
Add rules for the `parentNotifications` collection:

```javascript
// Allow read/write for authenticated teachers/admins
match /parentNotifications/{document} {
  allow read, write: if request.auth != null && 
    exists(/databases/$(database)/documents/teachers/$(request.auth.uid));
}
```

### 4. Deploy Functions
Deploy the updated Firebase Functions:

```bash
firebase deploy --only functions
```

### 5. Set Up Webhook
After deploying, you need to configure your Telegram bot to use your Firebase Function as a webhook.

**Option A: Use the Setup Script**
1. Edit `setup-telegram-bot.js` and update:
   - `BOT_TOKEN` with your actual bot token
   - `PROJECT_ID` with your Firebase project ID
2. Run: `node setup-telegram-bot.js`

**Option B: Use Firebase Function**
1. Deploy the functions first
2. Call the setup function from your app or use the test HTML file

**Option C: Manual Setup via API**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
     -H "Content-Type: application/json" \
     -d '{"url": "https://asia-southeast1-<YOUR_PROJECT_ID>.cloudfunctions.net/telegramWebhook"}'
```

## Message Templates

### Attendance Notification
```
🎒 **Attendance Alert**

👤 **Student:** John Doe
🏫 **Class:** Grade 10A
⏰ **Time:** Sep 29, 2025, 08:15 AM
📍 **Method:** Face Recognition

✅ Your child has arrived at school safely!
```

### Permission Request Notification
```
📝 **Permission Request PENDING APPROVAL**

👤 **Student:** John Doe
🏫 **Class:** Grade 10A
📋 **Type:** leave early
⏰ **Request Time:** Sep 29, 2025, 02:30 PM
📝 **Reason:** Medical appointment

ℹ️ Waiting for teacher approval...
```

### Permission Approved
```
✅ **Permission Request APPROVED**

👤 **Student:** John Doe
🏫 **Class:** Grade 10A
📋 **Type:** leave early
⏰ **Request Time:** Sep 29, 2025, 02:30 PM
📝 **Reason:** Medical appointment

✅ Permission has been approved by the teacher.
```

## Error Handling

### Automatic Deactivation
- When a parent blocks the bot, their notifications are automatically deactivated
- The system sets `isActive: false` and `deactivatedAt` timestamp
- No further notification attempts are made to blocked users

### Graceful Failures
- Parent notification failures don't affect core attendance functionality
- Errors are logged but not shown to users
- System continues to operate normally even if Telegram service is unavailable

## Security Considerations

### Token Security
- Registration tokens are time-sensitive and single-use
- Tokens expire after successful registration
- Base64 encoding provides basic obfuscation (not encryption)

### Data Privacy
- Only necessary student information is stored with parent chat IDs
- Parents can only receive notifications for their registered children
- Chat IDs are securely stored in Firestore with proper access controls

### Bot Security
- Bot token is stored as a Firebase secret
- All bot interactions are logged for audit purposes
- Automatic deactivation prevents spam to blocked users

## Monitoring and Analytics

### Logging
- All notification attempts are logged with success/failure status
- Parent registration events are tracked
- Bot blocking events are recorded for analytics

### Performance
- Notifications are sent asynchronously to avoid blocking main operations
- Failed notifications are handled gracefully without retries
- System scales automatically with Firebase Functions

## Future Enhancements

### Possible Extensions
1. **Multi-language Support**: Notifications in parent's preferred language
2. **Notification Preferences**: Parents choose which notifications to receive
3. **Delivery Confirmations**: Track whether parents actually read messages
4. **Batch Notifications**: Daily/weekly summaries for less urgent information
5. **Emergency Alerts**: High-priority notifications for urgent situations

### Integration Opportunities
1. **Student Apps**: Notify parents when students use the mobile app
2. **Payment Reminders**: Fee due date notifications
3. **Grade Updates**: Academic performance notifications
4. **Event Reminders**: School events and activities

## Troubleshooting

### Common Issues

#### "Bot doesn't respond to /start"
**This is the most common issue!** Your bot webhook isn't configured.

**Solution:**
1. Make sure you've deployed your functions: `firebase deploy --only functions`
2. Set up the webhook using one of these methods:
   - Run the setup script: `node setup-telegram-bot.js` (after editing it)
   - Use the test HTML file: `telegram-bot-setup.html`
   - Manual API call (see setup instructions above)
3. Test the webhook by messaging your bot

**Check webhook status:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

#### "Bot token not found"
- Ensure `TELEGRAM_PARENT_BOT_TOKEN` secret is properly configured
- Redeploy functions after setting secrets

#### "Parent notifications not working"
- Check if parent is properly registered in `parentNotifications` collection
- Verify `isActive: true` in parent's document
- Check function logs for error details

#### "Registration link not working"
- Ensure bot username is correctly set in `ActionsTab.tsx`
- Verify bot is active and responds to `/start` command
- Check token generation logic for proper encoding

#### "Webhook errors in logs"
- Check that your Firebase Functions URL is correct
- Verify the region matches (asia-southeast1)
- Ensure the function is deployed and accessible

### Debug Commands

```javascript
// Check parent registration
const parentDoc = await db.collection('parentNotifications')
  .doc(`${studentId}_${chatId}`)
  .get();

// Test notification manually
const notifyParentAttendance = httpsCallable(functions, 'notifyParentAttendance');
await notifyParentAttendance({
  studentId: 'test_student_id',
  studentName: 'Test Student'
});
```

---

This system provides a comprehensive solution for keeping parents informed about their children's school activities while maintaining security and scalability.