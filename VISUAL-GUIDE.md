# Appointment Questions Feature - Visual Guide

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    APPOINTMENT SYSTEM                        │
└─────────────────────────────────────────────────────────────┘

ADMIN FLOW                          STUDENT FLOW
═══════════════════════            ═════════════════════════

1. Dashboard                        1. Dashboard
   ↓                                  ↓
2. Create Availability             2. Book Appointment
   ├─ Date                            ├─ Select Date
   ├─ Time                            │  ├─ Calendar View
   ├─ Duration                        │  └─ Pick Date ✓
   │                                  │
   └─ Add Questions ⭐NEW⭐           ├─ Select Time
      ├─ Question Text                │  ├─ Available Slots
      ├─ Min English Words            │  └─ Pick Time ✓
      └─ Min Khmer Words              │
                                      └─ Answer Questions ⭐NEW⭐
3. Save to Database                    ├─ Show Questions Panel
   └─ adminAvailability {             ├─ Student Types Answers
      questions: [...]                ├─ Real-time Word Count
   }                                  │  ├─ English: X/Y ✓
                                      │  └─ Khmer: X/Y ✓
                                      └─ Submit
                                         ↓
                                         Save to Database
                                         └─ appointmentRequests {
                                            answers: [...]
                                         }
```

## 🔄 Data Flow Diagram

```
FIRESTORE COLLECTIONS
═════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────┐
│ adminAvailability Collection                             │
├──────────────────────────────────────────────────────────┤
│ Document ID: auto-generated                              │
│ {                                                        │
│   date: "2025-11-20",                                   │
│   startTime: "09:00",                                    │
│   endTime: "17:00",                                      │
│   slotDuration: 30,                                      │
│   minPriorHours: 2,                                      │
│   questions: [        ← NEW FIELD                        │
│     {                                                    │
│       id: "q_1234...",                                   │
│       question: "Your question here?",                   │
│       minWordCountEnglish: 10,                           │
│       minWordCountKhmer: 5,                              │
│       required: true,                                    │
│       order: 1                                           │
│     },                                                   │
│     { ... more questions ... }                           │
│   ]                                                      │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

                           ↓ (FK Reference)

┌──────────────────────────────────────────────────────────┐
│ appointmentRequests Collection                           │
├──────────────────────────────────────────────────────────┤
│ Document ID: auto-generated                              │
│ {                                                        │
│   studentId: "student123",                               │
│   studentName: "John Doe",                               │
│   appointmentDate: "2025-11-20",                        │
│   appointmentTime: "09:00",                              │
│   availabilityId: "ref to adminAvailability",           │
│   answers: [          ← NEW FIELD                        │
│     {                                                    │
│       questionId: "q_1234...",                           │
│       question: "Your question here?",                   │
│       answer: "Student's answer text...",                │
│       wordCountEnglish: 12,                              │
│       wordCountKhmer: 3,                                 │
│       meetsRequirement: true                             │
│     },                                                   │
│     { ... more answers ... }                             │
│   ],                                                     │
│   status: "pending",                                     │
│   requestedAt: timestamp,                                │
│   ... other fields ...                                   │
│ }                                                        │
└──────────────────────────────────────────────────────────┘
```

## 🎯 Question Validation Flow

```
ADMIN: Question Creation
═════════════════════════════════════════════════════════════

Input Question Form:
┌─────────────────────────────────┐
│ Question: "Why do you want to   │
│           meet with me?"        │
│                                 │
│ Min English Words: 5            │
│ Min Khmer Words: 3              │
│ [Add Question]                  │
└─────────────────────────────────┘
           ↓
    Validation: ✓ Question text not empty
           ↓
    Generate ID: q_1700481920_abc123
           ↓
    Save to questions[] array
           ↓
    Display in list:
    1. Why do you want to meet... [Delete]
           ↓
    [Create] Availability
           ↓
    Saved to Firestore ✓


STUDENT: Answer Validation
═════════════════════════════════════════════════════════════

Question Panel Appears:
┌─────────────────────────────────────────────────────────┐
│ 1. Why do you want to meet with me?                     │
│ ┌──────────────────────────────────────────────────┐   │
│ │ [Text Area - Student Types Answer]               │   │
│ └──────────────────────────────────────────────────┘   │
│ English: 2/5 ❌  Khmer: 1/3 ❌                           │
└─────────────────────────────────────────────────────────┘
           ↓ (Student types more)
┌─────────────────────────────────────────────────────────┐
│ Student Answer: "I want to discuss my academic progress │
│ and get advice on វិชា difficult សម្រាប់ me"           │
│                                                         │
│ English: 7/5 ✓   Khmer: 2/3 ❌                           │
│                  Continue typing...                     │
└─────────────────────────────────────────────────────────┘
           ↓ (Student adds Khmer)
┌─────────────────────────────────────────────────────────┐
│ Student Answer: "I want to discuss my academic progress │
│ and get advice on វិចារយ difficult មិនយល់ topics"      │
│                                                         │
│ English: 7/5 ✓   Khmer: 3/3 ✓    [✓ Valid!]             │
│                                                         │
│ Can now submit!                                         │
└─────────────────────────────────────────────────────────┘
           ↓
    [Submit Request] ← Now Enabled!
           ↓
    Validation Check:
    ├─ ✓ Date selected
    ├─ ✓ Time selected
    ├─ ✓ All questions answered
    ├─ ✓ All minimums met
    └─ ✓ Submit allowed!
           ↓
    Save to Firestore
```

## 🗣️ Word Counting Examples

```
ENGLISH WORD COUNTING
═════════════════════════════════════════════════════════════

"Hello world"
↓
Split by spaces → ["Hello", "world"]
↓
Count: 2 words ✓


"I want help, please!"
↓
Remove punctuation → ["I", "want", "help", "please"]
↓
Count: 4 words ✓


KHMER WORD COUNTING
═════════════════════════════════════════════════════════════

"ខ្ញុំត្រូវការជំនួយ"
↓
Characters: ខ-្-ញ-ុ | ម-្-ត-ូ-វ-ក | រ-ា | ជ-ំ-ន-ួ-យ
↓
Khmer clusters: 4 groups
↓
Count: 4 words ✓


MIXED LANGUAGE WORD COUNTING
═════════════════════════════════════════════════════════════

"I need help ខ្ញុំចង់ រៀន and សូត្របាង"

Step 1: Separate languages
├─ English text: "I need help and"
├─ Khmer text: "ខ្ញុំចង់រៀន សូត្របាង"

Step 2: Count each
├─ English: 4 words
├─ Khmer: 2 words

Result: English 4, Khmer 2

If minimum is English 3 + Khmer 3:
├─ English: 4/3 ✓
├─ Khmer: 2/3 ❌ NOT MET


VALIDATION REQUIREMENTS
═════════════════════════════════════════════════════════════

Scenario 1: English only (min 10 words)
  Student text: "This is help please ok thanks very much today"
  Count: 9 words
  Result: ❌ FAIL (need 1 more word)

Scenario 2: Khmer only (min 5 words)
  Student text: "ខ្ញុំ ចង់ រៀន ថ្នាក់ ជ្ រៀង"
  Count: 5 words
  Result: ✓ PASS

Scenario 3: Both required
  Requirement: English 5 + Khmer 3
  Student text: "I need help please វិយ័យ មិនយល់"
  ├─ English: 4 words ❌
  ├─ Khmer: 2 words ❌
  Result: ❌ BOTH FAIL - Edit answer!

Scenario 4: Both required (valid)
  Requirement: English 5 + Khmer 3
  Student text: "I need help today please វិយ័យ មិនយល់ ទេ"
  ├─ English: 5 words ✓
  ├─ Khmer: 3 words ✓
  Result: ✓ PASS - Can submit!
```

## 🎨 UI Component Hierarchy

```
ADMIN DASHBOARD
═════════════════════════════════════════════════════════════

AppointmentsManagementPage
├─ Tabs:
│  ├─ Admin Availability (ACTIVE)
│  ├─ Schedule View
│  └─ Appointment Requests
│
├─ Content
│  └─ AvailabilityForm Modal
│     ├─ DatePicker
│     ├─ TimeInputs (Start/End)
│     ├─ SlotDurationSelect
│     ├─ PriorHoursSelect
│     ├─ DowntimeSection
│     │  ├─ TimeInput (Start)
│     │  └─ TimeInput (End)
│     │
│     └─ QuestionsSection ⭐NEW⭐
│        ├─ ExistingQuestionsList
│        │  └─ QuestionItem[] (with Delete)
│        │
│        └─ AddQuestionForm
│           ├─ TextArea (Question)
│           ├─ NumberInput (Min English)
│           ├─ NumberInput (Min Khmer)
│           └─ [Add Question] Button
│
├─ AvailabilityList
│  └─ AvailabilityCard[]
│     ├─ Date & Time Display
│     ├─ QuestionsBadge ⭐NEW⭐
│     │  └─ QuestionsList (preview)
│     └─ Actions (Edit/Delete/Toggle)


STUDENT BOOKING FORM
═════════════════════════════════════════════════════════════

AppointmentBookingForm
├─ CalendarSection
│  ├─ MonthNavigation
│  └─ DateGrid
│
├─ TimepickerSection
│  ├─ DateDisplay
│  └─ TimeSlotGrid
│
├─ QuestionsPanel ⭐NEW⭐
│  ├─ Header ("Answer Questions")
│  └─ QuestionsList
│     └─ QuestionItem[]
│        ├─ QuestionNumber & Text
│        ├─ TextArea (Answer)
│        ├─ WordCountDisplay
│        │  ├─ English Count (X/Y)
│        │  ├─ Khmer Count (X/Y)
│        │  └─ ValidIndicator (✓)
│        └─ [Hidden until invalid]
│
├─ SelectionSummary
│  ├─ SelectedDateDisplay
│  ├─ SelectedTimeDisplay
│  └─ DurationDisplay
│
└─ ActionButtons
   ├─ [Submit Request] (Enabled only if all valid)
   └─ [Cancel]
```

## 📈 Feature Comparison

```
BEFORE vs AFTER
═════════════════════════════════════════════════════════════

BEFORE:                          AFTER:
───────────────────────          ─────────────────────────────

Admin:                           Admin:
✓ Create availability            ✓ Create availability
✓ Set date/time                  ✓ Set date/time
✓ Set slot duration              ✓ Set slot duration
✓ Set min prior hours            ✓ Set min prior hours
✗ No custom questions            ✓ Add custom questions ⭐NEW
                                 ✓ Set word minimums ⭐NEW

Student:                         Student:
✓ Browse calendar                ✓ Browse calendar
✓ Select date                    ✓ Select date
✓ Select time                    ✓ Select time
✓ Submit booking                 ✓ Answer questions ⭐NEW
                                 ✓ Real-time validation ⭐NEW
                                 ✓ Submit with answers ⭐NEW

Data:                            Data:
✓ Appointment request saved      ✓ Appointment request saved
✗ No question answers            ✓ Question answers saved ⭐NEW
                                 ✓ Word counts recorded ⭐NEW
```

## 🔐 Validation Rules Summary

```
VALIDATION CHECKLIST
═════════════════════════════════════════════════════════════

ADMIN SIDE:
┌─────────────────────────────────────────┐
│ ✓ Question text not empty               │
│ ✓ At least one word minimum set (opt)   │
│ ✓ Word counts are non-negative          │
│ ✓ Date not in the past                  │
│ ✓ Start time before end time            │
│ ✓ Valid slot duration selected          │
└─────────────────────────────────────────┘

STUDENT SIDE:
┌─────────────────────────────────────────┐
│ ✓ Date selected (not past)              │
│ ✓ Time selected (slot available)        │
│ ✓ All required questions answered       │ ⭐NEW
│ ✓ English word count ≥ minimum (if set) │ ⭐NEW
│ ✓ Khmer word count ≥ minimum (if set)   │ ⭐NEW
│ ✓ Form can only submit when ALL valid   │ ⭐NEW
└─────────────────────────────────────────┘
```

---

**Color Key:** ⭐NEW = New Feature Added with Questions System
