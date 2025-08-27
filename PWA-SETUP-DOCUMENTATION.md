# PWA Navigation System Documentation

## Overview
This PWA system prevents the app from breaking out of standalone mode when navigating between pages, particularly from `/login` to `/student/attendance`.

## Components Created

### 1. Next.js Configuration (`next.config.ts`)
- Configured `next-pwa` with custom caching strategies
- Network-first caching for API requests (Firestore)
- Cached critical pages: `/login` and `/student/attendance`
- Custom worker directory for enhanced service worker

### 2. Custom Service Worker (`worker/index.js`)
- Handles client-side navigation within PWA context
- Caches critical pages for offline functionality
- Network-first strategy for API requests
- Prevents breaking out of standalone mode during navigation

### 3. PWA Installer Component (`app/_components/PWAInstaller.tsx`)
- Registers service worker automatically
- Handles PWA installation prompts
- Manages service worker updates
- Pre-caches critical routes

### 4. PWA Navigation Hook (`app/_hooks/usePWANavigation.ts`)
- `usePWANavigation()`: Provides PWA-aware navigation functions
- `usePWAStatus()`: Detects PWA installation status and display mode
- Ensures navigation stays within PWA context

### 5. PWA Link Components (`app/_components/PWALink.tsx`)
- `PWALink`: Drop-in replacement for Next.js Link component
- `PWAButton`: PWA-aware button for navigation actions
- Prevents external navigation from breaking PWA context

### 6. Middleware (`middleware.ts`)
- Adds PWA-related security headers
- Handles root path redirections
- Manages cache headers for PWA pages

### 7. Enhanced Manifest (`public/manifest.json`)
- Added scope and shortcuts
- Improved PWA metadata
- Quick access shortcuts for login and home

## Usage Examples

### Using PWA Navigation Hook
```tsx
import { usePWANavigation } from '../_hooks/usePWANavigation';

function MyComponent() {
  const { navigateWithinPWA, isStandalone } = usePWANavigation();
  
  const handleLogin = () => {
    // Navigate to attendance page while preserving PWA context
    navigateWithinPWA('/student/attendance');
  };
  
  if (isStandalone()) {
    console.log('Running in PWA mode');
  }
}
```

### Using PWA Link Component
```tsx
import { PWALink } from '../_components/PWALink';

function Navigation() {
  return (
    <PWALink href="/student/attendance" className="nav-link">
      Go to Dashboard
    </PWALink>
  );
}
```

### Checking PWA Status
```tsx
import { usePWAStatus } from '../_hooks/usePWANavigation';

function AppStatus() {
  const { isInstalled, displayMode, isStandalone } = usePWAStatus();
  
  return (
    <div>
      <p>PWA Installed: {isInstalled ? 'Yes' : 'No'}</p>
      <p>Display Mode: {displayMode}</p>
      <p>Standalone: {isStandalone ? 'Yes' : 'No'}</p>
    </div>
  );
}
```

## How It Prevents Breaking Out of PWA

1. **Service Worker Navigation Handling**: The custom service worker intercepts navigation requests and ensures they're handled within the PWA context.

2. **Client-Side Routing**: All internal navigation uses Next.js router instead of full page reloads, maintaining the PWA shell.

3. **Scope Management**: The manifest scope is set to "/" and the service worker is configured to handle all same-origin requests.

4. **Cache Strategy**: Critical pages are cached and served quickly, reducing the need for external navigation.

5. **External Link Handling**: External links are opened in the system browser, preserving the PWA context for internal navigation.

## Testing the Implementation

1. **Build the application**:
   ```bash
   npm run build
   npm start
   ```

2. **Install as PWA**:
   - Open in Chrome/Edge
   - Look for "Install app" option in address bar
   - Install the PWA

3. **Test Navigation**:
   - Open PWA from home screen/app menu
   - Navigate from login to home
   - Verify app stays in standalone mode
   - Check that the URL bar doesn't reappear

4. **Test Offline Functionality**:
   - Disconnect internet
   - Navigate between cached pages
   - Verify offline functionality works

## Key Files Modified/Created

- `next.config.ts` - PWA configuration
- `worker/index.js` - Custom service worker
- `app/_components/PWAInstaller.tsx` - Service worker registration
- `app/_hooks/usePWANavigation.ts` - Navigation hooks
- `app/_components/PWALink.tsx` - PWA-aware components
- `app/layout.tsx` - Added PWA installer
- `middleware.ts` - PWA middleware
- `public/manifest.json` - Enhanced manifest

This system ensures that once users install your PWA and navigate from login to home, they remain in the standalone PWA context without breaking out to the browser.
