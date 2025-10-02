# 📱 How to Access Notification Test Page in PWA

## For iPhone Users (PWA)

Since you're using a PWA (installed on home screen), you can't just type a URL. Here's how to access the notification test page:

### ✅ **Easy Access via Account Page**

1. Open your PWA app from home screen
2. Go to the **Account** tab (bottom navigation)
3. Scroll to **"Preferences"** section
4. Tap on **"Notification Test"**
5. You'll see the diagnostic page!

### 📍 **Visual Guide**

```
Home Screen → Open PWA App
    ↓
Bottom Navigation → Account Tab
    ↓
Scroll to "Preferences" Section
    ↓
Tap "Notification Test" 🔔
    ↓
Diagnostic Page Appears! 🎉
```

### 🎯 **What You'll See**

The diagnostic page will show:
- ✅ Browser support status
- ✅ Permission status (granted/denied)
- ✅ Service worker registrations
- ✅ FCM token status
- ✅ Platform info (iOS, PWA mode)
- 🔘 **"Test Local Notification"** button

### 🧪 **To Test Notifications**

1. Make sure notifications are **enabled** (toggle in Account page)
2. Open the diagnostic page
3. Tap **"Test Local Notification"** button
4. You should see a notification appear!

### 💡 **Alternative Methods**

If you need to access directly (not in PWA):

1. **On Desktop Browser**:
   - Open `https://localhost:3000/student/notification-test`
   - View full diagnostics on larger screen

2. **In Safari (not PWA)**:
   - Open Safari on iPhone
   - Go to `https://localhost:3000/login`
   - Login
   - Navigate to `/student/notification-test` manually

### 🆘 **Troubleshooting**

**Don't see "Notification Test" option?**
- Make sure you're logged in
- Check you're on the Account page
- Look under "Preferences" section (yellow/orange icon)

**Button doesn't work?**
- Check notification permission is granted
- Try enabling notifications first
- Reload the PWA

---

**Note**: The diagnostic page is now easily accessible to all users without needing to manually type URLs!
