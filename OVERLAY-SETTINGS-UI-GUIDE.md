# Overlay Settings UI - Visual Guide

## 🎨 Main Interface

```
┌─────────────────────────────────────────────────────────────┐
│  ⚙️  Overlay Settings                              ✕       │
│      Enable or disable overlay conditions                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ ERROR   ⚠️ TOO LATE                          🔵 ON │  │
│  │                                                       │  │
│  │ PLEASE GO HOME                                        │  │
│  │ Late arrival limit exceeded                           │  │
│  │                                                       │  │
│  │ 📋 According to school policy, students arriving     │  │
│  │    after 30 minutes must return home.                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ WARNING   📝 MISSED QUIZ                     🔵 ON │  │
│  │                                                       │  │
│  │ FINISH YOUR CO-LEARNING                              │  │
│  │ You missed the quiz on October 14, 2025              │  │
│  │                                                       │  │
│  │ 📋 Students who missed the quiz must complete their  │  │
│  │    co-learning assignment. Please see your teacher.  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  2 of 2 overlays enabled                           [Done]  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔘 Toggle States

### Enabled (On)
```
┌───────────────────────────┐
│ ERROR   ⚠️ TOO LATE  🔵 │  ← Blue toggle = ON
│                           │
│ PLEASE GO HOME            │
└───────────────────────────┘
```

### Disabled (Off)
```
┌───────────────────────────┐
│ ERROR   ⚠️ TOO LATE  ⚪ │  ← Gray toggle = OFF
│                           │
│ PLEASE GO HOME            │
└───────────────────────────┘
```

---

## 🎨 Type Badges

Each overlay has a colored badge showing its type:

```
┌─────────┐
│  ERROR  │  🔴 Red background
└─────────┘

┌─────────┐
│ WARNING │  🟠 Orange background
└─────────┘

┌─────────┐
│ SUCCESS │  🟢 Green background
└─────────┘

┌─────────┐
│  INFO   │  🔵 Blue background
└─────────┘
```

---

## 🖱️ Interactions

### Hover Effect
```
Before hover:
┌────────────────────────────────┐
│ ERROR   ⚠️ TOO LATE     🔵  │
│                                │
│ Border: Light gray             │
└────────────────────────────────┘

On hover:
┌────────────────────────────────┐
│ ERROR   ⚠️ TOO LATE     🔵  │
│                                │
│ Border: Blue (highlighted)     │
└────────────────────────────────┘
```

### Click Toggle
```
Step 1: Click toggle switch
   🔵 (Blue - ON)  →  Click  →  ⚪ (Gray - OFF)

Step 2: Setting saved to localStorage
   localStorage.setItem('overlay-SEND_HOME', 'false')

Step 3: Visual feedback
   Toggle animates from blue to gray
   
Step 4: Overlay disabled
   Overlay won't show even if triggered in code
```

---

## 📱 Mobile View

```
┌───────────────────────────────┐
│ ⚙️  Overlay Settings    ✕   │
│                               │
├───────────────────────────────┤
│                               │
│ ┌─────────────────────────┐  │
│ │ ERROR                   │  │
│ │ ⚠️ TOO LATE       🔵  │  │
│ │                         │  │
│ │ PLEASE GO HOME          │  │
│ │ Late arrival limit      │  │
│ │ exceeded                │  │
│ └─────────────────────────┘  │
│                               │
│ ┌─────────────────────────┐  │
│ │ WARNING                 │  │
│ │ 📝 MISSED QUIZ    🔵  │  │
│ │                         │  │
│ │ FINISH YOUR CO-LEARNING │  │
│ │ You missed the quiz     │  │
│ └─────────────────────────┘  │
│                               │
├───────────────────────────────┤
│ 2 of 2 enabled        [Done] │
└───────────────────────────────┘
```

---

## 🎯 Opening the Settings

### Button Location
```
Face Scan Page
├── Header
├── Recognition Controls
├── [Overlay Settings] ← Click this button
├── Camera Section
└── Stats
```

### Button Design
```
┌────────────────────────────┐
│  ⚙️  Overlay Settings    │  ← Blue button with gear icon
└────────────────────────────┘
```

---

## 💾 Persistence Flow

```
User Action:
  Toggle MISSED_QUIZ OFF
         ↓
localStorage:
  Key: 'overlay-MISSED_QUIZ'
  Value: 'false'
         ↓
OVERLAY_CONFIGS:
  MISSED_QUIZ.enabled = false
         ↓
Runtime:
  Overlay won't show even if triggered
         ↓
Next Page Load:
  Settings restored from localStorage
```

---

## 🎨 Color Scheme

### Light Mode
- Background: White
- Text: Dark gray
- Borders: Light gray
- Toggle ON: Blue
- Toggle OFF: Gray
- Hover: Light blue border

### Dark Mode
- Background: Dark gray
- Text: Light gray
- Borders: Darker gray
- Toggle ON: Blue
- Toggle OFF: Gray
- Hover: Blue border

---

## 📊 Status Counter

Bottom of modal shows:
```
┌─────────────────────────────────────────┐
│ X of Y overlays enabled         [Done] │
└─────────────────────────────────────────┘

Examples:
- "0 of 2 overlays enabled" (both off)
- "1 of 2 overlays enabled" (one on)
- "2 of 2 overlays enabled" (both on)
```

---

## ✨ Animation Effects

### Modal Open
- Fade in background (200ms)
- Zoom in content (300ms)

### Toggle Switch
- Smooth color transition (200ms)
- Icon change (toggle switch / toggle switch off)

### Hover
- Border color change (150ms)
- Subtle scale effect

---

## 🔧 Usage Example

```typescript
// In page.tsx

// State
const [showOverlaySettings, setShowOverlaySettings] = useState(false);

// Button
<button onClick={() => setShowOverlaySettings(true)}>
  Overlay Settings
</button>

// Modal
{showOverlaySettings && (
  <OverlaySettings onClose={() => setShowOverlaySettings(false)} />
)}
```

---

## 📝 Settings Panel Features

✅ **Real-time updates** - Changes apply immediately
✅ **Persistent** - Saved to localStorage
✅ **Visual feedback** - Color-coded toggles
✅ **Responsive** - Works on all screen sizes
✅ **Accessible** - Clear labels and indicators
✅ **User-friendly** - Easy to understand
✅ **Professional** - Clean, modern design

---

## 🎓 Summary

The Overlay Settings UI provides:

1. **Easy Access** - Single button click
2. **Visual Control** - Toggle switches with color feedback
3. **Persistence** - Settings saved automatically
4. **Professional** - Beautiful, modern design
5. **Responsive** - Works on mobile and desktop

**Users can now control which overlays appear with just a click!** 🎉
