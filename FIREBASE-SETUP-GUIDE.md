# 🔧 Firebase Private Key Setup Guide

The backup system is encountering an issue with your Firebase private key format. This is a common issue when setting up Firebase Admin SDK credentials.

## 🚨 Current Error
```
Error: 2 UNKNOWN: Getting metadata from plugin failed with error: error:1E08010C:DECODER routines::unsupported
```

This error indicates that the private key in your `.env.local` file has formatting issues.

## ✅ How to Fix

### Step 1: Get Your Service Account Key
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to Project Settings (gear icon) → Service accounts
4. Click "Generate new private key"
5. Download the JSON file

### Step 2: Extract the Private Key
Open the downloaded JSON file and find the `private_key` field. It should look like:
```json
{
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",
  "project_id": "your-project-id"
}
```

### Step 3: Update Your .env.local File
Your `.env.local` file should look like this:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...
(your actual private key content here)
...
-----END PRIVATE KEY-----"
```

### Step 4: Alternative Format (If Above Doesn't Work)
Sometimes you need to escape the newlines:

```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

## 🧪 Test Your Setup

After updating your `.env.local` file, test it:

```bash
# Test the backup system
node scripts/simple-backup.js
```

If successful, you should see:
```
🚀 Starting simple Firebase backup...
✅ Firebase Admin SDK initialized
📁 Created backup directory: backup-2024-01-15T10-30-00
📋 Found X collections: students, transactions, classes, classTypes
🎉 Backup completed successfully!
```

## 🔧 Alternative: Using Environment File
If you continue having issues, you can place the service account JSON file directly in your project:

1. Save the JSON file as `serviceAccountKey.json` in your project root
2. Add it to `.gitignore`
3. Update your backup scripts to use the file instead:

```javascript
// In firebase initialization
const serviceAccount = require('./serviceAccountKey.json');
initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.project_id,
});
```

## 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Double-check permissions**: Your service account needs these roles:
   - Cloud Datastore User
   - Firebase Admin SDK Administrator Service Agent

2. **Verify project ID**: Make sure `NEXT_PUBLIC_FIREBASE_PROJECT_ID` matches your actual Firebase project ID

3. **Check quotes**: Make sure your private key is properly quoted in the `.env.local` file

4. **Test connection**: Use the test script to verify your credentials work

Once your credentials are working, the backup system will function properly through both the command line and the web interface! 🎉
