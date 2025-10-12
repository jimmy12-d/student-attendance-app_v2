# Visual Guide: Parent Absent Notification System

## Table of Contents
1. [Admin Dashboard Overview](#admin-dashboard-overview)
2. [Notification Settings](#notification-settings)
3. [Manual Notifications](#manual-notifications)
4. [Status Indicators](#status-indicators)

---

## Admin Dashboard Overview

### Location
Navigate to: **Dashboard → Students → Absent Follow-Up**

### New Features
The dashboard now includes a new column: **"Parent Notification"**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 📊 Absent Students Follow-up Dashboard                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ [Filters]  All Statuses ▼  |  All Priorities ▼                             │
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │ 🌅 Morning Shift Students                                              │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────┐   │
│ │ Student  │ Phone      │ Absent │ Monthly │ Status  │ Priority │      │   │
│ │          │ /Telegram  │ Date   │ Absent  │         │          │ 👉  │   │
│ ├──────────┼────────────┼────────┼─────────┼─────────┼──────────┼──────┤   │
│ │ John Doe │ 012-345-   │ Oct 11 │ 3 days  │ Absent  │ High     │ NEW  │   │
│ │ ជន ដូ    │ 678 📱     │ Today  │         │         │          │ COL  │   │
│ └──────────┴────────────┴────────┴─────────┴─────────┴──────────┴──────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                                                        ↑
                                                         NEW COLUMN ADDED HERE
```

---

## Notification Settings

### How to Access
1. Go to Absent Follow-Up Dashboard
2. Look for "Notification Settings" button (or navigate separately if implemented as a route)

### Configuration Screen

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔔 Parent Absence Notification Settings                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│ ┌────────────────────────────────────────────────────────────────────────┐ │
│ │  🔔 Automatic Notifications                                     [ON] ●│ │
│ │  Send automatic notifications to parents when students are absent      │ │
│ └────────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│ ⏰ Notification Trigger Times                                               │
│                                                                              │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│ │ 🌅 Morning Shift │  │ ☀️ Afternoon     │  │ 🌙 Evening Shift │          │
│ │                  │  │    Shift         │  │                  │          │
│ │  [09:00] ⏰      │  │  [14:00] ⏰      │  │  [18:00] ⏰      │          │
│ │                  │  │                  │  │                  │          │
│ │ Notifications    │  │ Notifications    │  │ Notifications    │          │
│ │ sent at 09:00    │  │ sent at 14:00    │  │ sent at 18:00    │          │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│                                                                              │
│ ℹ️ How it works:                                                            │
│ • The system checks for absent students hourly                             │
│ • At the trigger time for each shift, parents will be notified             │
│ • Only parents who have registered with Telegram bot will receive          │
│ • Each parent will only be notified once per day per absence               │
│                                                                              │
│                                                    [Save Settings] ✓        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Setting Trigger Times

**Step 1**: Click on the time input
```
┌──────────────────┐
│ 🌅 Morning Shift │
│                  │
│  [09:00] ⏰ ← Click here
│                  │
└──────────────────┘
```

**Step 2**: Select time from picker
```
┌─────────────┐
│   ⏰ Time   │
├─────────────┤
│  Hours: 09  │
│  Mins:  00  │
├─────────────┤
│    [OK]     │
└─────────────┘
```

**Step 3**: Click "Save Settings" button

---

## Manual Notifications

### Sending Notification to Individual Student

#### Step 1: Locate Student in Dashboard
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Student    │ Phone/     │ Absent │ Monthly │ Status │ Priority │ Parent │
│            │ Telegram   │ Date   │ Absent  │        │          │ Notif. │
├────────────┼────────────┼────────┼─────────┼────────┼──────────┼────────┤
│ John Doe   │ 012-345-   │ Oct 11 │ 3 days  │ Absent │ High     │ Not    │
│ ជន ដូ      │ 678 📱     │ Today  │         │         │          │ sent   │
│            │            │        │         │         │          │        │
│            │            │        │         │         │          │ [Send  │
│            │            │        │         │         │          │ Notif] │
└────────────┴────────────┴────────┴─────────┴────────┴──────────┴────────┘
                                                                      ↑
                                                        Click this button
```

#### Step 2: Button Changes While Sending
```
┌───────────────┐
│ ⏳ Sending... │  ← Loading spinner appears
└───────────────┘
```

#### Step 3: Success Notification
```
┌────────────────────────────────────┐
│ ✓ Sent 1 notification(s) to       │
│   parent(s)                        │  ← Toast notification
└────────────────────────────────────┘
```

#### Step 4: Status Updates
```
┌──────────────┐
│ ✓ Sent (1)   │  ← Green badge
│ Oct 11, 2:30 │  ← Timestamp
│ PM           │
└──────────────┘
```

---

## Status Indicators

### Status Badges

#### ✓ Success
```
┌──────────────┐
│ ✓ Sent (2)   │  GREEN BADGE
│ Oct 11, 2:30 │  • Successfully sent to 2 parents
│ PM           │  • Shows timestamp
└──────────────┘
```

#### ✗ Failed
```
┌──────────────┐
│ ✗ Failed     │  RED BADGE
│ Oct 11, 2:30 │  • Notification failed
│ PM           │  • Shows error on hover
│ Error: Bot   │
│ blocked...   │
└──────────────┘
```

#### No Parent
```
┌──────────────┐
│ No Parent    │  GRAY BADGE
│              │  • No registered parent
│              │  • Button still works for retry
└──────────────┘
```

#### ⏳ Pending
```
┌──────────────┐
│ ⏳ Pending   │  YELLOW BADGE
│              │  • Waiting to be sent
│              │  • Will be sent at trigger time
└──────────────┘
```

### Complete Column View

```
┌────────────────────────────────────┐
│ Parent Notification                │  ← Column Header
├────────────────────────────────────┤
│ ✓ Sent (1)                         │  ← Status Badge
│ Oct 11, 2:30 PM                    │  ← Timestamp
│                                     │
│ [Send Notification] 📤             │  ← Action Button
└────────────────────────────────────┘
```

---

## Notification Message (What Parents See)

### In Telegram Bot

```
┌─────────────────────────────────────────┐
│  📱 Parent Telegram Bot                 │
├─────────────────────────────────────────┤
│                                          │
│  ⚠️ ការជូនដំណឹងអវត្តមាន              │
│                                          │
│  👤 សិស្ស: ជន ដូ                       │
│  🏫 ថ្នាក់: ថ្នាក់ទី១២               │
│  ⏰ វេន: ព្រឹក                        │
│  📅 កាលបរិច្ឆេទ: ថ្ងៃទី១១ ខែតុលា    │
│      ឆ្នាំ២០២៥                        │
│                                          │
│  ❌ កូនរបស់បងមិនបានមកសាលារៀន         │
│     នៅថ្ងៃនេះទេ។                       │
│                                          │
│  សូមទាក់ទងសាលារៀនប្រសិនបើមាន        │
│  បញ្ហាឬហេតុផលអ្វីមួយ។                 │
│                                          │
│                                          │
└─────────────────────────────────────────┘
```

### Translation (English)

```
⚠️ Absence Notification

👤 Student: John Doe
🏫 Class: Grade 12
⏰ Shift: Morning
📅 Date: October 11, 2025

❌ Your child did not come to school today.

Please contact the school if there are any
issues or reasons.
```

---

## Workflow Diagram

### Automatic Notification Flow

```
⏰ Every Hour
    │
    ├─ Check: Is it 09:00? ──→ Process Morning Students
    │
    ├─ Check: Is it 14:00? ──→ Process Afternoon Students
    │
    └─ Check: Is it 18:00? ──→ Process Evening Students
           │
           ↓
    Get Absent Students for Today
           │
           ↓
    Filter by Shift (e.g., Morning)
           │
           ↓
    Skip Already Notified Students
           │
           ↓
    For Each Student:
       │
       ├─ Get Parent Info
       │
       ├─ Send Telegram Message
       │
       └─ Update Status ──→ ✓ Sent (1)
                            Oct 11, 9:00 AM
```

### Manual Notification Flow

```
Admin Clicks [Send Notification]
           │
           ↓
    Button Shows: ⏳ Sending...
           │
           ↓
    Call Cloud Function
           │
           ↓
    Get Parent Info
           │
           ↓
    Send Telegram Message
           │
           ├─ Success? ──→ ✓ Toast: "Sent 1 notification"
           │                  Update Status: ✓ Sent (1)
           │
           └─ Failed? ──→  ✗ Toast: "Failed to send"
                             Update Status: ✗ Failed
```

---

## Color Reference

### Status Colors

| Status | Badge Color | Border | Icon |
|--------|------------|--------|------|
| Success | 🟢 Green | Green | ✓ |
| Failed | 🔴 Red | Red | ✗ |
| No Parent | ⚫ Gray | Gray | - |
| Pending | 🟡 Yellow | Yellow | ⏳ |

### Shift Colors

| Shift | Background | Icon |
|-------|-----------|------|
| Morning | 🟠 Orange | 🌅 |
| Afternoon | 🟡 Yellow | ☀️ |
| Evening | 🟣 Indigo | 🌙 |

---

## Tips for Admins

### ✅ Best Practices

1. **Set Appropriate Times**
   - Morning: 1-2 hours after class start (e.g., 09:00 if class starts at 07:00)
   - This gives teachers time to confirm attendance

2. **Check Daily**
   - Review failed notifications
   - Follow up with "No Parent" cases
   - Verify automatic runs completed

3. **Manual Override**
   - Use manual button for urgent notifications
   - Don't rely only on automatic system
   - Manual sends immediately, no waiting

### ❌ Common Mistakes

1. **Setting Time Too Early**
   - Don't set to class start time
   - Teachers need time to mark attendance
   - Wait at least 1 hour after class starts

2. **Forgetting to Save**
   - Always click "Save Settings" after changes
   - Changes don't apply until saved
   - Check for success message

3. **Ignoring Failed Notifications**
   - Failed notifications need follow-up
   - Check error messages
   - Contact parents directly if needed

---

## Troubleshooting Visual Guide

### Problem: Button Doesn't Work

```
[Send Notification]  ← Click
         ↓
   Nothing happens?
         ↓
    Check These:
    1. Is internet working?
    2. Are you logged in?
    3. Check browser console for errors
    4. Try refreshing page
```

### Problem: Status Shows "No Parent"

```
┌──────────────┐
│ No Parent    │  ← This means:
└──────────────┘
         │
         ↓
    Parent hasn't registered
         │
         ↓
    Solutions:
    1. Ask parent to start bot
    2. Parent must complete registration
    3. Verify parent's phone number
    4. Check parentNotifications collection
```

### Problem: Status Shows "Failed"

```
┌──────────────┐
│ ✗ Failed     │  ← Hover to see error
│ Error: Bot   │
│ blocked...   │
└──────────────┘
         │
         ↓
    Common Causes:
    1. Parent blocked bot ──→ Contact parent
    2. Network error ──→ Try again
    3. Bot token issue ──→ Contact IT
    4. Invalid chat ID ──→ Re-register parent
```

---

## Quick Reference Card

### For Daily Use

```
┌─────────────────────────────────────────────────┐
│  PARENT ABSENT NOTIFICATION - QUICK REFERENCE   │
├─────────────────────────────────────────────────┤
│                                                  │
│  VIEW STATUS:                                   │
│  • ✓ Green = Sent successfully                 │
│  • ✗ Red = Failed                              │
│  • Gray = No parent registered                 │
│  • ⏳ Yellow = Pending                         │
│                                                  │
│  SEND MANUALLY:                                 │
│  1. Find student in dashboard                  │
│  2. Click [Send Notification]                  │
│  3. Wait for confirmation                      │
│                                                  │
│  AUTOMATIC SENDING:                             │
│  • Morning: 09:00                              │
│  • Afternoon: 14:00                            │
│  • Evening: 18:00                              │
│                                                  │
│  TROUBLESHOOTING:                               │
│  • No Parent? → Ask parent to register        │
│  • Failed? → Check error message              │
│  • Not sending? → Check settings              │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

**Last Updated**: October 11, 2025  
**Version**: 1.0.0
