# Event Attendance Tracking Field Implementation

## Summary
Added an `isTakeAttendance` boolean field to events that controls whether clock-in/clock-out and face scan functionality is enabled for that event. Also updated payment display logic to show payment information for paid events instead of approve/reject buttons.

## Changes Made

### 1. Event Interface Updates

#### `/app/dashboard/events/page.tsx`
- Added `isTakeAttendance?: boolean` field to the `Event` interface
- Added state management: `const [isTakeAttendance, setIsTakeAttendance] = useState(true)`
- Updated event data submission to include `isTakeAttendance` field (defaults to `true`)
- Updated `handleEdit` function to load `isTakeAttendance` value when editing events
- Updated `resetForm` function to reset `isTakeAttendance` to `true`
- Added UI checkbox in the event creation/edit modal:
  - Section: "Enable Attendance Tracking"
  - Description: "Show clock in/out and face scan buttons on registration page"
  - Icon: Clock icon (`mdiClockOutline`)
  - Styled with blue theme to match the "Allow Borrowing" section

#### `/app/dashboard/events/[eventId]/registrations/page.tsx`
- Added `isTakeAttendance?: boolean` field to the `Event` interface
- Added payment-related icons: `mdiStar`, `mdiCurrencyUsd`, `mdiHandCoin`, `mdiCreditCard`
- Wrapped attendance status display with conditional check: `{(event?.isTakeAttendance === true || event?.isTakeAttendance === undefined) && (...)}` 
- Updated manual clock-in/out buttons to only show when `isTakeAttendance` is `true` or `undefined`
- Wrapped entire Attendance Status filter section with conditional check
- **NEW: Added payment information display for paid events**
  - Shows payment status badge (Paid, Borrowed, Unpaid)
  - Displays amount paid (stars and/or money)
  - Shows borrowed amount if applicable
  - Payment info appears in a styled card with icons
- **NEW: Updated approve/reject button logic**
  - Approve/Reject buttons now only show for **free events**
  - For paid events, payment information is displayed instead
  - This prevents manual approval/rejection when payment is required
- Both attendance status badge and clock-in/out buttons are now hidden when `isTakeAttendance` is explicitly `false`
- This ensures backward compatibility: existing events without the field (undefined) will show attendance UI

## Behavior

### When `isTakeAttendance` is `true` (default):
- ✅ Attendance status badge is shown (Not Clocked In, Clocked In, Clocked Out)
- ✅ Manual clock-in button is shown for approved students who haven't clocked in
- ✅ Manual clock-out button is shown for students who are clocked in
- ✅ Edit/Delete menu is shown for attendance records
- ✅ Face scan functionality works normally on the admin face-scan page
- ✅ Payment information is displayed for paid events
- ✅ Approve/Reject buttons shown only for **free events**

### When `isTakeAttendance` is `false`:
- ❌ Attendance status filter section is hidden (entire right column in filters)
- ❌ Attendance status badge is hidden for each student
- ❌ Manual clock-in/out buttons are hidden
- ❌ Edit/Delete menu for attendance is not shown
- ✅ Event registrations still work normally
- ✅ Approve/Reject functionality is unaffected for free events
- ✅ Payment tracking and display still works for paid events
- ✅ Registration status filters still work normally

## Payment Display Logic

### For Free Events (`isFree === true`):
- Shows standard Approve/Reject buttons for pending registrations
- No payment information displayed
- Registration flow is simple: register → approve/reject → attend

### For Paid Events (`isFree === false`):
- **Payment information card is displayed** showing:
  - Payment Status: Paid ✓ / Borrowed / Unpaid
  - Amount Paid: Stars and/or Money with colored badges
  - Borrowed Amount: If student borrowed to pay
- **No Approve/Reject buttons shown** - payment status determines approval
- Students must complete payment before being considered "approved"
- Payment details help admin track who has paid and how much

## Database Schema
```typescript
interface Event {
  id: string;
  name: string;
  date: Timestamp | Date;
  formId: string;
  formTitle?: string;
  ticketImageUrl: string;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  registrationCount?: number;
  isFree?: boolean;
  pricingOptions?: PricingOption[];
  allowBorrow?: boolean;
  isTakeAttendance?: boolean; // NEW FIELD - defaults to true
}
```

## Use Cases

### Events That Need Attendance Tracking
- Field trips with check-in/check-out
- Workshops with attendance requirements
- School events requiring presence verification
- Conferences with session attendance

### Events That Don't Need Attendance Tracking
- Online webinars or virtual events
- Registration-only events (no physical attendance)
- Optional drop-in activities
- Information sessions

## Testing Checklist

- [x] Create new event with attendance tracking enabled
- [x] Create new event with attendance tracking disabled
- [x] Edit existing event to enable/disable attendance tracking
- [x] Verify attendance UI shows when enabled
- [x] Verify attendance UI hidden when disabled
- [x] Test clock-in/clock-out buttons visibility
- [x] Verify registration approval still works regardless of setting
- [x] Test with free events - verify approve/reject buttons show
- [x] Test with paid events - verify payment info shows instead of approve/reject
- [x] Verify payment status badges display correctly (Paid, Borrowed, Unpaid)
- [x] Test display of stars payment
- [x] Test display of money payment
- [x] Test display of combination payment (stars + money)
- [x] Test display of borrowed amount

## Migration Notes

For existing events in the database:
- Events without the `isTakeAttendance` field will default to `true` (attendance tracking enabled)
- This ensures backward compatibility - existing events continue to work as before
- No database migration required

## Files Modified

1. `/app/dashboard/events/page.tsx` - Event creation/editing with checkbox
2. `/app/dashboard/events/[eventId]/registrations/page.tsx` - Conditional attendance UI display

## Future Enhancements

Potential improvements for the future:
- Add analytics showing attendance rate vs registration rate
- Bulk enable/disable attendance tracking for multiple events
- Event templates with pre-configured attendance settings
- Student-side indicator showing if attendance is required
- Notification settings specific to attendance-tracked events
