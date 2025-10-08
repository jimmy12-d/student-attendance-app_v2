# Form Builder - Complete Route Map

## 📍 All Routes Created

### Admin Routes (Dashboard)

```
/dashboard/forms
├── GET     → View all forms (list page)
│           → Create new form button
│           → Edit, Delete, View Responses for each form
│
└── /dashboard/forms/new
    ├── GET → Create new form (builder page)
    │       → Add questions dynamically
    │       → Save to Firestore
    │
    └── /dashboard/forms/[formId]
        ├── GET → Edit existing form (builder page)
        │       → Load form data
        │       → Update questions
        │       → Save changes
        │
        └── /dashboard/forms/[formId]/responses
            └── GET → View all responses
                    → Individual response view
                    → Statistics & analytics
                    → Export to CSV
```

### Student Routes

```
/student/attendance
├── GET → Student attendance page
│       → NOW INCLUDES: Active Forms List component
│       → Shows forms with deadline not passed
│       → Shows "pending" badge for unsubmitted forms
│       → Shows "submitted" status for completed forms
│
└── /student/forms/[formId]
    └── GET → Fill out form
            → Dynamic question rendering
            → Submit answers
            → Validation
            → Prevent duplicate submissions
```

## 🎯 Navigation Flow

### Admin Flow
```
Dashboard Menu
    ↓
Click "Forms" (new menu item)
    ↓
Forms List Page (/dashboard/forms)
    ↓
    ├─→ Create New Form (/dashboard/forms/new)
    │       ↓
    │   Fill form details, add questions
    │       ↓
    │   Save → Returns to Forms List
    │
    ├─→ Edit Form (/dashboard/forms/[formId])
    │       ↓
    │   Modify form, save changes
    │       ↓
    │   Save → Returns to Forms List
    │
    └─→ View Responses (/dashboard/forms/[formId]/responses)
            ↓
        View statistics or individual responses
            ↓
        Export CSV (optional)
```

### Student Flow
```
Student Attendance Page (/student/attendance)
    ↓
See "Active Forms" section (new component)
    ↓
    ├─→ Click on form
    │       ↓
    │   Open Form Filler (/student/forms/[formId])
    │       ↓
    │   Fill out all questions
    │       ↓
    │   Submit → Returns to Attendance Page
    │       ↓
    │   Form now shows "Submitted" status
    │
    └─→ If already submitted
            ↓
        Shows "Already Submitted" screen
            ↓
        Can return to attendance page
```

## 🗂️ Component Hierarchy

### Admin Components
```
app/dashboard/forms/
├── page.tsx (Forms List)
│   └── Uses: Icon, toast, router
│
├── [formId]/page.tsx (Form Builder)
│   ├── Uses: QuestionEditor (multiple)
│   ├── Uses: Icon, toast, router
│   └── State: title, description, deadline, questions[]
│
├── [formId]/responses/page.tsx (Response Viewer)
│   ├── Uses: Icon, toast, router
│   └── State: form, responses[], selectedResponse
│
└── _components/
    ├── QuestionEditor.tsx
    │   ├── Uses: QuestionTypeSelector
    │   ├── Uses: Icon
    │   └── Props: question, onUpdate, onDelete, onDuplicate
    │
    └── QuestionTypeSelector.tsx
        ├── Uses: Icon
        └── Props: selectedType, onTypeChange
```

### Student Components
```
app/student/
├── attendance/page.tsx (Attendance Page - Updated)
│   └── NEW: Includes StudentFormsList component
│
├── attendance/_components/StudentFormsList.tsx
│   ├── Uses: Icon, router
│   └── Props: studentUid, khmerFont, createRipple
│       └── Fetches and displays active forms
│
└── forms/[formId]/page.tsx (Form Filler)
    ├── Uses: Icon, toast, router
    ├── State: form, answers{}, submitting, hasSubmitted
    └── Dynamic rendering based on question.type
```

## 🔄 Data Flow

### Creating a Form (Admin)
```
1. Admin clicks "Create New Form"
   ↓
2. Router navigates to /dashboard/forms/new
   ↓
3. FormBuilderPage component loads
   ↓
4. Admin fills form details and adds questions
   ↓
5. Click "Save Form"
   ↓
6. Validation checks (title, deadline, questions)
   ↓
7. Firestore: addDoc to 'forms' collection
   ↓
8. Success toast shown
   ↓
9. Router navigates back to /dashboard/forms
   ↓
10. Real-time listener updates list automatically
```

### Submitting a Form (Student)
```
1. Student sees form in Active Forms list
   ↓
2. Click on form card
   ↓
3. Router navigates to /student/forms/[formId]
   ↓
4. FormFillerPage loads form from Firestore
   ↓
5. Check if already submitted (query form_responses)
   ↓
6. If not submitted: Show form
   ↓
7. Student fills answers
   ↓
8. Click "Submit Form"
   ↓
9. Validation checks (required fields)
   ↓
10. Firestore: addDoc to 'form_responses' collection
    ↓
11. Success toast shown
    ↓
12. Router navigates back to /student/attendance
    ↓
13. Form now shows "Submitted" status
```

### Viewing Responses (Admin)
```
1. Admin clicks "Responses" on form card
   ↓
2. Router navigates to /dashboard/forms/[formId]/responses
   ↓
3. Load form details and responses
   ↓
4. Real-time listener updates responses
   ↓
5. Default view: Statistics/Analytics
   ↓
6. Click student name: View individual response
   ↓
7. Click "Export CSV": Download all responses
```

## 🎨 URL Examples

### Admin URLs
- List: `https://yourapp.com/dashboard/forms`
- Create: `https://yourapp.com/dashboard/forms/new`
- Edit: `https://yourapp.com/dashboard/forms/abc123`
- Responses: `https://yourapp.com/dashboard/forms/abc123/responses`

### Student URLs
- Forms list: `https://yourapp.com/student/attendance` (embedded component)
- Fill form: `https://yourapp.com/student/forms/abc123`

## 📊 State Management

### Forms List Page
```typescript
const [forms, setForms] = useState<Form[]>([]);
const [loading, setLoading] = useState(true);
```

### Form Builder Page
```typescript
const [title, setTitle] = useState('');
const [description, setDescription] = useState('');
const [deadline, setDeadline] = useState('');
const [isActive, setIsActive] = useState(true);
const [questions, setQuestions] = useState<Question[]>([]);
const [loading, setLoading] = useState(!isNewForm);
const [saving, setSaving] = useState(false);
```

### Form Filler Page
```typescript
const [form, setForm] = useState<Form | null>(null);
const [answers, setAnswers] = useState<{ [questionId: string]: string | string[] }>({});
const [loading, setLoading] = useState(true);
const [submitting, setSubmitting] = useState(false);
const [hasSubmitted, setHasSubmitted] = useState(false);
```

### Response Viewer Page
```typescript
const [form, setForm] = useState<Form | null>(null);
const [responses, setResponses] = useState<FormResponse[]>([]);
const [loading, setLoading] = useState(true);
const [selectedResponse, setSelectedResponse] = useState<FormResponse | null>(null);
```

## 🔥 Firestore Queries

### Get Active Forms (Students)
```typescript
query(
  collection(db, "forms"),
  where("isActive", "==", true),
  where("deadline", ">", Timestamp.now())
)
```

### Get Form Responses
```typescript
query(
  collection(db, "form_responses"),
  where("formId", "==", formId),
  orderBy("submittedAt", "desc")
)
```

### Check If Student Submitted
```typescript
query(
  collection(db, "form_responses"),
  where("formId", "==", formId),
  where("studentUid", "==", studentUid)
)
```

## ✨ Key Features by Route

| Route | Key Features |
|-------|-------------|
| `/dashboard/forms` | Real-time form list, Create/Edit/Delete, Status badges |
| `/dashboard/forms/new` | Dynamic question builder, 6 question types, Validation |
| `/dashboard/forms/[formId]` | Edit existing forms, Auto-save, Duplicate questions |
| `/dashboard/forms/[formId]/responses` | Analytics, Individual responses, CSV export |
| `/student/attendance` | Active forms widget, Deadline countdown, Status indicators |
| `/student/forms/[formId]` | Dynamic rendering, Validation, One-time submission |

## 🎯 Success Indicators

✅ All routes are functional
✅ No compilation errors
✅ Security rules in place
✅ Indexes configured
✅ Mobile-responsive
✅ Real-time updates
✅ Type-safe with TypeScript
✅ Production-ready

---

Your form builder is complete and ready for deployment! 🚀
