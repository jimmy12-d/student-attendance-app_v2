# 🚀 Missed Quiz System - Quick Start Guide

## What You Have Now

Your face scan system now **automatically detects** students who were absent on **October 14, 2025** and reminds them to complete their co-learning.

## How to Use

### 1. **Enable the Overlay** (if not already enabled)

1. Open the face scan page: `/dashboard/face-scan-faceapi`
2. Click the **"⚙️ Overlay Settings"** button (blue button, top right area)
3. Find **"📝 MISSED_QUIZ"** in the list
4. Make sure the toggle is **ON** (green)
5. Close the settings modal

### 2. **Test It**

Try with **Test Testing** (one of the absent students):

1. Have Test Testing scan their face
2. ✅ Attendance will be marked for today
3. ⚠️ Orange overlay will appear: **"FINISH YOUR CO-LEARNING"**
4. Overlay auto-dismisses after 10 seconds

### 3. **Verify**

Watch the browser console (F12 → Console tab):

**For absent student:**
```
📝 Test Testing missed quiz on 2025-10-14 - showing overlay
```

**For present student:**
```
✅ Student Name was present on 2025-10-14 - no overlay needed
```

## Students Who Will See the Overlay

All **47 valid students** from your list who were absent on Oct 14, 2025, including:

- Test Testing (Class 12B, Afternoon)
- Dina Molika (Class 12M, Morning)
- Ja Morant (Class 12A, Afternoon)
- Ross K-Ro (Class 12I, Morning)
- Bun Sivyean (Class 12S, Afternoon)
- _...and 42 more_

## How It Works

```
Student scans face
    ↓
Attendance marked for TODAY ✅
    ↓
System checks: Does student have attendance for Oct 14?
    ↓
NO → Show overlay ⚠️
YES → No overlay ✅
```

**Data Source:** Your existing `attendance` collection in Firestore  
**No uploads needed:** Works automatically!

## Troubleshooting

### Overlay not showing?

**Check 1:** Is overlay enabled?
- Open Overlay Settings
- Make sure MISSED_QUIZ toggle is ON

**Check 2:** Does student have attendance record for Oct 14?
- Open Firestore console
- Check `attendance` collection
- Search for studentId + date: "2025-10-14"
- If record exists, student was present (no overlay)

**Check 3:** Browser console errors?
- Press F12 → Console tab
- Look for error messages

### Overlay showing for wrong students?

**This means they were absent on Oct 14!**
- Verify in your attendance records
- If they were actually present, add their attendance record for Oct 14
- System will automatically stop showing overlay

### Want to disable the overlay?

1. Click "⚙️ Overlay Settings"
2. Toggle MISSED_QUIZ to OFF
3. System stops checking immediately

## Configuration

### Change the quiz date:
Edit `page.tsx` line ~1090:
```javascript
const missedQuizDate = '2025-10-14'; // Change date here
```

### Change the overlay message:
Edit `overlayConfigs.ts`:
```typescript
MISSED_QUIZ: {
  title: '📝 MISSED QUIZ',
  message: 'FINISH YOUR CO-LEARNING', // Change this
  subtitle: 'You missed the quiz on October 14, 2025', // Or this
}
```

## Advanced: Track Completion

To stop showing overlay after student completes co-learning:

1. Create a `quiz_completions` collection in Firestore
2. When student completes co-learning, add document:
   ```javascript
   {
     studentId: "xSZm547NSPLvz6XNsRe0",
     completed: true,
     completedAt: timestamp
   }
   ```
3. Modify check logic in `page.tsx` to query this collection

## Documentation

📖 **Full Guide:** `MISSED-QUIZ-AUTOMATIC-CHECK-GUIDE.md`  
📊 **Visual Flow:** `MISSED-QUIZ-VISUAL-FLOW.md`  
📋 **Summary:** `MISSED-QUIZ-IMPLEMENTATION-SUMMARY.md`

## Summary

✅ **Ready to use** - No setup needed!  
✅ **Automatic** - Uses existing attendance data  
✅ **Smart** - Only shows for absent students  
✅ **Controlled** - Toggle on/off via settings  
✅ **Works with your 50 absent students**

🎯 **Just enable and test!**

---

**Need help?** Check the console logs or review the full documentation files.
