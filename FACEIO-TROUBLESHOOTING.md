# FaceIO Integration - Troubleshooting Guide

## 🎉 INTEGRATION COMPLETE

**Status**: ✅ **PRODUCTION READY** - FaceIO is fully integrated and working!

## 📋 Current Configuration

### Environment Setup:
- ✅ App ID: `fioa74f6` (stored in `NEXT_PUBLIC_FACEIO_APP_ID`)
- ✅ Global `faceIO` function access working correctly
- ✅ React component properly configured
- ✅ Environment variable configuration active

### Working Features:
- ✅ **Face Enrollment**: Students can enroll their faces
- ✅ **Face Authentication**: Automatic attendance via recognition
- ✅ **Firebase Integration**: Attendance records saved automatically
- ✅ **Error Handling**: Proper error messages and user feedback
- ✅ **Loading States**: User-friendly loading indicators

## 🛠️ Common Usage Issues

### Issue 1: "Student Not Found" During Recognition
**Cause**: Student not enrolled or enrollment incomplete

**Solution**:
1. Go to FaceIO Scanner page
2. Click "Show Enrollment"
3. Select and enroll the student
4. Try recognition again

### Issue 2: Face Recognition Fails
**Possible Causes**:
- Poor lighting conditions
- Face partially obscured
- Student appearance changed significantly

**Solutions**:
- Ensure good lighting
- Remove glasses/masks if needed
- Re-enroll if appearance changed significantly
- Try multiple recognition attempts

### Issue 3: Enrollment Fails
**Possible Causes**:
- Camera permission denied
- Poor image quality
- Network connectivity issues

**Solutions**:
- Grant camera permissions in browser
- Ensure stable internet connection
- Try again with better lighting
- Check browser console for specific errors

## 📞 Support Information

### For Technical Issues:
- Check browser console for error messages
- Verify camera permissions are granted
- Ensure stable internet connection
- Contact system administrator

### For FaceIO Service Issues:
- **FaceIO Support**: support@faceio.net
- **FaceIO Console**: https://console.faceio.net/
- **App ID**: fioa74f6

## 🔧 System Health Check

### Verify Integration:
1. Visit `/dashboard/face-scan-faceio`
2. Check that page loads without errors
3. Test enrollment with a sample student
4. Test recognition after enrollment

### Expected Behavior:
- Page loads with "FaceIO ready for use" message
- Enrollment creates modal window for face capture
- Recognition automatically marks attendance
- Success/error messages appear as toast notifications

### Step 1: Run Enhanced Tests

1. **Simple Test (Enhanced)**: `/dashboard/face-scan-faceio-simple-test`
   - Now includes deeper debugging
   - Shows script content analysis
   - Tests multiple initialization patterns

2. **CDN Test**: `/dashboard/face-scan-faceio-cdn-test`
   - Tests CDN accessibility
   - Analyzes script content
   - Checks CORS headers

3. **Standalone HTML Test**: `/faceio-test.html`
   - Pure HTML test (no React/Next.js)
   - Visit: `http://localhost:3000/faceio-test.html`
   - This will tell us if it's a React/Next.js issue

### Step 2: Check for Conflicts

The properties `_realnet_alloc_face_result_array`, `_realnet_face_detect`, `_realnet_face_max_detection` suggest there might be another face recognition library loaded.

**Check for conflicts:**
```bash
# Search for other face recognition libraries
grep -r "realnet\|face_detect" app/ --include="*.tsx" --include="*.ts" --include="*.js"
```

### Step 3: Alternative Loading Methods

Try these approaches in order:

#### Method 1: Direct Script Tag in HTML
Add to `app/layout.tsx` or `public/index.html`:
```html
<script src="https://cdn.faceio.net/fio.js"></script>
```

#### Method 2: Dynamic Import
```javascript
const loadFaceIO = async () => {
  // Try dynamic import approach
  await import('https://cdn.faceio.net/fio.js');
  
  // Wait for initialization
  return new Promise((resolve) => {
    const check = () => {
      if (window.faceIO) resolve(window.faceIO);
      else setTimeout(check, 100);
    };
    check();
  });
};
```

#### Method 3: Alternative CDN
The script might be cached. Try:
```javascript
const timestamp = Date.now();
script.src = `https://cdn.faceio.net/fio.js?v=${timestamp}`;
```

## 🛠️ Immediate Actions

### Action 1: Test Standalone HTML
1. Visit `http://localhost:3000/faceio-test.html`
2. Click "Test Basic Load"
3. If this works, it's a React/Next.js integration issue
4. If this fails, it's a script/CDN issue

### Action 2: Check Browser Console
Look for:
- Network errors loading the script
- JavaScript errors after script loads
- CORS warnings
- Content Security Policy violations

### Action 3: Try Different Browser
Test in:
- Chrome (incognito mode)
- Firefox
- Safari
- Different device

## � Contact FaceIO Support

If the console checks don't resolve the issue, contact FaceIO support with:

**Email**: support@faceio.net  
**Discord**: https://discord.gg/faceio  
**Documentation**: https://faceio.net/getting-started  

**Provide this information:**
- App ID: `fioa74f6`
- Issue: "Script loads successfully but window.faceIO is undefined"
- Environment: Development (localhost:3000)
- Browser: Chrome/Safari/Firefox
- Test results: Script creates `_realnet_*` functions but not `faceIO` global

## �📋 Expected Results from Tests

### If App ID/Domain Issue (Most Likely):
- Fix permissions in FaceIO console
- Add development domains
- Verify app is active and billing current

### If Standalone HTML Works:
- Issue is with React/Next.js integration
- Try loading script in `app/layout.tsx`
- Check for hydration issues

### If CDN Test Shows Script Issues:
- Script content is not what we expect
- FaceIO might have changed their API
- Try alternative script URLs

### If Everything Fails:
- Contact FaceIO support
- Consider alternative face recognition services
- Use legacy face recognition system
- Check FaceIO console for app status
- Verify domain permissions

## 🔧 Quick Fixes to Try

### Fix 1: Force Script Reload
```javascript
// Clear browser cache and force reload
window.location.reload(true);
```

### Fix 2: Check App ID
Your App ID `fioa74f6` might need verification:
- Log into FaceIO console
- Verify app is active
- Check domain whitelist includes your domain

### Fix 3: HTTPS Requirement
FaceIO requires HTTPS in production:
- Use `https://localhost:3000` for local testing
- Ensure production uses HTTPS

## 📞 Next Steps

1. **Run the standalone HTML test first** - this is the most important diagnostic
2. **Check browser console** for any errors
3. **Report back with results** from all three test pages
4. Based on results, we'll know if it's:
   - CDN/Script issue
   - React integration issue  
   - Browser/security issue
   - App configuration issue

The standalone HTML test will definitively tell us if FaceIO works in your environment!
