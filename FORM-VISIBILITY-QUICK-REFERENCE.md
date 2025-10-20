# Form Visibility Control - Quick Reference

## Admin Quick Actions

### Toggle Visibility (Eye Icon)
**Location**: Dashboard Forms List - Top right of each form card

- **Eye Open (Green)** = Form is visible to students
- **Eye Closed (Gray)** = Form is hidden from students

**Click to toggle** between visible/hidden

### Toggle Active Status (Switch)
**Location**: Dashboard Forms List - Below eye icon

- **Switch Right (Green)** = Form accepts responses
- **Switch Left (Gray)** = Form does not accept responses

**Click to toggle** between active/inactive

### Set Visibility in Form Builder
**Location**: Form Builder - Configuration section

✅ **Visible (show to students)**
- Checked = Students can see the form in their list
- Unchecked = Form is completely hidden

✅ **Active (accepts responses)**
- Checked = Students can submit responses
- Unchecked = Form registration is closed

✅ **Requires Approval**
- Checked = Responses need admin approval
- Unchecked = Responses are auto-approved

## Common Scenarios

### 1. Preview Mode (Students can see but not submit)
```
isVisible = ✓ (ON)
isActive  = ✗ (OFF)
```
**Result**: Shows "Not Open Yet" in student list

### 2. Open for Submissions
```
isVisible = ✓ (ON)
isActive  = ✓ (ON)
```
**Result**: Students can click and submit

### 3. Closed but Visible
```
isVisible = ✓ (ON)
isActive  = ✗ (OFF)
```
**Result**: Students see it but can't submit

### 4. Completely Hidden
```
isVisible = ✗ (OFF)
isActive  = ✗ (OFF)
```
**Result**: Students don't see the form at all

## Student View States

| Visibility | Active | Student Sees |
|-----------|--------|--------------|
| OFF | OFF | Nothing (form hidden) |
| OFF | ON | Nothing (form hidden) |
| ON | OFF | Gray card with "Not Open Yet" badge |
| ON | ON | Blue card - can click to submit |

## Visual Indicators

### In Admin List
- **Eye Green** = Visible to students
- **Eye Gray** = Hidden from students
- **Switch Green** = Accepting responses
- **Switch Gray** = Not accepting responses

### In Student List (when visible)
- **Blue gradient icon** = Active and open
- **Gray gradient icon** = Not open yet
- **Green checkmark icon** = Already submitted
- **Orange pending icon** = Awaiting approval

## Tips

💡 **Use visibility to prepare forms quietly**
- Set `isVisible = OFF` while building
- Toggle ON when ready to announce

💡 **Use active status for time-sensitive control**
- Keep `isVisible = ON` so students know it exists
- Toggle `isActive` to open/close submissions

💡 **Combine with deadline for automatic closure**
- Set deadline for final cutoff time
- Use active toggle for early closure if needed

💡 **Preview before launch**
- Create form with `isVisible = OFF`
- Test thoroughly
- Toggle visibility when ready

## Workflow Example

### Launching a New Form

1. **Create Form**
   - Build questions and configuration
   - Set `isVisible = OFF` (hidden while preparing)
   - Set `isActive = OFF` (not accepting yet)
   - Set future deadline

2. **Preview & Test**
   - Form is invisible to students
   - Use direct link to test if needed
   - Make any adjustments

3. **Announce (but don't open)**
   - Toggle `isVisible = ON`
   - Keep `isActive = OFF`
   - Students see "Not Open Yet"

4. **Open for Submissions**
   - Toggle `isActive = ON`
   - Students can now submit

5. **Close Early (if needed)**
   - Toggle `isActive = OFF`
   - Form still visible but closed

6. **Hide After Deadline**
   - Toggle `isVisible = OFF`
   - Form disappears from student list

## Keyboard Shortcuts (Future Enhancement)
*Currently requires clicking, but these would be useful:*
- `V` - Toggle visibility
- `A` - Toggle active status
- `Shift+V` - Bulk visibility change
- `Shift+A` - Bulk active change

## API Reference (for developers)

### Toggle Visibility
```typescript
const handleToggleVisibility = async (formId: string, currentVisibility: boolean) => {
  await updateDoc(doc(db, "forms", formId), {
    isVisible: !currentVisibility
  });
};
```

### Toggle Active Status
```typescript
const handleToggleActive = async (formId: string, currentActive: boolean) => {
  await updateDoc(doc(db, "forms", formId), {
    isActive: !currentActive
  });
};
```

### Query Visible Forms (Student)
```typescript
const formsQuery = query(
  collection(db, "forms"),
  where("isVisible", "==", true),
  where("deadline", ">=", Timestamp.now())
);
```

## Troubleshooting

**Q: Old forms are not showing to students after update**
A: Old forms default to `isVisible = true`. Check the active status and deadline instead.

**Q: Students see form but can't click it**
A: This is correct if `isActive = false`. They'll see "Not Open Yet" message on click.

**Q: Eye icon doesn't change color when clicked**
A: Check browser console for errors. Ensure you have proper permissions to update the form.

**Q: Form shows in admin but not students**
A: Check three things:
1. `isVisible = true`?
2. `deadline` is in the future?
3. Student's class type matches `targetClassTypes` (if specified)?

**Q: Want to re-open closed form**
A: Toggle `isActive = ON`. If deadline passed, you may need to extend the deadline too.

## Related Documentation

- [FORM-VISIBILITY-CONTROL.md](./FORM-VISIBILITY-CONTROL.md) - Complete feature documentation
- [FILE-UPLOAD-FEATURE.md](./FILE-UPLOAD-FEATURE.md) - File upload capability
- [FILE-UPLOAD-DEFAULT-5MB.md](./FILE-UPLOAD-DEFAULT-5MB.md) - File size limits
