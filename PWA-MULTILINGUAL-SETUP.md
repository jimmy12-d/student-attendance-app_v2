# Student PWA Multi-Language Setup Guide

## Overview
The student PWA now supports both English and Khmer languages with seamless switching capabilities while maintaining PWA functionality. The language selector has been moved to the Account page, and new users will be greeted with an onboarding language selection screen.

## Features Implemented

### 1. Language Provider
- **Location**: `/app/_components/LocaleProvider.tsx`
- **Function**: Manages language state and provides translations to all components
- **Storage**: User language preference is saved to localStorage
- **Fallback**: Automatically falls back to English if translations fail to load
- **Onboarding**: Tracks whether user has completed language selection

### 2. Onboarding Language Selector
- **Location**: `/app/student/_components/OnboardingLanguageSelector.tsx`
- **Triggers**: Shows for new users who haven't completed language onboarding
- **Features**:
  - Beautiful full-screen language selection interface
  - Flag icons for visual language identification
  - Animated transitions and feedback
  - Skip option for users who prefer default language
  - Automatic completion tracking

### 3. Updated Student Layout
- **Location**: `/app/student/layout.tsx`
- **Changes**: 
  - Wrapped with `LocaleProvider` component
  - Integrated `StudentLayoutContent` for onboarding management
  - Supports font switching between Inter (English) and Nokora (Khmer)
  - Maintains all existing PWA functionality

### 4. Language Selector in Account Page
- **Location**: `/app/student/account/page.tsx`
- **Updates**: 
  - Added language selector in the Preferences section
  - Full-featured language switcher with proper styling
  - Integrated with account settings UI
  - **Removed from top navigation** for cleaner interface

### 5. Translated Components

#### Student Top Navigation
- **Location**: `/app/student/_components/StudentTopNav.tsx`
- **Updates**: 
  - **Language selector removed** from top navigation
  - Uses translated text for "Student Portal" → "ផ្ទាំងបញ្ជាសិស្ស"
  - Cleaner interface focusing on notifications

#### Student Bottom Navigation
- **Location**: `/app/student/_components/StudentBottomNav.tsx`
- **Updates**:
  - Navigation items now use translation keys
  - English: Home, Mock Exam, Account
  - Khmer: ទំព័រដើម, តេស្តសាកល្បង, គណនី

#### Student Main Page
- **Location**: `/app/student/page.tsx`
- **Updates**:
  - Loading text now translates
  - English: "Loading..."
  - Khmer: "កំពុងផ្ទុក..."

## User Experience Flow

### For New Users:
1. **First Visit**: Presented with onboarding language selection screen
2. **Language Choice**: Select between English (🇺🇸) and Khmer (🇰🇭)
3. **Confirmation**: Choice is saved and onboarding is marked complete
4. **Normal Usage**: Access all features in selected language

### For Returning Users:
1. **Automatic**: Previous language preference is loaded
2. **Settings Access**: Change language via Account > Preferences > Language
3. **Immediate Switch**: Language updates instantly without page reload

### For Testing/Development:
1. **Reset Onboarding**: Use "Reset Language Onboarding" button in Account page
2. **Re-experience Flow**: Test the onboarding process again
3. **Quick Switching**: Change languages easily in account settings

## Language Files

### English (`/locales/en.json`)
Contains comprehensive translations for:
- Navigation items
- Student dashboard elements
- Attendance system
- Mock exam interface
- Account settings
- Error messages
- Notifications
- Common actions (logout, loading, etc.)

### Khmer (`/locales/kh.json`)
Complete Khmer translations covering:
- ការនាំផ្លូវ (Navigation)
- ផ្ទាំងបញ្ជាសិស្ស (Student Dashboard)
- វត្តមាន (Attendance)
- តេស្តសាកល្បង (Mock Exam)
- គណនី (Account)
- សារកំហុស (Error Messages)
- ការជូនដំណឹង (Notifications)
- សកម្មភាពទូទៅ (Common actions)

## How to Use

### For Students:
1. **First Time**: Complete language selection on first visit
2. **Change Language**: Go to Account > Preferences > Language
3. **Switch Instantly**: Language changes immediately
4. **Persistent**: Preference saved for future visits

### For Developers:
1. Use `useTranslations()` hook in components:
   ```tsx
   const t = useTranslations('student.attendance');
   return <h1>{t('title')}</h1>; // "Attendance" or "វត្តមាន"
   ```

2. Add new translations to both language files:
   ```json
   // en.json
   "newFeature": {
     "title": "New Feature"
   }
   
   // kh.json
   "newFeature": {
     "title": "មុខងារថ្មី"
   }
   ```

3. Reset onboarding for testing:
   ```javascript
   localStorage.removeItem('hasCompletedLanguageOnboarding');
   ```

## PWA Compatibility

### Maintained Features:
- ✅ Offline functionality
- ✅ Install prompt
- ✅ Push notifications
- ✅ App-like navigation
- ✅ Service worker caching
- ✅ Responsive design
- ✅ Standalone mode support

### Language-Specific PWA Features:
- ✅ Font switching (Inter for English, Nokora for Khmer)
- ✅ Right-to-left text support where needed
- ✅ Cached translations for offline use
- ✅ Persistent language preference
- ✅ Onboarding works in standalone mode
- ✅ No navigation breaks during language switch

## Technical Implementation

### State Management:
- Uses React Context for language state
- LocalStorage for persistence
- next-intl for translation loading
- Onboarding status tracking

### Performance:
- Lazy loading of translation files
- Cached language preferences
- Minimal re-renders during language switches
- Smooth animations and transitions

### Accessibility:
- Proper font rendering for Khmer script
- Maintains semantic HTML structure
- Screen reader compatible
- High contrast support
- Keyboard navigation friendly

## Testing Guide

### Manual Testing Steps:
1. **Fresh Install Test**:
   - Clear localStorage
   - Visit `/student`
   - Should see onboarding screen
   - Select language and continue

2. **Language Switching Test**:
   - Go to Account > Preferences > Language
   - Switch between English/Khmer
   - Verify all UI elements update
   - Check persistence after refresh

3. **PWA Installation Test**:
   - Install as PWA
   - Test language switching in standalone mode
   - Verify onboarding works in PWA

4. **Offline Functionality Test**:
   - Go offline
   - Test language switching
   - Verify cached translations work

### Reset for Testing:
```javascript
// Reset onboarding
localStorage.removeItem('hasCompletedLanguageOnboarding');

// Reset language preference
localStorage.removeItem('preferredLanguage');

// Reload to trigger onboarding
window.location.reload();
```

### Supported Browsers:
- ✅ Chrome/Edge (recommended for PWA)
- ✅ Safari (iOS/macOS)
- ✅ Firefox
- ✅ Samsung Internet

## Troubleshooting

### Onboarding Not Showing:
1. Check localStorage for 'hasCompletedLanguageOnboarding'
2. Clear storage and refresh
3. Verify LocaleProvider is properly wrapped

### Language Not Switching:
1. Check browser console for errors
2. Verify translation files exist in `/locales/`
3. Clear localStorage and try again
4. Check network tab for translation file loading

### Khmer Font Issues:
1. Ensure Nokora font is loaded
2. Check font-family CSS application
3. Verify browser supports Khmer script

### PWA Installation Issues:
1. Verify service worker is running
2. Check manifest.json accessibility
3. Test on supported browsers

## Development Server

The PWA is running at: http://localhost:3001

### Testing URLs:
- Main app: http://localhost:3001/student
- Account settings: http://localhost:3001/student/account
- Reset onboarding via Account page "Reset Language Onboarding" button

## Future Enhancements

### Planned Features:
- [ ] Auto-detect system language
- [ ] Additional language support (French, Chinese, etc.)
- [ ] Voice commands in native language
- [ ] Cultural date/time formatting
- [ ] Regional content customization
- [ ] Language learning progress tracking

### Performance Optimizations:
- [ ] Pre-load common translations
- [ ] Compress translation files
- [ ] Smart caching strategies
- [ ] CDN delivery for translation assets
- [ ] Progressive language loading
