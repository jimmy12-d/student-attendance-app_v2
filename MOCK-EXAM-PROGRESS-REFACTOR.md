# Mock Exam Progress Bar Refactor

## Summary
Refactored the ProgressBar component to fetch student registration status from Firestore (events/form_responses) instead of Google Sheets.

## Changes Made

### 1. ProgressBar Component (`app/student/mock-exam/_components/ProgressBar.tsx`)

#### Removed:
- `status` prop (now fetched internally)
- Dependency on Google Sheets API

#### Added:
- Redux hooks to access `studentDocId` and `studentUid`
- Internal state management for `progressStatus` and `isLoadingStatus`
- New `useEffect` hook to fetch registration status from Firestore

#### Status Determination Logic:
The component now determines the student's progress status by:

1. **Getting the eventId** from `examControls` collection using `currentMockId` (e.g., "mock1", "mock2")
2. **Getting the formId** from `events` collection using the `eventId`
3. **Querying form_responses** collection for the student's registration:
   - Filters by `formId` and `studentId`
4. **Determining status** based on:
   - `registrationStatus`: 'pending', 'approved', 'rejected'
   - `paymentStatus`: 'paid', 'borrowed', 'unpaid'

#### Status Mapping:
| Registration Status | Payment Status | Displayed Status | Progress % |
|---------------------|----------------|------------------|------------|
| N/A (no record)     | N/A            | No Registered    | 0%         |
| rejected            | Any            | No Registered    | 0%         |
| pending             | Any            | Registered       | 33%        |
| approved            | unpaid/none    | Registered       | 33%        |
| approved            | borrowed       | Borrow           | 66%        |
| approved            | paid           | Paid Star        | 100%       |

### 2. Page Component (`app/student/mock-exam/page.tsx`)

#### Removed:
- `progressStatus` and `setProgressStatus` state (initially)
- `isProgressLoading` state
- Google Sheets API fetch logic in `loadAllData` function
- `progressCache` from Redux
- Environment variable `NEXT_PUBLIC_SHEET_SECRET` usage

#### Re-added (for Mock 3 check):
- `progressStatus` state - needed by MockExamResults to check if Mock 3 results can be viewed
- New `useEffect` hook to fetch status for the selected tab (duplicates ProgressBar logic but necessary for MockExamResults)

#### Updated Props:
- `ProgressBar` component now receives only:
  - `loading`: boolean (set to false, as status is now internally managed)
  - `availableTabs`: string[]
  - `currentMockId`: string

## Data Flow

### Before (Google Sheets):
```
page.tsx → API call to /api/sheet-data → Google Sheets
    ↓
progressStatus prop
    ↓
ProgressBar component
```

### After (Firestore):
```
page.tsx → provides currentMockId
    ↓
ProgressBar component → examControls → events → form_responses
    ↓
Internal progressStatus state
```

## Database Schema

### examControls Collection:
```typescript
{
  id: "mock1" | "mock2" | "mock3" | "mock4",
  nameEnglish: string,
  nameKhmer: string,
  date: string, // DD-MM-YYYY format
  isReadyToPublishedResult: boolean,
  isReadyForStudent: boolean,
  eventId: string // Link to events collection
}
```

### events Collection:
```typescript
{
  id: string,
  name: string,
  formId: string, // Link to forms collection
  date: Timestamp,
  // ... other fields
}
```

### form_responses Collection:
```typescript
{
  id: string,
  formId: string,
  studentId: string,
  studentName: string,
  authUid: string,
  registrationStatus: 'pending' | 'approved' | 'rejected',
  paymentStatus: 'unpaid' | 'paid' | 'borrowed',
  pricingOptionId?: string,
  amountPaid?: { stars?: number; money?: number },
  borrowAmount?: { stars?: number; money?: number },
  submittedAt: Timestamp,
  // ... other fields
}
```

## Benefits

1. **Real-time Updates**: Status changes are reflected immediately without API delays
2. **No External Dependencies**: Removed dependency on Google Sheets API
3. **Consistency**: Uses the same data source as the event registration system
4. **Performance**: Direct Firestore queries are faster than Google Sheets API calls
5. **Maintainability**: Single source of truth for registration status

## Testing Checklist

- [ ] Progress bar displays "No Registered" when student hasn't registered
- [ ] Progress bar displays "Registered" when registration is pending or approved without payment
- [ ] Progress bar displays "Borrow" when student has borrowed payment
- [ ] Progress bar displays "Paid Star" when payment is complete
- [ ] Progress bar updates when switching between mock exams
- [ ] Mock 3 results are hidden when payment status is not "Paid Star"
- [ ] Date badge displays correctly from examControls
- [ ] Countdown badge shows days until exam correctly

## Migration Notes

- The Google Sheets integration code has been completely removed
- Ensure all mock exams have corresponding events with registrations set up
- The `eventId` field must be populated in `examControls` documents for this to work
- Students who registered through other means may need their registrations added to Firestore

## Environment Variables (No Longer Needed)
- `NEXT_PUBLIC_SHEET_SECRET` - Can be removed if not used elsewhere
