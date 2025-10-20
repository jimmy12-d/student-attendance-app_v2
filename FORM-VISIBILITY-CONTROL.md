# Form Visibility Control Feature

## Overview
Added a comprehensive visibility control system to separate form display from form availability, giving admins fine-grained control over when students can see and access forms.

## Feature Details

### Three-Tiered Form Control System

1. **isVisible** (Visibility Control)
   - Controls whether a form appears in the student's form list
   - Default: `true` for backward compatibility
   - Icon: Eye (open) / Eye-off (closed)
   - Purpose: Hide forms from students that aren't ready yet

2. **isActive** (Availability Control)
   - Controls whether students can actually submit responses
   - Works independently from visibility
   - Toggle switch in admin UI
   - Purpose: Open/close form registration

3. **deadline** (Time Limit)
   - Sets the final deadline for form submissions
   - Automatic expiration when deadline passes
   - Purpose: Time-bound form availability

### Admin Features

#### Form Builder (`/dashboard/forms/[formId]`)
- Added visibility checkbox in form configuration
- Clear descriptions for each control:
  - **Active**: "Students can submit responses when active"
  - **Visible**: "Form appears in student list (if not active, shows 'Not Open Yet')"
  - **Requires Approval**: "Admin must approve/reject each response individually"

#### Forms List (`/dashboard/forms`)
- Eye icon button controls visibility
  - Green when visible
  - Gray when hidden
- Active toggle switch (green/gray)
- Both controls are independent and can be used together

### Student Experience

#### Forms List View
When `isVisible = true` and `isActive = false`:
- Form appears in the list
- Shows "Not Open Yet" badge (gray)
- Gray icon instead of blue gradient
- Gray status dot
- Gray border on card
- Clicking shows toast: "This form is not open yet. Please check back later."

When `isVisible = false`:
- Form does not appear in student list at all

When `isVisible = true` and `isActive = true`:
- Form appears normally
- Students can click and submit

## Implementation Details

### Database Schema
```typescript
interface Form {
  // ... existing fields
  isVisible: boolean; // New field - defaults to true for old forms
  isActive: boolean;  // Existing field
  deadline: Timestamp; // Existing field
}
```

### Files Modified

1. **app/_interfaces/forms.ts**
   - Added `isVisible?: boolean` to Form interface

2. **app/dashboard/forms/[formId]/page.tsx** (Form Builder)
   - Added `isVisible` state variable (line 31)
   - Added visibility checkbox in UI (lines 560-577)
   - Load isVisible from existing forms (defaults to true)
   - Save isVisible when creating/updating forms

3. **app/dashboard/forms/page.tsx** (Admin Forms List)
   - Imported `mdiEyeOffOutline` icon
   - Added `handleToggleVisibility` function (lines 172-182)
   - Added eye icon toggle button in form cards
   - Button shows current visibility state with color

4. **app/student/attendance/_components/StudentFormsList.tsx** (Student View)
   - Changed query from `isActive == true` to `isVisible == true`
   - Updated `handleFormClick` to check isActive and show toast if not active
   - Added "Not Open Yet" badge for inactive forms
   - Gray styling for inactive forms (icon, border, status dot)
   - Forms list now shows all visible forms regardless of active status

## Use Cases

### Scenario 1: Teaser/Preview
**Goal**: Show students an upcoming form but don't allow submissions yet

**Settings**:
- `isVisible = true`
- `isActive = false`
- Set deadline to future date

**Result**: Students see the form in their list with "Not Open Yet" badge. Clicking shows message. When ready, admin toggles `isActive = true` to allow submissions.

### Scenario 2: Quiet Preparation
**Goal**: Prepare a form without students knowing it exists

**Settings**:
- `isVisible = false`
- `isActive = false` (or true, doesn't matter)
- Configure all questions and settings

**Result**: Form invisible to students. When ready, toggle visibility on.

### Scenario 3: Soft Close
**Goal**: Keep form visible for reference but stop new submissions

**Settings**:
- `isVisible = true`
- `isActive = false`
- Keep past deadline if you want

**Result**: Students can see the form exists but cannot submit. Useful for showing "This form has closed."

### Scenario 4: Complete Hide
**Goal**: Remove form from student view after deadline

**Settings**:
- `isVisible = false`
- `isActive = false`
- Past deadline

**Result**: Form completely disappears from student view.

## Migration Notes

### Backward Compatibility
- Old forms without `isVisible` field are treated as `isVisible = true`
- This prevents existing forms from disappearing from student lists
- Uses `form.isVisible !== false` check to handle undefined values

### Database Updates
No migration script needed. The feature gracefully handles:
- Forms created before this feature (undefined `isVisible` → treated as true)
- Forms created after this feature (explicit `isVisible` boolean)

## UI/UX Highlights

### Visual Indicators
- **Eye Icon (Visible)**: Green background, eye-outline icon
- **Eye Icon (Hidden)**: Gray background, eye-off-outline icon
- **Active Toggle (On)**: Green background, checkmark icon
- **Active Toggle (Off)**: Gray background, X icon
- **Not Open Yet Badge**: Gray badge with lock icon
- **Inactive Form Card**: Gray gradient icon, gray border, muted colors

### Tooltips
- Eye button: "Click to hide/show form in student list"
- Active toggle: "Click to activate/deactivate form (bypasses deadline)"

### Toast Messages
- Visibility toggle: "Form visibility updated"
- Active toggle: "Form status updated"
- Student click inactive: "This form is not open yet. Please check back later."

## Testing Checklist

- [x] Create new form with visibility checkbox
- [x] Toggle visibility in form builder
- [x] Save form and verify isVisible in database
- [x] Toggle visibility from admin forms list (eye icon)
- [x] Verify student sees visible forms
- [x] Verify student doesn't see hidden forms
- [x] Verify "Not Open Yet" appears when visible but not active
- [x] Verify clicking inactive form shows toast message
- [x] Verify old forms without isVisible still work (default to visible)
- [x] Verify eye icon state reflects current visibility
- [x] Verify independent operation of visibility and active toggles

## Future Enhancements

Potential improvements for future versions:
1. Scheduled visibility (auto-show at specific time)
2. Conditional visibility (show to specific classes only when visible)
3. Bulk visibility operations (hide/show multiple forms)
4. Visibility history/audit log
5. Student notification when form becomes visible/active
6. Preview mode for admins to see student view

## Notes

- The eye icon in the admin list is stacked vertically above the active toggle
- Both controls are positioned absolutely in top-right corner of each form card
- The visibility control happens at the query level for performance
- No additional database indexes needed since we're filtering on an equality check
- The feature integrates seamlessly with existing approval workflow and deadline system
