# Firebase Database Backup System

This documentation covers the complete Firebase backup system implemented for your student attendance application.

## Overview

The backup system provides:
- **Automatic cloud backups** that run daily at midnight UTC using Firebase Functions (NO LAPTOP REQUIRED!)
- **Manual cloud backups** via admin interface triggered on-demand
- **Local backup scripts** for development and testing (legacy)
- **Full database restoration** with selective collection support (local only)
- **Backup management** through web interface
- **Data integrity verification**
- **Automatic cleanup** of old backups (keeps 30 days in cloud)

## 🌟 NEW: Cloud-Based Automatic Backups

### What's New
Your backup system now runs completely in the cloud using Firebase Functions! This means:
- ✅ Backups run automatically even when your laptop is closed
- ✅ No need to keep any local processes running
- ✅ Reliable, cloud-based scheduling
- ✅ Backups stored in Google Cloud Storage for durability
- ✅ Automatic cleanup of old backups
- ✅ Real-time backup status tracking

### Access Cloud Backup Management
Visit `/dashboard/cloud-backup` directly in your application to:
- View backup history and status
- Create manual backups instantly
- Monitor backup health and statistics
- Track storage usage and backup success rates

**Note**: This page is only accessible to admin users. You can navigate directly to the URL.

### How It Works
1. **Scheduled Function**: Runs daily at midnight UTC automatically
2. **Cloud Storage**: All backups stored securely in Google Cloud Storage
3. **Monitoring**: Real-time tracking via Firestore `backupHistory` collection
4. **Cleanup**: Automatically removes backups older than 30 days
5. **Admin Access**: Only admin users can trigger manual backups

## Quick Start

### 1. Cloud Backups (Recommended)

The easiest way to use backups is through the cloud system:

```bash
# No installation needed! Just visit your admin interface:
# https://your-app.com/admin/cloud-backup
```

**Features:**
- Automatic daily backups at midnight UTC
- Manual backup creation with one click
- Real-time backup status monitoring
- 30-day retention with automatic cleanup
- No laptop or local setup required

### 2. Local Development Backups (Optional)

For development and testing, you can still use local scripts:

```bash
npm install node-cron
```

Set environment variables in `.env.local`:

```env
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...your-private-key...\n-----END PRIVATE KEY-----\n"
```

### 3. Create Your First Cloud Backup

Visit `/admin/cloud-backup` and click "Create Manual Backup" or wait for the automatic midnight backup!

## Usage

### Cloud Backup Management (Primary Method)

Access your backup system at `/admin/cloud-backup`:

- **View Backup History**: See all backups with status, size, and timing
- **Create Manual Backup**: One-click backup creation
- **Monitor Status**: Real-time backup success/failure tracking
- **Automatic Schedule**: Daily backups at midnight UTC (no action needed)

### Firebase Functions Deployed

Your system now includes these cloud functions:

```javascript
// Automatic scheduled backup (runs daily at midnight UTC)
exports.scheduledBackup = onSchedule("0 0 * * *", async (event) => {
  // Backs up all Firestore collections to Cloud Storage
});

// Manual backup (callable by admin users)
exports.manualBackup = onCall(async (request) => {
  // Creates immediate backup when triggered
});
```

### Local Command Line Usage (Development Only)

For development and testing, you can still use local scripts:

### Creating Backups

```bash
# Basic backup (all collections)
node scripts/firebase-backup.js

# Backup specific collections only
node scripts/firebase-backup.js --collections=students,transactions

# Create compressed backup
node scripts/firebase-backup.js --compress

# Backup with all options
node scripts/firebase-backup.js --collections=students,transactions --compress
```

### Restoring Backups

```bash
# Dry run (simulation) - ALWAYS test first!
node scripts/firebase-restore.js --backup-id=backup-2024-01-15T10-30-00 --dry-run

# Restore specific collections
node scripts/firebase-restore.js --backup-id=backup-2024-01-15T10-30-00 --collections=students

# Full restore (BE CAREFUL!)
node scripts/firebase-restore.js --backup-id=backup-2024-01-15T10-30-00
```

### Scheduled Backups

```bash
# Start backup scheduler (runs in foreground)
node scripts/scheduled-backup.js

# Start as daemon (background process)
node scripts/scheduled-backup.js --start-daemon

# Custom schedule (daily at 3 AM)
node scripts/scheduled-backup.js --cron-schedule="0 3 * * *"

# Run a single backup immediately
node scripts/scheduled-backup.js --run-once
```

## NPM Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "backup:create": "node scripts/firebase-backup.js --compress",
    "backup:restore": "node scripts/firebase-restore.js",
    "backup:schedule": "node scripts/scheduled-backup.js --start-daemon",
    "backup:once": "node scripts/scheduled-backup.js --run-once"
  }
}
```

## Web Interface

Access the backup management interface at `/admin/backup` in your application.

Features:
- **View all backups** with details (size, collections, document count)
- **Create new backups** manually
- **Restore backups** with dry-run option
- **Delete old backups**
- **Health status** of each backup

## Cloud Backup Structure

Each cloud backup creates files in Google Cloud Storage:

```
gs://your-project.appspot.com/firestore-backups/
├── backup-2024-01-15T10-30-00/
│   ├── backup-manifest.json      # Backup metadata
│   ├── students.json            # Students collection
│   ├── transactions.json        # Transactions collection
│   ├── classes.json            # Classes collection
│   └── classTypes.json         # Class types collection
└── backup-2024-01-16T02-00-00/
    └── ...
```

### Backup Tracking

All backup operations are tracked in Firestore:

```javascript
// Collection: backupHistory
{
  backupId: "backup-2024-01-15T10-30-00",
  timestamp: "2024-01-15T10:30:00Z",
  status: "completed", // or "failed"
  totalCollections: 4,
  totalDocuments: 1250,
  totalSize: 2048576,
  duration: 15230, // milliseconds
  backupType: "scheduled_cloud_function", // or "manual"
  storagePath: "firestore-backups/backup-2024-01-15T10-30-00/"
}
```

## Local Backup Structure (Legacy)

Local backups still work for development:

```
backups/firestore/
├── backup-2024-01-15T10-30-00/
│   ├── backup-manifest.json      # Backup metadata
│   ├── students.json            # Students collection
│   ├── transactions.json        # Transactions collection
│   ├── classes.json            # Classes collection
│   └── classTypes.json         # Class types collection
└── backup-2024-01-16T02-00-00/
    └── ...
```

### Manifest File Structure

```json
{
  "backupId": "backup-2024-01-15T10-30-00",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "projectId": "your-project-id",
  "totalCollections": 4,
  "totalDocuments": 1250,
  "totalSize": 2048576,
  "collections": [
    {
      "collection": "students",
      "documentCount": 450,
      "filePath": "students.json",
      "size": 1024000
    }
  ],
  "compressed": true,
  "version": "1.0.0"
}
```

## Data Types Handling

The backup system properly handles Firestore-specific data types:

- **Timestamps** → Converted to ISO strings with type markers
- **Document References** → Stored as paths with type markers  
- **Arrays and Objects** → Recursively processed
- **Nested Documents** → Fully preserved

Example serialized data:
```json
{
  "createdAt": {
    "_type": "timestamp",
    "_value": "2024-01-15T10:30:00.000Z"
  },
  "classRef": {
    "_type": "reference", 
    "_value": "classes/math-101"
  }
}
```

## Automation & Scheduling

### Cron Schedule Examples

```bash
# Daily at 2 AM
"0 2 * * *"

# Every 6 hours
"0 */6 * * *"

# Weekly on Sundays at 3 AM
"0 3 * * 0"

# Monthly on 1st at midnight
"0 0 1 * *"
```

### Production Deployment

For production environments, consider using:

1. **PM2** for process management:
```bash
pm2 start scripts/scheduled-backup.js --name="backup-scheduler" -- --start-daemon
```

2. **Systemd service** (Linux):
```ini
[Unit]
Description=Firebase Backup Scheduler
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/app
ExecStart=/usr/bin/node scripts/scheduled-backup.js --start-daemon
Restart=always

[Install]
WantedBy=multi-user.target
```

3. **Docker container** with volume mounts for backup storage

## Monitoring & Alerts

### Log Files

Scheduled backups create logs at:
```
logs/backup-scheduler.log
```

Log format:
```
[2024-01-15T10:30:00.000Z] [INFO] Starting scheduled backup...
[2024-01-15T10:30:15.000Z] [SUCCESS] Backup completed successfully: backup-2024-01-15T10-30-00
[2024-01-15T10:30:15.000Z] [INFO]   - Duration: 15.23 seconds
[2024-01-15T10:30:15.000Z] [INFO]   - Collections: 4
[2024-01-15T10:30:15.000Z] [INFO]   - Documents: 1250
[2024-01-15T10:30:15.000Z] [INFO]   - Size: 2.00 MB
```

### API Endpoints for Monitoring

```javascript
// Check backup status
GET /api/admin/backup?action=list

// Get specific backup details  
GET /api/admin/backup?action=manifest&backupId=backup-2024-01-15T10-30-00
```

## Security Considerations

1. **Service Account Permissions**: Ensure your Firebase service account has only necessary permissions
2. **Backup Storage**: Store backups in secure, access-controlled locations
3. **Environment Variables**: Never commit private keys to version control
4. **Access Control**: Restrict backup management to admin users only

## Troubleshooting

### Common Issues

**Issue**: "Firebase credentials not found"
```bash
# Solution: Check environment variables
echo $FIREBASE_CLIENT_EMAIL
echo $FIREBASE_PRIVATE_KEY
```

**Issue**: "Permission denied" on Firestore
```bash
# Solution: Verify service account has Firestore permissions:
# - Cloud Datastore User
# - Firebase Admin SDK Administrator Service Agent
```

**Issue**: "Backup directory not writable"
```bash
# Solution: Check permissions
chmod 755 backups/
```

**Issue**: "Large backups failing"
```bash
# Solution: Increase Node.js memory limit
node --max-old-space-size=4096 scripts/firebase-backup.js
```

### Backup Validation

Test your backups regularly:

```bash
# 1. Create a test backup
npm run backup:create

# 2. Run restore simulation  
node scripts/firebase-restore.js --backup-id=YOUR_BACKUP_ID --dry-run

# 3. Check backup integrity
node -e "
const fs = require('fs');
const manifest = JSON.parse(fs.readFileSync('./backups/firestore/YOUR_BACKUP_ID/backup-manifest.json'));
console.log('Backup Health:', manifest.totalDocuments > 0 ? 'GOOD' : 'BAD');
"
```

## Best Practices

1. **Test Restores Regularly**: Schedule monthly restore tests on a separate environment
2. **Monitor Backup Sizes**: Set up alerts for unusually large or small backups
3. **Retention Policy**: Keep 30 daily backups, 12 monthly backups, 5 yearly backups
4. **Offsite Storage**: Consider uploading backups to cloud storage (S3, Google Cloud Storage)
5. **Encryption**: Encrypt sensitive backups before storage
6. **Documentation**: Keep restore procedures documented and tested

## Support

If you encounter issues:
1. Check the logs in `logs/backup-scheduler.log`
2. Verify Firebase credentials and permissions
3. Test with a small collection first
4. Use dry-run mode before actual restores

For additional help, check the Firebase Admin SDK documentation at: https://firebase.google.com/docs/admin/setup

---

## 🚀 Cloud Backup Migration Summary

**What Changed:**
- Added automatic cloud backups using Firebase Functions
- Backups now run at midnight UTC daily without requiring your laptop
- All backups stored in Google Cloud Storage for reliability
- Added admin web interface for backup management
- Automatic cleanup keeps storage costs low

**What Stayed:**
- All local backup scripts still work for development
- Same data format and structure
- Compatible restore procedures
- Environment variable configuration

**Benefits:**
- ✅ Zero maintenance - runs automatically in the cloud
- ✅ Higher reliability - Google's infrastructure
- ✅ Cost effective - automatic cleanup
- ✅ Admin friendly - web interface for management
- ✅ Secure - built-in authentication and permissions

**Next Steps:**
1. Visit `/dashboard/cloud-backup` to see your new backup dashboard
2. Optionally create a manual backup to test the system
3. Your automatic backups will start running at midnight UTC
4. Monitor backup health through the admin interface

Your old local backup scripts will continue to work, but the cloud backup system is now your primary backup solution!
