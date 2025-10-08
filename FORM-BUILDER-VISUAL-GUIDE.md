# Form Builder Enhancement - Visual Guide

## 🎨 Form Types & Icons

Each form type has a unique icon and color scheme:

```
┌─────────────────────────────────────────────────────────────┐
│ CLASS REGISTER       📋  Blue                                │
│ ├─ Icon: mdiClipboardTextClockOutline                       │
│ └─ Use: Daily attendance, class registration                │
├─────────────────────────────────────────────────────────────┤
│ MOCK EXAM REGISTER   🎓  Purple                             │
│ ├─ Icon: mdiSchool                                          │
│ └─ Use: Mock exam attendance registration                   │
├─────────────────────────────────────────────────────────────┤
│ EVENT                🌟  Green                              │
│ ├─ Icon: mdiCalendarStar                                    │
│ └─ Use: Event registration and participation                │
├─────────────────────────────────────────────────────────────┤
│ SURVEY               📊  Orange                             │
│ ├─ Icon: mdiPoll                                            │
│ └─ Use: Student surveys and polls                           │
├─────────────────────────────────────────────────────────────┤
│ FEEDBACK             💬  Pink                               │
│ ├─ Icon: mdiCommentQuote                                    │
│ └─ Use: Feedback and suggestions                            │
├─────────────────────────────────────────────────────────────┤
│ GENERAL              📄  Gray                               │
│ ├─ Icon: mdiFormSelect                                      │
│ └─ Use: General purpose form                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Form Builder Interface

### New Fields Added

```
┌─────────────────────────────────────────────────────────────┐
│ FORM SETTINGS                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Form Title *                                                 │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Student Feedback Survey                               │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Description                                                  │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Please provide your honest feedback...                │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Form Type *                                                  │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ▼ Survey - Student surveys and polls                  │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ Target Class Types (optional)                                │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ ☑ Grade 7    ☑ Grade 8    ☐ Grade 9                  │   │
│ │ ☑ Grade 10   ☐ Grade 11A  ☐ Grade 11E                │   │
│ │ ☐ Grade 12   ☐ Grade 12 Social                        │   │
│ └──────────────────────────────────────────────────────┘   │
│ Selected: [Grade 7] [Grade 8] [Grade 10]                    │
│                                                              │
│ Deadline *              Max Responses                        │
│ ┌──────────────────┐    ┌──────────────────┐               │
│ │ 2025-10-15 17:00 │    │ 100              │               │
│ └──────────────────┘    └──────────────────┘               │
│                                                              │
│ ☑ Active (visible to students)                              │
│ ☑ Requires Approval                                          │
│   Admin must approve/reject each response individually       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔍 Question-Level Class Type Filtering

### Question Editor Interface

```
┌─────────────────────────────────────────────────────────────┐
│ Question 1                      [Dropdown ▼] ☑ Required     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ What is your favorite subject?                               │
│ ──────────────────────────────────────────────────────────  │
│                                                              │
│ 1. Mathematics                                               │
│ 2. Science                                                   │
│ 3. English                                                   │
│ 4. [+ Add option]                                           │
│                                                              │
│ 👤 Target Class Types (2) ▼                                 │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ Select class types that should see this question.    │   │
│ │ Leave empty for all students.                        │   │
│ │                                                       │   │
│ │ ☑ Grade 7    ☑ Grade 8    ☐ Grade 9                  │   │
│ │ ☐ Grade 10   ☐ Grade 11A  ☐ Grade 11E                │   │
│ │                                                       │   │
│ │ Selected: [Grade 7] [Grade 8]                         │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Admin Forms List Display

### Form Card with New Features

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 SURVEY    ✓ APPROVAL                        [●──○] OFF   │
│                                                              │
│ Student Feedback Survey                                      │
│ Please provide your honest feedback about our program       │
│                                                              │
│ [Grade 7] [Grade 8] +1                                      │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ 📅 Deadline:    Oct 15, 2025 5:00 PM                       │
│ ❓ Questions:   12                                          │
│ 👥 Responses:   45                                          │
│                                                              │
│ [👁 View] [✏ Edit] [📄 Copy] [🗑 Delete]                   │
└─────────────────────────────────────────────────────────────┘
```

**Legend:**
- 📊 SURVEY = Form type badge (colored)
- ✓ APPROVAL = Requires approval badge
- [Grade 7] = Class type pills
- [●──○] OFF = Active toggle switch

---

## 📝 Response View with Approval

### Response Summary Header

```
┌─────────────────────────────────────────────────────────────┐
│ Student Feedback Survey                                      │
│ Please provide your honest feedback about our program       │
│                                                              │
│ 👥 45 responses  ⏰ Deadline: Oct 15, 2025 5:00 PM         │
│                                                              │
│ ✓ 30 Approved    ⏳ 10 Pending    ✗ 5 Rejected            │
│   (Green)          (Orange)          (Red)                  │
└─────────────────────────────────────────────────────────────┘
```

### Response List with Status

```
┌─────────────────────────────────────────────────────────────┐
│ RESPONSES                                                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ✓ John Doe          [✓ Approved]             ✓      │    │
│ │ ID: 12345                                            │    │
│ │ Grade 12 • Morning • Grade 12 Social                 │    │
│ │ Oct 10, 2025 2:30 PM                                 │    │
│ └─────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ⏳ Jane Smith       [⏳ Pending]              ⏰      │    │
│ │ ID: 12346                                            │    │
│ │ Grade 11A • Morning • Grade 11A                      │    │
│ │ Oct 11, 2025 9:15 AM                                 │    │
│ └─────────────────────────────────────────────────────┘    │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ ✗ Bob Wilson        [✗ Rejected]             ✗      │    │
│ │ ID: 12347                                            │    │
│ │ Grade 10 • Afternoon • Grade 10                      │    │
│ │ Oct 12, 2025 3:45 PM                                 │    │
│ └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Response Detail with Approval Actions

```
┌─────────────────────────────────────────────────────────────┐
│ Response from Jane Smith                                     │
│                                       [✓ Approve] [✗ Reject] │
├─────────────────────────────────────────────────────────────┤
│ 1. What is your favorite subject?                            │
│    ┌──────────────────────────────────────────────────┐     │
│    │ Mathematics                                       │     │
│    └──────────────────────────────────────────────────┘     │
│                                                              │
│ 2. How would you rate our program?                          │
│    ┌──────────────────────────────────────────────────┐     │
│    │ 9/10                                              │     │
│    └──────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎓 Student View - Form List

### Forms List (Filtered by Class Type)

```
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE FORMS                                    Badge: 2     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 📊  Student Feedback Survey          [URGENT] ───→   │   │
│ │                                                       │   │
│ │ • 2h left  • 12 questions                            │   │
│ │ Please provide your honest feedback...               │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌──────────────────────────────────────────────────────┐   │
│ │ 🌟  School Event Registration              ✓ Done    │   │
│ │                                                       │   │
│ │ • Completed  • 8 questions                           │   │
│ │ Register for the upcoming school event               │   │
│ └──────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Student only sees forms where:
- Form has no `targetClassTypes` (open to all), OR
- Form's `targetClassTypes` includes student's `classType`

---

## 📝 Student View - Form Filling

### Form with Filtered Questions

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Student Feedback Survey                                   │
│ Please provide your honest feedback about our program       │
│ * Required field                                             │
│                                                              │
│ Progress: [████████░░░░] 4/6 completed                      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 1  What is your name? *                                      │
│    ┌──────────────────────────────────────────────────┐     │
│    │ Your answer                                       │     │
│    └──────────────────────────────────────────────────┘     │
│    ✓ Completed                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 2  What is your favorite subject? * (Grade 7-8 only)        │
│    ○ Mathematics                                             │
│    ○ Science                                                 │
│    ○ English                                                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 3  Rate our facilities (1-10) *                             │
│    [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]                │
└─────────────────────────────────────────────────────────────┘
```

**Note:** Question 2 only shows to Grade 7-8 students (filtered by `targetClassTypes`)

---

## 🔄 Data Flow Diagrams

### Form Access Flow

```
Student opens forms list
        ↓
Load all active forms from Firestore
        ↓
Filter: form.targetClassTypes includes student.classType
   OR form.targetClassTypes is empty/undefined
        ↓
Display filtered forms
        ↓
Student clicks a form
        ↓
Load form questions
        ↓
Filter: question.targetClassTypes includes student.classType
   OR question.targetClassTypes is empty/undefined
        ↓
Display filtered questions
```

### Approval Flow

```
Student submits form
        ↓
If form.requiresApproval === true:
    Set response.approvalStatus = 'pending'
        ↓
Admin views response
        ↓
Admin clicks [Approve] or [Reject]
        ↓
Update Firestore:
    - approvalStatus: 'approved' | 'rejected'
    - approvedBy: admin.uid
    - approvedAt: Timestamp.now()
        ↓
UI updates automatically (real-time listener)
```

---

## 🎯 Status Indicators

### Approval Status Colors

```
✓ APPROVED
├─ Badge: Green background
├─ Border: Green (green-500)
├─ Icon: mdiCheckCircle
└─ Text: "✓ Approved"

⏳ PENDING
├─ Badge: Orange background
├─ Border: Orange (orange-500)
├─ Icon: mdiClockOutline
└─ Text: "⏳ Pending"

✗ REJECTED
├─ Badge: Red background
├─ Border: Red (red-500)
├─ Icon: mdiClose
└─ Text: "✗ Rejected"
```

### Form Type Colors

```
CLASS REGISTER:    Blue (#3B82F6)
MOCK EXAM:         Purple (#A855F7)
EVENT:             Green (#10B981)
SURVEY:            Orange (#F97316)
FEEDBACK:          Pink (#EC4899)
GENERAL:           Gray (#6B7280)
```

---

## ⚙️ Configuration Options

### When Creating/Editing a Form

**Required Settings:**
- ✅ Form Title
- ✅ Form Type
- ✅ Deadline

**Optional Settings:**
- ⚪ Description
- ⚪ Target Class Types (empty = all students)
- ⚪ Max Responses (empty = unlimited)
- ⚪ Requires Approval (checkbox)

### When Creating/Editing a Question

**Required Settings:**
- ✅ Question Text
- ✅ Question Type

**Optional Settings:**
- ⚪ Required (checkbox)
- ⚪ Target Class Types (empty = all students)
- ⚪ Options (for multiple choice, checkboxes, dropdown)
- ⚪ Scale settings (for linear scale)

---

## 📱 Responsive Design Notes

All new UI elements are responsive:
- Class type checkboxes: 2 columns on mobile, 3 on desktop
- Approval buttons: Stack on mobile, side-by-side on desktop
- Status badges: Wrap to new line on small screens
- Form type badges: Always visible with proper truncation

---

## 🔐 Permissions Notes

**Firestore Rules Considerations:**
- Students can only read forms where they match `targetClassTypes`
- Students can create responses but not update approval fields
- Only admins can update `approvalStatus`, `approvedBy`, etc.
- Recommend server-side validation for class type filtering

---

## 💡 Tips for Admins

1. **Form Types**: Choose the most appropriate type for better organization
2. **Class Targeting**: Leave empty if form is for all students
3. **Question Targeting**: Use when different grades need different questions
4. **Approval**: Enable only when manual review is needed (adds admin workload)
5. **Statistics**: Use approval stats to track review progress
6. **Export**: CSV export includes approval status column

---

## 🐛 Troubleshooting

**Students can't see forms:**
- Check if student has `classType` field in Firestore
- Verify form's `targetClassTypes` includes student's class
- Ensure form is marked as Active

**Questions not showing:**
- Check question's `targetClassTypes` settings
- Verify student's `classType` matches

**Approval not working:**
- Ensure form has `requiresApproval: true`
- Check admin has necessary Firestore permissions
- Verify response exists in database

**Icons not displaying:**
- Ensure `@mdi/js` package is installed
- Check import statements in form builder
