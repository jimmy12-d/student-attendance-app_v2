/**
 * Script to update attendance records with scannedBy="Manual attendance by teacher"
 * to have method="manual"
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    // Try to use service account key if it exists
    const serviceAccount = require(path.join(__dirname, '../firestore-upload/serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    // Fallback to environment variables
    console.log('Service account not found, using environment variables...');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

async function updateManualAttendanceMethods() {
  try {
    console.log('🚀 Updating attendance records with scannedBy="Manual attendance by teacher" to method="manual"...\n');

    // Query for records with scannedBy="Manual attendance by teacher"
    const attendanceQuery = db.collection('attendance')
      .where('scannedBy', '==', 'Manual attendance by teacher');

    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      console.log('⚠️  No attendance records found with scannedBy="Manual attendance by teacher".');
      return;
    }

    console.log(`📊 Found ${attendanceSnapshot.size} attendance records to update...\n`);

    let updatedCount = 0;
    let errorCount = 0;

    // Process each attendance record
    const updatePromises = attendanceSnapshot.docs.map(async (doc) => {
      try {
        const docRef = doc.ref;
        const data = doc.data();

        console.log(`   📝 Updating record ${doc.id} for student: ${data.studentName || 'Unknown'}`);

        // Update the method field
        await docRef.update({
          method: 'manual'
        });

        updatedCount++;
        console.log(`   ✅ Updated record ${doc.id}`);

      } catch (error) {
        console.error(`   ❌ Error updating record ${doc.id}:`, error.message);
        errorCount++;
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    console.log('\n📈 Update Results:');
    console.log(`   ✅ Successfully updated: ${updatedCount} records`);
    console.log(`   ❌ Failed to update: ${errorCount} records`);
    console.log(`   📊 Total processed: ${attendanceSnapshot.size} records`);

    if (updatedCount > 0) {
      console.log('\n🎯 All matching records have been updated with method="manual"');
    }

    console.log('\n🎉 Update process complete!');

  } catch (error) {
    console.error('❌ Error updating attendance data:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  updateManualAttendanceMethods()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateManualAttendanceMethods };
