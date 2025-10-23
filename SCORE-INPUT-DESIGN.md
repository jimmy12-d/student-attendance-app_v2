# Score Input Question - Visual Design Guide

## Component Layout

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  Enter Score (0 - 100)                                     │
│  ┌───────────────────────────────────────────────────┐    │
│  │                75                          / 100   │    │
│  └───────────────────────────────────────────────────┘    │
│                                                             │
│  Or drag to set score                             75%      │
│  ┌═══════════════════════════════════╗─────────────┐      │
│  ║███████████████████████████████ 75.0 ║           │      │
│  ║         GRADIENT FILL                ║  EMPTY    │      │
│  └═══════════════════════════════════╩─────────────┘      │
│  0     25          50          75         100             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  🏆                      Score                      │  │
│  │  Your Grade             75.0 / 100                  │  │
│  │     C                   75%                         │  │
│  │                                                      │  │
│  │  A: 90-100%  B: 80-89%  [C: 70-79%]                │  │
│  │  D: 60-69%   E: 50-59%  F: Below 50%               │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Color Schemes by Grade

### Grade A (90-100%)
- **Bar Gradient:** Green (from-green-400 via-green-500 to-green-600)
- **Grade Box:** Green border, light green background
- **Text:** Deep green
- **Icon:** Trophy in green
- **Feel:** Success, excellence

### Grade B (80-89%)
- **Bar Gradient:** Blue (from-blue-400 via-blue-500 to-blue-600)
- **Grade Box:** Blue border, light blue background
- **Text:** Deep blue
- **Icon:** Trophy in blue
- **Feel:** Achievement, good performance

### Grade C (70-79%)
- **Bar Gradient:** Yellow (from-yellow-400 via-yellow-500 to-yellow-600)
- **Grade Box:** Yellow border, light yellow background
- **Text:** Deep yellow/amber
- **Icon:** Trophy in yellow
- **Feel:** Average, satisfactory

### Grade D (60-69%)
- **Bar Gradient:** Orange (from-orange-400 via-orange-500 to-orange-600)
- **Grade Box:** Orange border, light orange background
- **Text:** Deep orange
- **Icon:** Trophy in orange
- **Feel:** Warning, needs improvement

### Grade E (50-59%)
- **Bar Gradient:** Red (from-red-400 via-red-500 to-red-600)
- **Grade Box:** Red border, light red background
- **Text:** Deep red
- **Icon:** Trophy in red
- **Feel:** Caution, poor performance

### Grade F (Below 50%)
- **Bar Gradient:** Gray (from-gray-400 via-gray-500 to-gray-600)
- **Grade Box:** Gray border, light gray background
- **Text:** Dark gray
- **Icon:** Trophy in gray
- **Feel:** Failed, needs significant improvement

## Interaction States

### Default State
```
Score: 0
Bar: Empty (gray background)
Grade: Hidden
Message: "Drag or type to set score"
```

### Dragging State
```
Scale: 105% (slight zoom)
Shadow: Enhanced (shadow-xl)
Cursor: Pointer
Animation: Smooth transition
```

### Filled State (Score > 0)
```
Bar: Gradient fill based on percentage
Score: Displayed on bar (if width > 15%)
Grade: Animated reveal
Trophy: Visible with grade color
```

## Responsive Design

### Desktop (>768px)
- Full width inputs
- Side-by-side trophy and score display
- 6-column grade legend
- Larger touch targets

### Mobile (<768px)
- Stacked layout
- Touch-optimized drag bar (h-16)
- 2-column grade legend
- Larger font sizes

## Animation Timeline

1. **On Mount:** Instant render, no animation
2. **Score Input:** Immediate update, no delay
3. **Drag Interaction:**
   - Start: Scale to 105%, add shadow
   - During: Smooth bar fill animation
   - End: Scale back, remove shadow
4. **Grade Reveal (score > 0):**
   - Slide in from bottom (4 units)
   - Fade in
   - Duration: 500ms
   - Easing: ease-out

## Dark Mode Adjustments

### Light Mode
- Background: White (bg-white)
- Borders: Gray-300 (border-gray-300)
- Text: Gray-900 (text-gray-900)
- Bar Empty: Gray-200 (bg-gray-200)

### Dark Mode
- Background: Slate-800 (dark:bg-slate-800)
- Borders: Slate-600 (dark:border-slate-600)
- Text: White (dark:text-white)
- Bar Empty: Slate-700 (dark:bg-slate-700)

## Accessibility Features

- **Labels:** Proper semantic labels for all inputs
- **ARIA:** Descriptive aria-labels on interactive elements
- **Keyboard:** Input field fully keyboard accessible
- **Touch:** Minimum 44x44px touch targets
- **Color Contrast:** WCAG AA compliant
- **Screen Reader:** Announces grade when calculated

## Component Dimensions

- **Input Field Height:** 64px (py-4)
- **Progress Bar Height:** 64px (h-16)
- **Grade Box Padding:** 24px (p-6)
- **Border Width:** 2px (border-2)
- **Border Radius:** 16px (rounded-2xl)
- **Icon Size (Trophy):** 32px
- **Icon Size (Gauge):** 20px

## Font Weights

- **Score Input:** Bold (font-bold) 2xl
- **Grade Letter:** Black (font-black) 5xl
- **Labels:** Semibold (font-semibold)
- **Secondary Text:** Medium (font-medium)
- **Scale Labels:** Medium (font-medium)

---

**Design Philosophy:**
- Minimalist yet engaging
- Clear visual hierarchy
- Instant feedback
- Delightful interactions
- Professional appearance
