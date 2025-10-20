# Overlay Template System - Complete Guide

A flexible, template-based overlay system that allows you to easily add, configure, and manage multiple overlay conditions for different attendance scenarios.

## 🎯 System Overview

The overlay system consists of three main components:

1. **OverlayTemplate.tsx** - The reusable visual component
2. **overlayConfigs.ts** - Centralized configuration file for all overlays
3. **Page implementation** - Simple state management in your page

## 📁 File Structure

```
app/dashboard/face-scan-faceapi/
├── components/
│   ├── OverlayTemplate.tsx      # Reusable overlay component
│   └── overlayConfigs.ts        # All overlay configurations
└── page.tsx                      # Uses the overlay system
```

## 🚀 Quick Start

### Step 1: Define Your Overlay Configurations

Edit `overlayConfigs.ts` to add or modify overlay conditions:

```typescript
export const OVERLAY_CONFIGS: Record<string, OverlayConfig> = {
  // Your overlay configurations here
  MY_NEW_CONDITION: {
    id: 'my-new-condition',
    enabled: true,
    type: 'warning',
    title: '⚠️ CUSTOM WARNING',
    message: 'YOUR MESSAGE HERE',
    subtitle: 'Additional details',
    // ... more options
  }
};
```

### Step 2: Trigger the Overlay

In your page component:

```typescript
// Show the overlay
const config = getOverlayConfig('MY_NEW_CONDITION');
if (config) {
  setCurrentOverlay({
    config: config,
    studentName: 'John Doe'  // Optional
  });
}

// Hide the overlay
setCurrentOverlay(null);
```

That's it! The overlay will automatically appear with your configuration.

## 📝 Pre-configured Overlay Conditions

The system comes with 6 ready-to-use overlay conditions:

### 1. SEND_HOME (Error - Red)
**When to use:** Student arrived too late and must go home

```typescript
const config = getOverlayConfig('SEND_HOME');
setCurrentOverlay({
  config: {
    ...config,
    subtitle: `Late by ${minutes} minutes`  // Customize subtitle
  },
  studentName: studentFullName
});
```

**Visual:** Red gradient, "Return Home" icon, policy notice

---

### 2. FINAL_WARNING (Warning - Orange)
**When to use:** Student is approaching late cutoff time

```typescript
const config = getOverlayConfig('FINAL_WARNING');
setCurrentOverlay({
  config: {
    ...config,
    subtitle: `Only ${remainingMinutes} minutes left!`
  },
  studentName: studentFullName
});
```

**Visual:** Orange gradient, warning icon, policy notice

---

### 3. EARLY_ARRIVAL (Info - Blue)
**When to use:** Student arrived before allowed entry time

```typescript
const config = getOverlayConfig('EARLY_ARRIVAL');
setCurrentOverlay({
  config: config,
  studentName: studentFullName
});
```

**Visual:** Blue gradient, clock icon, policy notice

---

### 4. ALREADY_CHECKED_IN (Info - Blue)
**When to use:** Student scanned face but already marked present

```typescript
const config = getOverlayConfig('ALREADY_CHECKED_IN');
setCurrentOverlay({
  config: config,
  studentName: studentFullName
});
```

**Visual:** Blue gradient, checkmark icon, auto-hides after 5 seconds

---

### 5. SUSPENDED (Error - Red)
**When to use:** Student's account is suspended

```typescript
const config = getOverlayConfig('SUSPENDED');
setCurrentOverlay({
  config: config,
  studentName: studentFullName
});
```

**Visual:** Red gradient, alert icon, policy notice

---

### 6. WRONG_SHIFT (Warning - Orange)
**When to use:** Student is scanning during wrong session

```typescript
const config = getOverlayConfig('WRONG_SHIFT');
setCurrentOverlay({
  config: {
    ...config,
    subtitle: `Your shift: ${studentShift}, Current: ${currentShift}`
  },
  studentName: studentFullName
});
```

**Visual:** Orange gradient, clock icon, policy notice

## ➕ Adding New Overlay Conditions

### Example: Add "NO UNIFORM" Overlay

**Step 1:** Add configuration to `overlayConfigs.ts`:

```typescript
import { mdiTshirtCrew } from '@mdi/js';  // Import icon

export const OVERLAY_CONFIGS: Record<string, OverlayConfig> = {
  // ... existing configs
  
  NO_UNIFORM: {
    id: 'no-uniform',
    enabled: true,
    type: 'warning',
    title: '👕 UNIFORM REQUIRED',
    message: 'PLEASE WEAR PROPER UNIFORM',
    subtitle: 'School dress code violation',
    icon: mdiTshirtCrew,
    showHomeIcon: false,
    showPolicyNotice: true,
    policyText: 'All students must wear proper school uniform. Please correct and return.',
    dismissDelay: 3000,
    showDismissButton: true,
  },
};
```

**Step 2:** Use it in your detection logic:

```typescript
// In face detection callback
if (studentNotWearingUniform) {
  const config = getOverlayConfig('NO_UNIFORM');
  if (config) {
    setCurrentOverlay({
      config: config,
      studentName: student.fullName
    });
  }
}
```

**Done!** The overlay will appear automatically.

## 🎨 Configuration Options

### OverlayConfig Interface

```typescript
interface OverlayConfig {
  id: string;                    // Unique identifier (kebab-case)
  enabled: boolean;              // Toggle this overlay on/off
  type: OverlayType;            // 'error' | 'warning' | 'success' | 'info'
  title: string;                // Main title (use emojis for impact!)
  message: string;              // Main message (ALL CAPS recommended)
  subtitle?: string;            // Additional details (optional)
  icon?: string;                // Custom MDI icon path (optional)
  showHomeIcon?: boolean;       // Show "Return Home" icon section
  showPolicyNotice?: boolean;   // Show policy notice box
  policyText?: string;          // Custom policy text
  dismissDelay?: number;        // Delay before dismiss button (ms)
  showDismissButton?: boolean;  // Show dismiss button
  autoHideDelay?: number;       // Auto-hide overlay (ms, optional)
}
```

### Color Types

| Type | Color | Use Case |
|------|-------|----------|
| `error` | Red | Critical issues, blocked access |
| `warning` | Orange | Warnings, approaching deadlines |
| `success` | Green | Successful actions, confirmations |
| `info` | Blue | Information, general notices |

## 🔧 Advanced Usage

### Conditional Subtitle

```typescript
const config = getOverlayConfig('SEND_HOME');
if (config) {
  setCurrentOverlay({
    config: {
      ...config,
      subtitle: cutoffTime 
        ? `Late arrival limit: ${cutoffTime}` 
        : 'Late arrival limit exceeded'
    },
    studentName: studentName
  });
}
```

### Temporary Enable/Disable

```typescript
// Temporarily disable an overlay
const config = getOverlayConfig('EARLY_ARRIVAL');
if (config) {
  setCurrentOverlay({
    config: {
      ...config,
      enabled: false  // Won't show even if triggered
    },
    studentName: studentName
  });
}
```

### Custom Icon

```typescript
import { mdiSchool } from '@mdi/js';

const config = getOverlayConfig('MY_CONDITION');
if (config) {
  setCurrentOverlay({
    config: {
      ...config,
      icon: mdiSchool  // Override default icon
    },
    studentName: studentName
  });
}
```

### Auto-Hide Overlay

```typescript
QUICK_NOTICE: {
  id: 'quick-notice',
  enabled: true,
  type: 'info',
  title: 'ℹ️ NOTICE',
  message: 'THIS WILL AUTO-HIDE',
  autoHideDelay: 3000,  // Auto-hide after 3 seconds
  showDismissButton: false  // No manual dismiss needed
}
```

## 🎯 Real-World Examples

### Example 1: Late Student with Dynamic Time

```typescript
// In attendance logic
if (minutesLate > 30) {
  const config = getOverlayConfig('SEND_HOME');
  if (config) {
    setCurrentOverlay({
      config: {
        ...config,
        subtitle: `Arrived ${minutesLate} minutes late (limit: 30 minutes)`
      },
      studentName: student.fullName
    });
  }
  
  // Record in database
  await markAttendance(student.id, 'absent', 'send-home');
}
```

### Example 2: Check Multiple Conditions

```typescript
// Check various conditions
if (student.suspended) {
  showOverlay('SUSPENDED', student.fullName);
} else if (isTooEarly) {
  showOverlay('EARLY_ARRIVAL', student.fullName);
} else if (isWrongShift) {
  const config = getOverlayConfig('WRONG_SHIFT');
  setCurrentOverlay({
    config: {
      ...config,
      subtitle: `Your shift: ${student.shift}, Current: ${currentShift}`
    },
    studentName: student.fullName
  });
} else if (alreadyCheckedIn) {
  showOverlay('ALREADY_CHECKED_IN', student.fullName);
}

// Helper function
function showOverlay(configId: string, studentName: string) {
  const config = getOverlayConfig(configId);
  if (config) {
    setCurrentOverlay({ config, studentName });
  }
}
```

### Example 3: Temperature Check Integration

```typescript
// Add new overlay for temperature
TEMPERATURE_HIGH: {
  id: 'temperature-high',
  enabled: true,
  type: 'error',
  title: '🌡️ HIGH TEMPERATURE',
  message: 'ENTRY DENIED',
  subtitle: 'Please visit the health office',
  showHomeIcon: true,
  showPolicyNotice: true,
  policyText: 'Students with fever above 37.5°C must be cleared by health office.',
  dismissDelay: 3000,
  showDismissButton: true,
}

// Use in temperature check
if (temperature > 37.5) {
  const config = getOverlayConfig('TEMPERATURE_HIGH');
  setCurrentOverlay({
    config: {
      ...config,
      subtitle: `Temperature: ${temperature}°C (Normal: < 37.5°C)`
    },
    studentName: student.fullName
  });
}
```

## 🔄 State Management

### In Your Component

```typescript
// State definition
const [currentOverlay, setCurrentOverlay] = useState<{
  config: OverlayConfig | null;
  studentName?: string;
} | null>(null);

// Render
<OverlayTemplate
  isVisible={currentOverlay !== null}
  config={currentOverlay?.config || null}
  studentName={currentOverlay?.studentName}
  onDismiss={() => {
    setCurrentOverlay(null);
    // Additional cleanup if needed
  }}
/>
```

## ✅ Best Practices

1. **Use Descriptive IDs**: `SEND_HOME`, not `overlay1`
2. **Keep Messages Concise**: Short, impactful text
3. **Use Emojis in Titles**: Visual indicators help recognition
4. **Appropriate Colors**: Match severity (error=red, warning=orange)
5. **Test Each Condition**: Ensure overlays appear correctly
6. **Disable Unused Overlays**: Set `enabled: false` instead of deleting
7. **Consistent Naming**: Use SCREAMING_SNAKE_CASE for config IDs
8. **Document Custom Overlays**: Add comments explaining when to use

## 🐛 Troubleshooting

### Overlay Not Showing

```typescript
// Debug: Check if config exists
const config = getOverlayConfig('MY_CONDITION');
console.log('Config:', config);
console.log('Config enabled:', config?.enabled);

// Debug: Check state
console.log('Current overlay:', currentOverlay);
```

### Overlay Won't Dismiss

```typescript
// Ensure onDismiss is called
<OverlayTemplate
  onDismiss={() => {
    console.log('Dismiss called');
    setCurrentOverlay(null);
  }}
/>
```

### Wrong Color Showing

```typescript
// Check type matches your intent
type: 'error'    // Red
type: 'warning'  // Orange
type: 'success'  // Green
type: 'info'     // Blue
```

## 📊 Configuration Checklist

When adding a new overlay, ensure you have:

- ✅ Unique `id` in kebab-case
- ✅ `enabled` set to `true`
- ✅ Appropriate `type` (error/warning/success/info)
- ✅ Clear, concise `title`
- ✅ Impactful `message`
- ✅ Optional but helpful `subtitle`
- ✅ Icon specified (or use default)
- ✅ `showHomeIcon` decision
- ✅ `showPolicyNotice` decision
- ✅ `policyText` if showing policy
- ✅ `dismissDelay` configured
- ✅ `showDismissButton` decision
- ✅ `autoHideDelay` if needed

## 🎓 Summary

The overlay template system provides:

- ✨ **Easy to Add**: Just add a config object
- 🎨 **Beautiful**: Professional gradients and animations
- 🔧 **Flexible**: Customize every aspect
- 📱 **Responsive**: Works on mobile and desktop
- ♿ **Accessible**: Clear visual hierarchy
- 🚀 **Performant**: Single overlay instance, swappable configs
- 🎯 **Centralized**: All configs in one place

**Add new conditions in 30 seconds or less!**
