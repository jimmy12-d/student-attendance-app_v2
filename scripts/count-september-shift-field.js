/**
 * Script to add timestamp field to attendance records and fix date from 2025-06-10 to 2025-10-06
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

async function addTimestampToAttendance() {
  try {
    console.log('🚀 Adding timestamp field to attendance records and fixing date...\n');

    // Query for attendance records with date 2025-06-10
    const attendanceQuery = db.collection('attendance')
      .where('date', '==', '2025-06-10');

    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      console.log('⚠️  No attendance records found with date 2025-06-10.');
      return;
    }

    console.log(`📊 Found ${attendanceSnapshot.size} attendance records with date 2025-06-10...\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each attendance record
    for (const doc of attendanceSnapshot.docs) {
      const data = doc.data();

      // Always update date, add timestamp if not present
      const updateData = { date: '2025-10-06' };
      if (!data.timestamp) {
        updateData.timestamp = admin.firestore.Timestamp.fromDate(new Date('2025-10-06T12:00:00'));
      }

      try {
        await doc.ref.update(updateData);
        console.log(`✅ Updated ${doc.id}: changed date to 2025-10-06${!data.timestamp ? ' and added timestamp' : ''}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${doc.id}:`, error);
        skippedCount++;
      }
    }

    console.log('\n📊 Timestamp Addition Summary:');
    console.log(`   📊 Total records processed: ${attendanceSnapshot.size}`);
    console.log(`   ✅ Records updated: ${updatedCount}`);
    console.log(`   ⚠️  Records skipped: ${skippedCount}`);

    console.log('\n⏰ Timestamp addition complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  addTimestampToAttendance()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addTimestampToAttendance };
