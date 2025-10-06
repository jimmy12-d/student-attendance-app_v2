# 📱 Android Notification Version Tracking

## Overview

After implementing the Android notification fixes (v2.2.0-android-fix), we now track which students have updated their PWA installation with the latest notification system. This is especially important for Android users who need to **reinstall the PWA** to get the notification fixes.

---

## 🎯 Why This Matters

### The Android Notification Fix

On **October 2, 2025**, we implemented critical Android notification fixes:
- Added `gcm_sender_id` to manifest.json (required for Android push)
- Added service worker lifecycle events (install/activate)
- Added Android-specific notification options (vibrate, timestamp)

### The Problem

**Android users need to reinstall the PWA** for these fixes to take effect:
1. Service worker needs to update to v2.2.0-android-fix
2. Manifest changes need to be re-registered
3. New FCM token needs to be generated with updated configuration

Simply clearing cache or reloading the page **is not enough** - the PWA must be uninstalled and reinstalled.

---

## 🔍 Tracking System

### How It Works

1. **Token Storage**: When a student enables notifications, we save:
   ```typescript
   {
     token: "...",
     userId: "authUid",
     platform: "iOS" | "Android" | "other",
     swVersion: "v2.2.0-android-fix",
     lastUpdated: Timestamp
   }
   ```

2. **Data Fetching**: Admin dashboard fetches notification data from `fcmTokens` collection

3. **Visual Indicators**: Student row shows notification status with color-coded badges

### Data Flow

```
Student enables notifications
  ↓
useFirebaseMessaging detects SW version
  ↓
Saves to fcmTokens/{authUid}
  ↓
Admin dashboard fetches and merges with student data
  ↓
StudentRow displays status badge
```

---

## 📊 Notification Version Column

### Column Configuration

**Location**: Dashboard → Students → Column Visibility → "Notif Version"

**Default**: Disabled (opt-in)

**Purpose**: Show which students have the latest notification system

### Status Badges

| Badge | Platform | Meaning | Action Required |
|-------|----------|---------|----------------|
| 🔴 **Android (old) REINSTALL** | Android | Has outdated notification system | **URGENT**: Student needs to reinstall PWA |
| ✅ **Android ✓** | Android | Has v2.2.0-android-fix | None - notifications working |
| ✅ **iOS ✓** | iOS | Has notifications enabled | None - iOS always works |
| ⚠️ **No Notif Setup** | Any | Logged in but never enabled notifications | Student needs to enable notifications |
| ⚪ **Not Logged In** | N/A | Student hasn't logged into portal | Student needs to log in first |
| ❓ **Unknown** | Other | Desktop or unknown platform | Check with student |

---

## 🚨 Identifying Students Who Need to Reinstall

### Method 1: Enable the Column

1. Go to Dashboard → Students
2. Scroll to "Column Visibility" panel
3. Enable "Notif Version"
4. Look for 🔴 **red "REINSTALL" badges**

### Method 2: Check Portal Status

Students who are "Logged In" or "Used QR" but have no notification setup likely need to:
1. Enable notifications (if they haven't)
2. Reinstall PWA (if they're Android)

---

## 📱 How Students Should Reinstall

### Android Reinstallation Steps

1. **Uninstall Current PWA**:
   - Long press the app icon
   - Select "App info"
   - Tap "Uninstall"

2. **Clear Browser Data** (Chrome):
   - Open Chrome
   - Go to Settings → Privacy and security → Clear browsing data
   - Select "Cached images and files"
   - Clear data

3. **Reinstall PWA**:
   - Open Chrome browser
   - Navigate to your portal URL
   - Tap menu (⋮) → "Install app" or "Add to Home screen"
   - Follow prompts

4. **Enable Notifications**:
   - Open installed PWA
   - Go to Account page
   - Enable notifications
   - Grant permission when prompted

---

## 🔧 Technical Implementation

### Files Modified

#### 1. `/app/_hooks/useFirebaseMessaging.ts`

Added service worker version detection:

```typescript
// Detect service worker version
let swVersion = 'unknown';
try {
  const swRegistration = await navigator.serviceWorker.getRegistration();
  if (swRegistration && swRegistration.active) {
    swVersion = 'v2.2.0-android-fix';
  }
} catch (error) {
  console.warn('Could not detect service worker version:', error);
}

// Save with version
await setDoc(doc(db, 'fcmTokens', userId), {
  // ... other fields
  swVersion: swVersion,
  lastUpdated: serverTimestamp()
}, { merge: true });
```

#### 2. `/app/_interfaces/index.ts`

Added notification tracking fields to Student interface:

```typescript
export interface Student {
  // ... existing fields
  
  // Notification system version tracking (from fcmTokens collection)
  notificationVersion?: string; // e.g., 'v2.2.0-android-fix'
  notificationPlatform?: 'iOS' | 'Android' | 'other';
  notificationLastUpdated?: Timestamp | Date;
}
```

#### 3. `/app/dashboard/students/page.tsx`

Fetch and merge notification data:

```typescript
// Fetch FCM notification versions
const fcmTokensRef = collection(db, "fcmTokens");
const fcmTokensSnapshot = await getDocs(fcmTokensRef);

// Create map of authUid -> notification data
const notificationVersionsMap = new Map();
fcmTokensSnapshot.docs.forEach(doc => {
  const fcmData = doc.data();
  if (fcmData.userId) {
    notificationVersionsMap.set(fcmData.userId, {
      notificationVersion: fcmData.swVersion || 'unknown',
      notificationPlatform: fcmData.platform || 'other',
      notificationLastUpdated: fcmData.lastUpdated || fcmData.createdAt
    });
  }
});

// Merge with student data
const studentsWithTokens = studentsData.map(student => {
  const notificationData = student.authUid ? notificationVersionsMap.get(student.authUid) : null;
  return { ...student, ...(notificationData || {}) };
});
```

#### 4. `/app/dashboard/students/TableStudents.tsx`

Added new column:

```typescript
const defaultColumns: ColumnConfig[] = [
  // ... existing columns
  { id: 'notificationVersion', label: 'Notif Version', enabled: false },
];
```

#### 5. `/app/dashboard/students/components/StudentRow.tsx`

Added notification status display:

```typescript
case 'notificationVersion':
  const needsUpdate = student.notificationPlatform === 'Android' && 
                     (!student.notificationVersion || 
                      student.notificationVersion !== 'v2.2.0-android-fix');
  
  // Display appropriate badge based on status
  // Red animated badge for Android users needing reinstall
  // Green badge for up-to-date Android users
  // Blue badge for iOS users
  // etc.
```

---

## 📋 Admin Workflow

### Weekly Check

1. Enable "Notif Version" column
2. Scan for red "REINSTALL" badges
3. Contact those students directly
4. Provide reinstallation instructions

### When Helping Students

**Student says**: "I'm not getting notifications on Android"

**Admin checks**:
1. Portal column - Are they logged in?
2. Notif Version column - Do they have the old version?

**Admin tells student**:
- "You need to reinstall the app for the notification fix"
- Send them this guide: `/android-notification-test.html`
- Or walk them through uninstall → reinstall → enable notifications

---

## 🎯 Success Metrics

### How to Know It's Working

After a student reinstalls:
1. Their badge changes from 🔴 **REINSTALL** to ✅ **Android ✓**
2. `notificationVersion` updates to `v2.2.0-android-fix`
3. `lastUpdated` timestamp changes to recent date
4. Test notifications work on their device

---

## ⚙️ Configuration

### Service Worker Version

Current expected version: **`v2.2.0-android-fix`**

Defined in:
- `/public/firebase-messaging-sw.js` (line 3)
- `/app/_hooks/useFirebaseMessaging.ts` (detection logic)

### Future Updates

When updating service worker:
1. Change `SW_VERSION` in `firebase-messaging-sw.js`
2. Update comparison in `StudentRow.tsx`
3. Update documentation

---

## 🐛 Troubleshooting

### Badge Shows "Unknown"

**Cause**: Student enabled notifications before tracking was implemented

**Solution**: Student needs to disable and re-enable notifications in Account page

### Badge Not Updating After Reinstall

**Cause**: Old FCM token still cached

**Solution**:
1. Student: Disable notifications in Account page
2. Student: Close app completely
3. Student: Reopen app
4. Student: Re-enable notifications
5. Admin: Refresh dashboard

### Android Shows Green But Notifications Don't Work

**Possible causes**:
1. Browser notifications blocked in Android settings
2. Battery saver mode restricting notifications
3. Chrome data saver blocking push
4. Firewall/VPN interfering with FCM

**Debug**:
- Use `/android-notification-test.html` diagnostic page
- Check Chrome notification settings
- Test with admin broadcast notification

---

## 📝 Related Documentation

- [ANDROID-NOTIFICATION-FIX.md](./ANDROID-NOTIFICATION-FIX.md) - Technical fixes applied
- [android-notification-test.html](./public/android-notification-test.html) - Diagnostic tool
- [NOTIFICATION-SYSTEM-README.md](./NOTIFICATION-SYSTEM-README.md) - Overall notification system

---

## 📅 Version History

| Version | Date | Changes |
|---------|------|---------|
| v2.2.0-android-fix | Oct 2, 2025 | Initial Android fix with tracking |
| v2.1.0-clean | Oct 1, 2025 | iOS fix (before tracking) |

---

## 💡 Best Practices

### For Admins

- Enable "Notif Version" column weekly to check for issues
- Proactively reach out to Android users with old versions
- Keep track of students who successfully reinstall

### For Students

- Reinstall PWA after admin announces notification updates
- Test notifications after reinstalling
- Contact admin if notifications still don't work after reinstall

---

**Last Updated**: October 2, 2025
**Status**: ✅ Active and tracking
**Next Review**: When next notification system update is deployed
