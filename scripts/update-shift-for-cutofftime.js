/**
 * Script to update shift to "Evening" for September records with cutoffTime "05:45 PM"
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

async function updateShiftForCutoffTime() {
  try {
    console.log('🚀 Updating shift to "Evening" for September records with cutoffTime "05:45 PM"...\n');

    // Query for records in September 2025
    const septemberQuery = db.collection('attendance')
      .where('date', '>=', '2025-09-01')
      .where('date', '<=', '2025-09-30');

    const septemberSnapshot = await septemberQuery.get();

    if (septemberSnapshot.empty) {
      console.log('⚠️  No attendance records found for September 2025.');
      return;
    }

    console.log(`📊 Found ${septemberSnapshot.size} total attendance records for September 2025...\n`);

    let recordsToUpdate = [];
    let recordsAlreadyEvening = [];
    let recordsSkipped = [];

    // Process each record to find those with cutoffTime "05:45 PM"
    septemberSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const cutoffTime = data.cutoffTime || '';
      const currentShift = data.shift || '';

      if (cutoffTime === '05:45 PM') {
        if (currentShift === 'Evening') {
          recordsAlreadyEvening.push({
            id: doc.id,
            studentName: data.studentName || 'Unknown',
            date: data.date,
            class: data.class || 'Unknown',
            shift: currentShift,
            cutoffTime: cutoffTime
          });
        } else {
          recordsToUpdate.push({
            id: doc.id,
            studentName: data.studentName || 'Unknown',
            date: data.date,
            class: data.class || 'Unknown',
            currentShift: currentShift,
            cutoffTime: cutoffTime
          });
        }
      } else {
        recordsSkipped.push({
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          cutoffTime: cutoffTime
        });
      }
    });

    console.log('📈 Analysis Results:');
    console.log(`   📊 Total September records: ${septemberSnapshot.size}`);
    console.log(`   🎯 Records with cutoffTime "05:45 PM": ${recordsToUpdate.length + recordsAlreadyEvening.length}`);
    console.log(`   ✅ Records to update (shift ≠ Evening): ${recordsToUpdate.length}`);
    console.log(`   ⏭️  Records already Evening: ${recordsAlreadyEvening.length}`);
    console.log(`   ⏭️  Records with different cutoffTime: ${recordsSkipped.length}`);

    if (recordsToUpdate.length > 0) {
      console.log('\n🔄 Updating records to Evening shift...\n');

      let updateCount = 0;
      let errorCount = 0;

      // Update records in batches
      for (const record of recordsToUpdate) {
        try {
          await db.collection('attendance').doc(record.id).update({
            shift: 'Evening'
          });

          console.log(`   ✅ Updated ${record.studentName} (${record.date}) - ${record.currentShift} → Evening`);
          updateCount++;
        } catch (error) {
          console.log(`   ❌ Error updating ${record.studentName}: ${error.message}`);
          errorCount++;
        }
      }

      console.log('\n📊 Update Results:');
      console.log(`   ✅ Successfully updated: ${updateCount} records`);
      console.log(`   ❌ Update errors: ${errorCount} records`);

      if (recordsAlreadyEvening.length > 0) {
        console.log('\n📋 Records already set to Evening:');
        recordsAlreadyEvening.slice(0, 10).forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - Class: ${record.class}`);
        });

        if (recordsAlreadyEvening.length > 10) {
          console.log(`   ... and ${recordsAlreadyEvening.length - 10} more records`);
        }
      }
    } else {
      console.log('\n⚠️  No records found that need updating.');
    }

    console.log('\n🎉 Shift update for cutoffTime "05:45 PM" complete!');

  } catch (error) {
    console.error('❌ Error during update process:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  updateShiftForCutoffTime()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateShiftForCutoffTime };
