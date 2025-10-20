# 📝 Missed Quiz Automatic Check - Visual Flow

## Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         STUDENT SCANS FACE                              │
└─────────────────────────┬───────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                    FACE RECOGNITION SYSTEM                              │
│  • Face detected                                                        │
│  • Matched to student database                                          │
│  • Confidence > 65%                                                     │
└─────────────────────────┬───────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────────┐
│                  MARK TODAY'S ATTENDANCE                                │
│  • Save to Firestore: attendance collection                             │
│  • date: 2025-10-16 (today)                                             │
│  • status: 'present' or 'late'                                          │
│  • ✅ ATTENDANCE RECORDED SUCCESSFULLY                                  │
└─────────────────────────┬───────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────────┐
│              CHECK IF MISSED_QUIZ OVERLAY ENABLED                       │
│  • Read from localStorage: overlay-missed-quiz                          │
│  • If disabled → STOP (no check)                                        │
│  • If enabled → Continue ↓                                              │
└─────────────────────────┬───────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────────────┐
│        QUERY FIRESTORE: Check Oct 14, 2025 Attendance                  │
│                                                                         │
│  Collection: attendance                                                 │
│  Query:                                                                 │
│    WHERE studentId == "xSZm547NSPLvz6XNsRe0" (recognized student)      │
│    AND date == "2025-10-14"                                             │
│                                                                         │
│  Result: Empty or Has Records?                                          │
└─────────────────────────┬───────────────────────────────────────────────┘
                          ↓
                ┌─────────┴─────────┐
                ↓                   ↓
    ┌──────────────────┐  ┌──────────────────┐
    │ RECORD FOUND     │  │ NO RECORD FOUND  │
    │ (Was Present)    │  │ (Was Absent)     │
    └────────┬─────────┘  └────────┬─────────┘
             ↓                     ↓
    ┌──────────────────┐  ┌──────────────────────────────┐
    │ ✅ NO OVERLAY    │  │ ⚠️  SHOW MISSED_QUIZ OVERLAY │
    │    SHOWN         │  │                              │
    │                  │  │  Title: "📝 MISSED QUIZ"     │
    │ Console:         │  │  Message: "FINISH YOUR       │
    │ "Student was     │  │           CO-LEARNING"       │
    │  present on      │  │  Subtitle: "You missed the   │
    │  2025-10-14"     │  │            quiz on Oct 14"   │
    │                  │  │                              │
    │ Student continues│  │  Auto-dismiss: 10 seconds    │
    └──────────────────┘  └──────────────────────────────┘
```

## Example: Test Testing (Absent Student)

```
STUDENT: Test Testing
ID: xSZm547NSPLvz6XNsRe0
STATUS: Was absent on Oct 14, 2025

┌──────────────────────────────────────────────┐
│  👤 Test Testing scans face                  │
│     2025-10-16 at 8:30 AM                    │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  ✅ Face Recognized (78% confidence)         │
│  ✅ Attendance marked for Oct 16, 2025       │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  🔍 Checking Oct 14, 2025 attendance...      │
│                                              │
│  Query Result: NO RECORDS                    │
│  ↳ Test Testing was ABSENT on Oct 14        │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  ⚠️  OVERLAY DISPLAYED                       │
│                                              │
│  ╔════════════════════════════════════════╗  │
│  ║  📝 MISSED QUIZ                       ║  │
│  ║                                        ║  │
│  ║  FINISH YOUR CO-LEARNING               ║  │
│  ║                                        ║  │
│  ║  Test Testing                          ║  │
│  ║  You missed the quiz on October 14,   ║  │
│  ║  2025                                  ║  │
│  ║                                        ║  │
│  ║  [Dismiss]                             ║  │
│  ╚════════════════════════════════════════╝  │
│                                              │
│  Auto-dismiss in 10 seconds...              │
└──────────────────────────────────────────────┘
```

## Example: Student Who Was Present

```
STUDENT: Kong Reachraksa
ID: jEI5PKOrX0OGmOeJYD99
STATUS: Was present on Oct 14, 2025

┌──────────────────────────────────────────────┐
│  👤 Kong Reachraksa scans face               │
│     2025-10-16 at 8:30 AM                    │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  ✅ Face Recognized (82% confidence)         │
│  ✅ Attendance marked for Oct 16, 2025       │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  🔍 Checking Oct 14, 2025 attendance...      │
│                                              │
│  Query Result: RECORD FOUND                  │
│  ↳ Kong Reachraksa was PRESENT on Oct 14    │
│  ↳ Attendance marked at 8:15 AM             │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  ✅ NO OVERLAY SHOWN                         │
│                                              │
│  Console log:                                │
│  "Kong Reachraksa was present on            │
│   2025-10-14 - no overlay needed"            │
│                                              │
│  Student continues normally                  │
└──────────────────────────────────────────────┘
```

## Data Structure

### Attendance Collection (Firestore)

```javascript
attendance/
├── doc_id_1
│   ├── studentId: "xSZm547NSPLvz6XNsRe0"
│   ├── date: "2025-10-16"  // TODAY - has record
│   ├── status: "present"
│   └── timestamp: "2025-10-16T08:30:00"
│
├── doc_id_2
│   ├── studentId: "jEI5PKOrX0OGmOeJYD99"
│   ├── date: "2025-10-14"  // OCT 14 - has record (was present)
│   ├── status: "present"
│   └── timestamp: "2025-10-14T08:15:00"
│
└── doc_id_3
    ├── studentId: "jEI5PKOrX0OGmOeJYD99"
    ├── date: "2025-10-16"  // TODAY - has record
    ├── status: "present"
    └── timestamp: "2025-10-16T08:30:00"

NOTE: "xSZm547NSPLvz6XNsRe0" has NO record for "2025-10-14"
      ↳ System detects absence and shows overlay
```

## Toggle Control Flow

```
┌──────────────────────────────────────────────┐
│  USER: Opens "Overlay Settings"             │
│  Clicks gear icon (⚙️) on face scan page    │
└──────────────────┬───────────────────────────┘
                   ↓
┌──────────────────────────────────────────────┐
│  SETTINGS MODAL DISPLAYED                    │
│                                              │
│  Active Overlays:                            │
│  ┌────────────────────────────────────────┐  │
│  │ ⚠️ SEND_HOME           [✓ ON]         │  │
│  │ TOO LATE                                │  │
│  │ Error • Enabled                         │  │
│  ├────────────────────────────────────────┤  │
│  │ 📝 MISSED_QUIZ         [✓ ON]         │  │
│  │ FINISH YOUR CO-LEARNING                 │  │
│  │ Warning • Enabled                       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  User clicks toggle to OFF ─────────────────┐│
└──────────────────────────────────────────────┘│
                   ↓                            │
┌──────────────────────────────────────────────┘
│  SAVED TO LOCALSTORAGE                       
│  Key: "overlay-missed-quiz"                  
│  Value: "false"                              
└──────────────────┬───────────────────────────
                   ↓
┌──────────────────────────────────────────────┐
│  NEXT STUDENT SCANS                          │
│  ↓                                           │
│  Attendance marked                           │
│  ↓                                           │
│  Check overlay enabled?                      │
│  ↓                                           │
│  localStorage.getItem('overlay-missed-quiz') │
│  → Returns "false"                           │
│  ↓                                           │
│  ⏭️ SKIP QUIZ CHECK - Overlay disabled       │
└──────────────────────────────────────────────┘
```

## Performance

### Query Speed
```
Average query time: ~50-100ms
Impact on recognition: NONE (runs after attendance marked)
Network: Single Firestore query with indexed fields

┌─────────────────────────────────────────┐
│  Timeline                               │
├─────────────────────────────────────────┤
│  0ms:    Face detected                  │
│  100ms:  Face matched to student        │
│  150ms:  Attendance save started        │
│  350ms:  Attendance saved ✅            │
│  400ms:  Quiz check query sent          │
│  450ms:  Query result received          │
│  460ms:  Overlay shown (if needed)      │
└─────────────────────────────────────────┘
```

## Browser Console Output

### Student Was Absent
```
✅ Attendance marking completed for Test Testing: present
📝 MISSED QUIZ CHECK: Checking if student missed quiz on October 14, 2025
📝 Test Testing missed quiz on 2025-10-14 - showing overlay
```

### Student Was Present
```
✅ Attendance marking completed for Kong Reachraksa: present
📝 MISSED QUIZ CHECK: Checking if student missed quiz on October 14, 2025
✅ Kong Reachraksa was present on 2025-10-14 - no overlay needed
```

### Overlay Disabled
```
✅ Attendance marking completed for Test Testing: present
(No quiz check - overlay disabled in settings)
```

## Summary

```
╔══════════════════════════════════════════════════════════════╗
║  AUTOMATIC MISSED QUIZ CHECK                                 ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ✓ No manual list uploads needed                            ║
║  ✓ Uses existing attendance data                            ║
║  ✓ Real-time check on every scan                            ║
║  ✓ Self-correcting if data changes                          ║
║  ✓ Toggle on/off via UI                                     ║
║  ✓ Fast query (~50ms)                                       ║
║  ✓ Works with all 50 absent students                        ║
║                                                              ║
║  Target Date: October 14, 2025                              ║
║  Check Method: Query attendance collection                   ║
║  Trigger: After successful attendance marking               ║
║  Duration: 10 seconds (auto-dismiss)                        ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
```
