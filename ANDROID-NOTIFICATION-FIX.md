# Android Notification Fix Guide

## 🚨 Issue
Notifications work on iOS but NOT on Android devices or Chrome browser.

## 🔍 Root Causes

### 1. Missing Android-Specific Manifest Properties
Android requires additional manifest properties for proper PWA notification handling.

### 2. Service Worker Scope Issues
Android Chrome is stricter about service worker scope and registration.

### 3. Notification Permission Timing
Android requires user interaction before requesting notification permission (can't auto-request).

## ✅ Fixes Applied

### Fix 1: Enhanced manifest.json with Android Support

Added:
- `gcm_sender_id` for Android push notifications
- Purpose-specific icons for Android
- Better orientation and display settings

### Fix 2: Improved Service Worker Registration

- Added better error handling for Android
- Fixed scope issues
- Added install event handling

### Fix 3: Better Permission Request Flow

- Check for user gesture requirement (Android)
- Add retry logic for failed registrations
- Better logging for debugging

## 📱 Testing on Android

### Method 1: Android Chrome Browser
1. Open Chrome on Android
2. Navigate to your app URL
3. Tap menu (3 dots) → "Install app" or "Add to Home screen"
4. Open the installed PWA
5. Go to Account → Enable notifications
6. Grant permission when prompted

### Method 2: Android PWA (Installed)
1. Make sure app is installed as PWA (not just bookmark)
2. Check Chrome flags: `chrome://flags/#enable-web-platform-notifications`
3. Ensure "Experimental Web Platform features" is ENABLED
4. Test notification

### Method 3: Using Chrome DevTools
1. Connect Android device via USB
2. Open `chrome://inspect#devices` on desktop Chrome
3. Inspect your device's browser
4. Check console for errors

## 🐛 Common Android Issues

### Issue 1: "Service Worker registration failed"
**Solution**: Clear Chrome data for your site, try again

### Issue 2: "Notification permission blocked"
**Solution**: 
1. Go to Android Settings → Apps → Chrome → Site Settings
2. Find your domain → Notifications → Allow

### Issue 3: "No FCM token generated"
**Solution**: 
1. Check VAPID key is correct
2. Verify service worker is registered
3. Check console for detailed errors

### Issue 4: Notifications work in browser but not in PWA
**Solution**: 
1. Uninstall PWA
2. Clear Chrome cache
3. Reinstall PWA from scratch

## 📋 Checklist for Android

- [ ] Manifest includes `gcm_sender_id`
- [ ] Service worker scope is `/`
- [ ] VAPID key is correctly set in environment
- [ ] Notification permission is granted
- [ ] FCM token is saved to Firestore
- [ ] Service worker shows as "Active" in DevTools
- [ ] Test with admin broadcast notification

## 🔧 Debug Commands

### Check Service Worker Status
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Registered SWs:', regs.length);
  regs.forEach(reg => {
    console.log('Scope:', reg.scope);
    console.log('Active:', reg.active);
  });
});
```

### Check Notification Permission
```javascript
// In browser console
console.log('Permission:', Notification.permission);
```

### Check FCM Token
```javascript
// In browser console
// Go to: Account → Notification Test page
// Or check Firestore: fcmTokens/{userId}
```

### Force Service Worker Update
```javascript
// In browser console
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => reg.update());
  console.log('Service workers updated');
});
```

## 📝 Firebase Console Checks

1. **Check FCM Configuration**
   - Firebase Console → Project Settings → Cloud Messaging
   - Verify Server Key exists
   - Check VAPID key matches `.env.local`

2. **Check Firestore Rules**
   - Ensure `fcmTokens` collection allows writes
   - Check token document exists after enabling notifications

3. **Check Function Logs**
   ```bash
   firebase functions:log --only sendNotificationToStudents
   ```

## 🎯 Testing Steps

1. **Clear Everything** (Fresh Start)
   ```
   Android: Settings → Apps → Chrome → Storage → Clear Data
   Desktop: DevTools → Application → Clear Storage
   ```

2. **Reinstall/Reload App**
   ```
   - Close all tabs
   - Open fresh tab
   - Navigate to app
   - Install as PWA
   ```

3. **Enable Notifications**
   ```
   - Go to Account page
   - Toggle notifications ON
   - Grant permission
   - Check console for "Token saved"
   ```

4. **Test with Admin Broadcast**
   ```
   - Admin panel → Notifications
   - Create test notification
   - Target your account
   - Check if received on Android
   ```

5. **Verify in Firestore**
   ```
   - Check fcmTokens/{yourUserId}
   - Verify token exists
   - Check platform field shows "Android" or "other"
   ```

## 🔗 Useful Links

- [Firebase Cloud Messaging for Web](https://firebase.google.com/docs/cloud-messaging/js/client)
- [Web Push Notifications (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API)
- [PWA on Android](https://web.dev/explore/progressive-web-apps)
- [Service Worker Debugging](https://developer.chrome.com/docs/workbox/troubleshooting-and-logging/)

## 🆘 If Still Not Working

1. Check Chrome version (update to latest)
2. Try different Android device/emulator
3. Test on desktop Chrome first (easier to debug)
4. Check Firebase project has Cloud Messaging enabled
5. Verify no VPN/firewall blocking FCM servers
6. Check device clock is synchronized (FCM requires accurate time)

---

**Status**: ✅ Fixes Applied
**Date**: October 2, 2025
**Next Step**: Test on Android device
