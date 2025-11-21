# Unified Detail Modal - Architecture & Flow Diagram

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                  Appointments Management Page                    │
│              (/app/dashboard/appointments/page.tsx)             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │  AppointmentSchedule│
                    │       Grid          │
                    └─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │  Expanded Slot     │
                    │  Action Buttons    │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────────────┐
                    │   "View Details" Button    │
                    │  onClick: fetchExamResults │
                    └─────────┬──────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐          ┌─────────┐         ┌─────────┐
    │ Query   │          │ Query   │         │ Query   │
    │mockExam1│          │ exam    │         │appoint- │
    │         │          │Settings │         │ment req │
    │         │          │         │         │ answers │
    └────┬────┘          └────┬────┘         └────┬────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   setDetailData    │
                    │   {                │
                    │    studentName     │
                    │    studentId       │
                    │    examResults     │
                    │    appointment     │
                    │   }               │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────────────────┐
                    │  Unified Detail Modal Opens    │
                    │  showDetailModal = true        │
                    └─────────┬──────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │    HEADER    │  │ EXAM SECTION │  │ ANSWER SECTION
    │              │  │ (Collapsible)│  │ (Collapsible)
    │ Student Name │  │              │  │
    │ Close Button │  │ • Scores     │  │ • Questions
    │              │  │ • Grades     │  │ • Responses
    └──────────────┘  │ • Performance│  │ • Validation
                      │ • Summary    │  │ • Stats
                      └──────────────┘  └──────────────┘
```

---

## 🔄 State Management Flow

```
Initial State:
  showDetailModal = false
  detailData = null
  loadingDetail = false
  expandedDetailSections = Set(['exam', 'answers'])

                    │
                    ▼ User clicks "View Details"
                    
setLoadingDetail(true)
setShowDetailModal(true)

         ┌─────────────────────────┐
         │  Fetch Exam Data        │
         │  + Fetch Max Scores     │
         │  + Get Appointment Data │
         └────────┬────────────────┘
                  │
                  ▼
        setDetailData({
          studentName: string
          studentId: string
          appointmentRequest: object
          examResults: object
        })

                  │
                  ▼
        setLoadingDetail(false)
        
           Modal Renders with:
        - Header with student info
        - Exam Results Section (OPEN)
        - Student Answers Section (OPEN)
        - Close buttons

User Interaction:
┌──────────────────────┐
│ Click Chevron/Header │
└──────┬───────────────┘
       │
       ▼
toggleDetailSection(section)
  │
  ├─ if section in expandedSections
  │     Delete from Set
  │     (Section Collapses)
  │
  └─ if section not in expandedSections
        Add to Set
        (Section Expands)

Updated expandedDetailSections State
  │
  ▼
Re-render with Animation:
  animate-in fade-in slide-in-from-top-2 duration-300
```

---

## 📱 Component Hierarchy

```
AppointmentScheduleGrid
│
├─ AppointmentScheduleGrid (component)
│  │
│  ├─ State Variables
│  │  ├─ expandedSlots
│  │  ├─ selectedStudent
│  │  ├─ showStudentModal (connects to StudentDetailsModal)
│  │  ├─ showDetailModal ◄─── UNIFIED MODAL TRIGGER
│  │  ├─ detailData ◄─────── UNIFIED DATA STRUCTURE
│  │  ├─ loadingDetail
│  │  └─ expandedDetailSections ◄─ COLLAPSIBLE SECTIONS
│  │
│  ├─ Functions
│  │  ├─ toggleSlot()
│  │  ├─ fetchStudentDetails()
│  │  ├─ fetchExamResults() ◄─ UNIFIED DATA FETCHING
│  │  ├─ toggleDetailSection() ◄─ TOGGLE LOGIC
│  │  ├─ onApproveRequest()
│  │  ├─ onRejectRequest()
│  │  └─ onDeleteRequest()
│  │
│  ├─ Return JSX
│  │  │
│  │  ├─ Appointment Schedule Grid Display
│  │  │  └─ "View Details" Button ◄─ TRIGGERS fetchExamResults
│  │  │
│  │  ├─ StudentDetailsModal ◄─ SEPARATE (NOT CONSOLIDATED)
│  │  │
│  │  └─ Unified Detail Modal ◄─ NEW CONSOLIDATED MODAL
│  │     │
│  │     ├─ Modal Header
│  │     │  ├─ Student Icon + Name
│  │     │  └─ Close Button (X)
│  │     │
│  │     ├─ Modal Body
│  │     │  │
│  │     │  ├─ Loading State (while loadingDetail)
│  │     │  │
│  │     │  └─ Content (after data loads)
│  │     │     │
│  │     │     ├─ Exam Results Section ◄─ COLLAPSIBLE
│  │     │     │  ├─ Header Button
│  │     │     │  │  ├─ Chevron Icon (▼/▶)
│  │     │     │  │  ├─ "Mock Exam Results" Title
│  │     │     │  │  └─ Class Type Badge
│  │     │     │  │
│  │     │     │  └─ Content (if expandedDetailSections.has('exam'))
│  │     │     │     ├─ Subject Scores Grid
│  │     │     │     │  └─ Grade Badges (A-F with colors)
│  │     │     │     └─ Overall Performance Summary
│  │     │     │
│  │     │     └─ Student Answers Section ◄─ COLLAPSIBLE
│  │     │        ├─ Header Button
│  │     │        │  ├─ Chevron Icon (▼/▶)
│  │     │        │  ├─ "Student Answers" Title
│  │     │        │  └─ Validation Count Badge
│  │     │        │
│  │     │        └─ Content (if expandedDetailSections.has('answers'))
│  │     │           ├─ Answer Items List
│  │     │           │  └─ Question → Response → Validation
│  │     │           └─ Answers Summary Stats
│  │     │
│  │     └─ Modal Footer
│  │        └─ Close Button
```

---

## 🎨 Visual Layout - Unified Detail Modal

```
╔════════════════════════════════════════════════════════════════╗
║                   UNIFIED DETAIL MODAL                         ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  [📊]  Student Details              [✕ Close]                 ║
║        John Doe                                                ║
║                                                                 ║
╠════════════════════════════════════════════════════════════════╣
║                                                                 ║
║  ▼ Mock Exam Results                           Grade 12        ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Subject Scores                                          │  ║
║  │ ┌──────────────┐  ┌──────────────┐                    │  ║
║  │ │ Mathematics  │  │ English      │                    │  ║
║  │ │   [A] 95/100│  │   [B] 82/100 │                    │  ║
║  │ └──────────────┘  └──────────────┘                    │  ║
║  │                                                         │  ║
║  │ Overall Performance                                     │  ║
║  │ ┌──────────────────────────────────────────────┐      │  ║
║  │ │ Total Score: 177 / 200  (88.5%)   [A]       │      │  ║
║  │ └──────────────────────────────────────────────┘      │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                 ║
║  ▼ Student Answers                    3 / 4 valid            ║
║  ┌─────────────────────────────────────────────────────────┐  ║
║  │ Question 1                                   ✓ Valid    │  ║
║  │ Discuss the impact of climate change...               │  ║
║  │ "Climate change has significant impacts on..."       │  ║
║  │ ┌─────────────────┐  ┌──────────────────┐            │  ║
║  │ │ Words: 156      │  │ Status: Valid    │            │  ║
║  │ └─────────────────┘  └──────────────────┘            │  ║
║  │                                                         │  ║
║  │ Summary                                                 │  ║
║  │ Total: 4 | Valid: 3 | Avg Words: 142                  │  ║
║  └─────────────────────────────────────────────────────────┘  ║
║                                                                 ║
╠════════════════════════════════════════════════════════════════╣
║                          [Close]                               ║
╚════════════════════════════════════════════════════════════════╝
```

---

## 🔌 Data Flow Diagram

```
User Action: Click "View Details" Button
      │
      ▼
┌─────────────────────────────────────┐
│ fetchExamResults(studentId,         │
│   studentName,                      │
│   appointmentRequest)               │
└─────────────┬───────────────────────┘
              │
      ┌───────┴───────┐
      │               │
      ▼               ▼
  ┌─────────┐    ┌──────────────┐
  │mockExam1│    │examSettings  │
  │Query    │    │Query         │
  └────┬────┘    └────┬─────────┘
       │              │
       ▼              ▼
  ┌─────────────┐  ┌──────────────┐
  │examData:    │  │maxScoresMap: │
  │{            │  │{             │
  │ fullName    │  │ "Grade 12_..│
  │ classType   │  │  math": 100  │
  │ mock1Result │  │ ...          │
  │}            │  │}             │
  └────┬────────┘  └────┬─────────┘
       │                │
       └────────┬───────┘
              │
      ┌───────▼────────────────┐
      │ appointmentRequest:    │
      │ {                      │
      │  answers: [{           │
      │   question: "...",     │
      │   answer: "...",       │
      │   wordCount: 156,      │
      │   meetsRequirement: ✓  │
      │  }]                    │
      │ }                      │
      └───────┬────────────────┘
              │
              ▼
      ┌──────────────────────┐
      │ Combined detailData: │
      │ {                    │
      │  studentName: string │
      │  studentId: string   │
      │  examResults: {...}  │
      │  appointmentRequest  │
      │ }                    │
      └──────────┬───────────┘
                 │
                 ▼
         ┌───────────────┐
         │setDetailData()│
         └───────┬───────┘
                 │
                 ▼
         ┌──────────────────┐
         │showDetailModal=  │
         │ true             │
         └──────────┬───────┘
                    │
                    ▼
         ┌─────────────────────┐
         │Modal Renders with   │
         │Both Sections OPEN   │
         └─────────────────────┘
```

---

## 🎭 Animation Sequence

```
User clicks Chevron/Header to toggle section:

1. Current State
   └─ expandedDetailSections = Set(['exam', 'answers'])
      └─ Both sections visible

2. User Action: Click Exam Section Chevron
   └─ toggleDetailSection('exam')

3. State Update
   └─ newSet = Set(['answers'])
   └─ 'exam' removed

4. Re-render Triggered
   └─ expandedDetailSections.has('exam') = false
   └─ Conditional rendering evaluates to false
   └─ Exam section content hidden

5. Animation Class Applied (on collapse)
   └─ Section div removed from DOM with animation
   └─ Chevron rotates: ▼ → ▶
   └─ Duration: 300ms

6. Alternative: User clicks to expand again
   └─ toggleDetailSection('exam')
   └─ newSet = Set(['exam', 'answers'])
   └─ 'exam' added
   └─ Re-render with:
      └─ animate-in fade-in slide-in-from-top-2 duration-300
      └─ Chevron rotates: ▶ → ▼
      └─ Smooth content appears
```

---

## 📊 State Change Matrix

```
Event: User Toggle Action
┌─────────────────────┬──────────────┬──────────────┐
│ Current State       │ User Clicks  │ New State    │
├─────────────────────┼──────────────┼──────────────┤
│ Both Open           │ Exam Toggle  │ Exam Closed  │
│ Set(['exam',        │              │ Set(['answr'])
│  'answers'])        │              │              │
├─────────────────────┼──────────────┼──────────────┤
│ Exam Closed         │ Exam Toggle  │ Both Open    │
│ Set(['answers'])    │              │ Set(['exam', │
│                     │              │  'answers']) │
├─────────────────────┼──────────────┼──────────────┤
│ Both Open           │ Answer       │ Answer Closed│
│ Set(['exam',        │ Toggle       │ Set(['exam'])│
│  'answers'])        │              │              │
├─────────────────────┼──────────────┼──────────────┤
│ Both Open           │ Close Modal  │ Reset All   │
│ Set(['exam',        │              │ showDetailMo│
│  'answers'])        │              │ dal = false │
│                     │              │ detailData  │
│                     │              │ = null      │
└─────────────────────┴──────────────┴──────────────┘
```

---

## ✨ Animation Timing

```
Duration: 300ms (0.3 seconds)
Timing Function: ease-in-out
Classes Applied: animate-in fade-in slide-in-from-top-2

Timeline:
0ms   ├─ Animation Start
      ├─ Element opacity: 0
      ├─ Element transform: translateY(-8px)
      │
150ms ├─ 50% Complete
      ├─ Element opacity: 0.5
      ├─ Element transform: translateY(-4px)
      │
300ms ├─ Animation Complete
      ├─ Element opacity: 1
      ├─ Element transform: translateY(0)

Result:
✓ Smooth fade-in (opacity 0 → 1)
✓ Smooth slide down (y: -8px → 0)
✓ Natural ease-in-out easing
```

---

## 🎯 Key Points Summary

1. **Single Unified Modal** - Replaces 3 previous modals
2. **Collapsible Sections** - User controls what to see
3. **Smooth Animations** - 300ms transitions for section toggles
4. **Responsive Design** - Works on all screen sizes
5. **Dark Mode Support** - Full dark theme styling
6. **Zero Errors** - All TypeScript errors resolved
7. **Optimized Performance** - Single data fetch, fewer renders
8. **Professional UI** - Gradient styling, color-coded information

---

*Diagram Reference: Architecture, Flow, State Management, Animation Timing*
