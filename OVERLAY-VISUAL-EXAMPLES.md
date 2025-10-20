# Overlay Template System - Visual Examples

This document shows what each pre-configured overlay looks like.

---

## 🔴 SEND_HOME (Error - Red)

```
┌────────────────────────────────────────────────┐
│                                                │
│              ⚠️ (pulsing red)                  │
│                                                │
│           ⚠️ TOO LATE                         │
│                                                │
│           John Smith                           │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │      PLEASE GO HOME                      │ │
│  │                                          │ │
│  │  🕐 Late arrival limit: 30 minutes      │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│            🏠 Return Home                      │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ According to school policy, students     │ │
│  │ arriving after 30 minutes must return    │ │
│  │ home.                                    │ │
│  └──────────────────────────────────────────┘ │
│                                   [Dismiss]    │
└────────────────────────────────────────────────┘
```

**Colors:** Red gradient background, white text
**Use Case:** Student arrived too late (>30 minutes)

---

## 🟠 FINAL_WARNING (Warning - Orange)

```
┌────────────────────────────────────────────────┐
│                                                │
│              ⚠️ (pulsing orange)               │
│                                                │
│           ⏰ FINAL WARNING                     │
│                                                │
│           Jane Doe                             │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │      LAST CHANCE TO ENTER                │ │
│  │                                          │ │
│  │  🕐 Cutoff time approaching              │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ You have less than 5 minutes before late │ │
│  │ arrival cutoff. Please hurry!            │ │
│  └──────────────────────────────────────────┘ │
│                                   [Dismiss]    │
└────────────────────────────────────────────────┘
```

**Colors:** Orange gradient background, white text
**Use Case:** Student approaching late cutoff time (25-30 minutes late)

---

## 🔵 EARLY_ARRIVAL (Info - Blue)

```
┌────────────────────────────────────────────────┐
│                                                │
│              🕐 (pulsing blue)                 │
│                                                │
│           🕐 TOO EARLY                        │
│                                                │
│           Bob Wilson                           │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │      PLEASE WAIT OUTSIDE                 │ │
│  │                                          │ │
│  │  🕐 Classes have not started yet         │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Students are not allowed to enter before │ │
│  │ 7:00 AM. Please wait in the designated   │ │
│  │ area.                                    │ │
│  └──────────────────────────────────────────┘ │
│                                   [Dismiss]    │
└────────────────────────────────────────────────┘
```

**Colors:** Blue gradient background, white text
**Use Case:** Student arrived before allowed entry time (before 7:00 AM)

---

## 🔵 ALREADY_CHECKED_IN (Info - Blue)

```
┌────────────────────────────────────────────────┐
│                                                │
│              ✅ (pulsing blue)                 │
│                                                │
│           ✅ ALREADY CHECKED IN               │
│                                                │
│           Alice Johnson                        │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │      ATTENDANCE RECORDED                 │ │
│  │                                          │ │
│  │  🕐 You have already been marked present │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                   [Dismiss]    │
└────────────────────────────────────────────────┘
```

**Colors:** Blue gradient background, white text
**Use Case:** Student scanned face but already marked present today
**Special:** Auto-hides after 5 seconds

---

## 🔴 SUSPENDED (Error - Red)

```
┌────────────────────────────────────────────────┐
│                                                │
│              🚫 (pulsing red)                  │
│                                                │
│           🚫 ACCESS DENIED                    │
│                                                │
│           Tom Brown                            │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │      PLEASE CONTACT ADMINISTRATION       │ │
│  │                                          │ │
│  │  🕐 Account suspended                    │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Your account has been temporarily        │ │
│  │ suspended. Please visit the              │ │
│  │ administration office.                   │ │
│  └──────────────────────────────────────────┘ │
│                                   [Dismiss]    │
└────────────────────────────────────────────────┘
```

**Colors:** Red gradient background, white text
**Use Case:** Student's account is suspended

---

## 🟠 WRONG_SHIFT (Warning - Orange)

```
┌────────────────────────────────────────────────┐
│                                                │
│              ⚠️ (pulsing orange)               │
│                                                │
│           ⚠️ WRONG SHIFT                      │
│                                                │
│           Sarah Lee                            │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │                                          │ │
│  │      NOT YOUR SESSION TIME               │ │
│  │                                          │ │
│  │  🕐 Please come during your scheduled    │ │
│  │     shift                                │ │
│  │                                          │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ You are registered for a different       │ │
│  │ session. Please check your schedule.     │ │
│  └──────────────────────────────────────────┘ │
│                                   [Dismiss]    │
└────────────────────────────────────────────────┘
```

**Colors:** Orange gradient background, white text
**Use Case:** Student scanning during wrong shift/session

---

## 🎨 Color Scheme Summary

### Error (Red) 🔴
- **Background:** Red-600 → Red-700 → Red-800 gradient
- **Border:** Red-400 with 50% opacity
- **Use For:** Critical issues, access denied, must go home
- **Overlays:** SEND_HOME, SUSPENDED

### Warning (Orange) 🟠
- **Background:** Orange-500 → Orange-600 → Orange-700 gradient
- **Border:** Orange-400 with 50% opacity
- **Use For:** Warnings, approaching limits, incorrect actions
- **Overlays:** FINAL_WARNING, WRONG_SHIFT

### Success (Green) 🟢
- **Background:** Green-600 → Green-700 → Green-800 gradient
- **Border:** Green-400 with 50% opacity
- **Use For:** Successful actions, confirmations, approvals
- **Overlays:** (Add your own success overlays)

### Info (Blue) 🔵
- **Background:** Blue-600 → Blue-700 → Blue-800 gradient
- **Border:** Blue-400 with 50% opacity
- **Use For:** Information, notices, status updates
- **Overlays:** EARLY_ARRIVAL, ALREADY_CHECKED_IN

---

## 📐 Layout Components

Each overlay consists of:

1. **Pulsing Icon** (top center)
   - Animated ping effect
   - White circle background
   - Colored icon based on type

2. **Title** (large, bold)
   - 4xl-5xl font size
   - Often includes emoji
   - White text with drop shadow

3. **Student Name** (optional)
   - 2xl-3xl font size
   - Semi-bold weight
   - Lighter shade of white

4. **Content Box** (main message)
   - Semi-transparent background
   - Rounded corners with border
   - Contains message and subtitle

5. **Icon Section** (optional)
   - "Return Home" icon for send-home cases
   - Only shown when `showHomeIcon: true`

6. **Policy Notice** (optional)
   - Bottom box with policy text
   - Only shown when `showPolicyNotice: true`
   - Rounded corners with border

7. **Dismiss Button** (top-right)
   - Appears after delay (default: 3 seconds)
   - Semi-transparent white background
   - Hover effect with scale

---

## 🎭 Animation Effects

- **Fade In:** Entire overlay fades in (300ms)
- **Zoom In:** Content scales up from 95% to 100% (500ms)
- **Ping:** Icon has pulsing animation (continuous)
- **Hover:** Dismiss button scales up 5% on hover

---

## 📱 Responsive Behavior

### Desktop (md and up)
- Text: 5xl title, 3xl student name, 2xl message
- Max width: 2xl (672px)
- Padding: 8 units

### Mobile
- Text: 4xl title, 2xl student name, xl message
- Max width: Full width with margin
- Padding: 8 units
- All text scales appropriately

---

## ⚡ Performance Notes

- Single overlay instance (not multiple components)
- Config-based approach (very lightweight)
- CSS animations (hardware accelerated)
- Lazy rendering (only when visible)

---

## 🎯 Accessibility

- High contrast colors
- Large, readable text
- Clear visual hierarchy
- Keyboard dismissible (ESC key support can be added)
- Screen reader friendly (semantic HTML)

---

## 💡 Tips for Custom Overlays

1. **Choose the right color:**
   - Red: Critical/blocking issues
   - Orange: Warnings/cautions
   - Green: Success/confirmations
   - Blue: Information/notices

2. **Keep text concise:**
   - Title: 2-4 words
   - Message: 2-5 words
   - Subtitle: 1 sentence
   - Policy: 1-2 sentences

3. **Use emojis wisely:**
   - One emoji in title is impactful
   - Too many emojis look unprofessional

4. **Test on mobile:**
   - Ensure text is readable
   - Check that overlay fits on screen

5. **Consider timing:**
   - Critical messages: Longer display
   - Info messages: Can auto-hide
   - Adjust `dismissDelay` and `autoHideDelay`
