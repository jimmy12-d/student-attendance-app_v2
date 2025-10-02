# Complete Notification Testing Guide

## Current Situation
After redeploying Cloud Functions, you need to test:
1. ✅ Bell icon updates in real-time (already working)
2. ❓ Push notifications appear when app is in foreground
3. ❓ Admin panel shows read counts updating

## Prerequisites - ON YOUR iPHONE PWA

### Step 1: Verify Notification Permission
1. Open PWA
2. Go to: **Account** → **Preferences**
3. Check **"Enable Notifications"** toggle is **ON** (green)
4. If OFF, toggle it ON and allow permission when prompted

### Step 2: Verify FCM Token
1. In PWA, go to: **Account** → **Notification Test**
2. Check these sections:
   - ✅ **Permission Status**: Should show "granted"
   - ✅ **Service Worker**: Should show "Registered"
   - ✅ **FCM Token**: Should show "Yes" with preview

### Step 3: Get Your FCM Token (for manual testing)
1. Still on Notification Test page
2. Scroll to **"FCM Token Status"** section
3. You'll see something like: `BDxp9w...` (first 30 characters)
4. Open browser dev tools in Safari (if possible) or just remember it's there

---

## Test 1: Verify Cloud Function is Triggering

### From Computer (Admin Panel):
1. Open: **Dashboard** → **Notification Manager**
2. Fill in notification:
   - Title: `Test 1 - Function Trigger`
   - Body: `Testing if function triggers`
   - Target: **All Students** (or just yourself)
3. Click **"Send Notification"**

### Check Logs (Computer Terminal):
```bash
# Wait 2-3 seconds, then check:
firebase functions:log --only sendNotificationToStudents --limit 10
```

### Expected Output:
```
Processing notification: Test 1 - Function Trigger (all)
Found 1 target students
Sending notification to 1 devices
Notification sent successfully: 1 succeeded, 0 failed
```

### If NO LOGS:
- ❌ Function is not triggering
- Check: `firebase functions:list | grep sendNotification`
- Should see the function listed

---

## Test 2: Foreground Notifications (Main Test)

### Setup on iPhone PWA:
1. **Keep PWA open** and active
2. Stay on any page (e.g., Dashboard)
3. Don't have notifications panel open
4. Screen must be ON and unlocked

### From Computer (Admin Panel):
1. **Dashboard** → **Notification Manager**
2. Send notification:
   - Title: `Test 2 - Foreground`
   - Body: `You should see this popup!`
   - Target: Yourself

### Expected Behavior on iPhone:
**Within 1-2 seconds:**
- ✅ System notification should appear at TOP of screen
- ✅ Bell badge should update (e.g., 0 → 1 or 3 → 4)
- ✅ Can tap notification to navigate

### If NO Notification Appears:
Check in order:

#### A. Check Browser Console (if accessible):
- Safari → Develop → iPhone → localhost
- Look for:
  - `[useFirebaseMessaging] Message received in foreground`
  - Any errors

#### B. Re-toggle Notification Permission:
1. Account → Preferences
2. Toggle "Enable Notifications" **OFF**
3. Wait 2 seconds
4. Toggle "Enable Notifications" **ON**
5. Allow permission again
6. Try sending notification again

#### C. Check FCM Token is Valid:
1. Go to Notification Test page
2. Verify FCM Token shows "Yes"
3. If "No" or undefined:
   - Close PWA completely
   - Re-open from home screen
   - Check again

#### D. Test Local Notification:
1. On Notification Test page
2. Click **"Test Local Notification"** button
3. If this works but FCM doesn't:
   - Problem is with FCM message delivery
   - Check Cloud Function logs

---

## Test 3: Background Notifications (iOS Limitation)

### Setup on iPhone:
1. Close PWA completely (swipe up)
2. Or minimize it (press home button)

### From Computer:
1. Send notification from admin panel

### Expected Behavior:
- ❌ **Will NOT work** - iOS PWA limitation
- This is normal and expected
- No system notification when app is closed/minimized

### Workaround:
- Keep PWA open when expecting notifications
- Check bell icon periodically
- Badge shows unread count

---

## Test 4: Read Count Updates

### Setup:
1. Send 2-3 notifications from admin panel
2. Keep admin panel open on computer
3. Note current "Reads" count (should be 0)

### On iPhone PWA:
1. Click bell icon
2. See unread notifications (blue dots)
3. Click **checkmark button** on one notification (mark as read)

### Expected on Computer (Admin Panel):
- ✅ "Reads" count should increment: 0 → 1
- ✅ "Unread" count should decrement
- ✅ Updates within 1-2 seconds (real-time)

### Test "Mark All as Read":
1. On iPhone: Click **"Mark all as read"** button
2. On Computer: Watch "Reads" count jump by number of notifications

---

## Test 5: Mark All as Read

### On iPhone PWA:
1. Bell icon → have 3+ unread notifications
2. Click **"Mark all as read"** button

### Expected:
- ✅ All blue dots disappear
- ✅ Admin panel "Reads" count increases by 3+
- ✅ Badge on bell icon goes to 0

---

## Debugging Commands

### Check if functions are deployed:
```bash
firebase functions:list
```

### Check function logs:
```bash
# Recent logs
firebase functions:log --only sendNotificationToStudents --limit 20

# Real-time tail
gcloud logging tail "resource.labels.function_name=sendNotificationToStudents" --project=rodwell-attendance
```

### Check Eventarc trigger:
```bash
gcloud eventarc triggers describe sendnotificationtostudents-* \
  --location=asia-southeast1 \
  --project=rodwell-attendance
```

### Verify trigger has correct filters (should have 3, not 4):
```bash
gcloud eventarc triggers describe sendnotificationtostudents-* \
  --location=asia-southeast1 \
  --project=rodwell-attendance \
  | grep -A 10 "eventFilters"
```

Expected:
```yaml
eventFilters:
- attribute: database
  value: (default)
- attribute: namespace
  value: (default)
- attribute: document
  operator: match-path-pattern
  value: notifications/{docId}
# Should NOT have "type" attribute!
```

---

## Troubleshooting Matrix

| Symptom | Cause | Solution |
|---------|-------|----------|
| No function logs at all | Function not triggering | Check Eventarc trigger, redeploy |
| Function logs show "0 target students" | No FCM tokens in database | Check notification test page, re-enable permissions |
| Function logs show "0 devices" | FCM tokens not retrieved | Check Firestore `fcmTokens` collection |
| Function logs show "1 succeeded" but no notification | Foreground handler not working | Check browser console, verify onMessage handler |
| Local notification works, FCM doesn't | FCM delivery issue | Check Cloud Function message format |
| Bell badge updates but no popup | Real-time listener working, FCM not | Check useFirebaseMessaging hook |
| Notification appears only after clicking bell | Not using foreground notifications | Normal if app was closed (iOS limit) |
| Read count not updating | trackNotificationReadStatus not deployed | Deploy the function |
| "Permission denied" in console | Firestore rules | Already fixed, redeploy rules if needed |

---

## Success Criteria

### ✅ Everything Working:
1. Send notification from admin
2. **iPhone PWA (foreground)**: System notification appears
3. Bell badge updates: 0 → 1
4. Click bell: See notification in list
5. Mark as read: Blue dot disappears
6. **Admin panel**: "Reads" count increases automatically

### ⚠️ Partial Working (iOS Limitations):
1. ✅ Foreground notifications work
2. ✅ Bell badge updates
3. ✅ In-app notification center works
4. ✅ Read counts update
5. ❌ Background notifications don't work (iOS PWA limitation - expected)

---

## If Nothing Works - Nuclear Option

### 1. Clear Everything:
```bash
# Delete both functions
firebase functions:delete sendNotificationToStudents --force
firebase functions:delete trackNotificationReadStatus --force
```

### 2. Redeploy Both:
```bash
firebase deploy --only functions:sendNotificationToStudents,trackNotificationReadStatus
```

### 3. On iPhone:
1. Delete PWA from home screen
2. Clear Safari cache: Settings → Safari → Clear History and Website Data
3. Re-visit https://localhost:3000
4. Add to Home Screen again
5. Open PWA
6. Enable notifications again

### 4. Test again from step 1

---

## Manual FCM Test (Advanced)

If you want to test FCM directly (bypassing Cloud Function):

### On iPhone PWA:
1. Go to Notification Test page
2. Note the FCM token (first 30 chars shown)

### On Computer:
1. Get full FCM token from Firestore:
   ```bash
   # Using Firebase console
   # Go to: Firestore Database → fcmTokens → [your-user-id]
   # Copy the "token" field
   ```

2. Send test message:
   ```bash
   node /tmp/test-notification.js "YOUR_FCM_TOKEN_HERE"
   ```

### Expected:
- ✅ Notification should appear on iPhone
- ✅ Confirms FCM path is working
- If this works: Problem is in Cloud Function
- If this doesn't work: Problem is with FCM token or device

---

## Timeline

- Function deployment: ~2-3 minutes
- First notification test: Immediate after deployment
- Expected total time: ~5 minutes to verify everything works

## Need Help?

Check the logs in this order:
1. Browser console (iPhone Safari dev tools)
2. Firebase function logs
3. Eventarc trigger configuration
4. Firestore rules
5. FCM token validity
