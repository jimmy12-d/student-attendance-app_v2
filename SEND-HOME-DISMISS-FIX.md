# Send-Home Overlay Dismiss Fix

## Issue
When a student dismissed the send-home warning overlay, the face tracking box and name were still visible on the camera feed, which was confusing.

## Problem Details
- User clicks "Dismiss" button on send-home overlay
- Overlay closes correctly
- **BUT** the red bounding box with "SEND HOME" label remained on camera feed
- This made it unclear that the student had been sent home

## Solution
Updated the `onDismiss` handler in the SendHomeOverlay component to clear the tracked face from the canvas.

## Code Changes

### File: `/app/dashboard/face-scan-faceapi/page.tsx`

**Before**:
```typescript
onDismiss={() => {
  setShowSendHomeOverlay(false);
  setSendHomeStudent(null);
}}
```

**After**:
```typescript
onDismiss={() => {
  setShowSendHomeOverlay(false);
  setSendHomeStudent(null);
  // Clear the tracked face from the canvas so it's not visible anymore
  setTrackedFaces(prevFaces => prevFaces.filter(f => 
    f.attendanceStatus !== 'send-home' && 
    f.message?.includes('Send Home') === false
  ));
}}
```

## How It Works

The fix filters out faces from the tracked faces array that:
1. Have `attendanceStatus === 'send-home'`
2. OR have a message containing "Send Home"

This ensures that when the overlay is dismissed, the face tracking box is also removed from the camera view.

## User Experience

### Before Fix:
1. Student scans face (too late)
2. Red overlay appears ✅
3. User clicks "Dismiss"
4. Overlay closes ✅
5. **Red bounding box still visible on camera** ❌

### After Fix:
1. Student scans face (too late)
2. Red overlay appears ✅
3. User clicks "Dismiss"
4. Overlay closes ✅
5. **Red bounding box removed from camera** ✅
6. Camera shows clean view, ready for next student

## Auto-Dismiss Behavior
The auto-dismiss after 5 seconds already included the face removal logic, so this fix ensures consistency between manual and auto-dismiss.

## Testing

To verify the fix:
1. Set time to after send-home threshold
2. Scan a student's face
3. Wait for red overlay to appear
4. Wait 3 seconds for dismiss button
5. Click "Dismiss"
6. **Verify**: Red bounding box disappears from camera
7. **Verify**: Camera view is clean and ready for next scan

## Status
✅ **FIXED** - Send-home overlay dismiss now properly clears face tracking

## Date
October 12, 2025
