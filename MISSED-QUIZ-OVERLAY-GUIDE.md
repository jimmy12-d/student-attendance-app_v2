# MISSED_QUIZ Overlay - Implementation Guide

## Overview
The `MISSED_QUIZ` overlay notifies students who missed a quiz on a specific date that they need to complete their co-learning assignment.

## Configuration

```typescript
MISSED_QUIZ: {
  id: 'missed-quiz',
  enabled: true,
  type: 'warning',
  title: '📝 MISSED QUIZ',
  message: 'FINISH YOUR CO-LEARNING',
  subtitle: 'You missed the quiz on October 14, 2025',
  icon: mdiAlertCircle,
  showHomeIcon: false,
  showPolicyNotice: true,
  policyText: 'Students who missed the quiz must complete their co-learning assignment. Please see your teacher.',
  dismissDelay: 3000,
  showDismissButton: true,
}
```

## How to Use

### Step 1: Create a List of Students Who Missed the Quiz

Store this in Firestore or in your component state:

```typescript
// Example: Store in component state
const [missedQuizStudents] = useState<Set<string>>(new Set([
  'student-id-1',
  'student-id-2',
  'student-id-3',
  // Add more student IDs
]));

// OR: Store in Firestore
// Create a collection: missed_quizzes/2025-10-14/students
// Each document contains: { studentId: 'xxx', quizDate: '2025-10-14', completed: false }
```

### Step 2: Check During Face Recognition

In your face detection logic (around line 935 in page.tsx):

```typescript
// After successful face recognition, check if student missed quiz
if (attendanceCheckStatus === 'present') {
  // Check if student missed the quiz on Oct 14
  if (missedQuizStudents.has(bestMatch.student.id)) {
    // Show missed quiz overlay
    const missedQuizConfig = getOverlayConfig('MISSED_QUIZ');
    if (missedQuizConfig) {
      setCurrentOverlay({
        config: missedQuizConfig,
        studentName: bestMatch.student.fullName
      });
    }
    
    // Still mark attendance as present
    // The overlay is just a reminder
  }
  
  // Continue with normal attendance marking...
}
```

### Step 3: Firestore Implementation (Recommended)

#### Collection Structure:
```
missed_quizzes/
  ├── 2025-10-14/
  │   ├── students/
  │   │   ├── student-id-1: { studentId, studentName, coLearningCompleted: false, notifiedAt: timestamp }
  │   │   ├── student-id-2: { studentId, studentName, coLearningCompleted: false, notifiedAt: timestamp }
  │   │   └── ...
```

#### Load Missed Quiz Students:

```typescript
// Add this to your component
const [missedQuizStudents, setMissedQuizStudents] = useState<Set<string>>(new Set());

// Load from Firestore
const loadMissedQuizStudents = useCallback(async () => {
  try {
    const quizDate = '2025-10-14'; // Or make it dynamic
    const missedQuizRef = collection(db, `missed_quizzes/${quizDate}/students`);
    
    const snapshot = await getDocs(missedQuizRef);
    const studentIds = new Set<string>();
    
    snapshot.forEach(doc => {
      const data = doc.data();
      // Only include students who haven't completed co-learning
      if (!data.coLearningCompleted) {
        studentIds.add(data.studentId);
      }
    });
    
    setMissedQuizStudents(studentIds);
    console.log(`Loaded ${studentIds.size} students who missed quiz on ${quizDate}`);
  } catch (error) {
    console.error('Failed to load missed quiz students:', error);
  }
}, []);

// Call it in useEffect
useEffect(() => {
  loadMissedQuizStudents();
}, [loadMissedQuizStudents]);
```

#### Check and Show Overlay:

```typescript
// In your face detection logic (detectFaces callback)
if (attendanceCheckStatus === 'present') {
  // Check if student missed quiz
  if (missedQuizStudents.has(bestMatch.student.id)) {
    const missedQuizConfig = getOverlayConfig('MISSED_QUIZ');
    if (missedQuizConfig) {
      setCurrentOverlay({
        config: missedQuizConfig,
        studentName: bestMatch.student.fullName
      });
      
      // Update last notified timestamp in Firestore
      const quizDate = '2025-10-14';
      const docRef = doc(db, `missed_quizzes/${quizDate}/students/${bestMatch.student.id}`);
      await updateDoc(docRef, {
        notifiedAt: serverTimestamp(),
        notificationCount: increment(1)
      });
    }
  }
  
  // Continue with attendance marking...
}
```

### Step 4: Mark Co-Learning as Completed

Create an admin interface or teacher dashboard to mark when students complete their co-learning:

```typescript
// Mark co-learning as completed
const markCoLearningCompleted = async (studentId: string, quizDate: string) => {
  try {
    const docRef = doc(db, `missed_quizzes/${quizDate}/students/${studentId}`);
    await updateDoc(docRef, {
      coLearningCompleted: true,
      completedAt: serverTimestamp()
    });
    
    // Refresh the list
    loadMissedQuizStudents();
    
    toast.success('Co-learning marked as completed');
  } catch (error) {
    console.error('Failed to update co-learning status:', error);
    toast.error('Failed to update status');
  }
};
```

## Example: Complete Integration

```typescript
// In your FaceApiAttendanceScanner component

// State
const [missedQuizStudents, setMissedQuizStudents] = useState<Set<string>>(new Set());
const QUIZ_DATE = '2025-10-14'; // Can be made configurable

// Load missed quiz students
const loadMissedQuizStudents = useCallback(async () => {
  try {
    const missedQuizRef = collection(db, `missed_quizzes/${QUIZ_DATE}/students`);
    const q = query(missedQuizRef, where('coLearningCompleted', '==', false));
    
    const snapshot = await getDocs(q);
    const studentIds = new Set<string>();
    
    snapshot.forEach(doc => {
      studentIds.add(doc.data().studentId);
    });
    
    setMissedQuizStudents(studentIds);
  } catch (error) {
    console.error('Failed to load missed quiz students:', error);
  }
}, []);

// Call in useEffect
useEffect(() => {
  if (students.length > 0) {
    loadMissedQuizStudents();
  }
}, [students, loadMissedQuizStudents]);

// In detectFaces callback (after attendance marking)
if (attendanceCheckStatus === 'present') {
  // Mark attendance first
  await markAttendance(...);
  
  // Then check if student missed quiz
  if (missedQuizStudents.has(bestMatch.student.id)) {
    const missedQuizConfig = getOverlayConfig('MISSED_QUIZ');
    if (missedQuizConfig?.enabled) { // Check if overlay is enabled
      setCurrentOverlay({
        config: missedQuizConfig,
        studentName: bestMatch.student.fullName
      });
      
      // Log notification
      try {
        const docRef = doc(db, `missed_quizzes/${QUIZ_DATE}/students/${bestMatch.student.id}`);
        await updateDoc(docRef, {
          lastNotifiedAt: serverTimestamp(),
          notificationCount: increment(1)
        });
      } catch (error) {
        console.error('Failed to log notification:', error);
      }
    }
  }
}
```

## Customizing the Date

To make the quiz date dynamic:

```typescript
// Store in Firestore: settings/quiz_tracking
{
  activeQuizDate: '2025-10-14',
  enabled: true
}

// Load in component
const [activeQuizDate, setActiveQuizDate] = useState<string | null>(null);

useEffect(() => {
  const loadQuizSettings = async () => {
    const docRef = doc(db, 'settings/quiz_tracking');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists() && docSnap.data().enabled) {
      setActiveQuizDate(docSnap.data().activeQuizDate);
    }
  };
  
  loadQuizSettings();
}, []);

// Then use activeQuizDate instead of hardcoded date
if (activeQuizDate && missedQuizStudents.has(bestMatch.student.id)) {
  // Show overlay with dynamic date
  const missedQuizConfig = getOverlayConfig('MISSED_QUIZ');
  if (missedQuizConfig) {
    setCurrentOverlay({
      config: {
        ...missedQuizConfig,
        subtitle: `You missed the quiz on ${new Date(activeQuizDate).toLocaleDateString()}`
      },
      studentName: bestMatch.student.fullName
    });
  }
}
```

## Enable/Disable Overlay

Users can enable or disable the MISSED_QUIZ overlay through the Overlay Settings UI:

1. Click the "Overlay Settings" button on the face scan page
2. Toggle the MISSED_QUIZ overlay on/off
3. Settings are saved to localStorage

Or programmatically:

```typescript
import { toggleOverlay } from './components/overlayConfigs';

// Disable
toggleOverlay('MISSED_QUIZ', false);

// Enable
toggleOverlay('MISSED_QUIZ', true);
```

## Testing

```typescript
// Add test student IDs temporarily
const [missedQuizStudents] = useState<Set<string>>(new Set([
  'test-student-id-1',
  'test-student-id-2',
]));

// The overlay should appear when these students are recognized
```

## Summary

1. ✅ Create list of students who missed quiz (Firestore or state)
2. ✅ Load the list when component mounts
3. ✅ Check if recognized student is in the list
4. ✅ Show MISSED_QUIZ overlay if they are
5. ✅ Log notifications in Firestore
6. ✅ Allow teachers to mark co-learning as completed
7. ✅ Users can toggle overlay on/off via settings

The overlay will remind students every time they scan their face until their co-learning is marked as completed!
