# Form Builder Enhancement Summary

## Overview
Enhanced the form builder system with four major new features:
1. **Form Types** - Categorize forms with different icons
2. **Approval Workflow** - Admin approval for form responses
3. **Class Type Targeting** - Forms and questions can target specific class types
4. **Enhanced Filtering** - Students only see relevant forms and questions

---

## 1. Form Types

### What Was Added
- 6 predefined form types with unique icons and colors:
  - **Class Register** (Blue) - Daily attendance
  - **Mock Exam Register** (Purple) - Mock exam attendance
  - **Event** (Green) - Event registration
  - **Survey** (Orange) - Student surveys
  - **Feedback** (Pink) - Feedback collection
  - **General** (Gray) - General purpose

### Files Modified
- `app/_interfaces/forms.ts` - Added `FormType` enum and `formType` field
- `app/_constants/formTypes.ts` - **NEW FILE** - Form type configurations
- `app/dashboard/forms/[formId]/page.tsx` - Form type dropdown in builder
- `app/dashboard/forms/page.tsx` - Display form type badges and icons

### Usage
Admins select a form type when creating/editing a form. The type is displayed with a colored badge and appropriate icon throughout the system.

---

## 2. Approval Workflow

### What Was Added
- Optional approval requirement for forms
- Three approval statuses: **Pending**, **Approved**, **Rejected**
- Admin can approve/reject individual responses
- Approval statistics displayed in response summary

### Fields Added to `FormResponse`
```typescript
approvalStatus?: 'pending' | 'approved' | 'rejected'
approvedBy?: string        // Admin UID
approvalNote?: string      // Optional note
approvedAt?: Timestamp     // When decision was made
```

### Files Modified
- `app/_interfaces/forms.ts` - Added approval fields
- `app/dashboard/forms/[formId]/page.tsx` - "Requires Approval" checkbox
- `app/dashboard/forms/[formId]/responses/page.tsx` - Approval UI with stats
- `app/student/forms/[formId]/page.tsx` - Set status to 'pending' on submit

### Usage
1. Admin enables "Requires Approval" when creating a form
2. Students submit responses (status = 'pending')
3. Admin views responses and clicks Approve/Reject buttons
4. Statistics show counts: X Approved, Y Pending, Z Rejected

---

## 3. Class Type Targeting (Forms)

### What Was Added
- Forms can be restricted to specific class types (e.g., Grade 12, Grade 11A)
- If no class types selected, form is available to all students
- Students only see forms matching their `classType` field

### Fields Added to `Form`
```typescript
targetClassTypes?: string[]  // Array of class types, e.g., ['Grade 12', 'Grade 11A']
```

### Files Modified
- `app/_interfaces/forms.ts` - Added `targetClassTypes` field
- `app/dashboard/forms/[formId]/page.tsx` - Multi-select checkboxes for class types
- `app/student/attendance/_components/StudentFormsList.tsx` - Filter forms by student's classType

### Usage
1. Admin selects target class types when creating a form
2. Form is only visible to students whose `classType` matches
3. Empty selection = visible to all students

---

## 4. Class Type Targeting (Questions)

### What Was Added
- Individual questions can target specific class types
- Questions without targeting are shown to all students
- Students only see questions matching their `classType`

### Fields Added to `Question`
```typescript
targetClassTypes?: string[]  // Array of class types for this question
```

### Files Modified
- `app/_interfaces/forms.ts` - Added `targetClassTypes` to Question
- `app/dashboard/forms/_components/QuestionEditor.tsx` - Collapsible class type selector
- `app/student/forms/[formId]/page.tsx` - `getVisibleQuestions()` filter function

### Usage
1. Admin expands "Target Class Types" section in question editor
2. Selects which class types should see this question
3. Only matching students see the question when filling the form
4. Validation and submission only consider visible questions

---

## Data Flow

### Student Viewing Forms
```
1. Student opens form list
2. System filters forms by student's classType
3. Only matching forms (or forms with no targeting) are shown
```

### Student Filling Form
```
1. Student opens a form
2. System filters questions by student's classType
3. Only matching questions (or questions with no targeting) are shown
4. Validation only checks visible questions
5. Submission includes classType and approvalStatus (if required)
```

### Admin Approving Response
```
1. Admin opens responses page
2. Sees approval statistics (approved/pending/rejected)
3. Clicks on a response
4. Clicks Approve or Reject button
5. Response updated with status, admin UID, and timestamp
```

---

## Database Schema Changes

### `forms` collection
```typescript
{
  // ... existing fields ...
  formType: 'class_register' | 'mock_register' | 'event' | 'survey' | 'feedback' | 'general',
  requiresApproval: boolean,
  targetClassTypes: string[],  // e.g., ['Grade 12', 'Grade 11A']
  questions: [
    {
      // ... existing fields ...
      targetClassTypes: string[]  // Per-question targeting
    }
  ]
}
```

### `form_responses` collection
```typescript
{
  // ... existing fields ...
  classType: string,            // Student's class type
  approvalStatus: 'pending' | 'approved' | 'rejected',
  approvedBy: string,           // Admin UID
  approvalNote: string,         // Optional
  approvedAt: Timestamp
}
```

---

## UI Enhancements

### Admin Form Builder
- Form type dropdown with descriptions
- Multi-select class type checkboxes (form level)
- "Requires Approval" toggle
- Per-question class type filters (collapsible)
- Visual badges showing selected class types

### Admin Forms List
- Form type icons and colored badges
- "Approval" badge when approval is required
- Class type pills showing first 2 + count

### Admin Response View
- Approval statistics badges (Green/Orange/Red)
- Colored borders on response cards by status
- Approve/Reject buttons in detail view
- Status badges on each response card

### Student Form List
- Filtered by student's class type
- Only shows accessible forms

### Student Form View
- Filtered questions based on class type
- Progress bar reflects only visible questions

---

## Example Use Cases

### Use Case 1: Mock Exam Registration for Grade 12 Only
1. Admin creates form with type "Mock Exam Register"
2. Selects "Grade 12" in target class types
3. Only Grade 12 students see the form
4. Enables "Requires Approval"
5. Admin reviews and approves each registration

### Use Case 2: Event with Different Questions per Grade
1. Admin creates form with type "Event"
2. Question 1: "Your name" (no class type = all see it)
3. Question 2: "Grade 12 specific question" (target: Grade 12)
4. Question 3: "Grade 11 specific question" (target: Grade 11A, Grade 11E)
5. Each student sees only relevant questions

### Use Case 3: Class Register for Specific Classes
1. Admin creates form with type "Class Register"
2. Selects multiple target class types: Grade 7, Grade 8, Grade 9
3. Only junior grades see this registration form
4. Senior grades see different forms

---

## Migration Notes

### Existing Forms
- Old forms without `formType` will default to 'general'
- Old forms without `targetClassTypes` are accessible to all
- Old questions without `targetClassTypes` are shown to all
- Old responses without approval fields continue to work

### Student Data Requirement
- Students must have `classType` field in their document
- If missing, they'll see all forms (no filtering)
- Found at: `students/{docId}/classType`

---

## Testing Checklist

### Form Creation
- [ ] Create form with each type - verify icon changes
- [ ] Enable "Requires Approval" - verify checkbox works
- [ ] Select target class types - verify pills display
- [ ] Add questions with class type filters - verify UI

### Student Experience
- [ ] Verify student only sees matching forms
- [ ] Verify student only sees matching questions
- [ ] Submit form - verify approval status set correctly
- [ ] Check progress bar updates correctly

### Admin Approval
- [ ] View response statistics - verify counts
- [ ] Approve a response - verify status updates
- [ ] Reject a response - verify status updates
- [ ] Verify response list shows color-coded borders

### Edge Cases
- [ ] Form with no class types - visible to all
- [ ] Question with no class types - visible to all
- [ ] Student with no classType - sees all forms
- [ ] Form without approval - no approval UI shown

---

## Files Created
1. `app/_constants/formTypes.ts` - Form type configurations

## Files Modified
1. `app/_interfaces/forms.ts` - Added types and fields
2. `app/dashboard/forms/[formId]/page.tsx` - Form builder UI
3. `app/dashboard/forms/_components/QuestionEditor.tsx` - Question targeting
4. `app/dashboard/forms/page.tsx` - Forms list display
5. `app/dashboard/forms/[formId]/responses/page.tsx` - Approval workflow
6. `app/student/attendance/_components/StudentFormsList.tsx` - Form filtering
7. `app/student/forms/[formId]/page.tsx` - Question filtering + submission

---

## Future Enhancements
- Bulk approve/reject multiple responses
- Email notifications for approval decisions
- Approval notes/comments functionality
- Export filtered by approval status
- Form templates based on type
- Analytics by form type
