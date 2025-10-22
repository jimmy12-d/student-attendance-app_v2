# 🎨 Activities Page - Visual Design Preview

## Layout Structure

```
┌─────────────────────────────────────────┐
│  📱 Top Navigation Bar                  │
├─────────────────────────────────────────┤
│                                         │
│  📋 Events & Forms                      │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  ╔═══════════╗  ┌───────────┐  │    │
│  │  ║  Events   ║  │   Forms   │  │    │
│  │  ╚═══════════╝  └───────────┘  │    │
│  └────────────────────────────────┘    │
│                                         │
│  ┌────────────────────────────────┐    │
│  │  📅 School Events               │    │
│  │  Discover and register for      │    │
│  │  upcoming school events...      │    │
│  ├────────────────────────────────┤    │
│  │                                 │    │
│  │  🎉 Annual Sports Day           │    │
│  │  📅 December 15, 2025           │    │
│  │  ✓ Registered                   │    │
│  │  [View Ticket]                  │    │
│  │                                 │    │
│  │  🎭 Cultural Festival           │    │
│  │  📅 January 20, 2026            │    │
│  │  📝 Form Available              │    │
│  │  [Register Now]                 │    │
│  │                                 │    │
│  └────────────────────────────────┘    │
│                                         │
├─────────────────────────────────────────┤
│  🔵 Home  📝 Exam  ⭐ Activities  👤   │
│         Bottom Navigation               │
└─────────────────────────────────────────┘
```

## Color Scheme

### Light Mode
```
Background:     #FFFFFF (white)
Cards:          #FFFFFF with shadow
Active Tab:     #FFFFFF with elevated shadow
Inactive Tab:   #6B7280 (gray-600)
Border:         #E5E7EB (gray-200)
Text Primary:   #111827 (gray-900)
Text Secondary: #6B7280 (gray-600)
Accent:         #8B5CF6 (purple-500)
```

### Dark Mode
```
Background:     #111827 (gray-900)
Cards:          #1F2937 (gray-800)
Active Tab:     #374151 (gray-700)
Inactive Tab:   #9CA3AF (gray-400)
Border:         #374151 (gray-700)
Text Primary:   #FFFFFF (white)
Text Secondary: #9CA3AF (gray-400)
Accent:         #A78BFA (purple-400)
```

## Component Breakdown

### 1. Tab Navigation
```
┌──────────────────────────────────────┐
│ ╔══════════════╗  ┌──────────────┐ │
│ ║   🎪 Events  ║  │  📝 Forms    │ │
│ ╚══════════════╝  └──────────────┘ │
└──────────────────────────────────────┘
   ↑ Active         ↑ Inactive
   White bg         Gray text
   Shadow           No shadow
```

### 2. Content Header (Bilingual)
```
┌──────────────────────────────────────┐
│         📅 School Events             │
│         ព្រឹត្តិការណ៍សាលា            │
│                                      │
│  Discover and register for upcoming  │
│  school events and activities        │
└──────────────────────────────────────┘
```

### 3. Event Card
```
┌──────────────────────────────────────┐
│  ┌────────────────────────────────┐  │
│  │   [Event Banner Image]         │  │
│  └────────────────────────────────┘  │
│                                      │
│  🎉 Annual Sports Day        ✓ Reg.  │
│  📅 December 15, 2025                │
│  📝 Sports Registration Form         │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   👁️  View Ticket           │   │
│  └──────────────────────────────┘   │
└──────────────────────────────────────┘
```

### 4. Form Card
```
┌──────────────────────────────────────┐
│  📄                                   │
│  Field Trip Permission Form   [NEW]  │
│                                      │
│  📝 5 questions                      │
│  ⏰ 2 days left                      │
│                                      │
│  Status: Not Submitted        →      │
└──────────────────────────────────────┘
```

## Interaction States

### Tab Click Animation
```
Before:  [Events]  Forms
          ↓ Click
During:  ●───────  Forms  (Ripple effect)
          ↓
After:   [Events]  Forms  (Fade in content)
```

### Ripple Effect
```
Frame 1:  ● (Small circle at click point)
Frame 2:  ⦿ (Expanding)
Frame 3:  ○ (Large, fading)
Frame 4:  (Disappeared)
```

### Content Transition
```
Fade Out:  [Old Content] → 🌫️ → (Empty)
             100% opacity    0% opacity

Fade In:   (Empty) → 🌫️ → [New Content]
           0% opacity    100% opacity
           translateY(10px)  translateY(0)
```

## Responsive Breakpoints

### Mobile (< 640px)
```
┌────────────────┐
│  Full Width    │
│  Single Column │
│  Compact Tabs  │
└────────────────┘
```

### Desktop (≥ 640px)
```
┌──────────────────────────┐
│    Centered Container    │
│    Max-width: 1200px     │
│    Wider Tabs            │
└──────────────────────────┘
```

## Typography

### English
```
Title:       text-2xl font-bold (24px)
Subtitle:    text-sm (14px)
Body:        text-base (16px)
Tab Label:   text-base font-medium (16px)
```

### Khmer (khmer-font class)
```
Title:       text-2xl font-bold (24px) + khmer-font
Subtitle:    text-sm (14px) + khmer-font
Body:        text-base (16px) + khmer-font
Tab Label:   text-base font-medium (16px) + khmer-font
```

## Accessibility Features

1. **Keyboard Navigation**: Tab through elements
2. **Focus States**: Clear focus indicators
3. **Screen Reader Support**: Proper ARIA labels
4. **Color Contrast**: WCAG AA compliant
5. **Touch Targets**: Minimum 44x44px

## Animation Timeline

```
0ms:   User clicks tab
50ms:  Ripple starts expanding
200ms: Old content fades out
400ms: New content fades in
600ms: Ripple completes
```

## Example Use Cases

### Scenario 1: Student Checks Events
```
User → Opens Activities
     → Sees Events tab (default)
     → Views upcoming events
     → Clicks "Register Now"
     → Redirected to form
```

### Scenario 2: Student Completes Form
```
User → Opens Activities
     → Clicks Forms tab
     → Sees pending forms
     → Clicks on form
     → Completes submission
     → Returns to see "Approved" badge
```

### Scenario 3: Student Views Ticket
```
User → Opens Activities
     → Sees registered event
     → Clicks "View Ticket"
     → Modal shows ticket with image
     → Can download/share
```

---

**Design Language**: Modern, Clean, Bilingual
**Color Palette**: Consistent with app theme
**Interactions**: Smooth, responsive, delightful
