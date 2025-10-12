# Send-Home Policy Implementation Summary

## Overview
Implemented a new school policy where students arriving after the allowed late window (start time + grace period + late window duration) will be shown a red warning overlay instructing them to go home instead of having their attendance marked.

## Changes Made

### 1. **Attendance Logic Update** (`app/dashboard/_lib/attendanceLogic.ts`)

#### Modified `determineAttendanceStatus` function:
- Added new return value: `sendHomeCutoff` (time when student should be sent home)
- Added new status: `'send-home'`
- Calculation logic:
  - **On-time deadline**: `startTime + STANDARD_ON_TIME_GRACE_MINUTES` (default: 15 minutes)
  - **Send-home deadline**: `startTime + STANDARD_ON_TIME_GRACE_MINUTES + LATE_WINDOW_DURATION_MINUTES` (default: 30 minutes total)
  - If current time > send-home deadline → status = 'send-home'
  - If current time > on-time deadline → status = 'late'
  - Otherwise → status = 'present'

#### Updated `markAttendance` function:
- Added toast notification for 'send-home' status with error styling
- Message: "Too late! Must return home"
- Duration: 6000ms (6 seconds)

### 2. **Send Home Overlay Component** (`app/dashboard/face-scan-faceapi/components/SendHomeOverlay.tsx`)

Created a new React component that displays:
- **Red warning overlay** with pulsing alert icon
- **Student name** prominently displayed
- **"TOO LATE" heading** in large text
- **"PLEASE GO HOME" message** in a highlighted box
- **Send-home cutoff time** display
- **Policy notice** explaining the rule
- **Auto-dismiss after 3 seconds** or manual dismiss button
- Animated entrance with fade-in and zoom-in effects

### 3. **Face Recognition Integration** (`app/dashboard/face-scan-faceapi/page.tsx`)

#### Added imports:
- `determineAttendanceStatus` from attendance logic
- `SendHomeOverlay` component

#### Added state variables:
- `showSendHomeOverlay`: boolean to control overlay visibility
- `sendHomeStudent`: object storing student name and cutoff time

#### Modified face detection logic:
- Before marking attendance, check the attendance status using `determineAttendanceStatus`
- If status is 'send-home':
  - Show the red warning overlay
  - Display student name and cutoff time
  - Update face tracking to show "Too late - Please go home" message
  - Remove temporary cooldown (don't mark attendance)
  - Auto-dismiss overlay after 5 seconds
  - Clear the tracked face
  - **Skip attendance marking entirely**

#### Added JSX:
- Rendered `SendHomeOverlay` component with appropriate props
- Positioned before `FailedAttendanceManager` in component tree

## Timing Configuration

The policy uses two constants from `configForAttendanceLogic.ts`:

```typescript
STANDARD_ON_TIME_GRACE_MINUTES = 15;  // Grace period for on-time arrival
LATE_WINDOW_DURATION_MINUTES = 15;    // Additional window for late arrival
```

**Total allowed time** = Start time + 30 minutes (15 + 15)

### Example Timeline:
- **Class start time**: 7:00 AM
- **On-time deadline**: 7:15 AM (7:00 + 15 min grace)
- **Send-home deadline**: 7:30 AM (7:15 + 15 min late window)

**Arrival scenarios:**
- Arrive at 7:10 AM → Status: `present` ✅
- Arrive at 7:20 AM → Status: `late` ⚠️
- Arrive at 7:35 AM → Status: `send-home` ❌ (Red overlay shown)

## Visual Design

The overlay uses:
- **Background**: Red gradient (red-600 to red-800) with backdrop blur
- **Border**: 4px red border with transparency
- **Icon**: Pulsing white alert octagon on red background
- **Text**: White and red-100 for contrast
- **Animations**: 
  - Fade-in and zoom-in entrance
  - Pulsing icon animation
  - Smooth transitions

## User Experience Flow

1. Student's face is detected and recognized
2. System checks if arrival time exceeds send-home deadline
3. If yes:
   - Red overlay appears immediately
   - Sound plays (success sound for face recognition)
   - Attendance is **NOT** marked
   - "Too late" message shows on face bounding box
   - Overlay auto-dismisses after 5 seconds
   - Student can manually dismiss by clicking button (after 3 seconds)
4. If no:
   - Normal attendance marking proceeds
   - Status is either 'present' or 'late'
   - Green/amber overlay shown

## Benefits

✅ **Clear visual feedback** - Students immediately know they're too late
✅ **Enforces school policy** - No attendance marked for very late arrivals
✅ **Detailed information** - Shows exact cutoff time that was exceeded
✅ **Professional design** - Red warning colors clearly indicate policy violation
✅ **Smooth UX** - Auto-dismiss prevents blocking the system
✅ **Consistent with existing system** - Uses same styling patterns as other overlays

## Notes

- The send-home status is still saved to Firestore with status='send-home' if `markAttendance` is called directly
- The face scanner prevents calling `markAttendance` for send-home cases
- Manual attendance marking in other parts of the system will still record send-home status
- The policy applies to all shifts (Morning, Afternoon, Evening)
- Student-specific grace periods are respected in the calculation
