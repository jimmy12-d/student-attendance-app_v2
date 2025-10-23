# Mock Exam Progress Status Flow

## Data Retrieval Process

```mermaid
graph TB
    Start[Student Views Mock Exam Page] --> CheckMock[currentMockId e.g. 'mock1']
    CheckMock --> ExamControls[Query examControls/mock1]
    ExamControls --> GetEventId{eventId exists?}
    
    GetEventId -->|No| NoReg1[Status: No Registered]
    GetEventId -->|Yes| QueryEvent[Query events/{eventId}]
    
    QueryEvent --> GetFormId{formId exists?}
    GetFormId -->|No| NoReg2[Status: No Registered]
    GetFormId -->|Yes| QueryResponse[Query form_responses<br/>where formId = {formId}<br/>and studentId = {studentId}]
    
    QueryResponse --> HasResponse{Registration<br/>found?}
    HasResponse -->|No| NoReg3[Status: No Registered<br/>Progress: 0%]
    HasResponse -->|Yes| CheckRegStatus{registrationStatus?}
    
    CheckRegStatus -->|rejected| NoReg4[Status: No Registered<br/>Progress: 0%]
    CheckRegStatus -->|pending| Registered[Status: Registered<br/>Progress: 33%]
    CheckRegStatus -->|approved| CheckPayment{paymentStatus?}
    
    CheckPayment -->|unpaid/none| Registered2[Status: Registered<br/>Progress: 33%]
    CheckPayment -->|borrowed| Borrow[Status: Borrow<br/>Progress: 66%]
    CheckPayment -->|paid| PaidStar[Status: Paid Star<br/>Progress: 100%]
    
    NoReg1 --> Display[Display in ProgressBar]
    NoReg2 --> Display
    NoReg3 --> Display
    NoReg4 --> Display
    Registered --> Display
    Registered2 --> Display
    Borrow --> Display
    PaidStar --> Display
```

## Collections Structure

```
Firestore Database
│
├── examControls (Collection)
│   ├── mock1 (Document)
│   │   ├── nameEnglish: "Mock Exam 1"
│   │   ├── nameKhmer: "ប្រលងសាកល្បងទី ១"
│   │   ├── date: "30-10-2025"
│   │   ├── isReadyToPublishedResult: false
│   │   ├── isReadyForStudent: true
│   │   └── eventId: "RJs0xs1mKfHoa92X1vsT" ← Links to events
│   │
│   ├── mock2 (Document)
│   ├── mock3 (Document)
│   └── mock4 (Document)
│
├── events (Collection)
│   └── {eventId} (Document)
│       ├── name: "Mock Exam 1 Registration"
│       ├── formId: "xyz123..." ← Links to forms
│       ├── date: Timestamp
│       ├── pricingOptions: [...]
│       └── ...
│
├── forms (Collection)
│   └── {formId} (Document)
│       ├── title: "Mock Exam 1 Registration Form"
│       └── ...
│
└── form_responses (Collection)
    └── {responseId} (Document)
        ├── formId: "xyz123..." ← Matches form
        ├── studentId: "abc456..." ← Current student
        ├── studentName: "John Doe"
        ├── registrationStatus: "approved" ← Status check
        ├── paymentStatus: "paid" ← Payment check
        ├── amountPaid: { stars: 10, money: 0 }
        ├── borrowAmount: { stars: 0, money: 0 }
        └── ...
```

## Status Decision Tree

```
form_responses Registration
         │
         ├─ Not Found ──────────────────→ No Registered (0%)
         │
         ├─ registrationStatus
         │   │
         │   ├─ "rejected" ──────────────→ No Registered (0%)
         │   │
         │   ├─ "pending" ───────────────→ Registered (33%)
         │   │
         │   └─ "approved"
         │       │
         │       └─ paymentStatus
         │           │
         │           ├─ null/undefined ──→ Registered (33%)
         │           │
         │           ├─ "unpaid" ────────→ Registered (33%)
         │           │
         │           ├─ "borrowed" ──────→ Borrow (66%)
         │           │
         │           └─ "paid" ──────────→ Paid Star (100%)
```

## Component Communication

```
┌─────────────────────────────────────────────────────┐
│              Student Mock Exam Page                 │
│                    (page.tsx)                       │
├─────────────────────────────────────────────────────┤
│  State:                                             │
│  • availableTabs: ['mock1', 'mock2', ...]          │
│  • selectedTab: 'mock1'                             │
│  • progressStatus: 'Paid Star' (for Mock 3 check)  │
│                                                     │
│  Effects:                                           │
│  • Fetch registration status for selectedTab       │
│    (duplicate logic for MockExamResults)            │
└─────────────────┬───────────────┬───────────────────┘
                  │               │
        ┌─────────▼──────┐   ┌───▼──────────────────┐
        │  ProgressBar   │   │  MockExamResults     │
        │                │   │                      │
        │  Props:        │   │  Props:              │
        │  • loading     │   │  • progressStatus    │
        │  • availableTabs│   │  • examScores       │
        │  • currentMockId│   │  • ...              │
        │                │   │                      │
        │  Internal:     │   │  Logic:              │
        │  • progressStatus│  │  • Shows results if │
        │  • Fetches from │   │    mock !== mock3 OR│
        │    Firestore   │   │    status = PaidStar│
        └────────────────┘   └─────────────────────┘
```

## Before vs After Comparison

### Before (Google Sheets):
```
page.tsx
  ↓ (API call)
/api/sheet-data
  ↓ (HTTP request)
Google Sheets API
  ↓ (spreadsheet lookup)
Student Progress Row
  ↓ (response)
progressStatus prop
  ↓
ProgressBar displays status
```

### After (Firestore):
```
page.tsx (provides currentMockId)
  ↓
ProgressBar component
  ↓ (Firestore query)
examControls/{mockId}
  ↓ (get eventId)
events/{eventId}
  ↓ (get formId)
form_responses (where formId & studentId)
  ↓ (analyze registrationStatus & paymentStatus)
progressStatus state
  ↓
ProgressBar displays status
```

**Key Improvements:**
- ✅ Real-time updates (no caching delays)
- ✅ Faster (direct Firestore vs API + Google Sheets)
- ✅ More reliable (fewer external dependencies)
- ✅ Consistent with event registration system
