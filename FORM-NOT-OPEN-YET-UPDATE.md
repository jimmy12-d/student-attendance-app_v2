# Form "Not Open Yet" Logic Update

## Overview
Updated the form visibility logic to only show "Not Open Yet" badge and styling for forms that are:
- **Visible** (`isVisible: true`)
- **Not Active** (`isActive: false`)
- **Not Submitted** (student hasn't submitted the form yet)

## Changes Made

### 1. Translation Files

#### English (`locales/en.json`)
```json
"forms": {
  "notOpenYet": "This form is not open yet"
}
```

#### Khmer (`locales/kh.json`)
```json
"forms": {
  "notOpenYet": "ទម្រង់នេះមិនទាន់បើកនៅឡើយទេ"
}
```

### 2. StudentFormsList.tsx Updates

#### Toast Message
- Changed from hardcoded English text to translated message
- Before: `"This form is not open yet. Please check back later."`
- After: `t('notOpenYet')`

#### "Not Open Yet" Badge Display Logic
```tsx
{!form.isActive && !isSubmitted ? (
  // Show "Not Open Yet" badge only for visible but inactive forms that haven't been submitted
  <div>Not Open Yet Badge</div>
) : isSubmitted ? (
  // Show submission status badges
)}
```

#### Icon Styling Logic
```tsx
{!form.isActive && !isSubmitted
  ? 'bg-gradient-to-br from-gray-400 to-gray-500'  // Gray for not open
  : isSubmitted
  ? // Green/Orange/Red based on approval status
  : 'bg-gradient-to-br from-blue-500 to-purple-600'  // Blue/Purple for open
}
```

#### Border Styling Logic
```tsx
{!form.isActive && !isSubmitted
  ? 'border-gray-300/80 dark:border-gray-600/80'  // Gray border for not open
  : isSubmitted 
  ? // Green/Orange/Red border based on approval status
  : 'border-gray-100/80 dark:border-slate-600/80'  // Default border for open
}
```

## Behavior Matrix

| Scenario | isVisible | isActive | isSubmitted | Deadline | Display |
|----------|-----------|----------|-------------|----------|---------|
| Not submitted, not open | ✅ true | ❌ false | ❌ false | Any | 🔒 "Not Open Yet" badge, gray styling |
| Submitted as pending | ✅ true | ❌ false | ✅ true | Any | 🟠 "Pending" badge, orange styling |
| Submitted as approved | ✅ true | ❌ false | ✅ true | Any | ✅ "Approved" badge, green styling |
| Not submitted, deadline over | ✅ true | ✅ true | ❌ false | ❌ Passed | 📝 Normal form display (can still submit) |
| Submitted, deadline over | ✅ true | ✅ true | ✅ true | ❌ Passed | Status badge based on approval |

## Key Points

### ✅ What Changed
1. **"Not Open Yet"** only shows for forms that haven't been submitted
2. **Submitted forms** always show their status (Pending/Approved/Rejected) regardless of `isActive` or deadline
3. **Toast message** now supports both English and Khmer

### ❌ What Didn't Change
1. Deadline filter - still removed from query (forms visible after deadline)
2. Click behavior - inactive forms still show toast, can't be clicked
3. Swipe-to-dismiss - still only available for submitted forms

## User Experience Flow

### Scenario 1: Form Not Open Yet
```
Student sees form → Gray badge "Not Open Yet"
Student clicks → Toast: "This form is not open yet" / "ទម្រង់នេះមិនទាន់បើកនៅឡើយទេ"
```

### Scenario 2: Form Submitted Before Opening
```
Student submits while active → Form becomes inactive
Student sees form → Orange badge "Pending" (NOT "Not Open Yet")
Form shows submission status, not "not open" status
```

### Scenario 3: Form Past Deadline
```
Form deadline passes → isVisible: true keeps it visible
Student hasn't submitted → Shows normally (can still submit if allowed)
Student has submitted → Shows status badge (Pending/Approved/Rejected)
```

## Technical Implementation

### Condition Priority (in order)
1. **Not Active + Not Submitted** → "Not Open Yet" styling
2. **Submitted** → Status badge (Pending/Approved/Rejected/Done)
3. **Active + Not Submitted** → Normal form styling
4. **Urgent Deadline** → Urgent badge (only if active and not submitted)

### Code Pattern
```tsx
// Condition: Show "Not Open Yet" only if both conditions are true
const showNotOpenYet = !form.isActive && !isSubmitted;

// Apply this condition consistently across:
// - Badge display
// - Icon background color
// - Border styling
// - Icon SVG selection
```

## Testing Checklist

- [ ] Form visible, not active, not submitted → Shows "Not Open Yet"
- [ ] Form visible, not active, submitted as pending → Shows "Pending"
- [ ] Form visible, not active, submitted as approved → Shows "Approved"
- [ ] Form visible, active, not submitted → Shows normal (no badge)
- [ ] Form deadline passed, not submitted → Shows normal (can submit)
- [ ] Form deadline passed, submitted → Shows status badge
- [ ] Click on "Not Open Yet" form → Toast in English
- [ ] Click on "Not Open Yet" form (Khmer) → Toast in Khmer
- [ ] Swipe on submitted form → Works (can dismiss)
- [ ] Swipe on "Not Open Yet" form → No effect (can't dismiss)

## Migration Notes

### No Database Changes Required
- Existing forms work without modification
- `isVisible` defaults to `true` for old forms
- `isActive` controls form opening
- Deadline doesn't block visibility

### Backward Compatibility
✅ Forms with `isVisible: undefined` → Treated as visible
✅ Forms with `isActive: false` → Show "Not Open Yet" if not submitted
✅ Submitted forms → Always show status, never "Not Open Yet"

## Files Modified

1. ✅ `locales/en.json` - Added `notOpenYet` translation
2. ✅ `locales/kh.json` - Added `notOpenYet` translation
3. ✅ `app/student/attendance/_components/StudentFormsList.tsx` - Updated display logic

## Summary

The update ensures that **submitted forms always display their submission status**, while **unsubmitted inactive forms show "Not Open Yet"**. This provides clarity to students about:
- Forms they can't access yet (Not Open Yet)
- Forms they've already submitted (Status badges)
- Forms they can still submit (Normal display)

Even if a form's deadline has passed or it's inactive, students who submitted it will see their submission status rather than a "not open" message, which is the correct user experience.
