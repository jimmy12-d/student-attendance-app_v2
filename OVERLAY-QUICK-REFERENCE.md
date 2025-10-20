# Overlay System - Quick Reference Card

## 🚀 Add New Overlay in 3 Steps

### Step 1: Add Config (`overlayConfigs.ts`)
```typescript
YOUR_CONDITION: {
  id: 'your-condition',
  enabled: true,
  type: 'error', // error|warning|success|info
  title: '⚠️ YOUR TITLE',
  message: 'YOUR MESSAGE',
  subtitle: 'Additional info',
  showPolicyNotice: true,
  policyText: 'Your policy text here',
  dismissDelay: 3000,
  showDismissButton: true,
}
```

### Step 2: Trigger Overlay (In detection logic)
```typescript
const config = getOverlayConfig('YOUR_CONDITION');
if (config) {
  setCurrentOverlay({
    config: config,
    studentName: student.fullName
  });
}
```

### Step 3: Test!
That's it! The overlay will appear automatically.

---

## 📋 Pre-built Overlays

| ID | Type | Use Case |
|----|------|----------|
| `SEND_HOME` | Error | Student too late (>30 min) |
| `FINAL_WARNING` | Warning | Approaching cutoff time |
| `EARLY_ARRIVAL` | Info | Student arrived too early |
| `ALREADY_CHECKED_IN` | Info | Duplicate scan detected |
| `SUSPENDED` | Error | Account suspended |
| `WRONG_SHIFT` | Warning | Wrong session time |

---

## 🎨 Color Types

```typescript
type: 'error'    // 🔴 Red   - Critical issues
type: 'warning'  // 🟠 Orange - Warnings
type: 'success'  // 🟢 Green  - Success/confirmations
type: 'info'     // 🔵 Blue   - Information
```

---

## 🔧 Common Customizations

### Dynamic Subtitle
```typescript
config: {
  ...config,
  subtitle: `Late by ${minutes} minutes`
}
```

### Auto-Hide
```typescript
autoHideDelay: 5000  // Hide after 5 seconds
```

### Custom Icon
```typescript
import { mdiSchool } from '@mdi/js';

config: {
  ...config,
  icon: mdiSchool
}
```

### No Dismiss Button
```typescript
showDismissButton: false
```

---

## 📍 State Management

```typescript
// State
const [currentOverlay, setCurrentOverlay] = useState<{
  config: OverlayConfig | null;
  studentName?: string;
} | null>(null);

// Show
setCurrentOverlay({ config, studentName });

// Hide
setCurrentOverlay(null);

// Render
<OverlayTemplate
  isVisible={currentOverlay !== null}
  config={currentOverlay?.config || null}
  studentName={currentOverlay?.studentName}
  onDismiss={() => setCurrentOverlay(null)}
/>
```

---

## 🎯 Real Usage Examples

### Example 1: Send Home
```typescript
if (minutesLate > 30) {
  const config = getOverlayConfig('SEND_HOME');
  setCurrentOverlay({
    config: {
      ...config,
      subtitle: `Late by ${minutesLate} minutes`
    },
    studentName: student.fullName
  });
}
```

### Example 2: Already Checked In
```typescript
if (alreadyMarked) {
  const config = getOverlayConfig('ALREADY_CHECKED_IN');
  setCurrentOverlay({ config, studentName: student.fullName });
}
```

### Example 3: Wrong Shift
```typescript
if (currentShift !== student.shift) {
  const config = getOverlayConfig('WRONG_SHIFT');
  setCurrentOverlay({
    config: {
      ...config,
      subtitle: `Your shift: ${student.shift}, Current: ${currentShift}`
    },
    studentName: student.fullName
  });
}
```

---

## ⚙️ Helper Functions

```typescript
// Get specific config
getOverlayConfig('SEND_HOME')

// Get all enabled configs
getEnabledOverlays()

// Toggle overlay on/off
toggleOverlay('SEND_HOME', false)
```

---

## ✅ Configuration Checklist

- [ ] Unique `id` in kebab-case
- [ ] `enabled: true`
- [ ] Appropriate `type`
- [ ] Clear `title` with emoji
- [ ] Concise `message` (ALL CAPS)
- [ ] Optional `subtitle`
- [ ] `icon` specified
- [ ] `showPolicyNotice` decision
- [ ] `policyText` if needed
- [ ] `dismissDelay` configured
- [ ] `showDismissButton` decision

---

## 🐛 Debug

```typescript
// Check config exists
console.log('Config:', getOverlayConfig('MY_ID'));

// Check if enabled
console.log('Enabled:', OVERLAY_CONFIGS['MY_ID']?.enabled);

// Check current state
console.log('Current overlay:', currentOverlay);
```

---

## 📚 Full Documentation
See `OVERLAY-TEMPLATE-SYSTEM-GUIDE.md` for complete guide.
