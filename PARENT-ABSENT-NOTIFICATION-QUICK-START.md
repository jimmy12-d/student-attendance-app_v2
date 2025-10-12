# Quick Start Guide: Parent Absent Notification System

## For Administrators

### Setup (One-Time)

1. **Deploy the Cloud Functions**
   ```bash
   cd functions
   firebase deploy --only functions:notifyParentAbsence,functions:scheduledAbsentParentNotifications
   ```

2. **Configure Notification Times**
   - Go to: Dashboard → Students → Absent Follow-Up
   - Click "Notification Settings" (if available) or navigate to settings page
   - Set trigger times:
     - Morning Shift: 09:00 (or when morning classes start)
     - Afternoon Shift: 14:00 (or when afternoon classes start)
     - Evening Shift: 18:00 (or when evening classes start)
   - Toggle "Enable Automatic Notifications" ON
   - Click "Save Settings"

3. **Verify Setup**
   - Mark one test student as absent
   - Manually send notification using the button
   - Check if parent receives Telegram message

### Daily Usage

#### Viewing Notification Status
In the Absent Follow-Up Dashboard, the "Parent Notification" column shows:
- ✓ **Sent (X)** = Successfully sent to X parent(s)
- ✗ **Failed** = Notification failed to send
- **No Parent** = No active parent registered
- ⏳ **Pending** = Waiting to be sent

#### Manually Sending Notifications
1. Find the absent student in the dashboard
2. Locate the "Parent Notification" column
3. Click "Send Notification" button
4. Wait for confirmation toast message
5. Status will update automatically

#### Troubleshooting

**If notification shows "No Parent":**
- The student's parent hasn't registered with the Telegram bot
- Ask parent to start a chat with your parent Telegram bot
- Parent must complete registration process

**If notification shows "Failed":**
- Check the error message (hover over truncated text)
- Common causes:
  - Parent blocked the bot → Contact parent
  - Network issue → Try again later
  - Bot token issue → Contact tech support

### Understanding Automatic Notifications

The system automatically checks every hour:
- At 09:00 → Sends notifications for absent Morning shift students
- At 14:00 → Sends notifications for absent Afternoon shift students
- At 18:00 → Sends notifications for absent Evening shift students

**Important Notes:**
- Each parent receives only ONE notification per day per absence
- Already-notified students won't receive duplicate notifications
- System processes only students whose shift matches the current time window

### Settings Management

#### Changing Trigger Times
1. Open Notification Settings
2. Adjust time for desired shift
3. Click "Save Settings"
4. Changes take effect on next hourly check

#### Disabling Automatic Notifications
1. Open Notification Settings
2. Toggle "Automatic Notifications" OFF
3. Click "Save Settings"
4. Manual notifications still work when disabled

### Best Practices

✅ **DO:**
- Set trigger times 1-2 hours after class start time (gives time to confirm absence)
- Manually send urgent notifications immediately
- Check failed notifications daily
- Verify parent registrations for new students

❌ **DON'T:**
- Set trigger times too early (may notify before teacher confirms absence)
- Disable automatic notifications without informing staff
- Spam parents with manual notifications
- Change settings frequently (causes confusion)

### Quick Checks

**Daily**:
- [ ] Review failed notifications
- [ ] Follow up with "No Parent" cases
- [ ] Verify automatic notifications ran at scheduled times

**Weekly**:
- [ ] Check notification success rate
- [ ] Update trigger times if needed
- [ ] Review parent registration status

**Monthly**:
- [ ] Analyze notification patterns
- [ ] Verify all active parents receiving notifications
- [ ] Update documentation if procedures change

### Common Questions

**Q: Can I send multiple notifications for the same absence?**  
A: Yes, click "Send Notification" button again. However, automatic system sends only once per day.

**Q: What if a student is marked absent by mistake?**  
A: Update attendance status. No way to "unsend" notification, but you can contact parent directly to clarify.

**Q: Why didn't parent receive notification?**  
A: Check these in order:
1. Is automatic notifications enabled?
2. Is current time matching the shift's trigger time?
3. Does parent have active Telegram registration?
4. Has parent blocked the bot?
5. Check Cloud Functions logs for errors

**Q: Can I customize the notification message?**  
A: Not currently. Contact development team for customization requests.

**Q: How do I know if automatic notifications are working?**  
A: Check the "Parent Notification" column - it will show timestamp and "Sent" status after automatic run.

### Getting Help

1. **Check Notification Status**: Look at the dashboard first
2. **Review Logs**: `firebase functions:log --only notifyParentAbsence`
3. **Test Manually**: Use "Send Notification" button to test
4. **Contact Support**: If issue persists, contact tech team with:
   - Student name and ID
   - Date of absence
   - Error message (if any)
   - Screenshots of notification status

---

**Need more details?** See: `PARENT-ABSENT-NOTIFICATION-SYSTEM.md`
