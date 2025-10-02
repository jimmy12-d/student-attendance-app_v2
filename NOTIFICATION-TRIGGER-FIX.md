# Notification Function Not Triggering - Diagnosis & Fix

## Date: October 1, 2025

## Problem
When admin sends notifications from the Notification Manager:
- ❌ **No logs appear** in `sendNotificationToStudents` Cloud Function
- ❌ **No FCM messages sent** to students
- ✅ Notification documents ARE being created in Firestore
- ✅ Bell badge updates in real-time (because of onSnapshot listener)
- ✅ Students can see notifications in notification panel
- ❌ But NO push notifications are sent

## Root Cause

The Eventarc trigger for `sendNotificationToStudents` has an **extra filter attribute** that shouldn't be there:

```yaml
eventFilters:
- attribute: namespace
  value: (default)
- attribute: document
  operator: match-path-pattern
  value: notifications/{docId}
- attribute: type  # ❌ THIS SHOULD NOT BE HERE
  value: google.cloud.firestore.document.v1.created
- attribute: database
  value: (default)
```

The `type` attribute is being treated as a **document field filter** instead of as the event type. This causes the trigger to look for documents where `type === 'google.cloud.firestore.document.v1.created'`, which never matches.

### Correct Configuration
Should only have these 3 filters:
- `namespace: (default)`
- `document: notifications/{docId}` (path pattern)
- `database: (default)`

The event type (`google.cloud.firestore.document.v1.created`) should be specified in the trigger definition, **not** as an event filter.

## Why It Happened

When using `onDocumentCreated` from `firebase-functions/v2/firestore`, the function definition might have been incorrectly parsed or the trigger got corrupted during a previous deployment.

## Solution

### Step 1: Redeploy the Function
Force redeploy to recreate the Eventarc trigger properly:

```bash
firebase deploy --only functions:sendNotificationToStudents --force
```

### Step 2: Verify Trigger After Deployment

Check that the trigger only has 3 event filters (not 4):

```bash
gcloud eventarc triggers describe sendnotificationtostudents-798982 \
  --location=asia-southeast1 \
  --project=rodwell-attendance
```

Expected output:
```yaml
eventFilters:
- attribute: namespace
  value: (default)
- attribute: document
  operator: match-path-pattern
  value: notifications/{docId}
- attribute: database
  value: (default)
# NO "type" attribute here!
```

### Step 3: Test After Deployment

1. **Send Test Notification**:
   - Go to Dashboard → Notification Manager
   - Send notification to yourself
   
2. **Check Logs Immediately**:
   ```bash
   gcloud logging read \
     "resource.type=cloud_function AND \
      resource.labels.function_name=sendNotificationToStudents AND \
      severity>=DEFAULT" \
     --limit 10 --project rodwell-attendance
   ```

3. **Expected Log Output**:
   ```
   Processing notification: Test Title (all)
   Found 1 target students
   Sending notification to 1 devices
   Notification sent successfully: 1 succeeded, 0 failed
   ```

## Alternative: Manual Trigger Recreation

If redeployment doesn't fix it, manually delete and recreate the trigger:

```bash
# 1. Delete the corrupted trigger
gcloud eventarc triggers delete sendnotificationtostudents-798982 \
  --location=asia-southeast1 \
  --project=rodwell-attendance

# 2. Redeploy the function (will create new trigger)
firebase deploy --only functions:sendNotificationToStudents
```

## Verification Steps

### 1. Check Function Is Active
```bash
firebase functions:list | grep sendNotification
```

Should show:
```
sendNotificationToStudents    v2    google.cloud.firestore.document.v1.created    asia-southeast1
```

### 2. Check Eventarc Trigger Exists
```bash
gcloud eventarc triggers list --location=asia-southeast1 | grep sendnotification
```

### 3. Send Test Notification & Monitor Logs
```bash
# In one terminal, tail the logs
gcloud logging tail "resource.labels.function_name=sendNotificationToStudents" \
  --project=rodwell-attendance

# In another window/phone, send notification from admin panel
```

### 4. Verify FCM Token Retrieval
The logs should show:
```
Processing notification: [Title] ([targetType])
Found [N] target students
Sending notification to [N] devices
```

If you see:
- ✅ "Processing notification..." → Function is triggering correctly
- ✅ "Found N target students" → Student query working
- ✅ "Sending notification to N devices" → FCM tokens retrieved
- ✅ "Notification sent successfully..." → Messages delivered to FCM

## Related Issues

### Issue 1: Read Count Not Updating
**Status**: Fixed by deploying `trackNotificationReadStatus` function
**Fix**: Cloud Function that increments `readCount` when students mark notifications as read

### Issue 2: No Foreground Notifications
**Status**: Already implemented in `useFirebaseMessaging.ts`
**Note**: This requires `sendNotificationToStudents` to actually send FCM messages first!

## Impact

With `sendNotificationToStudents` not triggering:
- ❌ No FCM messages sent (no push notifications at all)
- ❌ No foreground notifications (because no FCM message received)
- ✅ In-app notification center still works (reads directly from Firestore)
- ✅ Bell badge updates (onSnapshot listener)
- ❌ Can't test foreground notification fix until this is resolved

## Next Steps After Fix

Once `sendNotificationToStudents` is working:

1. **Test Foreground Notifications**:
   - Keep PWA open on iPhone
   - Send notification from admin
   - Should see system notification popup

2. **Test Read Count Tracking**:
   - Mark notification as read in PWA
   - Check admin panel - "Reads" should increment

3. **Monitor Cloud Function Costs**:
   - `sendNotificationToStudents`: Triggers on every notification creation
   - `trackNotificationReadStatus`: Triggers on every read status change
   - Should be minimal cost (< $1/month for typical usage)

## Debug Commands Reference

```bash
# Check function logs
firebase functions:log --only sendNotificationToStudents

# Check Cloud Function list
firebase functions:list

# Check Eventarc triggers
gcloud eventarc triggers list --location=asia-southeast1

# Describe specific trigger
gcloud eventarc triggers describe TRIGGER_NAME --location=asia-southeast1

# Check Pub/Sub subscription
gcloud pubsub subscriptions describe SUBSCRIPTION_NAME

# Tail logs in real-time
gcloud logging tail "resource.labels.function_name=sendNotificationToStudents"

# Check recent Firestore writes (for debugging)
# Note: Requires Firestore Admin API
```

## Expected Timeline

- **Deployment**: 2-3 minutes
- **Trigger Recreation**: Automatic during deployment
- **First Test**: Immediate after deployment completes
- **Verification**: 1-2 minutes of testing

Total time to resolution: ~5 minutes after deployment completes
