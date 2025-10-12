# Parent Absent Notification System

## Overview
This document describes the parent notification system for absent students, which automatically sends Telegram notifications to parents when their children are absent from class.

## Features

### 1. **Automated Notifications**
- Automatically notifies parents via Telegram when students are marked absent
- Configurable trigger times for Morning, Afternoon, and Evening shifts
- Scheduled to run every hour and check if notifications should be sent
- Only sends one notification per parent per day per absence

### 2. **Manual Notifications**
- Admin can manually trigger notifications from the Absent Follow-Up Dashboard
- Immediate notification with real-time feedback
- Useful for urgent cases or when automatic notifications need to be resent

### 3. **Notification Tracking**
- Tracks notification status: `success`, `failed`, `pending`, `no_parent`
- Records timestamp of when notification was sent
- Counts number of notifications sent
- Logs any errors that occur during sending

### 4. **Admin Configuration**
- Configure notification trigger times for each shift:
  - **Morning Shift**: Default 09:00
  - **Afternoon Shift**: Default 14:00
  - **Evening Shift**: Default 18:00
- Enable/disable automatic notifications system-wide
- Settings stored in Firestore collection `absentNotificationSettings`

## Database Schema

### AbsentFollowUp Collection (Updated)
```typescript
{
  id: string;
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: 'Absent' | 'Contacted' | 'Waiting for Response' | 'Resolved';
  notes?: string;
  updatedAt: Date | Timestamp;
  updatedBy: string;
  
  // NEW: Parent Notification Fields
  parentNotificationStatus?: 'success' | 'failed' | 'pending' | 'no_parent' | null;
  parentNotificationTimestamp?: Date | Timestamp | null;
  parentNotificationsSent?: number;
  parentNotificationError?: string | null;
}
```

### AbsentNotificationSettings Collection (New)
```typescript
{
  id: 'default'; // Single document
  morningTriggerTime: string; // HH:mm format (e.g., "09:00")
  afternoonTriggerTime: string; // HH:mm format (e.g., "14:00")
  eveningTriggerTime: string; // HH:mm format (e.g., "18:00")
  enabled: boolean;
  updatedAt?: Date | Timestamp;
  updatedBy?: string;
}
```

## Cloud Functions

### 1. `notifyParentAbsence` (Callable Function)
**Purpose**: Sends Telegram notification to parent(s) about student absence

**Parameters**:
```typescript
{
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  absentFollowUpId?: string; // Optional, for updating the record
}
```

**Returns**:
```typescript
{
  success: boolean;
  status: 'success' | 'failed' | 'no_parent' | 'partial';
  message: string;
  notificationsSent: number;
  failedNotifications?: number;
  errors?: string;
}
```

**Features**:
- Retrieves active parent notifications for the student
- Formats message in Khmer language
- Includes student name, class, shift, and absence date
- Updates `absentFollowUps` document with notification status
- Handles blocked bots by deactivating notifications
- Returns detailed status and error information

**Message Format** (Khmer):
```
⚠️ **ការជូនដំណឹងអវត្តមាន**

👤 **សិស្ស:** [Student Khmer Name]
🏫 **ថ្នាក់:** [Class]
⏰ **វេន:** [Shift]
📅 **កាលបរិច្ឆេទ:** [Date in Khmer]

❌ កូនរបស់បងមិនបានមកសាលារៀននៅថ្ងៃនេះទេ។

សូមទាក់ទងសាលារៀនប្រសិនបើមានបញ្ហាឬហេតុផលអ្វីមួយ។
```

### 2. `scheduledAbsentParentNotifications` (Scheduled Function)
**Purpose**: Automatically sends notifications at configured trigger times

**Schedule**: Runs every 1 hour

**Timezone**: Asia/Phnom_Penh

**Logic**:
1. Checks current time against configured trigger times
2. Identifies which shift to process (Morning/Afternoon/Evening)
3. Fetches all absent follow-ups for today with matching shift
4. Filters out students already notified today
5. Calls `notifyParentAbsence` for each student
6. Logs processing summary

**Returns**:
```typescript
{
  processed: number; // Number of students processed
  sent: number; // Total notifications sent
  failed: number; // Failed notifications
}
```

## UI Components

### 1. `AbsentNotificationSettings` Component
**Location**: `app/dashboard/students/components/AbsentNotificationSettings.tsx`

**Features**:
- Toggle to enable/disable automatic notifications
- Time inputs for each shift's trigger time
- Visual indicators for each shift (Morning 🌅, Afternoon ☀️, Evening 🌙)
- Real-time preview of notification times
- Information panel explaining how the system works
- Save button with loading state

**Usage**:
```typescript
import { AbsentNotificationSettingsComponent } from './components/AbsentNotificationSettings';

// In admin page
<AbsentNotificationSettingsComponent />
```

### 2. `AbsentFollowUpDashboard` Component (Updated)
**Location**: `app/dashboard/students/components/AbsentFollowUpDashboard.tsx`

**New Features**:
- **Parent Notification Column**: Shows notification status, timestamp, and errors
- **Send Notification Button**: Manually trigger notification for each student
- **Real-time Status Updates**: Automatically refreshes after sending
- **Loading States**: Shows spinner while sending notification
- **Error Handling**: Displays user-friendly error messages

**Column Display**:
- ✓ Sent (X) - Green badge showing successful notifications
- ✗ Failed - Red badge for failed notifications
- No Parent - Gray badge when no parent is registered
- ⏳ Pending - Yellow badge for pending notifications
- Timestamp - Shows when notification was sent
- Error message - Truncated error details on hover

## Integration Steps

### Step 1: Deploy Cloud Functions
```bash
cd functions
npm install
firebase deploy --only functions:notifyParentAbsence,functions:scheduledAbsentParentNotifications
```

### Step 2: Configure Notification Settings
1. Navigate to the Absent Follow-Up Dashboard
2. Open Notification Settings
3. Set trigger times for each shift:
   - Morning: When morning classes typically start (e.g., 09:00)
   - Afternoon: When afternoon classes typically start (e.g., 14:00)
   - Evening: When evening classes typically start (e.g., 18:00)
4. Enable automatic notifications
5. Save settings

### Step 3: Set Up Firestore Indexes
The system requires indexes for efficient querying:

```javascript
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "absentFollowUps",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "date", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    }
  ]
}
```

Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

### Step 4: Test the System

#### Manual Test:
1. Mark a student as absent in the attendance system
2. Go to Absent Follow-Up Dashboard
3. Find the absent student
4. Click "Send Notification" button
5. Verify notification appears in parent's Telegram

#### Automatic Test:
1. Configure trigger time to current time + 5 minutes
2. Mark a student as absent
3. Wait for the scheduled function to run
4. Check notification status in dashboard
5. Verify parent received Telegram message

## Notification Flow

### Automatic Flow
```
[Hourly Scheduler]
    ↓
[Check Current Time vs Trigger Times]
    ↓
[Identify Target Shift]
    ↓
[Query Absent Students for Today]
    ↓
[Filter by Shift]
    ↓
[Check if Already Notified]
    ↓
[Send Notification via Telegram Bot]
    ↓
[Update AbsentFollowUp Record]
    ↓
[Log Results]
```

### Manual Flow
```
[Admin Clicks "Send Notification"]
    ↓
[Call notifyParentAbsence Function]
    ↓
[Retrieve Parent Notification Settings]
    ↓
[Send Notification via Telegram Bot]
    ↓
[Update AbsentFollowUp Record]
    ↓
[Show Toast Notification]
    ↓
[Refresh Dashboard]
```

## Error Handling

### Common Errors and Solutions

#### 1. "No active parent registered"
- **Cause**: Student's parent hasn't registered with Telegram bot
- **Solution**: Ask parent to register with bot
- **Status**: `no_parent`

#### 2. "Parent bot configuration error"
- **Cause**: Missing `TELEGRAM_PARENT_BOT_TOKEN` secret
- **Solution**: Set up the secret in Firebase Functions
- **Status**: `failed`

#### 3. "Blocked by user"
- **Cause**: Parent blocked the Telegram bot
- **Solution**: System automatically deactivates notifications
- **Status**: `failed`

#### 4. Network Errors
- **Cause**: Telegram API unavailable
- **Solution**: System will retry on next scheduled run
- **Status**: `failed`

## Security Considerations

1. **Function Authentication**: 
   - `notifyParentAbsence` is a callable function (requires Firebase auth)
   - Only authenticated admin users can call it

2. **Data Privacy**:
   - Only sends notifications to registered parents
   - Uses student's Khmer name (more personal)
   - Doesn't expose sensitive student data

3. **Rate Limiting**:
   - One notification per parent per day per absence
   - Prevents spam and bot blocking

4. **Error Logging**:
   - All errors logged to Cloud Functions logs
   - Sensitive data not included in error messages

## Monitoring and Maintenance

### Check Logs
```bash
# View function logs
firebase functions:log --only notifyParentAbsence
firebase functions:log --only scheduledAbsentParentNotifications

# Filter by error
firebase functions:log --only notifyParentAbsence | grep ERROR
```

### Monitor Metrics
- Number of notifications sent per day
- Success rate
- Failed notifications
- Students without registered parents

### Regular Maintenance
1. **Weekly**: Check failed notifications and investigate causes
2. **Monthly**: Review notification timing and adjust if needed
3. **Quarterly**: Verify all active parents are still receiving notifications

## Future Enhancements

1. **Multi-language Support**: Add English language option
2. **SMS Fallback**: Send SMS if Telegram notification fails
3. **Custom Messages**: Allow admins to customize notification templates
4. **Batch Notifications**: Send summary of multiple absences
5. **Notification History**: View complete history of all sent notifications
6. **Analytics Dashboard**: Visual statistics on notification effectiveness

## Troubleshooting

### Notifications Not Sending
1. Check if automatic notifications are enabled
2. Verify trigger time matches current time window
3. Check student's shift matches current processing window
4. Verify parent has active Telegram registration
5. Check Cloud Functions logs for errors

### Wrong Trigger Time
1. Ensure timezone is set to Asia/Phnom_Penh
2. Verify trigger times in settings are correct
3. Check server time vs local time

### Parent Not Receiving
1. Verify parent's Telegram bot is not blocked
2. Check parent's notification settings in database
3. Ensure parent's chat ID is correct
4. Test with manual notification first

## Contact and Support

For issues or questions:
1. Check Cloud Functions logs first
2. Review this documentation
3. Contact system administrator
4. Submit GitHub issue (if applicable)

---

**Version**: 1.0.0  
**Last Updated**: October 11, 2025  
**Author**: System Development Team
