# Expected Revenue Card Implementation

## Overview
Replaced the "Daily Average" metric card with an "Expected Revenue" card that shows the projected revenue from unpaid students, broken down into two categories: Trial Period students and Existing Unpaid students.

## Date Implemented
October 4, 2025

## Changes Made

### 1. Updated Data Structures

#### SummaryData Interface (`page.tsx`)
Added `expectedRevenue` object with:
```typescript
expectedRevenue: {
  trialPeriodAmount: number;      // Expected revenue from trial period students
  existingUnpaidAmount: number;   // Expected revenue from existing unpaid students
  totalExpected: number;          // Sum of both categories
  trialPeriodCount: number;       // Count of trial period students
  existingUnpaidCount: number;    // Count of existing unpaid students
}
```

### 2. Calculation Logic

#### Trial Period Students
- Students created **within 3 days or less** (≤3 days)
- Counted as "new" or "trial period" students
- Expected to pay their first tuition

#### Existing Unpaid Students
- Students created **more than 3 days ago** (>3 days)
- Have 'unpaid' or 'no-record' status
- Expected to pay overdue/current tuition

#### Pricing
- Fetches class type prices from `classTypes` collection in Firestore
- Defaults to $25 if no price is set for a class type
- Calculates expected revenue by multiplying student count by their class price

### 3. Metric Card Changes

#### Before:
```
1. Total Revenue
2. Total Transactions  
3. Average Payment
4. Daily Average      ← Removed
```

#### After:
```
1. Total Revenue
2. Total Transactions
3. Expected Revenue   ← NEW (moved to position 3)
4. Average Payment    ← Moved to position 4
```

### 4. Visual Design

#### Expected Revenue Card
- **Color**: Orange-red gradient (from-orange-500 to-red-600)
- **Icon**: Trending up icon
- **Main Display**: Total expected revenue (sum of both categories)
- **Breakdown Section**: Shows two subcategories with:
  - Purple dot + "Trial Period (X)" → $XX.XX
  - Red dot + "Existing Unpaid (X)" → $XX.XX
  - Separated by border from main value
  - Color-coded for easy identification

### 5. Data Flow

```
fetchSummaryData()
  ↓
1. Fetch class types and prices from Firestore
  ↓
2. Loop through students
  ↓
3. Check payment status (unpaid or no-record)
  ↓
4. If unpaid AND current month:
   a. Get student's class price
   b. Check createdAt date
   c. Calculate days since creation
   d. If ≤3 days → add to trial period
   e. If >3 days → add to existing unpaid
  ↓
5. Calculate totals
  ↓
6. Store in expectedRevenue object
  ↓
7. Pass to MetricsCards component
  ↓
8. Display with breakdown
```

## Files Modified

1. **`app/dashboard/payment-summary/page.tsx`**
   - Updated `SummaryData` interface
   - Added expected revenue calculation logic
   - Fetches class type pricing
   - Categorizes students into trial period vs existing unpaid
   - Calculates expected amounts

2. **`app/dashboard/payment-summary/components/MetricsCards.tsx`**
   - Updated `MetricsCardsProps` interface
   - Replaced Daily Average card with Expected Revenue card
   - Added breakdown display section
   - Reordered cards (Expected Revenue to position 3)

## Key Features

### 1. **Smart Categorization**
- Automatically categorizes unpaid students
- Uses 3-day threshold for trial period
- Considers student creation date (createdAt field)

### 2. **Accurate Pricing**
- Pulls actual class prices from database
- Different students may have different expected amounts
- Based on their enrolled class type

### 3. **Current Month Only**
- Expected revenue only calculated for current month
- Historical data doesn't show expected revenue
- Makes sense: can't "expect" revenue from past

### 4. **Visual Breakdown**
- Main card shows total expected revenue
- Expandable breakdown shows:
  - How much from new students (purple)
  - How much from existing students (red)
  - Count of each category

## Example Scenarios

### Scenario 1: Mixed Unpaid Students
- 5 students unpaid for current month
- 2 are trial period (joined 2 days ago) @ $30 each
- 3 are existing unpaid @ $25 each

**Display:**
```
Expected Revenue
$135.00

Trial Period (2)     $60.00
Existing Unpaid (3)  $75.00
```

### Scenario 2: Only New Students
- 3 students unpaid
- All 3 joined yesterday @ $25 each

**Display:**
```
Expected Revenue
$75.00

Trial Period (3)     $75.00
Existing Unpaid (0)  $0.00
```

### Scenario 3: Past Month View
- Viewing September data (not current month)
- No expected revenue shown (N/A or $0.00)
- Makes sense: can't expect revenue from past

## Benefits

1. **Financial Forecasting**: Admins can see expected incoming revenue
2. **New vs Existing**: Understand which group needs attention
3. **Targeted Follow-up**: Different strategies for new vs existing unpaid
4. **Better Than Daily Average**: More actionable for payment collection
5. **Real-time Pricing**: Uses actual class prices, not estimates

## Technical Notes

- Only runs calculation for current month (performance optimization)
- Handles missing `createdAt` gracefully (treats as existing)
- Falls back to $25 if class price not found
- Uses same payment status logic as rest of system
- Consistent with UnpaidStudentsTab trial period logic

## Testing Checklist

- [ ] Verify calculation for current month
- [ ] Check trial period threshold (≤3 days)
- [ ] Confirm class pricing pulls correctly
- [ ] Test with mixed student types
- [ ] Verify breakdown totals match main value
- [ ] Check dark mode styling
- [ ] Test with no unpaid students
- [ ] Test with only trial period students
- [ ] Test with only existing unpaid students
- [ ] Verify past months don't calculate expected revenue

## Related Features

- Unpaid Students Modal (shows list when clicking unpaid count)
- Unpaid Students Tab (detailed view with same trial period logic)
- Payment Summary (overall financial dashboard)

## Future Enhancements

Potential improvements:
- Add late fee calculations to expected revenue
- Show expected revenue trend over time
- Add "collection probability" percentage
- Include payment history patterns
- Export expected revenue report
- Send reminders based on expected revenue
