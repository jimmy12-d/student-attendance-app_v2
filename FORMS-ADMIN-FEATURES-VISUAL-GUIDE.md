# 🎯 Forms Features - Quick Visual Guide

## Admin Forms List - Button Layout

```
┌─────────────────────────────────────────────────┐
│  📋 Student Feedback Survey          [●────○]   │ ← Active Toggle
│                                                  │
│  Description text here...                       │
│                                                  │
│  📅 Deadline: Dec 25, 2024                      │
│  📝 Questions: 5                                │
│  👥 Responses: 12 / 50                          │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │  📊 Responses                             │   │ ← Primary Actions
│  └──────────────────────────────────────────┘   │
│  [✏️ Edit]  [🗑️ Delete]                         │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐            │
│  │ 👁️ Preview  │  │ 📋 Duplicate │            │ ← New Actions
│  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────┘
```

---

## Toggle Switch States

### Active (ON) - Form Accessible
```
┌──────────────┐
│  ●───────○   │  🟢 Emerald → Green gradient
└──────────────┘
       ↓
Students CAN access
(Deadline bypassed)
```

### Inactive (OFF) - Form Blocked
```
┌──────────────┐
│    ○───────● │  ⚫ Gray
└──────────────┘
       ↓
Students CANNOT access
(Blocked)
```

---

## Preview Modal Layout

```
┌───────────────────────────────────────────────────────┐
│  👁️ Form Preview                               [X]   │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📋 Student Feedback Survey                           │
│  Please share your thoughts on this semester...       │
└───────────────────────────────────────────────────────┘
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  1  How would you rate this course? *          │ │
│  │     Type: Multiple choice                       │ │
│  │                                                 │ │
│  │     ○ Excellent                                 │ │
│  │     ○ Good                                      │ │
│  │     ○ Average                                   │ │
│  │     ○ Poor                                      │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  2  Any additional comments?                   │ │
│  │     Type: Paragraph                             │ │
│  │                                                 │ │
│  │     ┌─────────────────────────────────────┐    │ │
│  │     │ Your answer...                      │    │ │
│  │     │                                     │    │ │
│  │     └─────────────────────────────────────┘    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ℹ️ This is a preview. Students will see this form.  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Form Duplication Flow

```
Original Form                    Duplicate Created
┌──────────────┐                ┌─────────────────────┐
│ Course Survey│    Click        │ Course Survey       │
│              │  Duplicate  →   │ (Copy)              │
│ Active: ✅   │                 │ Active: ❌          │
│ 5 questions  │                 │ 5 questions (same)  │
└──────────────┘                └─────────────────────┘
```

---

## Question Type Preview Examples

### 1. Short Answer
```
┌─────────────────────────────┐
│ Your answer...              │
└─────────────────────────────┘
```

### 2. Paragraph
```
┌─────────────────────────────┐
│ Your answer...              │
│                             │
│                             │
│                             │
└─────────────────────────────┘
```

### 3. Multiple Choice (Radio)
```
○ Option 1
○ Option 2
○ Option 3
```

### 4. Checkboxes (Multiple)
```
☐ Option 1
☐ Option 2
☐ Option 3
```

### 5. Dropdown
```
┌─────────────────┐
│ Choose...    ▼  │
└─────────────────┘
```

### 6. Linear Scale (1-5)
```
1 ────────────────────── 5
Not satisfied      Very satisfied

┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐
│ 1 │ │ 2 │ │ 3 │ │ 4 │ │ 5 │
└───┘ └───┘ └───┘ └───┘ └───┘
```

---

## Access Control Logic

### Admin View
```
Form Card
├─ Toggle Switch (Top-right)
├─ Status indicators
└─ Action buttons
   ├─ Responses (Blue)
   ├─ Edit (Purple)
   ├─ Delete (Red)
   ├─ Preview (Teal)    ← New
   └─ Duplicate (Orange) ← New
```

### Student View
```
Check isActive
     │
     ├─ ✅ Active → Show form
     │
     └─ ❌ Inactive → Blocked
                    "Form not currently active"
```

---

## Toggle State Matrix

| Deadline Status | Toggle ON | Toggle OFF | Student Access |
|----------------|-----------|------------|----------------|
| Future         | ✅ Active  | ❌ Inactive | ✅ Can Access   |
| Future         | ❌ Inactive | ❌ Inactive | ❌ Blocked      |
| Past (Expired) | ✅ Active  | ✅ Active  | ✅ Can Access   |
| Past (Expired) | ❌ Inactive | ❌ Inactive | ❌ Blocked      |

**Key Point:** Toggle ON = Always accessible (bypasses deadline)

---

## Button Colors Reference

```
Responses:  🔵●──────────●🟣  Blue → Indigo
Edit:       🟣  Purple background
Delete:     🔴  Red background
Preview:    🟢●──────────●🔵  Teal → Cyan
Duplicate:  🟠●──────────●🟡  Orange → Amber
```

---

## User Workflow Diagrams

### 1. Preview Workflow
```
Admin clicks Preview
       ↓
Modal opens (overlay)
       ↓
Review questions
       ↓
Click X or outside
       ↓
Modal closes
```

### 2. Duplicate Workflow
```
Admin finds form
       ↓
Clicks Duplicate
       ↓
Form copied instantly
       ↓
"(Copy)" appears in list
       ↓
Edit copied form
```

### 3. Toggle Workflow
```
Form with deadline tomorrow
       ↓
Admin toggles OFF
       ↓
Students blocked immediately
       ↓
Admin toggles ON (next week)
       ↓
Students can access again
```

---

## Mobile Layout

### Card on Mobile
```
┌─────────────────────┐
│ Form Title  [Toggle]│
│                     │
│ Description...      │
│                     │
│ 📅 Deadline         │
│ 📝 Questions: 5     │
│ 👥 Responses: 12    │
│                     │
│ ┌─────────────────┐ │
│ │  📊 Responses  │ │
│ └─────────────────┘ │
│                     │
│ [✏️]  [🗑️]         │
│                     │
│ ┌────────┐ ┌──────┐│
│ │Preview │ │Dupli │││
│ └────────┘ └──────┘││
└─────────────────────┘
```

---

## Icon Legend

- 👁️ `mdiEyeOutline` - Preview
- 📋 `mdiContentCopy` - Duplicate  
- ✏️ `mdiPencil` - Edit
- 🗑️ `mdiDelete` - Delete
- 📊 `mdiChartBox` - Responses
- ✅ `mdiCheckCircle` - Active
- ❌ `mdiCloseCircle` - Inactive
- 📅 `mdiCalendarClock` - Deadline
- 📝 `mdiFileDocumentEditOutline` - Questions
- 👥 `mdiAccountMultiple` - Responses count
- ⚠️ `mdiClockAlertOutline` - Expired

---

## Quick Comparison

### Before Enhancement
```
[────── Responses ──────]  [Edit]  [Delete]

Static badge shows "Active" or "Inactive"
No preview available
No duplication feature
Deadline controls access
```

### After Enhancement
```
[────── Responses ──────]  [Edit]  [Delete]
[─── Preview ───]  [── Duplicate ──]

Interactive toggle controls access
Click to preview form
One-click duplication
Toggle bypasses deadline
```

---

## Status Indicators

### Expired Form
```
┌─────────────────────────┐
│ ⚠️ Expired             │  Red badge
│ Form Title  [●────○]    │  Toggle can override
│                         │
│ Deadline: Yesterday     │  Red text
└─────────────────────────┘
```

### Active Form
```
┌─────────────────────────┐
│ Form Title  [●────○]    │  Green toggle
│                         │
│ Deadline: Next week     │  Normal text
│ ✅ Collecting responses │
└─────────────────────────┘
```

### Inactive Form
```
┌─────────────────────────┐
│ Form Title  [○────●]    │  Gray toggle
│                         │
│ Deadline: Next week     │  Muted colors
│ ❌ Not accessible       │
└─────────────────────────┘
```

---

## 🎯 Quick Tips

**✅ DO:**
- Toggle OFF when form ready to close
- Preview before publishing
- Duplicate for similar forms
- Use toggle for deadline extensions

**❌ DON'T:**
- Leave inactive forms in list (delete if not needed)
- Forget to check preview on mobile
- Edit original when you meant to duplicate
- Toggle rapidly (give it a moment)

---

## Success Indicators

### ✅ Form Duplicated
```
Toast: "Form duplicated successfully"
New form appears with "(Copy)" suffix
Original unchanged
```

### ✅ Form Toggled
```
Toast: "Form activated successfully"
      or "Form deactivated successfully"
Toggle animates smoothly
Students access updates immediately
```

### ✅ Preview Opened
```
Modal slides in smoothly
All questions visible
Scroll works for long forms
Click anywhere to close
```

---

## 🚀 Ready to Use!

All features are production-ready and fully responsive across:
- 📱 Mobile (320px+)
- 📱 Tablet (768px+)
- 💻 Desktop (1024px+)
- 🖥️ Large screens (1920px+)

**Enjoy your enhanced form management system!** 🎉
