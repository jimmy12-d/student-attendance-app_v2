# Event Pricing Feature Implementation

## Overview
Added comprehensive pricing functionality to the events system, allowing:
1. **Multiple pricing options** per event (simple numbered tiers like Option 1, Option 2, etc.)
2. **Flexible payment methods**:
   - Stars only
   - Money only
   - Combination (stars + money)
3. **Payment status tracking** - Changes "approve" to "pay" for paid events
4. **Borrow feature** - Students can borrow stars/money if insufficient

## Data Structure

### Event Interface Updates
```typescript
interface PricingOption {
  id: string;
  starPrice?: number; // Stars only option
  moneyPrice?: number; // Money only option (in dollars)
  starWithMoney?: {
    stars: number;
    money: number;
  }; // Combination option
  stock?: number; // Optional ticket limit
  soldCount?: number;
}

interface Event {
  // ... existing fields
  isFree?: boolean; // true if event is free
  pricingOptions?: PricingOption[]; // Multiple pricing tiers
  allowBorrow?: boolean; // Allow students to borrow for payment
}
```

### Form Response Interface Updates
```typescript
interface FormResponse {
  // ... existing fields
  paymentStatus?: 'unpaid' | 'paid' | 'borrowed';
  pricingOptionId?: string; // Which pricing tier selected
  amountPaid?: {
    stars?: number;
    money?: number;
  };
  borrowAmount?: {
    stars?: number;
    money?: number;
  };
  paidAt?: Timestamp | Date;
}
```

## Features Implemented

### 1. Event Creation/Editing Form
**Location:** `app/dashboard/events/page.tsx`

#### Free vs Paid Toggle
- Checkbox to mark event as free
- When free, pricing options are hidden and borrowing is disabled

#### Pricing Options Management
- **Add Multiple Options**: Create unlimited pricing tiers (numbered as Option 1, Option 2, etc.)
- **Each Option Includes**:
  - Payment type selection (3 buttons):
    - ⭐ **Stars Only**: Input field for star amount
    - 💵 **Money Only**: Input field for dollar amount
    - 🤝 **Combo**: Two input fields (stars + money)
  - Stock limit (optional) - Leave empty for unlimited

#### Payment Type Examples
```
Option 1:
- Stars Only: 100⭐
- Money Only: $50
- Combo: 50⭐ + $25

Option 2:
- Stars Only: 50⭐
- Money Only: $25
- Combo: 25⭐ + $15
```

#### Borrow Feature Toggle
- Checkbox: "Allow Borrowing"
- When enabled, students can borrow if they don't have enough funds
- Only visible for paid events

### 2. Event Card Display
**Location:** `app/dashboard/events/page.tsx` - EventCard component

#### Visual Indicators
- **Free Events**: Green gift icon with "Free Event" badge
- **Paid Events**: 
  - Shows all pricing options with their costs
  - Icons: ⭐ for stars, $ for money
  - Different colors for different payment types:
    - Yellow: Stars only
    - Green: Money only
    - Purple: Combo
  - "Borrowing available" badge if enabled

### 3. Registration/Payment Flow
**Location:** `app/dashboard/events/[eventId]/registrations/page.tsx`

#### Updated Registration Status
- **For Free Events**: "Approve/Reject" workflow remains
- **For Paid Events**: Changes to "Pay/Reject" workflow

#### Payment Information Displayed
- Pricing option selected by student
- Payment method used (stars/money/combo)
- Amount paid breakdown
- Borrow amount if applicable
- Payment timestamp

## UI/UX Enhancements

### Color Coding
- **Free**: Green theme
- **Stars**: Yellow/Gold theme
- **Money**: Green theme
- **Combo**: Purple theme
- **Borrowing**: Blue theme

### Icons Used
- `mdiGift`: Free events
- `mdiStar`: Star payments
- `mdiCurrencyUsd`: Money payments
- `mdiHandCoin`: Borrowing/Combo payments
- `mdiTicket`: Pricing options

## Implementation Notes

### State Management
```typescript
// Pricing states in event form
const [isFree, setIsFree] = useState(true);
const [pricingOptions, setPricingOptions] = useState<PricingOption[]>([]);
const [allowBorrow, setAllowBorrow] = useState(false);
```

### Helper Functions
```typescript
// Add new pricing option
addPricingOption()

// Update specific option
updatePricingOption(id, updates)

// Remove option
removePricingOption(id)

// Set payment type (stars/money/combo)
setPricingType(id, type)
```

### Form Validation
- Event name, date, and form selection are required
- For paid events, at least one pricing option should be added
- Each pricing option must have a valid price (either starPrice, moneyPrice, or starWithMoney)

## Next Steps for Full Integration

### 1. Student Registration Form
Create a payment selection UI where students can:
- View all available pricing options
- Select their preferred payment method
- See their current balance (stars/money)
- Choose to borrow if needed and allowBorrow is enabled
- Complete payment/registration

### 2. Payment Processing
Implement functions to:
- Deduct stars/money from student accounts
- Record borrow transactions
- Update student financial records
- Generate payment receipts
- Handle refunds if event is cancelled

### 3. Admin Payment Management
Add admin capabilities to:
- View payment status of all registrations
- Manually mark payments as paid/unpaid
- Process refunds
- Track borrowed amounts
- Generate financial reports

### 4. Borrowed Amount Tracking
Create system to:
- Track what students borrowed
- Set repayment schedules
- Send reminders for repayment
- Update student credit scores/limits

### 5. Stock Management
Implement logic to:
- Track sold tickets per pricing option
- Disable options when sold out
- Show "Sold Out" badges
- Handle waitlists

## Database Collections Needed

### Payment Transactions
```typescript
// Collection: "eventPayments"
{
  id: string;
  eventId: string;
  studentId: string;
  pricingOptionId: string;
  amountPaid: {
    stars?: number;
    money?: number;
  };
  borrowAmount?: {
    stars?: number;
    money?: number;
  };
  paymentMethod: 'stars' | 'money' | 'combo';
  status: 'completed' | 'pending' | 'refunded';
  paidAt: Timestamp;
  refundedAt?: Timestamp;
}
```

### Borrow Records
```typescript
// Collection: "eventBorrows"
{
  id: string;
  eventId: string;
  studentId: string;
  borrowAmount: {
    stars?: number;
    money?: number;
  };
  repaidAmount?: {
    stars?: number;
    money?: number;
  };
  borrowedAt: Timestamp;
  dueDate?: Timestamp;
  status: 'active' | 'repaid' | 'overdue';
  repaidAt?: Timestamp;
}
```

## Testing Checklist

- [ ] Create free event
- [ ] Create event with stars-only pricing
- [ ] Create event with money-only pricing
- [ ] Create event with combo pricing
- [ ] Create event with multiple pricing tiers
- [ ] Enable/disable borrowing
- [ ] Set stock limits
- [ ] Edit existing events
- [ ] Display pricing on event cards
- [ ] Filter paid vs free events
- [ ] Student registration with payment
- [ ] Process payment with sufficient funds
- [ ] Process payment with borrowing
- [ ] Handle sold-out tickets
- [ ] Generate payment reports

## Security Considerations

1. **Payment Validation**: Server-side validation of all payments
2. **Balance Verification**: Check student balances before allowing payment
3. **Double-Spending Prevention**: Use transactions for payment processing
4. **Borrow Limits**: Set maximum borrow amounts per student
5. **Audit Trail**: Log all payment and borrow transactions
6. **Refund Protection**: Implement refund policies and checks

## Future Enhancements

1. **Early Bird Pricing**: Time-based automatic price adjustments
2. **Discount Codes**: Promo codes for special pricing
3. **Group Discounts**: Reduced rates for group registrations
4. **Payment Plans**: Allow installment payments
5. **Scholarship/Free Tickets**: Admin-granted free access
6. **Dynamic Pricing**: Price changes based on demand
7. **Payment Gateway Integration**: Accept real credit card payments
8. **QR Code Tickets**: Generate scannable tickets after payment
