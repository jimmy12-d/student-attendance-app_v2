# Fix AuthUID Script

This script fixes existing attendance records by adding the `authUid` field to records that are missing it.

## What it does

1. **Maps Students**: Creates a mapping from `studentId` (Firestore document ID) to `authUid` from the students collection
2. **Finds Records**: Locates all attendance records with `method: "face-api"` that need fixing
3. **Updates Records**: Adds the correct `authUid` to attendance records using batch operations
4. **Verifies**: Confirms all updates were successful

## Prerequisites

- Firebase Admin SDK credentials configured
- Access to the Firestore database
- Node.js environment

## Usage

### Step 1: Test the connection (Recommended)
```bash
npm run fix:test
```

### Step 2: Run the fix script
#### Option 1: Using npm script (Recommended)
```bash
npm run fix:authuid
```

#### Option 2: Direct execution
```bash
node scripts/fix_method_api.js
```

## What records get updated

The script will update attendance records that meet ALL of these criteria:
- `method` field equals `"face-api"`
- `authUid` field is missing, null, or equals `"manual-entry"`
- The `studentId` has a corresponding `authUid` in the students collection

## Safety features

- **Batch processing**: Updates records in batches of 500 to respect Firestore limits
- **Verification**: Verifies all updates after completion
- **Logging**: Detailed logging of all operations
- **Selective updates**: Only updates records that actually need fixing
- **Audit trail**: Adds `updatedBy` and `updatedAt` fields to track the fix

## Expected output

```
🚀 Starting attendance records authUid fix...
📋 Building student ID to authUid mapping...
   ✓ Mapped student abc123 -> xyz789
   ⚠️  Student def456 (John Doe) has no authUid
📊 Found 150 students with authUid out of 160 total students

🔍 Finding attendance records that need fixing...
📝 Found 450 face-api attendance records

🔧 Found 23 records that need authUid updates

📝 Updating attendance records...
   Processing batch 1 (23 records)...
     ✓ Jane Smith (2025-08-15) - Adding authUid: xyz789
   ✅ Batch committed successfully (23/23 total)

🔍 Verifying updates...
✅ Verification: 23 records were successfully updated

📊 SUMMARY:
   • Students with authUid: 150
   • Face-api attendance records found: 450
   • Records updated: 23
   • Records verified: 23

🎉 Attendance records authUid fix completed successfully!
```

## Benefits after running

1. **Student Portal Access**: Students can now query their attendance records using their `authUid`
2. **Data Consistency**: All attendance records will have proper `authUid` mapping
3. **Privacy**: Students can filter to see only their own attendance data

## Troubleshooting

### Error: "Could not load the default credentials"
Make sure you have Firebase Admin credentials configured:
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- Or run `gcloud auth application-default login`

### Error: "Permission denied"
Ensure your Firebase Admin account has read/write access to:
- `students` collection
- `attendance` collection

### No records to update
This is normal if:
- All face-api records already have `authUid`
- No students have `authUid` set up yet
- All attendance was created after the authUid field was added

## Related files

- `app/dashboard/face-scan-faceapi/utils/attendanceLogic.ts` - Face recognition attendance logic
- `app/student/attendance/page.tsx` - Student portal attendance requests
- `app/_interfaces/index.ts` - Student interface definition
