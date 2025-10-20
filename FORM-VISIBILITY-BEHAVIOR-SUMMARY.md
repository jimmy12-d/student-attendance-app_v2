# Form Visibility Behavior - Student View

## Current Behavior ✅

The student forms list now correctly shows forms based on the following logic:

### What Students See

#### 1. **Visible & Active & Not Submitted**
```
isVisible: true (or undefined)
isActive: true
hasResponded: false
```
**Display**: 
- Blue gradient icon
- "Urgent" or deadline countdown badge
- Clickable to submit

#### 2. **Visible & Active & Submitted (No Approval Required)**
```
isVisible: true (or undefined)
isActive: true
hasResponded: true
requiresApproval: false
```
**Display**:
- Green checkmark icon
- Green "Done" badge
- Shows submission status
- Can swipe to dismiss

#### 3. **Visible & Active & Submitted (Approval Required)**
```
isVisible: true (or undefined)
isActive: true
hasResponded: true
requiresApproval: true
```
**Display**:
- Icon color based on approval status:
  - Green (Approved)
  - Red (Rejected)
  - Orange (Pending)
- Status badge showing approval state
- Shows submission status
- Can swipe to dismiss

#### 4. **Visible & Not Active**
```
isVisible: true (or undefined)
isActive: false
```
**Display**:
- Gray icon
- Gray "Not Open Yet" badge
- Muted colors
- Clickable but shows toast: "This form is not open yet. Please check back later."

#### 5. **Hidden Forms**
```
isVisible: false
```
**Display**: 
- **Not shown at all** (filtered out)

---

## Key Features

### ✅ Submitted Forms Stay Visible
- Students can see forms they've submitted
- Clear status indicators (Approved, Pending, Rejected, Done)
- Can dismiss submitted forms by swiping left

### ✅ Preview Mode
- Forms with `isActive: false` show as "Not Open Yet"
- Students can see upcoming forms but cannot submit

### ✅ Backward Compatibility
- Forms without `isVisible` field (undefined) are treated as visible
- Old forms continue to work without database migration

### ✅ Manual Dismissal
- Students can swipe submitted forms to the left
- Shows delete button
- Removed from view but still in database
- Dismissed state saved in localStorage per student

---

## Query Logic

### Database Query
```typescript
query(
  collection(db, "forms"),
  where("deadline", ">=", now)
)
```
- Retrieves all forms with future deadlines
- No server-side visibility filter (for backward compatibility)

### Client-Side Filter
```typescript
.filter(form => form.isVisible !== false)
```
- Only excludes forms explicitly set to `false`
- Includes forms with `isVisible: true`
- Includes forms with `isVisible: undefined` (old forms)

### Display Filter
```typescript
.filter(f => !dismissedForms.has(f.id))
```
- Removes forms student manually dismissed
- Dismissed state persists in localStorage

---

## Visual States

| isVisible | isActive | Submitted | Icon | Badge | Clickable |
|-----------|----------|-----------|------|-------|-----------|
| false | - | - | ❌ Not shown | ❌ Not shown | ❌ No |
| true/undefined | false | false | Gray | "Not Open Yet" | ✅ Yes (shows toast) |
| true/undefined | true | false | Blue gradient | Deadline/Urgent | ✅ Yes (submit form) |
| true/undefined | true | true (no approval) | Green | "Done" | ✅ Yes (can dismiss) |
| true/undefined | true | true (pending) | Orange | "Pending" | ✅ Yes (can dismiss) |
| true/undefined | true | true (approved) | Green | "Approved" | ✅ Yes (can dismiss) |
| true/undefined | true | true (rejected) | Red | "Rejected" | ✅ Yes (can dismiss) |

---

## Admin Use Cases

### Scenario 1: Announce Form Early
**Goal**: Let students know a form exists but don't accept submissions yet

**Settings**:
- `isVisible: true` ✅
- `isActive: false` ❌

**Student sees**: Form with "Not Open Yet" badge, gray styling

**When ready**: Admin toggles `isActive: true` → students can submit

---

### Scenario 2: Keep Submitted Forms Visible
**Goal**: Students can see their submission status

**Settings**:
- `isVisible: true` ✅
- `isActive: true` ✅
- Student submits

**Student sees**: Form with "Done"/"Approved"/"Pending" badge, can dismiss

---

### Scenario 3: Hide Form Completely
**Goal**: Remove form from student view

**Settings**:
- `isVisible: false` ❌

**Student sees**: Nothing (form doesn't appear in list)

---

### Scenario 4: Close Form But Keep Visible
**Goal**: Stop accepting submissions but keep form visible

**Settings**:
- `isVisible: true` ✅
- `isActive: false` ❌

**Student sees**: 
- If not submitted: "Not Open Yet" (can't submit)
- If submitted: Still shows their submission status

---

## Technical Notes

### Why Client-Side Filtering?
Firestore queries with `where("isVisible", "==", true)` only match documents where the field is explicitly `true`. This breaks backward compatibility with forms that don't have the `isVisible` field.

**Solution**: Query all forms, filter client-side with `form.isVisible !== false`

### Performance Consideration
Client-side filtering is acceptable because:
- Forms are limited by deadline (only future forms)
- Typical schools have 10-50 active forms max
- Real-time updates via `onSnapshot` are efficient
- No pagination needed for this volume

### localStorage for Dismissed Forms
```typescript
localStorage.setItem(`dismissed_forms_${studentUid}`, JSON.stringify(Array.from(dismissedSet)))
```
- Persists between sessions
- Per-student basis
- Doesn't affect database
- Can be cleared by clearing browser data

---

## Troubleshooting

**Q: Student doesn't see any forms even though forms exist**
- Check: `isVisible !== false` ✅
- Check: `deadline` is in the future ✅
- Check: Form not linked to an event ✅
- Check: Student's `classType` matches `targetClassTypes` (if set) ✅

**Q: Submitted forms disappear**
- They shouldn't! Check if student manually dismissed them
- Dismissed forms stored in localStorage: `dismissed_forms_${studentUid}`
- Can be restored by clearing browser data

**Q: Form shows "Not Open Yet" even though it should be active**
- Check admin dashboard: Is `isActive` toggled ON?
- Check form builder: Is the Active checkbox checked?
- May need to refresh student page

**Q: Old forms suddenly disappeared**
- If you changed a form to `isVisible: false`, it will hide
- If deadline passed, it will be filtered out
- Check Firebase console for form data

---

## Related Documentation
- [FORM-VISIBILITY-CONTROL.md](./FORM-VISIBILITY-CONTROL.md) - Complete feature documentation
- [FORM-VISIBILITY-QUICK-REFERENCE.md](./FORM-VISIBILITY-QUICK-REFERENCE.md) - Admin quick reference
