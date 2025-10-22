# Translation Context Fix

## Problem
`LoadingScreen` and `AccountInactiveScreen` were using `useTranslations()` hook, which requires `NextIntlClientProvider` context. But these components are rendered in the **student layout** before the `LocaleProvider` wrapper, causing the error:

```
Error: Failed to call `useTranslations` because the context from `NextIntlClientProvider` was not found.
```

## Solution
Made these components **translation-independent** by:
1. Removing `useTranslations()` and `useLocale()` hooks
2. Using hardcoded English messages
3. Removing Khmer font class dependencies

## Files Fixed

### 1. `LoadingScreen.tsx`
- ✅ Removed translation imports
- ✅ Uses simple `message` prop (default: "Loading...")
- ✅ No context dependency

### 2. `AccountInactiveScreen.tsx`
- ✅ Removed translation imports
- ✅ Created static `messages` object with English text
- ✅ Removed Khmer font classes
- ✅ No context dependency

## Why This Works

The render order is:
```
1. Root Layout
2. Student Layout (← LoadingScreen & AccountInactiveScreen used here)
3. LocaleProvider (← Translation context available here)
4. Student pages
```

Since LoadingScreen and AccountInactiveScreen are used in step 2, they can't access the context from step 3.

## Trade-off

**Before**: ✅ Supports English/Khmer | ❌ Crashes with context error  
**After**: ✅ No crashes | ⚠️ English only (for now)

## Future Enhancement Option

If you need Khmer support for these screens, you can:

### Option 1: Move Status Check After LocaleProvider
Wrap the status check in a separate component inside LocaleProvider:

```tsx
// student/layout.tsx
return (
  <LocaleProvider>
    <StudentStatusChecker>
      {loading ? <LoadingScreen /> : 
       !active ? <AccountInactiveScreen /> :
       <StudentLayout>{children}</StudentLayout>}
    </StudentStatusChecker>
  </LocaleProvider>
);
```

### Option 2: Use Dynamic Messages
Pass language from localStorage/cookies:

```tsx
const lang = localStorage.getItem('locale') || 'en';
const messages = {
  en: { title: 'Account Inactive', ... },
  kh: { title: 'គណនីមិនសកម្ម', ... }
};
```

### Option 3: Accept Translation Props
```tsx
<LoadingScreen 
  message={translations?.loading || "Loading..."} 
/>
```

## Current Status

✅ **Fixed**: No more translation context errors  
✅ **Working**: Loading screen shows immediately  
✅ **Working**: Inactive students are blocked  
⚠️ **Trade-off**: English-only messages for inactive screens

The app will now work without crashes. If you need Khmer support for these specific screens, let me know and I can implement one of the enhancement options above.
