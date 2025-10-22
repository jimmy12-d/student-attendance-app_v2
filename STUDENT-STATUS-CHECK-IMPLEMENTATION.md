# Student Account Status & Loading Screen Implementation

## Overview
Implemented a comprehensive account status check system for students and improved the initial loading UX to prevent flashing of login UI.

## Features Implemented

### 1. Account Status Check ✅
When students open their PWA, the system now:
- ✅ Checks if the student is **dropped** (inactive)
- ✅ Checks if the student is **onBreak** (on break)
- ✅ Checks if the student is **onWaitlist** (on waitlist)
- ✅ Shows appropriate frozen screen if account is inactive
- ✅ Prevents any actions when account is inactive

### 2. Professional Loading Screen ✅
- ✅ Uses the 3D icon (`/icon-512x512-3d.png`)
- ✅ Animated gradient background
- ✅ Glow effect around the icon
- ✅ Smooth bounce animation
- ✅ Loading spinner
- ✅ Animated dots
- ✅ Shows during auth initialization to prevent UI flash

### 3. Account Inactive Screen ✅
Shows different messages based on status:

#### Dropped (Inactive)
- Red color theme
- Message: "Your account is currently inactive. Please contact the school to reactivate your account."

#### On Break
- Yellow/Orange color theme
- Shows expected return month (if available)
- Shows break reason (if available)
- Message: "Your account is currently on break. Please contact the school for more information."

#### Waitlist
- Blue color theme
- Shows waitlist reason (if available)
- Message: "Your account is currently on the waitlist. You will be notified when a spot becomes available."

## Files Created

### 1. `/app/_components/LoadingScreen.tsx`
- Reusable loading screen component
- Beautiful gradient background with 3D icon
- Customizable message prop
- Smooth animations

### 2. `/app/_components/AccountInactiveScreen.tsx`
- Account inactive/frozen screen
- Supports three states: dropped, onBreak, waitlist
- Shows relevant information for each state
- Prevents any user actions

## Files Modified

### 1. `/app/student/page.tsx`
**Changes:**
- Added Firestore query to fetch student data
- Check for `dropped`, `onBreak`, `onWaitlist` fields
- Show appropriate screen based on status
- Use LoadingScreen while checking status
- Use AccountInactiveScreen if student is not active

### 2. `/app/_components/ClientLayoutWrapper.tsx`
**Changes:**
- Import and use AuthContext
- Show LoadingScreen during auth initialization
- Only show loading on protected routes
- Prevents flash of login UI

### 3. `/locales/en.json`
**Added translations:**
```json
"student": {
  "checkingStatus": "Checking account status...",
  "accountInactive": {
    "droppedTitle": "Account Inactive",
    "droppedMessage": "...",
    "onBreakTitle": "Account on Break",
    "onBreakMessage": "...",
    "waitlistTitle": "Account on Waitlist",
    "waitlistMessage": "...",
    "reason": "Reason",
    "expectedReturn": "Expected Return",
    "contactSchool": "Please contact the school for assistance",
    "noActions": "You cannot perform any actions while your account is inactive"
  }
}
```

### 4. `/locales/kh.json`
**Added Khmer translations** for all the same keys

## User Experience Flow

### Active Student
1. **Open PWA** → LoadingScreen with 3D icon
2. **Auth check** → Fast loading (no flash)
3. **Status check** → Validates account is active
4. **Redirect** → Goes to `/student/attendance`

### Inactive Student (Dropped/OnBreak/Waitlist)
1. **Open PWA** → LoadingScreen with 3D icon
2. **Auth check** → Fast loading
3. **Status check** → Detects inactive status
4. **Frozen Screen** → Shows AccountInactiveScreen
5. **No Actions** → Cannot navigate or perform actions
6. **Contact Info** → Clear message to contact school

## Technical Details

### Status Check Logic
```typescript
if (studentData.dropped === true) {
  // Show dropped screen
}
if (studentData.onBreak === true) {
  // Show on break screen with reason & expected return
}
if (studentData.onWaitlist === true) {
  // Show waitlist screen with reason
}
```

### Loading States
- **AuthContext loading**: Shows LoadingScreen at layout level
- **Student status loading**: Shows LoadingScreen at page level
- **Prevents double loading**: Smart conditional rendering

## Design Features

### Loading Screen
- Gradient background: slate-900 → blue-900 → slate-900
- 3D icon with glow effect and bounce animation
- Spinning loader ring
- Animated dots below text
- Professional and modern look

### Inactive Screen
- Status-specific color themes
- Material Design icons
- Semi-transparent backdrop
- Clear messaging
- Contact information
- Additional details (break reason, expected return, waitlist reason)

## Benefits

✅ **Security**: Prevents inactive students from accessing the system  
✅ **UX**: No flash of login UI during initial load  
✅ **Professional**: Beautiful loading and inactive screens  
✅ **Informative**: Clear messages about account status  
✅ **Bilingual**: Full English & Khmer support  
✅ **Responsive**: Works on all screen sizes  
✅ **Accessible**: Clear visual hierarchy and messaging  

## Testing Checklist

- [ ] Test with active student account
- [ ] Test with dropped student account
- [ ] Test with student on break (with/without return date & reason)
- [ ] Test with student on waitlist (with/without reason)
- [ ] Test loading screen appearance
- [ ] Test in both English and Khmer
- [ ] Test on mobile devices
- [ ] Test in PWA standalone mode
- [ ] Verify no navigation is possible when inactive
- [ ] Verify smooth transition from loading to content

## Notes

- The loading screen appears very briefly if authentication is fast
- The account status check happens on every PWA open
- The inactive screen is a full-screen overlay that prevents all actions
- The 3D icon must exist at `/public/icon-512x512-3d.png`
- Translations support both languages seamlessly

---

**Implementation Date**: October 20, 2025  
**Status**: ✅ Complete
