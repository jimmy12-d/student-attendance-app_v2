# Event Star Reward Refactor

## Overview
Updated the event pricing system to properly handle different types of **physical paper stars** with colors instead of using generic numeric values or referencing the starRewards collection.

## Important Context
Stars in events are **physical paper stars** (not digital star rewards from the starRewards collection). Admins input:
- **Quantity**: Simple number (e.g., 10)
- **Color**: white, pink, orange, blue, or yellow

## Changes Made

### 1. Interface Updates
Simplified the `PricingOption` interface to use direct star quantity and color:

**Before:**
```typescript
starRewards?: { rewardId: string; amount: number }[];
```

**After:**
```typescript
starQuantity?: number;
starColor?: 'white' | 'pink' | 'orange' | 'blue';
```

**Full Interface:**
```typescript
interface PricingOption {
  id: string;
  type?: 'stars' | 'money' | 'combo';
  starQuantity?: number;
  starColor?: 'white' | 'pink' | 'orange' | 'blue' | 'yellow';
  moneyPrice?: number;
  starWithMoney?: {
    starQuantity: number;
    starColor: 'white' | 'pink' | 'orange' | 'blue' | 'yellow';
    money: number | undefined;
  };
  stock?: number;
  soldCount?: number;
}
```

### 2. Form UI Updates (`/app/dashboard/events/page.tsx`)
- **Number input** for star quantity (simple input field)
- **Dropdown** for star color selection (white/pink/orange/blue/yellow)
- No complex multi-selects or reward references
- Example input: Quantity: 10, Color: Yellow

### 3. Display Updates
**EventCard** shows colored badges:
- Format: "10x ⭐ Blue"
- Colors match physical star colors with appropriate badge styling
- Badge colors: white, pink, orange, blue, yellow

**Event Registrations Page** shows:
- Pricing options with colored star labels: "10x ⭐ Blue"
- Payment details showing star quantity with colored badge
- Total price display includes star color badge

### 4. Helper Functions
- `getStarColorClass(color)`: Returns Tailwind classes for star color badges
- Moved outside component for proper scope
- Supports: white, pink, orange, blue, yellow star colors

### 5. Payment Processing Updates (`/app/dashboard/events/[eventId]/registrations/page.tsx`)
**Simplified payment calculation:**
- No more `calculateTotalStars()` helper (was for array-based rewards)
- Direct access: `selectedOption.starQuantity`
- Tracks star color in totalPrice object
- Removed complex `paidStarRewards` and `borrowedStarRewards` arrays

**Before:**
```typescript
const totalStars = calculateTotalStars(selectedOption.starRewards);
paidStarRewards = selectedOption.starRewards;
```

**After:**
```typescript
const totalStars = selectedOption.starQuantity || 0;
const starColor = selectedOption.starColor || 'white';
```

## Usage
When creating an event with star pricing:
1. Select pricing type (stars, money, or combo)
2. For star-based pricing:
   - Enter star quantity (e.g., 10)
   - Select star color from dropdown (white/pink/orange/blue/yellow)
3. The event card will display: "10x ⭐ Yellow" with colored badge
4. Registration page will show the same format in pricing options

## Files Modified
- `/app/dashboard/events/page.tsx` - Event creation/editing form and display ✅
- `/app/dashboard/events/[eventId]/registrations/page.tsx` - Registration payment processing ✅
- `/EVENT-STAR-REWARD-REFACTOR.md` - This documentation ✅

## Key Design Decision
✅ **Simple quantity + color inputs** (physical paper stars)  
❌ **NOT using starRewards collection references** (digital rewards)

## Testing Checklist
- [ ] Create event with star pricing (stars only)
- [ ] Create event with combo pricing (stars + money)
- [ ] Verify colored badges display correctly on event cards
- [ ] Test registration page displays correct pricing options
- [ ] Test payment processing with star payments
- [ ] Verify payment details show colored star badges
- [ ] Test borrowed vs paid payment flows
