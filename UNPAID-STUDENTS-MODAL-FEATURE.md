# Unpaid Students Modal Feature

## Overview
Added a clickable modal feature to the Payment Summary page that displays a list of unpaid student names when the admin clicks on the "Unpaid" label in the Total Transactions card. The modal shows unpaid students for the selected month/date range, not just the current month.

## Changes Made

### Files Modified
- `app/dashboard/payment-summary/components/MetricsCards.tsx`
- `app/dashboard/payment-summary/page.tsx`

## Implementation Details

#### 1. **Added Imports**
- `useState` hook from React
- `mdiClose` icon from `@mdi/js`
- Firestore functions: `collection`, `getDocs`, `query`, `where`
- Firebase config: `db`
- Payment logic: `getPaymentStatus`

#### 2. **Props Update**
Added `startDate?: string` prop to MetricsCards component to track the selected date from the parent component.

#### 3. **State Management**
Added four state variables:
- `showUnpaidModal`: Controls the visibility of the modal
- `unpaidStudents`: Stores the list of unpaid students
- `loadingUnpaid`: Manages the loading state while fetching data
- `selectedMonthDisplay`: Stores the formatted month/year for display

#### 4. **Fetch Function**
Created `fetchUnpaidStudents()` async function that:
- Uses the selected date from the date picker (or current date as fallback)
- Formats and displays the selected month in the modal header
- Queries Firestore for students in the current academic year (2026)
- Filters out inactive students (on break, waitlist, dropped)
- Uses `getPaymentStatus()` with the selected date context to determine if a student is unpaid
- Sorts students alphabetically by name
- Stores student data including: id, fullName, nameKhmer, and class

#### 5. **UI Changes**

##### Unpaid Label (Button)
- Changed the unpaid label from a `<span>` to a `<button>`
- Added hover effects: `hover:bg-red-200 dark:hover:bg-red-900/50`
- Added `onClick` handler to trigger the modal
- Made it visually indicate it's clickable with cursor pointer

##### Modal Component
Created a full-featured modal with:

**Header Section:**
- Red gradient background (`from-red-500 to-red-600`)
- Warning icon
- "Unpaid Students" title
- **Selected month display** (e.g., "October 2025")
- Count badge showing number of unpaid students
- Close button with icon (top-right X button)

**Body Section:**
- Loading state with spinner animation
- Empty state with checkmark icon when no unpaid students
- Student list with:
  - Numbered badges (1, 2, 3...)
  - Student full name (English)
  - Student Khmer name (if available)
  - Class badge
  - Hover effects on each row

**Footer Section:**
- **Close button** at the bottom with icon and "Close" text
- Gray background with border separator
- Smooth hover transition

**Features:**
- Click outside modal to close
- Click X button in header to close
- **Click Close button in footer to close**
- Responsive design (max-w-2xl, max-h-80vh)
- Dark mode support
- Smooth transitions
- Overflow scrolling for long lists
- **Date-aware**: Shows unpaid students for the selected month, not just current month

## Usage

1. Navigate to the Payment Summary page
2. Authenticate with the finance password
3. **Select a date range or month** using the date picker
4. Look at the "Total Transactions" card
5. If there are unpaid students for that period, you'll see a red badge showing the count
6. Click on the "X unpaid" badge
7. A modal will appear showing the list of unpaid students **for the selected month**
8. The modal header displays which month is being viewed
9. Close the modal by:
   - Clicking the X button in the top-right
   - Clicking the "Close" button at the bottom
   - Clicking outside the modal

## Key Features

- **Date Context Aware**: When viewing last month's data, the modal shows unpaid students from last month, not the current month
- **Smart Filtering**: 
  - **Current Month**: Shows both 'unpaid' and 'no-record' students
  - **Past Months**: Shows only 'unpaid' students (excludes 'no-record' students)
- **Three Ways to Close**: X button (top), Close button (bottom), or click outside
- **Month Display**: Shows which month's unpaid students are being displayed
- Real-time data fetching from Firestore
- Filters students based on academic year 2026
- Excludes students on break, waitlist, or dropped
- Sorted alphabetically for easy navigation
- Responsive and accessible design
- Full dark mode support

## Future Enhancements (Optional)

Potential improvements that could be added:
- Add search/filter functionality within the modal
- Show additional student details (phone, parent info)
- Add export functionality for the unpaid list
- Include days overdue information
- Add quick payment action buttons
- Show last payment date for each student

## Testing

To test the feature:
1. Ensure you have students in the database with unpaid status
2. Navigate to Payment Summary
3. **Test with current month**: Verify the unpaid count appears and modal shows current month's unpaid students
4. **Test with last month**: Change date picker to last month, verify modal shows last month's unpaid students
5. Click the unpaid badge to open the modal
6. Verify the modal header shows the correct month
7. Test all three closing methods:
   - Click the X button in top-right corner
   - Click the "Close" button at the bottom
   - Click outside the modal
8. Test in both light and dark modes
9. Test with different screen sizes for responsiveness

## Date Implemented
October 4, 2025

## Updates
- **October 4, 2025 (v2)**: 
  - Added Close button at the bottom of the modal
  - Modal now shows unpaid students for the selected month/date (not just current month)
  - Added month display in modal header to show which period is being viewed

- **October 4, 2025 (v3)**: 
  - Improved filtering logic for past months
  - **Current month**: Shows both 'unpaid' and 'no-record' students
  - **Past months**: Shows only 'unpaid' students (excludes 'no-record' students)
  - Rationale: Students with 'no-record' status in past months have already missed the deadline and should not be counted as unpaid for historical data
