/**
 * Script to check if all September attendance records have startTime field
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

async function checkSeptemberStartTimeField() {
  try {
    console.log('🚀 Checking if all September attendance records have startTime field...\n');

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

    let recordsWithStartTime = [];
    let recordsWithoutStartTime = [];
    let recordsWithEmptyStartTime = [];

    // Process each record
    septemberSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const startTime = data.startTime;

      if (startTime !== undefined && startTime !== null && startTime !== '') {
        recordsWithStartTime.push({
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          class: data.class || 'Unknown',
          shift: data.shift || 'Unknown',
          startTime: startTime
        });
      } else if (startTime === '' || startTime === null) {
        recordsWithEmptyStartTime.push({
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          class: data.class || 'Unknown',
          shift: data.shift || 'Unknown'
        });
      } else {
        recordsWithoutStartTime.push({
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          class: data.class || 'Unknown',
          shift: data.shift || 'Unknown'
        });
      }
    });

    console.log('📈 September startTime Field Analysis:');
    console.log('=' .repeat(80));
    console.log(`   📊 Total September records: ${septemberSnapshot.size}`);
    console.log(`   ✅ Records with startTime field: ${recordsWithStartTime.length}`);
    console.log(`   ❌ Records without startTime field: ${recordsWithoutStartTime.length}`);
    console.log(`   📝 Records with empty startTime: ${recordsWithEmptyStartTime.length}`);

    const withStartTimePercentage = ((recordsWithStartTime.length / septemberSnapshot.size) * 100).toFixed(1);
    const withoutStartTimePercentage = (((recordsWithoutStartTime.length + recordsWithEmptyStartTime.length) / septemberSnapshot.size) * 100).toFixed(1);

    console.log(`   📈 Coverage: ${withStartTimePercentage}% have startTime, ${withoutStartTimePercentage}% missing/empty`);

    if (recordsWithStartTime.length > 0) {
      console.log('\n📋 Sample records WITH startTime:');
      recordsWithStartTime.slice(0, 10).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - ${record.class} - ${record.shift} - Start: ${record.startTime}`);
      });

      if (recordsWithStartTime.length > 10) {
        console.log(`   ... and ${recordsWithStartTime.length - 10} more records`);
      }

      // Analyze startTime values
      const startTimeCounts = {};
      recordsWithStartTime.forEach(record => {
        if (!startTimeCounts[record.startTime]) {
          startTimeCounts[record.startTime] = 0;
        }
        startTimeCounts[record.startTime]++;
      });

      console.log('\n⏰ Start Time Distribution:');
      Object.entries(startTimeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .forEach(([time, count], index) => {
          const percentage = ((count / recordsWithStartTime.length) * 100).toFixed(1);
          console.log(`   ${index + 1}. "${time}": ${count} records (${percentage}%)`);
        });
    }

    if (recordsWithoutStartTime.length > 0) {
      console.log('\n❌ Records WITHOUT startTime field:');
      recordsWithoutStartTime.slice(0, 10).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - ${record.class} - ${record.shift}`);
      });

      if (recordsWithoutStartTime.length > 10) {
        console.log(`   ... and ${recordsWithoutStartTime.length - 10} more records`);
      }
    }

    if (recordsWithEmptyStartTime.length > 0) {
      console.log('\n📝 Records with EMPTY startTime field:');
      recordsWithEmptyStartTime.slice(0, 10).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - ${record.class} - ${record.shift}`);
      });

      if (recordsWithEmptyStartTime.length > 10) {
        console.log(`   ... and ${recordsWithEmptyStartTime.length - 10} more records`);
      }
    }

    console.log('\n🎉 September startTime field check complete!');

  } catch (error) {
    console.error('❌ Error during check:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  checkSeptemberStartTimeField()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkSeptemberStartTimeField };
