/**
 * Script to count and analyze shift field values in September 2025 attendance records
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

async function countSeptemberShiftField() {
  try {
    console.log('🚀 Counting and analyzing shift field values for September 2025...\n');

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

    let recordsWithShift = [];
    let recordsWithoutShift = [];
    let shiftCounts = {};
    let uniqueShifts = new Set();

    // Process each record
    septemberSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      if (data.shift !== undefined && data.shift !== null && data.shift !== '') {
        const shift = data.shift;
        recordsWithShift.push({
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          shift: shift,
          method: data.method || 'Unknown',
          timeIn: data.timeIn || 'N/A'
        });

        // Count shifts
        if (!shiftCounts[shift]) {
          shiftCounts[shift] = 0;
        }
        shiftCounts[shift]++;

        // Track unique shifts
        uniqueShifts.add(shift);
      } else {
        recordsWithoutShift.push({
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          method: data.method || 'Unknown'
        });
      }
    });

    console.log('📈 September 2025 Shift Field Analysis:');
    console.log(`   📊 Total September records: ${septemberSnapshot.size}`);
    console.log(`   ✅ Records with shift field: ${recordsWithShift.length}`);
    console.log(`   ❌ Records without shift field: ${recordsWithoutShift.length}`);
    console.log(`   🎯 Unique shift values: ${uniqueShifts.size}`);

    const withShiftPercentage = ((recordsWithShift.length / septemberSnapshot.size) * 100).toFixed(1);
    const withoutShiftPercentage = ((recordsWithoutShift.length / septemberSnapshot.size) * 100).toFixed(1);

    console.log(`   📈 Coverage: ${withShiftPercentage}% have shift, ${withoutShiftPercentage}% missing shift`);

    if (recordsWithShift.length > 0) {
      console.log('\n📋 September Shift Distribution:');
      const sortedShifts = Object.entries(shiftCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([shift, count], index) => {
          const percentage = ((count / recordsWithShift.length) * 100).toFixed(1);
          console.log(`   ${index + 1}. "${shift}": ${count} records (${percentage}%)`);
        });

      console.log('\n📋 Sample September records with shift:');
      recordsWithShift.slice(0, 15).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - Shift: ${record.shift} - Method: ${record.method}`);
      });

      if (recordsWithShift.length > 15) {
        console.log(`   ... and ${recordsWithShift.length - 15} more records`);
      }
    }

    if (recordsWithoutShift.length > 0) {
      console.log('\n📋 Sample September records without shift:');
      recordsWithoutShift.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - Method: ${record.method}`);
      });

      if (recordsWithoutShift.length > 5) {
        console.log(`   ... and ${recordsWithoutShift.length - 5} more records`);
      }
    }

    console.log('\n🎉 September shift field analysis complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  countSeptemberShiftField()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { countSeptemberShiftField };
