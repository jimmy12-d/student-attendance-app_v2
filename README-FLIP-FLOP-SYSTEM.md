# Flip-Flop Schedule Management System

## Overview

The Flip-Flop Schedule Management System is an automated solution for managing students who alternate between Morning and Afternoon shifts on a monthly basis. This system provides automatic detection, preview capabilities, and seamless schedule updates.

## 🎯 Purpose

Students with "Flip-Flop" schedule type need their shifts toggled every month:
- **Morning** students move to **Afternoon**
- **Afternoon** students move to **Morning**
- **Evening** students remain unchanged

## 📋 System Components

### 1. Database Collections

#### `flipFlopTracking` Collection
Stores monthly flip-flop execution records:

```javascript
{
  // Document ID: "YYYY_M" (e.g., "2025_7" for August 2025)
  year: 2025,
  month: 7, // 0-based (7 = August)
  monthName: "August",
  isBaseline: true, // true for first month setup
  appliedAt: Timestamp,
  appliedBy: "system-initialization", // or user email
  studentsAffected: 15,
  description: "Monthly flip-flop schedule update",
  students: [
    {
      studentId: "student123",
      fullName: "John Doe",
      class: "Class 10A",
      originalShift: "Morning",
      newShift: "Afternoon",
      wasFlipped: true
    }
    // ... more students
  ],
  settings: {
    autoApplyEnabled: true,
    gracePeriodDays: 7,
    notificationEnabled: true
  },
  nextScheduledFlip: {
    year: 2025,
    month: 8, // September
    monthName: "September"
  }
}
```

#### `systemSettings/flipFlopConfig` Document
Global system configuration:

```javascript
{
  enabled: true,
  autoApplyEnabled: true,
  defaultCountdownSeconds: 10,
  defaultGracePeriodDays: 7,
  notificationsEnabled: true,
  systemVersion: "1.0.0",
  lastUpdated: Timestamp,
  features: {
    previewMode: true,
    batchProcessing: true,
    historyTracking: true,
    autoDetection: true
  },
  schedule: {
    targetDay: 1, // First day of each month
    maxGracePeriod: 15,
    minCountdown: 5,
    maxCountdown: 30
  }
}
```

### 2. Student Document Updates

When flip-flop is applied, each affected student document gets updated:

```javascript
{
  // Existing fields...
  shift: "Afternoon", // Updated shift
  lastFlipFlopUpdate: Timestamp,
  flipFlopHistory: {
    "2025_8": {
      previousShift: "Morning",
      newShift: "Afternoon",
      updatedAt: Timestamp,
      updatedBy: "auto-system"
    }
    // ... history for other months
  }
}
```

## 🚀 Getting Started

### ✅ System Status (August 2025)

**Current Status:** Fully operational and baseline established!

- ✅ **78 flip-flop students** registered
- ✅ **August 2025 baseline** created successfully  
- ✅ **System settings** configured
- ✅ **Firestore collections** established
- 🔄 **Ready for September 2025** (first flip month)

### Initial Setup Commands

The system has been initialized! If you need to reinitialize:

1. **Run the initialization script:**
   ```bash
   cd /path/to/project
   node scripts/initialize-flip-flop-system.js
   ```

2. **What this creates:**
   - Baseline tracking document for August 2025
   - System settings configuration
   - No schedule changes (this is the starting month)

### Monthly Operation

The system automatically:
1. **Detects new months** when users access the application
2. **Shows notifications** with countdown timer
3. **Applies changes** automatically or manually
4. **Tracks history** in Firestore collections

## 📅 Timeline & Behavior

### August 2025 (Baseline Month) ✅ **COMPLETED**
- **Status:** ✅ Baseline established with 78 flip-flop students
- **Students:** Current shifts maintained (no changes needed for first month)
- **Purpose:** Established baseline for future flips
- **Created:** August 28, 2025

### September 2025 (First Flip)
- **Trigger:** September 1-7 (grace period)
- **Action:** All flip-flop students switch shifts
- **Example:** Morning → Afternoon, Afternoon → Morning

### October 2025 (Second Flip)
- **Trigger:** October 1-7 (grace period)
- **Action:** Students flip back to original shifts
- **Example:** Back to August 2025 configuration

## ⚙️ Configuration Options

### User Settings (Stored in localStorage)
```javascript
{
  autoApplyEnabled: true,     // Enable automatic application
  autoApplyDelay: 10,         // Countdown seconds (5-30)
  gracePeriodDays: 7,         // Days to show reminders (1-15)
  notificationEnabled: true   // Show notifications
}
```

### Accessing Settings
- Navigate to Students page
- Click "More" button
- Select "Flip-Flop Settings"

## 🎮 User Interface

### 1. Status Indicator
Shows current flip-flop status:
- ✅ **Green:** Applied for current month
- ⚠️ **Yellow:** Available to apply (grace period)
- ❌ **Red:** Overdue for application

### 2. Preview Mode
- Toggle "Flip Preview" to see future state
- Students show with orange highlighting
- "PREVIEW" badges on affected students
- Section headers show flipped shifts

### 3. Manual Controls
- **Apply Flip-Flop:** Manual execution
- **Flip Preview:** Toggle preview mode
- **Flip-Flop Settings:** Configure behavior

## 🔄 Automatic Detection Logic

### New Month Detection
```javascript
// Triggers when:
const now = new Date();
const currentMonth = now.getMonth();
const lastCheck = getLastCheckDate();

const isNewMonth = !lastCheck || 
  lastCheck.getMonth() !== currentMonth ||
  lastCheck.getFullYear() !== now.getFullYear();
```

### Grace Period Logic
```javascript
// Shows notifications during:
const gracePeriod = settings.gracePeriodDays; // Default: 7 days
const currentDay = now.getDate();

if (currentDay <= gracePeriod && !alreadyApplied) {
  showNotification();
}
```

## 📊 Tracking & History

### Monthly Tracking
Each month gets its own document in `flipFlopTracking`:
- Execution details
- Student lists
- Settings used
- Success/failure status

### Student History
Individual student documents track:
- Previous shifts
- New shifts
- Update timestamps
- Who applied the change

### Reporting
View flip-flop history through:
- Firestore console
- System logs
- Student detail modals

## 🛠️ Troubleshooting

### Common Issues

1. **Auto-apply not working**
   - Check if notifications are enabled
   - Verify grace period settings
   - Ensure flip-flop students exist

2. **Preview mode not showing changes**
   - Confirm students have `scheduleType: "Flip-Flop"`
   - Check browser console for errors

3. **Manual apply fails**
   - Verify Firebase permissions
   - Check network connectivity
   - Review error messages in toast notifications

### Debug Information

Enable detailed logging:
```javascript
localStorage.setItem('flipFlopDebug', 'true');
```

### Support Commands

```bash
# Check system status
node scripts/check-flip-flop-status.js

# Repair corrupted data
node scripts/repair-flip-flop-data.js

# Generate reports
node scripts/generate-flip-flop-report.js
```

## 🔒 Security & Permissions

### Required Permissions
- Read/Write access to `students` collection
- Read/Write access to `flipFlopTracking` collection
- Read/Write access to `systemSettings` collection

### Data Privacy
- Only schedule information is modified
- Personal data remains unchanged
- All changes are logged and reversible

## 📈 Future Enhancements

### Planned Features
- [ ] Email notifications for administrators
- [ ] Bulk import/export of flip-flop schedules
- [ ] Advanced scheduling rules
- [ ] Integration with attendance system
- [ ] Mobile app notifications

### API Extensions
- [ ] REST API for external integrations
- [ ] Webhook notifications
- [ ] Batch processing endpoints

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review browser console logs
3. Check Firestore collection data
4. Contact system administrator

## 📝 Changelog

### Version 1.0.0 (August 2025)
- Initial system implementation
- Automatic month detection
- Preview mode functionality
- Settings configuration
- History tracking
- Baseline setup for August 2025

---

**Last Updated:** August 28, 2025  
**System Version:** 1.0.0  
**Baseline Month:** August 2025 ✅ **ESTABLISHED**
**Next Flip:** September 2025 🔄
