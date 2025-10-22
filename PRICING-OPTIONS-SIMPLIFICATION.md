# Pricing Options Simplification

## Changes Made

Removed the `name` and `description` fields from pricing options to simplify the interface.

## Updated Data Structure

### Before
```typescript
interface PricingOption {
  id: string;
  name: string; // e.g., "VIP Ticket", "General Admission"
  description?: string;
  starPrice?: number;
  moneyPrice?: number;
  starWithMoney?: { stars: number; money: number };
  stock?: number;
  soldCount?: number;
}
```

### After
```typescript
interface PricingOption {
  id: string;
  starPrice?: number; // Stars only
  moneyPrice?: number; // Money only (in dollars)
  starWithMoney?: { stars: number; money: number }; // Combination
  stock?: number; // Optional ticket limit
  soldCount?: number;
}
```

## UI Changes

### Event Creation Form
- **Removed**: Name input field
- **Removed**: Description input field
- **Simplified**: Options now just labeled as "Option 1", "Option 2", etc.

**Before:**
```
┌─ Option 1 ───────────────────┐
│ Name: VIP Ticket             │
│ Description: Front row seats │
│ [Payment Type Buttons]       │
│ Price: [inputs]              │
│ Stock: [input]               │
└──────────────────────────────┘
```

**After:**
```
┌─ Option 1 ───────────┐
│ [Payment Type Buttons]│
│ Price: [inputs]       │
│ Stock: [input]        │
└───────────────────────┘
```

### Event Card Display
- **Changed**: From showing custom names like "VIP", "General" 
- **To**: Showing generic tier numbers like "Tier 1", "Tier 2"

**Before:**
```
🎟️ VIP: ⭐100
🎟️ General: $25
🎟️ Student: ⭐25 + $10
```

**After:**
```
🎟️ Tier 1: ⭐100
🎟️ Tier 2: $25
🎟️ Tier 3: ⭐25 + $10
```

## Benefits

1. **Simpler UI**: Less fields to fill out when creating events
2. **Faster Setup**: Admins can create pricing tiers more quickly
3. **Cleaner Code**: Fewer optional fields to manage
4. **Less Complexity**: No need to validate or store custom names
5. **Universal Understanding**: Tier numbers are universally understood

## What's Retained

- All payment functionality (stars/money/combo)
- Stock limits per option
- Multiple pricing tiers support
- Borrowing feature
- Free vs Paid toggle
- All core pricing features

## Files Modified

1. **app/dashboard/events/page.tsx**
   - Updated `PricingOption` interface
   - Removed name/description from `addPricingOption()`
   - Removed name/description input fields from UI
   - Changed event card to display "Tier X" instead of custom names

2. **app/dashboard/events/[eventId]/registrations/page.tsx**
   - Updated `PricingOption` interface in Event type
   - Removed `pricingOptionName` from FormResponse interface

3. **EVENT-PRICING-FEATURE.md**
   - Updated documentation to reflect simpler structure
   - Changed examples to use generic tier numbers

## Migration Note

If you have existing events with pricing options in the database that include `name` and `description` fields, those fields will simply be ignored. The system will work with or without them, so no database migration is needed.

## Testing

✅ No TypeScript errors
✅ Compiles successfully
✅ Cleaner interface for creating pricing options
✅ Event cards display tier numbers correctly
