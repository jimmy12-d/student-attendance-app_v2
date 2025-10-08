# Student Approval Status UI - Visual Guide

## Form Status Visual States

### Active Form (Not Submitted)
```
┌────────────────────────────────────────────────┐
│                              [Urgent]  ← Red   │
│  ┌────┐                                        │
│  │ 📝 │  Weekly Survey              [►]        │
│  └────┘  • 2h 30m left                         │
│  Blue    • 10 questions                        │
└────────────────────────────────────────────────┘
```

---

## Submitted Forms (WITH Approval Required)

### Approved Status
```
┌────────────────────────────────────────────────┐
│                       [🛡️ Approved] ← Green    │
│  ┌────┐                                        │
│  │ 🛡️ │  Weekly Survey                         │
│  └────┘  • Approved                            │
│  Green   • 10 questions                        │
│  Border                                        │
└────────────────────────────────────────────────┘

Colors:
- Badge: Green background, white text
- Border: Light green
- Icon: Green shield on green gradient
- Dot: Green
- Text: "Approved" in green
```

### Rejected Status
```
┌────────────────────────────────────────────────┐
│                        [❌ Rejected] ← Red      │
│  ┌────┐                                        │
│  │ ❌ │  Weekly Survey                         │
│  └────┘  • Rejected                            │
│  Red     • 10 questions                        │
│  Border                                        │
└────────────────────────────────────────────────┘

Colors:
- Badge: Red background, white text
- Border: Light red
- Icon: Red X on red gradient
- Dot: Red
- Text: "Rejected" in red
```

### Pending Review Status
```
┌────────────────────────────────────────────────┐
│                    [⏰ Pending] ← Orange        │
│  ┌────┐                                        │
│  │ ⏰ │  Weekly Survey                         │
│  └────┘  • Pending Review                      │
│  Orange  • 10 questions                        │
│  Border                                        │
└────────────────────────────────────────────────┘

Colors:
- Badge: Orange background, white text
- Border: Light orange
- Icon: Orange clock on orange gradient
- Dot: Orange
- Text: "Pending Review" in orange
```

---

## Submitted Forms (WITHOUT Approval Required)

### Completed Status
```
┌────────────────────────────────────────────────┐
│                           [✅ Done] ← Green     │
│  ┌────┐                                        │
│  │ ✅ │  Class Register                        │
│  └────┘  • Completed                           │
│  Green   • 5 questions                         │
│  Border                                        │
└────────────────────────────────────────────────┘

Colors:
- Badge: Green background, white text
- Border: Light green
- Icon: Green check on green gradient
- Dot: Green
- Text: "Completed" in green
```

---

## Side-by-Side Comparison

### All Status Types
```
┌─────────────────────────────────────────────────────────────────┐
│  Active Forms                                              [3]  │
│                                                                 │
│  ┌──────────────────────────────────┐ [⏰ Pending]            │
│  │ ⏰  Survey Form                  │  Orange badge            │
│  │    • Pending Review • 8 questions│                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ┌──────────────────────────────────┐ [🛡️ Approved]           │
│  │ 🛡️  Feedback Form                │  Green badge             │
│  │    • Approved • 12 questions     │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ┌──────────────────────────────────┐ [❌ Rejected]            │
│  │ ❌  Mock Register                │  Red badge               │
│  │    • Rejected • 5 questions      │                          │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ┌──────────────────────────────────┐ [✅ Done]                │
│  │ ✅  Class Register               │  Green badge             │
│  │    • Completed • 5 questions     │  (No approval)           │
│  └──────────────────────────────────┘                          │
│                                                                 │
│  ┌──────────────────────────────────┐ [Urgent]                 │
│  │ 📝  New Survey                   │  Red badge (pulsing)     │
│  │    • 1h 30m left • 10 questions  │  (Not submitted)         │
│  └──────────────────────────────────┘                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Color Palette

### Approved (Green Theme)
```
┌──────────────────────────────────────┐
│ Badge Background:    #10B981 (green) │
│ Border Light:        #BBF7D0         │
│ Border Dark:         #15803D         │
│ Icon Gradient From:  #10B981 (green) │
│ Icon Gradient To:    #059669 (emer.) │
│ Status Dot:          #10B981         │
│ Text Light:          #16A34A         │
│ Text Dark:           #4ADE80         │
└──────────────────────────────────────┘
```

### Rejected (Red Theme)
```
┌──────────────────────────────────────┐
│ Badge Background:    #EF4444 (red)   │
│ Border Light:        #FECACA         │
│ Border Dark:         #991B1B         │
│ Icon Gradient From:  #EF4444 (red)   │
│ Icon Gradient To:    #F43F5E (rose)  │
│ Status Dot:          #EF4444         │
│ Text Light:          #DC2626         │
│ Text Dark:           #F87171         │
└──────────────────────────────────────┘
```

### Pending (Orange Theme)
```
┌──────────────────────────────────────┐
│ Badge Background:    #F97316 (orange)│
│ Border Light:        #FED7AA         │
│ Border Dark:         #C2410C         │
│ Icon Gradient From:  #F97316 (orang.)│
│ Icon Gradient To:    #F59E0B (amber) │
│ Status Dot:          #F97316         │
│ Text Light:          #EA580C         │
│ Text Dark:           #FB923C         │
└──────────────────────────────────────┘
```

---

## Icon Reference

### Badge Icons
```
Approved:  🛡️  mdiShieldCheck
Rejected:  ❌  mdiCloseCircle
Pending:   ⏰  mdiClockOutline
Done:      ✅  mdiCheckCircle
Active:    📝  mdiFormSelect
Urgent:    ⏰  mdiClockOutline
```

### Icon Sizes
```
Badge Icon:     12px
Card Icon:      26px (1.625rem)
Status Dot:     6px (1.5 × 1.5 rounded-full)
```

---

## Animation States

### Badge Animations
```css
/* Approved - Static */
.approved-badge {
  animation: none;
  transition: all 0.2s ease;
}

/* Rejected - Static */
.rejected-badge {
  animation: none;
  transition: all 0.2s ease;
}

/* Pending - Static (no animation) */
.pending-badge {
  animation: none;
  transition: all 0.2s ease;
}

/* Urgent - Pulsing (for unsubmitted) */
.urgent-badge {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
```

### Card Interactions
```css
/* Hover - Subtle shadow increase */
.form-card:hover {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
}

/* Active/Press - Scale down */
.form-card:active {
  transform: scale(0.98);
  transition: transform 0.15s;
}

/* Swipe - Smooth translation */
.form-card.swiping {
  transform: translateX(-Xpx);
  transition: none; /* Real-time movement */
}
```

---

## Responsive Behavior

### Mobile (Default)
```
┌─────────────────────────┐
│  Active Forms      [3] │
│                         │
│  [Form Card]           │ ← Full width
│  Badge: Visible        │
│  Border: 2px           │
│  Icon: 64px            │
│                         │
└─────────────────────────┘
```

### Tablet (md breakpoint)
```
┌───────────────────────────────┐
│  Active Forms            [3] │
│                               │
│  [Form Card]                 │ ← Wider
│  Badge: Larger text          │
│  Border: 2px                 │
│  Icon: 64px                  │
│                               │
└───────────────────────────────┘
```

### Desktop (lg breakpoint)
```
┌─────────────────────────────────────┐
│  Active Forms                  [3] │
│                                     │
│  [Form Card]                       │ ← Max width
│  Badge: Larger text                │
│  Border: 2px                       │
│  Icon: 64px                        │
│                                     │
└─────────────────────────────────────┘
```

---

## State Transition Diagram

```
[Not Submitted]
      │
      │ Student submits
      ▼
[Pending Review] ─────────────────────┐
  Orange badge                        │
  Orange border                       │
      │                               │
      │ Admin reviews                 │
      │                               │
   ┌──┴──┐                            │
   │     │                            │
   ▼     ▼                            │
[Approved]  [Rejected]                │
Green       Red                       │
badge       badge                     │
   │         │                        │
   │         │ Admin deletes response │
   │         │                        │
   └────┬────┴────────────────────────┘
        │
        ▼
[Back to Not Submitted]
```

---

## Dark Mode Variations

### Light Mode
```
Background:    white/95 (#FFFFFF + 95% opacity)
Text:          gray-900 (#111827)
Border:        Colored + /80 opacity
Status Text:   Colored (bright)
```

### Dark Mode
```
Background:    slate-800/95 (#1E293B + 95% opacity)
Text:          white (#FFFFFF)
Border:        Colored + dark variant
Status Text:   Colored (light variant)
```

---

## Badge Component Breakdown

### Approved Badge
```tsx
<div className="
  flex items-center gap-1 
  px-2 py-1 
  bg-green-500 
  text-white 
  text-xs 
  font-medium 
  rounded-full 
  shadow-sm
">
  <Icon path={mdiShieldCheck} size={12} />
  Approved
</div>
```

### Rejected Badge
```tsx
<div className="
  flex items-center gap-1 
  px-2 py-1 
  bg-red-500 
  text-white 
  text-xs 
  font-medium 
  rounded-full 
  shadow-sm
">
  <Icon path={mdiCloseCircle} size={12} />
  Rejected
</div>
```

### Pending Badge
```tsx
<div className="
  flex items-center gap-1 
  px-2 py-1 
  bg-orange-500 
  text-white 
  text-xs 
  font-medium 
  rounded-full 
  shadow-sm
">
  <Icon path={mdiClockOutline} size={12} />
  Pending
</div>
```

---

## Real-World Examples

### Student Dashboard View
```
╔══════════════════════════════════════════════════════════╗
║  Welcome back, John!                                     ║
║                                                          ║
║  Quick Actions                                           ║
║  [📊 Attendance] [📝 Forms] [📚 Resources]              ║
║                                                          ║
║  ─────────────────────────────────────────────────────  ║
║                                                          ║
║  Active Forms                                       [4] ║
║                                                          ║
║  ┌────────────────────────────────┐ [⏰ Pending]        ║
║  │ ⏰ Weekly Feedback             │                      ║
║  │   • Pending Review             │                      ║
║  │   • 10 questions               │                      ║
║  └────────────────────────────────┘                      ║
║                                                          ║
║  ┌────────────────────────────────┐ [🛡️ Approved]       ║
║  │ 🛡️ January Survey              │                      ║
║  │   • Approved                   │                      ║
║  │   • 15 questions               │                      ║
║  └────────────────────────────────┘                      ║
║                                                          ║
║  ┌────────────────────────────────┐ [❌ Rejected]        ║
║  │ ❌ Class Register              │                      ║
║  │   • Rejected                   │                      ║
║  │   • 5 questions                │                      ║
║  └────────────────────────────────┘                      ║
║                                                          ║
║  ┌────────────────────────────────┐ [Urgent]            ║
║  │ 📝 New Survey                  │                      ║
║  │   • 2h 15m left                │                      ║
║  │   • 12 questions               │                      ║
║  └────────────────────────────────┘                      ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

---

## Summary

This visual guide demonstrates:
- **5 distinct visual states** for forms
- **Color-coded system** for instant recognition
- **Consistent iconography** across all states
- **Responsive design** that works on all devices
- **Smooth transitions** between states
- **Accessibility-friendly** color contrast

The enhanced UI provides clear, immediate feedback to students about their form submission status!
