# 🔧 Admin Notification Testing Guide

## Issue Fixed: FCM Token Permission Error ✅

The Firestore security rules have been updated to allow users to save their FCM tokens correctly.

### What Was Fixed:
- ✅ **Firestore Rules**: Updated `fcmTokens` collection rules to allow creation
- ✅ **Token Storage**: Users can now save their FCM tokens without permission errors
- ✅ **Diagnostic Page**: Enhanced to show more token details

## 📝 Testing Steps

### Step 1: Re-enable Notifications (After Rule Fix)

1. **On your iPhone PWA:**
   - Open the app
   - Go to **Account** page
   - **Turn OFF** notifications (toggle)
   - Wait 2 seconds
   - **Turn ON** notifications (toggle)
   - Grant permission when prompted

2. **Check the diagnostic page:**
   - Go to Account → Notification Test
   - Look for "FCM Token Registered" - should show ✅ Yes
   - Should show "Token Created At" timestamp
   - Should NOT show "missing or insufficient permissions" error

### Step 2: Verify Token is Saved

You can verify the token is saved in Firebase Console:

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project (rodwell-attendance)
3. Go to **Firestore Database**
4. Find collection: `fcmTokens`
5. Look for document with your user ID
6. Should contain:
   - `token`: (long string)
   - `userId`: (your auth UID)
   - `createdAt`: (timestamp)
   - `platform`: "iOS" or "other"
   - `isPWA`: true/false

### Step 3: Test Admin Notification

1. **From Admin Panel** (on desktop or another device):
   ```
   Go to: https://localhost:3000/dashboard/notification
   ```

2. **Create a test notification:**
   - Title: "Test Notification"
   - Body: "Testing push notification system"
   - Target: **By Student** (select your account)
   - Click "Create Notification"

3. **Check Your iPhone:**
   - Test with **app in foreground** (open) first
   - Should see notification appear as system notification
   - Test with **app in background** (minimized)
   - Test with **app closed** (may not work due to iOS limitations)

### Step 4: Check Cloud Function Logs

To see if the Cloud Function is sending notifications:

```bash
firebase functions:log --only sendNotificationToStudents --limit 20
```

Look for:
- "Processing notification: Test Notification"
- "Found X target students"
- "Sending notification to Y devices"
- "Notification sent successfully: X succeeded, Y failed"

## 🔍 Troubleshooting

### Issue: Still getting "missing or insufficient permissions"

**Solution:**
1. Make sure you deployed the new Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
2. Clear browser cache and reload
3. Re-enable notifications (toggle off → on)

### Issue: Token saved but no notifications received

**Possible causes:**

1. **iOS Limitations** (most likely):
   - Background notifications may not work on iOS PWAs
   - Try with app **open in foreground**

2. **Service Worker not running**:
   - Check Service Worker status in diagnostic page
   - Should show "Active: ✅ Yes"

3. **Cloud Function not triggering**:
   - Check Firebase Console → Functions → Logs
   - Look for `sendNotificationToStudents` execution

4. **Token mismatch**:
   - In diagnostic page, check "Token Preview"
   - In Firebase Console, verify the token exists in Firestore

### Issue: Notification sent but not showing

**Check iOS Settings:**
1. Go to **iPhone Settings → Notifications**
2. Find your PWA app
3. Ensure:
   - Allow Notifications: ON
   - Lock Screen: ON
   - Notification Center: ON
   - Banners: ON
4. Check **Focus Mode** is not blocking

### Issue: Admin can't send to specific student

**Verify:**
1. Student has enabled notifications
2. Student's FCM token exists in Firestore (`fcmTokens` collection)
3. Student's `authUid` matches the token's `userId`

## ⚡ Quick Test Commands

### Check if token exists for a user:
In Firebase Console → Firestore → fcmTokens → [find user's auth UID]

### Check Cloud Function status:
```bash
firebase functions:list | grep notification
```

### View recent function logs:
```bash
firebase functions:log --limit 50
```

### Deploy only rules (fast):
```bash
firebase deploy --only firestore:rules
```

### Deploy everything:
```bash
firebase deploy --only hosting,firestore:rules
```

## 📊 Expected Results

### ✅ Success Indicators:
- Diagnostic page shows "FCM Token Registered: ✅ Yes"
- No "permission" errors in console
- Token visible in Firebase Console (`fcmTokens` collection)
- Cloud Function logs show "Notification sent successfully"
- **Foreground notifications work** (app open)

### ⚠️ Known Limitations:
- Background notifications may not work on iOS (Apple limitation)
- Lock screen notifications unreliable on iOS PWAs
- Notification sounds may not play consistently

## 🎯 Next Steps After Testing

If foreground notifications work but background don't:
1. ✅ **Consider this expected behavior** on iOS PWAs
2. 📱 Emphasize the **in-app notification center** (bell icon)
3. 📧 Add **email notifications** as backup
4. 📱 Consider **native iOS app** for reliable push notifications

---

**Last Updated**: October 1, 2025
**Status**: Firestore rules fixed, ready for testing
