# Face-API.js Quick Setup Guide

## 🚀 Quick Start for Administrators

### Prerequisites
- ✅ Node.js installed
- ✅ Student data in Firestore with `photoUrl` fields
- ✅ Camera permissions enabled in browser

### 1. Verify Installation
```bash
# Check if face-api.js is installed
npm list face-api.js

# If not installed:
npm install face-api.js
```

### 2. Check Model Files
Navigate to `/public/models/` and verify these files exist:
```
✅ ssd_mobilenetv1_model-weights_manifest.json (26KB)
✅ ssd_mobilenetv1_model-shard1 (4MB)
✅ ssd_mobilenetv1_model-shard2 (1.4MB)
✅ face_landmark_68_model-weights_manifest.json (8KB)
✅ face_landmark_68_model-shard1 (350KB)
✅ face_recognition_model-weights_manifest.json (18KB)
✅ face_recognition_model-shard1 (4MB)
✅ face_recognition_model-shard2 (2.2MB)
```

### 3. Access the System
1. Start your development server: `npm run dev`
2. Navigate to: **Dashboard → Attendance → Face-API.js Scanner**
3. Wait for "Models loaded successfully" message

## 📋 Daily Operations

### Enrollment Workflow

#### **Batch Enrollment (Recommended)**
1. **Prepare Student Photos**:
   - Ensure all students have `photoUrl` in Firestore
   - Photos should be clear, front-facing, good lighting
   - Google Drive links are automatically supported

2. **Start Enrollment Session**:
   - Go to Face-API.js Scanner page
   - Click "Show Enrollment"
   - Select students one by one from dropdown

3. **Monitor Progress**:
   ```
   Status Display:
   📊 Enrolled Students: 45
   📊 Pending Enrollment: 12
   📊 Faces Tracked: 0
   ```

#### **Individual Enrollment**
For students without photos:
1. Have student sit in front of camera
2. Select student from "Pending Enrollment" dropdown
3. Click "Enroll Student"
4. Student should look directly at camera
5. Wait for "Enrolled successfully" message

### Attendance Monitoring

#### **Real-time Recognition**
1. Click "Start Camera"
2. Students approach camera one at a time
3. Watch for status messages:
   - 🔵 "Hold position..." - Student should stay still
   - 🟢 "Recognized: [Name]" - Attendance marked
   - 🔴 "Unknown person" - Not enrolled or unclear

#### **Attendance Status Colors**
- **Green Box**: Student recognized as "Present"
- **Yellow Box**: Student recognized as "Late" (after 8:30 AM)
- **Red Box**: Unknown person detected
- **Gray Box**: Face detecting, waiting for stability

## 🔧 Troubleshooting

### Common Issues & Solutions

| Problem | Symptoms | Solution |
|---------|----------|----------|
| **Models won't load** | "Failed to load models" error | Check model files in `/public/models/` |
| **Photo enrollment fails** | "Could not generate descriptor" | Verify photo URL accessibility |
| **Camera enrollment fails** | "Could not detect face" | Improve lighting, center face |
| **Recognition too sensitive** | Wrong person recognized | Adjust `RECOGNITION_THRESHOLD` |
| **Recognition not working** | Face detected but not recognized | Check if student is enrolled |

### System Performance

#### **Optimal Settings**
```javascript
Detection Interval: 1000ms (1 second)
Recognition Threshold: 0.6 (60% confidence)
Dwell Time: 2000ms (2 seconds)
Cooldown Period: 30000ms (30 seconds)
```

#### **Performance Monitoring**
- Watch browser console for errors
- Monitor camera frame rate
- Check memory usage in DevTools
- Verify attendance records in Firestore

## 👥 Student Management

### Enrollment Status Categories

#### **✅ Enrolled Students**
- Have `faceDescriptor` array in Firestore
- Can be automatically recognized
- Displayed in green "Enrolled Students" section

#### **⏳ Pending Enrollment**
- Missing `faceDescriptor` in their record
- Available in enrollment dropdown
- Need to complete enrollment process

#### **📷 Photo vs Camera Enrollment**
| Method | When Used | Process |
|--------|-----------|---------|
| **Photo** | Student has `photoUrl` | Automatic from existing photo |
| **Camera** | No `photoUrl` available | Live capture during enrollment |

### Bulk Operations

#### **Check Enrollment Status**
```javascript
// In browser console
students.filter(s => s.faceDescriptor).length // Enrolled count
students.filter(s => !s.faceDescriptor).length // Pending count
```

#### **Reset Student Enrollment**
If re-enrollment needed:
1. Remove student from enrolled list (if available)
2. Student will appear in "Pending Enrollment"
3. Re-enroll using normal process

## 📊 Monitoring & Reports

### Daily Attendance Check
1. Review attendance records in Firestore
2. Check for any "Unknown person" alerts
3. Verify all expected students were recognized

### System Health Indicators
- **Green**: All systems operational
- **Yellow**: Minor issues, check console
- **Red**: Critical errors, restart system

### Performance Metrics
```
✅ Recognition Accuracy: >95%
✅ False Positive Rate: <2%
✅ Processing Time: <3 seconds
✅ Model Load Time: <10 seconds
```

## 🔒 Security Best Practices

### Data Protection
- Face descriptors stored as numbers (not images)
- All processing happens locally
- No external API calls for recognition
- Original photos remain in their locations

### Access Control
- Only authorized staff can enroll students
- Camera access requires browser permissions
- Attendance records include timestamps

### Privacy Compliance
- No face images stored in system
- Descriptors cannot be reverse-engineered
- Students can request enrollment removal

## 🆘 Emergency Procedures

### System Not Working
1. **Check Models**: Verify all 8 model files exist
2. **Restart Browser**: Clear cache and restart
3. **Fallback Method**: Use manual attendance entry
4. **Contact Support**: Document error messages

### Camera Issues
1. **Permission Denied**: Check browser camera settings
2. **Camera Busy**: Close other applications using camera
3. **Poor Quality**: Improve lighting, clean camera lens
4. **Not Detected**: Try different browser or device

---

**Quick Access URLs:**
- Face-API.js Scanner: `/dashboard/face-scan-faceapi`
- System Selector: `/dashboard/face-attendance-selector`
- Manual Attendance: `/dashboard/check`

**Support Contacts:**
- Technical Issues: Check browser console
- Student Questions: Refer to enrollment process
- System Admin: Review this guide first

---
*Last Updated: August 25, 2025*
