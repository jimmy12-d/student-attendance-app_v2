# Student Answers Modal - Quick Reference

## Collections Overview

### appointmentRequests Collection
**Purpose**: Stores appointment booking requests from students with their responses

| Field | Type | Description |
|-------|------|-------------|
| `studentId` | string | Reference to student document |
| `studentName` | string | Student full name |
| `studentClass` | string | Class e.g., "Grade 12" |
| `appointmentDate` | string | Date in YYYY-MM-DD format |
| `appointmentTime` | string | Time in HH:MM format |
| `answers` | array | Student responses with wordCount & meetsRequirement |
| `status` | string | 'pending' \| 'approved' \| 'rejected' |
| `attendanceStatus` | string | 'met' \| 'no-show' (after appointment) |

### adminAvailability Collection
**Purpose**: Stores admin availability slots with questions to ask students

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | Availability date (YYYY-MM-DD) |
| `startTime` | string | Slot start time (HH:MM) |
| `endTime` | string | Slot end time (HH:MM) |
| `slotDuration` | number | Minutes per slot (e.g., 15, 30) |
| `questions` | array | Array of questions with minWordCount |
| `isActive` | boolean | Whether this slot is accepting bookings |

---

## New Feature: Student Answers Modal

### Location
Dashboard → Appointments Management → Schedule View Tab

### How to Access
1. Find an **approved** appointment in the schedule grid
2. Click **"Show Actions"** button on the time slot
3. Click **"View Answers"** button (only appears if answers exist)

### Modal Contents

#### Header
- Student name
- Appointment date
- Close button (X)

#### For Each Answer
```
┌─────────────────────────────────────────┐
│ Question 1                    ✓ Valid   │
│ Do you speak English?                   │
├─────────────────────────────────────────┤
│ Student's Answer:                       │
│ "Yes, I am fluent in English and can... │
│                                         │
│ Word Count: 45        Status: Valid     │
└─────────────────────────────────────────┘
```

#### Summary Section
Shows:
- **Total Answers**: Count of all responses
- **Valid Answers**: Count meeting min word requirement
- **Average Words**: Mean word count across answers

### Features
- ✅ Color-coded validation badges (green/red)
- ✅ Word count display for each answer
- ✅ Summary statistics
- ✅ Dark mode support
- ✅ Full answer text display
- ✅ Responsive design

---

## Data Structure Examples

### Sample appointmentRequest Document
```json
{
  "studentId": "xSZm547NSPLvz6XNsRe0",
  "studentName": "Test Testing",
  "studentClass": "Grade 12",
  "appointmentDate": "2025-11-24",
  "appointmentTime": "10:15",
  "answers": [
    {
      "questionId": "q_1763635793563_4ddq6uzid",
      "question": "Why did you fail the exam?",
      "answer": "I didn't prepare well enough...",
      "wordCount": 91,
      "meetsRequirement": true
    },
    {
      "questionId": "q_1763635840191_zr8bem9g3",
      "question": "What will you do differently?",
      "answer": "I will study harder and...",
      "wordCount": 87,
      "meetsRequirement": true
    }
  ],
  "status": "approved"
}
```

### Sample adminAvailability Document
```json
{
  "date": "2025-11-24",
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDuration": 15,
  "isActive": true,
  "questions": [
    {
      "id": "q_1763635793563_4ddq6uzid",
      "question": "Why did you fail the exam?",
      "minWordCount": 50,
      "required": true,
      "order": 1
    },
    {
      "id": "q_1763635840191_zr8bem9g3",
      "question": "What will you do differently?",
      "minWordCount": 50,
      "required": true,
      "order": 2
    }
  ]
}
```

---

## UI Colors

| Element | Color | Dark Mode |
|---------|-------|-----------|
| Header Icon | Blue → Cyan gradient | Same |
| Valid Badge | Green | Green-dark |
| Invalid Badge | Red | Red-dark |
| Word Count Box | Blue gradient | Blue-dark |
| Status Box | Purple gradient | Purple-dark |
| Summary Box | Blue → Cyan gradient | Blue/Cyan dark |

---

## Integration with Other Features

### Related Modals
1. **Exam Results Modal** - Shows mockExam1 scores and grades
2. **Student Details Modal** - Shows full student information
3. **Student Answers Modal** - Shows appointment Q&A responses (NEW)

### Workflow
```
Approved Appointment
        ↓
    [Show Actions]
        ↓
    ┌───────────────────────┐
    │ Mark Attendance       │
    │ View Student Details  │
    │ View Exam Results     │
    │ View Answers ← NEW    │
    └───────────────────────┘
```

---

## Technical Details

### Component Location
File: `/app/dashboard/appointments/page.tsx`
Component: `AppointmentScheduleGrid`

### State Variables
```typescript
const [showStudentAnswersModal, setShowStudentAnswersModal] = useState(false);
const [selectedAppointmentRequest, setSelectedAppointmentRequest] = useState<AppointmentRequest | null>(null);
```

### Trigger Button
Appears only when: `slot.request.answers && slot.request.answers.length > 0`

### Z-Index
Modal uses `z-120` for proper layering

### Responsive
- Max width: 3xl
- Full height on mobile with max 90vh
- Scrollable content
- Padding for mobile devices
