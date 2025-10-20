# SendHomeOverlay Component - Template Usage Guide

The `SendHomeOverlay` component has been refactored into a flexible, template-based overlay that can display different types of messages with customizable colors, icons, and content.

## Features

- ✅ **Enable/Disable Control**: Toggle overlay functionality with `enabled` prop
- 🎨 **4 Color Schemes**: Error (red), Warning (orange), Success (green), Info (blue)
- 📝 **Customizable Messages**: Configure title, message, subtitle, and student name
- 🔔 **Flexible Icons**: Use default icons or provide custom MDI icons
- ⏱️ **Configurable Dismiss**: Control dismiss button visibility and delay

## Props Interface

```typescript
interface SendHomeOverlayProps {
  isVisible: boolean;        // Show/hide the overlay
  enabled?: boolean;          // Enable/disable functionality (default: true)
  type?: OverlayType;        // 'error' | 'warning' | 'success' | 'info' (default: 'error')
  title?: string;            // Main title text (default: '⚠️ TOO LATE')
  studentName?: string;      // Student name to display
  message?: string;          // Main message content (default: 'PLEASE GO HOME')
  subtitle?: string;         // Additional subtitle/details
  icon?: string;             // Custom MDI icon path (optional)
  showDismissButton?: boolean; // Show dismiss button (default: true)
  dismissDelay?: number;     // Delay before showing dismiss button in ms (default: 3000)
  onDismiss?: () => void;    // Callback when dismissed
}
```

## Usage Examples

### Example 1: Error - Late Arrival (Send Home)
```tsx
<SendHomeOverlay
  isVisible={showSendHomeOverlay}
  enabled={true}
  type="error"
  title="⚠️ TOO LATE"
  studentName="John Smith"
  message="PLEASE GO HOME"
  subtitle="Late arrival limit: 30 minutes exceeded"
  showDismissButton={true}
  dismissDelay={3000}
  onDismiss={() => {
    setShowSendHomeOverlay(false);
  }}
/>
```

### Example 2: Warning - Last Chance
```tsx
<SendHomeOverlay
  isVisible={showWarning}
  enabled={true}
  type="warning"
  title="⏰ FINAL WARNING"
  studentName="Jane Doe"
  message="LAST CHANCE TO ENTER"
  subtitle="Cutoff time in 5 minutes"
  showDismissButton={true}
  dismissDelay={2000}
  onDismiss={() => setShowWarning(false)}
/>
```

### Example 3: Success - Check-in Confirmed
```tsx
<SendHomeOverlay
  isVisible={showSuccess}
  enabled={true}
  type="success"
  title="✅ WELCOME"
  studentName="Alice Johnson"
  message="CHECK-IN SUCCESSFUL"
  subtitle="Attendance recorded at 8:15 AM"
  showDismissButton={true}
  dismissDelay={2000}
  onDismiss={() => setShowSuccess(false)}
/>
```

### Example 4: Info - Event Notification
```tsx
<SendHomeOverlay
  isVisible={showInfo}
  enabled={true}
  type="info"
  title="ℹ️ EVENT REMINDER"
  studentName="Bob Wilson"
  message="ASSEMBLY IN 10 MINUTES"
  subtitle="Please proceed to the main hall"
  showDismissButton={true}
  dismissDelay={5000}
  onDismiss={() => setShowInfo(false)}
/>
```

### Example 5: Disabled Overlay (Testing)
```tsx
<SendHomeOverlay
  isVisible={true}
  enabled={false}  // Won't render even though isVisible is true
  type="error"
  title="This won't show"
  message="Overlay is disabled"
/>
```

## Color Schemes

### Error (Red)
- Use for: Critical issues, send home notices, blocked access
- Gradient: Red-600 → Red-700 → Red-800
- Shows: "Return Home" icon and policy notice

### Warning (Orange)
- Use for: Warnings, approaching deadlines, cautions
- Gradient: Orange-500 → Orange-600 → Orange-700
- Shows: Policy notice

### Success (Green)
- Use for: Successful check-ins, confirmations, approvals
- Gradient: Green-600 → Green-700 → Green-800
- Clean design without policy notice

### Info (Blue)
- Use for: General information, announcements, reminders
- Gradient: Blue-600 → Blue-700 → Blue-800
- Clean design without policy notice

## Controlling the Overlay

### In Component State
```typescript
const [showSendHomeOverlay, setShowSendHomeOverlay] = useState(false);
const [sendHomeOverlayEnabled, setSendHomeOverlayEnabled] = useState(true);
const [sendHomeStudent, setSendHomeStudent] = useState<{ 
  name: string; 
  cutoff?: string 
} | null>(null);
```

### Triggering the Overlay
```typescript
// Show overlay for late student
setSendHomeStudent({ 
  name: "John Doe", 
  cutoff: "30 minutes" 
});
setShowSendHomeOverlay(true);
```

### Disabling Globally
```typescript
// Toggle enable/disable
setSendHomeOverlayEnabled(false);  // Overlay won't show
setSendHomeOverlayEnabled(true);   // Overlay can show
```

## Customization Tips

1. **Custom Icons**: Import any MDI icon and pass the path:
   ```tsx
   import { mdiSchool } from '@mdi/js';
   
   <SendHomeOverlay
     icon={mdiSchool}
     // ... other props
   />
   ```

2. **Longer Dismiss Delay**: For important messages:
   ```tsx
   dismissDelay={10000}  // 10 seconds
   ```

3. **No Dismiss Button**: For forced viewing:
   ```tsx
   showDismissButton={false}
   // User must wait for your code to hide it
   ```

4. **Dynamic Messages**: Build messages programmatically:
   ```tsx
   subtitle={
     cutoffMinutes > 0 
       ? `Late by ${cutoffMinutes} minutes` 
       : 'On time'
   }
   ```

## Best Practices

1. ✅ Always provide `onDismiss` callback to clean up state
2. ✅ Use appropriate `type` for the situation
3. ✅ Keep `title` and `message` concise
4. ✅ Use `subtitle` for additional context
5. ✅ Test with `enabled={false}` during development
6. ✅ Consider dismissDelay based on message importance

## Migration from Old Version

**Old Usage:**
```tsx
<SendHomeOverlay
  isVisible={showSendHomeOverlay}
  studentName={sendHomeStudent?.name || ''}
  sendHomeCutoff={sendHomeStudent?.cutoff}
  onDismiss={() => {}}
/>
```

**New Usage:**
```tsx
<SendHomeOverlay
  isVisible={showSendHomeOverlay}
  enabled={true}
  type="error"
  title="⚠️ TOO LATE"
  studentName={sendHomeStudent?.name || ''}
  message="PLEASE GO HOME"
  subtitle={sendHomeStudent?.cutoff ? `Late arrival limit: ${sendHomeStudent.cutoff}` : 'Late arrival limit exceeded'}
  showDismissButton={true}
  dismissDelay={3000}
  onDismiss={() => {}}
/>
```

## Notes

- The overlay uses `z-index: 9999` to appear above all content
- Animation includes fade-in and zoom-in effects
- Background has black overlay with blur effect
- Pulsing animation on the icon draws attention
- Responsive design works on mobile and desktop
