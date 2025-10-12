# Parent Bot Testing Guide

## Quick Testing Checklist

### ✅ Test 1: Menu Buttons Everywhere
**Goal:** Verify menu buttons appear on every message

**Steps:**
1. Open parent bot in Telegram
2. Send any command: `/start`, `/attendance`, `/payment`, `/help`
3. Check every response

**Expected Result:**
- Every message should have 4 buttons at the bottom:
  - 📅 ពិនិត្យវត្តមាន
  - 💰 ពិនិត្យបង់ថ្លៃ
  - 📝 លទ្ធផលប្រលង
  - ❓ ជំនួយ

---

### ✅ Test 2: Regular Class Attendance Only
**Goal:** Check attendance display for regular class student

**Test Data:**
- Student: Attends only regular class (Class 12A Morning)
- Date: Today
- Attendance time: 07:25

**Steps:**
1. Send `/attendance` to bot
2. Check response

**Expected Output:**
```
📅 ពិនិត្យវត្តមានសិស្ស

👤 [Student Name]
   🏫 ថ្នាក់ទី១២ក (ព្រឹក)
   ✅ បានមកដល់សាលា
   🕐 ម៉ោង ០៧:២៥ នាទី
   📊 មកមុនម៉ោង ៥ នាទី 🟢

[4 menu buttons]
```

---

### ✅ Test 3: BP Class Attendance Only
**Goal:** Check attendance display for BP class student

**Test Data:**
- Student: Attends only BP class (Class 12BP Evening)
- Date: Today
- Attendance time: 17:35

**Steps:**
1. Send `/attendance` to bot
2. Check response

**Expected Output:**
```
📅 ពិនិត្យវត្តមានសិស្ស

👤 [Student Name]
   🏫 ថ្នាក់ទី១២BP (ល្ងាច)
   ✅ បានមកដល់សាលា
   🕐 ម៉ោង ១៧:៣៥ នាទី
   📊 មកត្រឹមម៉ោង ✅

[4 menu buttons]
```

---

### ✅ Test 4: Both Regular + BP Attendance (CRITICAL!)
**Goal:** Verify BOTH attendance records appear

**Test Data:**
- Student: Attends BOTH regular and BP class
  - Morning: Class 12A at 07:20
  - Evening: Class 12BP at 17:40
- Date: Today

**Steps:**
1. Mark student attendance for Morning shift (Class 12A)
2. Mark student attendance for Evening shift (Class 12BP)
3. Send `/attendance` to bot
4. Check response shows BOTH records

**Expected Output:**
```
📅 ពិនិត្យវត្តមានសិស្ស

👤 [Student Name]
   🏫 ថ្នាក់ទី១២ក (ព្រឹក)
   ✅ បានមកដល់សាលា
   🕐 ម៉ោង ០៧:២០ នាទី
   📊 មកមុនម៉ោង ១០ នាទី 🟢

   🏫 ថ្នាក់ទី១២BP (ល្ងាច)
   ✅ បានមកដល់សាលា
   🕐 ម៉ោង ១៧:៤០ នាទី
   📊 មកត្រឹមម៉ោង ✅

[4 menu buttons]
```

**⚠️ CRITICAL CHECK:**
- Both attendance records must be visible
- Each should show correct class and shift
- Start times should be correct (07:30 for Morning, 17:30 for Evening)
- Status should be calculated correctly for each shift

---

### ✅ Test 5: No Attendance Today
**Goal:** Check message when student hasn't arrived

**Test Data:**
- Student: No attendance record for today
- Date: Today

**Steps:**
1. Send `/attendance` to bot
2. Check response

**Expected Output:**
```
📅 ពិនិត្យវត្តមានសិស្ស

👤 [Student Name]
❌ កូនរបស់បងមិនទាន់មកដល់សាលានៅឡើយទេ

[4 menu buttons]
```

---

### ✅ Test 6: Menu Button Navigation
**Goal:** Test all menu buttons work correctly

**Steps:**
1. Send any message to get menu buttons
2. Click **📅 ពិនិត្យវត្តមាន** button
   - Expected: Shows attendance for today
3. Click **💰 ពិនិត្យបង់ថ្លៃ** button
   - Expected: Shows payment status
4. Click **📝 លទ្ធផលប្រលង** button
   - Expected: Shows available exams or "no exams" message
5. Click **❓ ជំនួយ** button
   - Expected: Shows help menu

**Check:**
- Each button response should also have the 4 menu buttons
- Navigation should be smooth and consistent

---

### ✅ Test 7: Not Registered User
**Goal:** Check experience for unregistered users

**Steps:**
1. Use a Telegram account NOT registered as parent
2. Send `/attendance` to bot
3. Check response

**Expected Output:**
```
🔍 បងមិនទាន់បានចុះឈ្មោះទទួលការជូនដំណឹងអំពីកូនរបស់បងនៅឡើយទេ។

ដើម្បីពិនិត្យវត្តមាន សូមចុះឈ្មោះជាមុនសិន។

វាយ /start ដើម្បីចាប់ផ្តើម។

[4 menu buttons]
```

**Check:**
- Error message is clear
- Menu buttons still appear (good UX)
- Buttons should work even though user isn't registered

---

### ✅ Test 8: Status Calculation
**Goal:** Verify attendance status is correct

**Test Cases:**

| Shift | Start Time | Arrival Time | Expected Status |
|-------|------------|--------------|-----------------|
| Morning | 07:30 | 07:15 | មកមុនម៉ោង ១៥ នាទី 🟢 |
| Morning | 07:30 | 07:30 | មកត្រឹមម៉ោង ✅ |
| Morning | 07:30 | 07:45 | មកត្រឹមម៉ោង ✅ |
| Morning | 07:30 | 07:50 | មកយឺត ២០ នាទី 🟡 |
| Afternoon | 13:30 | 13:25 | មកមុនម៉ោង ៥ នាទី 🟢 |
| Afternoon | 13:30 | 13:40 | មកត្រឹមម៉ោង ✅ |
| Afternoon | 13:30 | 14:00 | មកយឺត ៣០ នាទី 🟡 |
| Evening | 17:30 | 17:20 | មកមុនម៉ោង ១០ នាទី 🟢 |
| Evening | 17:30 | 17:35 | មកត្រឹមម៉ោង ✅ |
| Evening | 17:30 | 18:00 | មកយឺត ៣០ នាទី 🟡 |

**Key Rules:**
- **🟢 Early:** Arrived before start time
- **✅ On Time:** Arrived 0-15 minutes after start time
- **🟡 Late:** Arrived more than 15 minutes after start time

---

### ✅ Test 9: Multiple Children
**Goal:** Check display when parent has multiple children registered

**Test Data:**
- Parent registered for 2 children
- Child 1: Has attendance today (Morning)
- Child 2: No attendance today

**Steps:**
1. Send `/attendance` to bot
2. Check response

**Expected Output:**
```
📅 ពិនិត្យវត្តមានសិស្ស

👤 [Child 1 Name]
   🏫 ថ្នាក់ទី១២ក (ព្រឹក)
   ✅ បានមកដល់សាលា
   🕐 ម៉ោង ០៧:២៥ នាទី
   📊 មកមុនម៉ោង ៥ នាទី 🟢

👤 [Child 2 Name]
❌ កូនរបស់បងមិនទាន់មកដល់សាលានៅឡើយទេ

[4 menu buttons]
```

---

### ✅ Test 10: Real-Time Notification
**Goal:** Verify parent receives notification with menu buttons

**Steps:**
1. Mark student attendance in dashboard
2. Check parent receives Telegram notification
3. Verify notification has menu buttons

**Expected Notification:**
```
📍 ការជូនដំណឹងវត្តមាន

✅ [Student Name] បានមកដល់សាលា
🏫 ថ្នាក់ទី១២ក (ព្រឹក)
🕐 ម៉ោង ០៧:២៥ នាទី
📊 មកមុនម៉ោង ៥ នាទី 🟢

[4 menu buttons]
```

---

## Common Issues & Solutions

### Issue: Menu buttons not appearing
**Cause:** Old function deployment  
**Solution:** Redeploy functions with `firebase deploy --only functions`

### Issue: Only one attendance showing for student with both regular + BP
**Cause:** Query still has `.limit(1)`  
**Solution:** Check functions/index.js line ~730, ensure no `.limit(1)` in attendance query

### Issue: Wrong start time displayed
**Cause:** Start time not looking up from class configuration  
**Solution:** Check class configuration in `/attendance` handler has correct times

### Issue: Status calculation incorrect
**Cause:** Wrong start time used  
**Solution:** Verify `calculateAttendanceStatus` receives correct `startTime` parameter

---

## Testing Tools

### Test Bot Commands
```bash
/start - Register or view status
/attendance - Check today's attendance
/payment - Check payment status
/parentinfo - View registration details
/help - Show help menu
```

### Firebase Console Checks
1. Open Firestore console
2. Check `attendance` collection for test data
3. Verify records have correct:
   - `studentId`
   - `class` (e.g., "Class 12A", "Class 12BP")
   - `shift` (Morning/Afternoon/Evening)
   - `date` (YYYY-MM-DD format)
   - `timestamp` (Firestore Timestamp)

### Cloud Function Logs
```bash
# View logs for parent bot
firebase functions:log --only parentBotWebhook

# Watch logs in real-time
firebase functions:log --only parentBotWebhook --lines 50
```

---

## Success Criteria

### ✅ All Tests Must Pass
- [ ] Menu buttons appear on ALL messages
- [ ] Regular class attendance displays correctly
- [ ] BP class attendance displays correctly
- [ ] **CRITICAL:** Both regular + BP attendance show together
- [ ] No attendance message works correctly
- [ ] All menu buttons navigate properly
- [ ] Unregistered users see menu buttons
- [ ] Status calculation is accurate
- [ ] Multiple children display correctly
- [ ] Real-time notifications have menu buttons

### ✅ Performance Checks
- [ ] Bot responds within 2 seconds
- [ ] Menu buttons are clickable immediately
- [ ] No error messages in logs
- [ ] Functions deploy successfully

### ✅ UX Validation
- [ ] Interface is clean and professional
- [ ] Navigation is intuitive
- [ ] Error messages are helpful
- [ ] Parents don't need to ask "how to use"

---

## Deployment Verification

After deployment, verify:

1. **Check Function URL:**
   ```
   https://parentbotwebhook-uegi5asu6a-as.a.run.app
   ```

2. **Test Bot:**
   - Open bot in Telegram
   - Send `/start`
   - Should see menu buttons

3. **Check Logs:**
   ```bash
   firebase functions:log --only parentBotWebhook --lines 20
   ```
   - Should see no errors

4. **Test All Commands:**
   - `/start` ✅
   - `/attendance` ✅
   - `/payment` ✅
   - `/parentinfo` ✅
   - `/help` ✅

---

## Emergency Rollback

If issues occur after deployment:

1. **Revert to previous version:**
   ```bash
   git revert HEAD
   git push
   firebase deploy --only functions
   ```

2. **Check previous deployment:**
   ```bash
   firebase functions:log --only parentBotWebhook
   ```

3. **Notify users:**
   - Post in admin dashboard
   - Send notification about temporary issues

---

## Contact

For testing support:
- Technical Issues: Check Firebase Console logs
- Bot not responding: Verify webhook setup
- Attendance not showing: Check Firestore data

**Testing Status:** Ready for production testing ✅
