# FaceIO Quick Reference

## 🚀 Quick Start

### For Administrators

1. **Setup FaceIO App**
   ```bash
   ./setup-faceio.sh  # Run setup script
   ```

2. **Get FaceIO App ID**
   - Visit: https://console.faceio.net/
   - Create application
   - Copy Application ID

3. **Configure App ID**
   - Edit: `app/dashboard/face-scan-faceio/page.tsx`
   - Replace: `YOUR_FACEIO_APP_ID`

### For Daily Use

1. **Enroll Students**
   - Go to: Dashboard → Attendance → FaceIO Scanner
   - Show Enrollment → Select Student → Enroll

2. **Mark Attendance**
   - Students click "Start Attendance Recognition"
   - Look at camera
   - Automatic attendance marking

## 🎯 Navigation

| Path | Purpose |
|------|---------|
| `/dashboard/face-attendance-selector` | Choose face system |
| `/dashboard/face-scan-faceio` | FaceIO attendance |
| `/dashboard/face-scan` | Legacy face scan |

## 🔧 Configuration

### Required Environment Variables
```env
# Optional but recommended
NEXT_PUBLIC_FACEIO_APP_ID=fioapi-xxxx-xxxx-xxxx-xxxx
```

### FaceIO Console Settings
- **Permitted Domains**: Add your domain
- **Security**: Enable anti-spoofing
- **Webhooks**: Optional for advanced features

## 📊 Database Schema

### Students Collection
```typescript
{
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  faceId?: string,              // FaceIO facial ID
  faceioEnrolledAt?: Date,      // Enrollment timestamp
}
```

### Attendance Collection
```typescript
{
  studentId: string,
  studentName: string,
  date: string,                 // "2025-01-01"
  timeIn: string,               // "9:30 AM"
  status: "present" | "late",
  method: "faceio",
  timestamp: Timestamp,
}
```

## 🛠️ Troubleshooting

### Common Error Codes

| Code | Error | Solution |
|------|-------|----------|
| 2 | Face not detected | Better lighting, face camera |
| 4 | Already enrolled | Use recognition instead |
| 9 | Face not recognized | Enroll first or retry |

### Quick Fixes

**"FaceIO not initialized"**
```bash
# Check internet and App ID
console.log(process.env.NEXT_PUBLIC_FACEIO_APP_ID)
```

**"Domain not permitted"**
- Add domain to FaceIO console
- Include port for localhost (localhost:3000)

**"No face detected"**
- Improve lighting
- Grant camera permissions
- Clear view of face

## 📱 System Comparison

| Feature | FaceIO | Legacy |
|---------|--------|--------|
| Setup | ⭐⭐ Easy | ⭐⭐⭐⭐ Complex |
| Accuracy | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Internet | ✅ Required | ❌ Optional |
| Anti-spoofing | ⭐⭐⭐⭐⭐ | ⭐⭐ |

## 🎯 Best Practices

### Enrollment
- ✅ Good lighting
- ✅ Face camera directly
- ✅ Remove glasses if issues
- ✅ Consistent appearance

### Recognition
- ✅ Same lighting as enrollment
- ✅ Clear face view
- ✅ Allow 2-3 seconds
- ✅ Retry if first attempt fails

### Security
- ✅ Restrict enrollment to admins
- ✅ Regular attendance audits
- ✅ Monitor error rates
- ✅ Backup attendance methods

## 🆘 Support

- **Documentation**: `FACEIO-INTEGRATION-GUIDE.md`
- **FaceIO Docs**: https://faceio.net/getting-started
- **FaceIO Support**: https://discord.gg/faceio
- **System Issues**: Create GitHub issue

## 🚀 Quick Commands

```bash
# Setup FaceIO
./setup-faceio.sh

# Start development
npm run dev

# Build production
npm run build

# Deploy
npm run start
```

---
*Updated: $(date)*
