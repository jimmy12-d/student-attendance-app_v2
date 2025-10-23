# Migration Guide: Setting Up Mock Exams for New Progress Bar

## Current Status (from verification)

✅ **Mock 1**: Fully configured with eventId and form  
❌ **Mock 2, 3, 4**: Missing eventId field in examControls

## Steps to Complete Setup

### 1. Create Events for Each Mock Exam

For each mock exam that doesn't have an event yet:

```javascript
// Example for Mock 2
const mock2Event = {
  name: "Mock Exam 2 Registration",
  nameKhmer: "ចុះឈ្មោះប្រលងសាកល្បងទី ២",
  date: admin.firestore.Timestamp.fromDate(new Date('2025-12-12')),
  formId: "CREATE_FORM_FIRST", // Create form first, then add formId
  ticketImageUrl: "URL_TO_TICKET_IMAGE",
  isFree: false,
  pricingOptions: [
    {
      id: "stars-only",
      type: "stars",
      starPrice: 10,
      stock: 100,
      soldCount: 0
    }
  ],
  allowBorrow: true,
  isTakeAttendance: true,
  createdAt: admin.firestore.FieldValue.serverTimestamp()
};

// Add to Firestore
await db.collection('events').add(mock2Event);
```

### 2. Create Forms for Each Mock Exam

```javascript
const mock2Form = {
  title: "Mock Exam 2 Registration Form",
  titleKhmer: "ទម្រង់ចុះឈ្មោះប្រលងសាកល្បងទី ២",
  description: "Register for Mock Exam 2",
  eventId: "EVENT_ID_FROM_STEP_1",
  isActive: true,
  questions: [
    {
      id: "q1",
      type: "text",
      question: "What is your phone number?",
      required: true
    }
    // Add more questions as needed
  ],
  createdAt: admin.firestore.FieldValue.serverTimestamp()
};

await db.collection('forms').add(mock2Form);
```

### 3. Update examControls with eventId

Once you have created the event:

```javascript
// Update mock2, mock3, mock4
await db.collection('examControls').doc('mock2').update({
  eventId: "EVENT_ID_FROM_STEP_1"
});

await db.collection('examControls').doc('mock3').update({
  eventId: "EVENT_ID_FOR_MOCK3"
});

await db.collection('examControls').doc('mock4').update({
  eventId: "EVENT_ID_FOR_MOCK4"
});
```

### 4. Fix Mock 1 Registration Data

The Mock 1 registration found doesn't have proper status fields. Update existing registrations:

```javascript
// Find all Mock 1 registrations without status fields
const mock1FormId = "kUrktZD6Y3ZHGDsJBgne";

const registrations = await db.collection('form_responses')
  .where('formId', '==', mock1FormId)
  .get();

const batch = db.batch();

registrations.forEach(doc => {
  const data = doc.data();
  
  // Only update if status fields are missing
  if (!data.registrationStatus || !data.paymentStatus) {
    batch.update(doc.ref, {
      registrationStatus: 'approved', // or 'pending' based on your logic
      paymentStatus: 'unpaid' // or 'paid'/'borrowed' based on actual status
    });
  }
});

await batch.commit();
```

## Quick Setup Script

Run this script to set up missing eventIds (after creating events manually):

```javascript
// setup-mock-exams.js
const admin = require('firebase-admin');

async function setupMockExams() {
  const db = admin.firestore();
  
  // Replace these with your actual event IDs
  const eventIds = {
    mock2: 'YOUR_MOCK2_EVENT_ID',
    mock3: 'YOUR_MOCK3_EVENT_ID',
    mock4: 'YOUR_MOCK4_EVENT_ID'
  };
  
  for (const [mockId, eventId] of Object.entries(eventIds)) {
    await db.collection('examControls').doc(mockId).update({
      eventId: eventId
    });
    console.log(`✅ Updated ${mockId} with eventId: ${eventId}`);
  }
}

setupMockExams().then(() => console.log('Done!'));
```

## Alternative: Gradual Rollout

If you want to roll out gradually:

### Option A: Keep Google Sheets as Fallback

Modify `ProgressBar.tsx` to fallback to Google Sheets if no Firestore data found:

```typescript
// After fetching from Firestore returns empty
if (formResponsesSnapshot.empty) {
  // Fallback to Google Sheets
  try {
    const secretKey = process.env.NEXT_PUBLIC_SHEET_SECRET;
    const apiUrl = `/api/sheet-data?student_id=${studentDocId}&secret=${secretKey}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    setProgressStatus(data.status || "No Registered");
    return;
  } catch (error) {
    console.error('Google Sheets fallback failed:', error);
    setProgressStatus("No Registered");
  }
}
```

### Option B: Only Enable for Specific Mocks

Add a feature flag in examControls:

```javascript
{
  id: "mock1",
  useFirestoreStatus: true, // Enable new system
  // ...
}

{
  id: "mock2",
  useFirestoreStatus: false, // Still use Google Sheets
  // ...
}
```

Then check this flag in ProgressBar before querying.

## Testing After Setup

1. Run the verification script:
   ```bash
   node verify-mock-exam-setup.js
   ```

2. Test with a real student ID:
   ```bash
   node verify-mock-exam-setup.js YOUR_STUDENT_ID mock1
   ```

3. Test in the UI:
   - Log in as a student
   - Navigate to Mock Exam page
   - Check that progress bar shows correct status
   - Switch between different mock tabs

## Checklist

- [ ] Created events for mock2, mock3, mock4
- [ ] Created forms for each mock exam
- [ ] Updated examControls with eventIds
- [ ] Fixed existing form_responses with proper status fields
- [ ] Ran verification script (all checks pass)
- [ ] Tested with real student account
- [ ] Verified progress bar displays correctly
- [ ] Confirmed Mock 3 payment gate works

## Data Schema Reference

### form_responses Document Structure:
```javascript
{
  formId: "kUrktZD6Y3ZHGDsJBgne",
  studentId: "abc123",
  studentName: "John Doe",
  authUid: "firebase_uid",
  
  // Required fields for new system:
  registrationStatus: "approved", // 'pending' | 'approved' | 'rejected'
  paymentStatus: "paid",          // 'unpaid' | 'paid' | 'borrowed'
  
  // Optional payment details:
  pricingOptionId: "stars-only",
  amountPaid: {
    stars: 10,
    money: 0
  },
  borrowAmount: {
    stars: 0,
    money: 0
  },
  
  submittedAt: Timestamp,
  responses: { /* form answers */ }
}
```

### examControls Required Fields:
```javascript
{
  nameEnglish: "Mock Exam 1",
  nameKhmer: "ប្រលងសាកល្បងទី ១",
  date: "30-10-2025", // DD-MM-YYYY
  isReadyForStudent: true,
  isReadyToPublishedResult: false,
  eventId: "RJs0xs1mKfHoa92X1vsT" // REQUIRED for new system
}
```

## Firestore Security Rules

**IMPORTANT**: Make sure your firestore.rules allow authenticated users to read the required collections:

```javascript
match /examControls/{controlsId} {
  allow read: if request.auth != null;
  allow write: if isAuthorizedUser();
}

match /events/{eventId} {
  allow read: if request.auth != null;
  allow write: if isAuthorizedUser();
}

match /form_responses/{responseId} {
  allow read: if isAuthorizedUser() || 
               (request.auth != null && 
                (request.auth.uid == resource.data.authUid || 
                 request.auth.uid == resource.data.studentUid));
  // ... other rules
}
```

Deploy the rules:
```bash
firebase deploy --only firestore:rules
```

## Support

If you encounter issues:

1. **"Missing or insufficient permissions" error**: 
   - Check Firestore security rules allow authenticated reading of:
     - examControls
     - events
     - form_responses
   - Deploy updated rules with `firebase deploy --only firestore:rules`

2. Verify student has valid `studentDocId` in Redux state

3. Check browser console for Firestore query errors

4. Run verification script to identify specific issues
