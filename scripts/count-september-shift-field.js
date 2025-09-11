/**
 * Script to count and analyze startTime field values in September 2025 attendance records
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

async function countSeptemberStartTimeField() {
  try {
    console.log('🚀 Counting and analyzing startTime field values for September 2025...\n');

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
    let recordsWithoutStartTimeWithCutoff = [];
    let recordsWithoutStartTimeWithoutCutoff = [];
    let class12NKGSSaturdayRecords = [];
    let startTimeCounts = {};
    let uniqueStartTimes = new Set();

    // Process each record
    septemberSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      if (data.startTime !== undefined && data.startTime !== null && data.startTime !== '') {
        const startTime = data.startTime;
        recordsWithStartTime.push({
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          startTime: startTime,
          method: data.method || 'Unknown',
          timeIn: data.timeIn || 'N/A'
        });

        // Count startTimes
        if (!startTimeCounts[startTime]) {
          startTimeCounts[startTime] = 0;
        }
        startTimeCounts[startTime]++;

        // Track unique startTimes
        uniqueStartTimes.add(startTime);
      } else {
        // Check if record has cutoffTime
        const hasCutoffTime = data.cutoffTime !== undefined && data.cutoffTime !== null && data.cutoffTime !== '';
        
        const record = {
          id: doc.id,
          studentName: data.studentName || 'Unknown',
          date: data.date,
          method: data.method || 'Unknown',
          cutoffTime: data.cutoffTime || 'N/A',
          class: data.class || 'N/A',
          shift: data.shift || 'N/A'
        };

        recordsWithoutStartTime.push(record);
        
        if (hasCutoffTime) {
          recordsWithoutStartTimeWithCutoff.push(record);
          
          // Check for Class 12NKGS on Saturday
          if (data.class && data.class.includes('12NKGS')) {
            const recordDate = new Date(data.date);
            const dayOfWeek = recordDate.getDay(); // 0 = Sunday, 6 = Saturday
            
            if (dayOfWeek === 6) { // Saturday
              class12NKGSSaturdayRecords.push({
                ...record,
                dayOfWeek: 'Saturday'
              });
            }
          }
        } else {
          recordsWithoutStartTimeWithoutCutoff.push(record);
        }
      }
    });

    console.log('📈 September 2025 StartTime Field Analysis:');
    console.log(`   📊 Total September records: ${septemberSnapshot.size}`);
    console.log(`   ✅ Records with startTime field: ${recordsWithStartTime.length}`);
    console.log(`   ❌ Records without startTime field: ${recordsWithoutStartTime.length}`);
    console.log(`   🎯 Unique startTime values: ${uniqueStartTimes.size}`);

    const withStartTimePercentage = ((recordsWithStartTime.length / septemberSnapshot.size) * 100).toFixed(1);
    const withoutStartTimePercentage = ((recordsWithoutStartTime.length / septemberSnapshot.size) * 100).toFixed(1);

    console.log(`   📈 Coverage: ${withStartTimePercentage}% have startTime, ${withoutStartTimePercentage}% missing startTime`);

    // Add cutoffTime analysis for records without startTime
    if (recordsWithoutStartTime.length > 0) {
      const withCutoffPercentage = ((recordsWithoutStartTimeWithCutoff.length / recordsWithoutStartTime.length) * 100).toFixed(1);
      const withoutCutoffPercentage = ((recordsWithoutStartTimeWithoutCutoff.length / recordsWithoutStartTime.length) * 100).toFixed(1);

      console.log(`   🔍 CutoffTime Analysis (for records without startTime):`);
      console.log(`      ✅ Have cutoffTime: ${recordsWithoutStartTimeWithCutoff.length} (${withCutoffPercentage}%)`);
      console.log(`      ❌ Missing cutoffTime: ${recordsWithoutStartTimeWithoutCutoff.length} (${withoutCutoffPercentage}%)`);
    }

    if (recordsWithStartTime.length > 0) {
      console.log('\n📋 September StartTime Distribution:');
      const sortedStartTimes = Object.entries(startTimeCounts)
        .sort(([,a], [,b]) => b - a)
        .forEach(([startTime, count], index) => {
          const percentage = ((count / recordsWithStartTime.length) * 100).toFixed(1);
          console.log(`   ${index + 1}. "${startTime}": ${count} records (${percentage}%)`);
        });

      console.log('\n📋 Sample September records with startTime:');
      recordsWithStartTime.slice(0, 15).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - StartTime: ${record.startTime} - Method: ${record.method}`);
      });

      if (recordsWithStartTime.length > 15) {
        console.log(`   ... and ${recordsWithStartTime.length - 15} more records`);
      }
    }

    if (recordsWithoutStartTime.length > 0) {
      console.log('\n📋 All September records without startTime (44 records):');
      recordsWithoutStartTime.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - Method: ${record.method} - Status: ${record.status || 'N/A'}`);
      });

      // Show breakdown of records with and without cutoffTime
      if (recordsWithoutStartTimeWithCutoff.length > 0) {
        console.log('\n📋 Sample records without startTime BUT with cutoffTime:');
        recordsWithoutStartTimeWithCutoff.slice(0, 5).forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - CutoffTime: ${record.cutoffTime}`);
        });
      }

      if (recordsWithoutStartTimeWithoutCutoff.length > 0) {
        console.log('\n📋 Sample records without startTime AND without cutoffTime:');
        recordsWithoutStartTimeWithoutCutoff.slice(0, 5).forEach((record, index) => {
          console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - No cutoffTime`);
        });
      }
    }

    // Special analysis for Class 12NKGS on Saturday
    if (class12NKGSSaturdayRecords.length > 0) {
      console.log('\n🎯 SPECIAL ANALYSIS: Class 12NKGS Saturday Records (with cutoffTime but no startTime):');
      console.log(`   📊 Found ${class12NKGSSaturdayRecords.length} Class 12NKGS Saturday records with cutoffTime but missing startTime`);
      
      console.log('\n📋 All Class 12NKGS Saturday records:');
      class12NKGSSaturdayRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - ${record.dayOfWeek}`);
        console.log(`      Class: ${record.class} | Shift: ${record.shift} | CutoffTime: ${record.cutoffTime} | Method: ${record.method}`);
      });
    } else {
      console.log('\n🎯 SPECIAL ANALYSIS: Class 12NKGS Saturday Records');
      console.log('   📊 No Class 12NKGS Saturday records found with cutoffTime but missing startTime');
    }

    console.log('\n🎉 September startTime field analysis complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  countSeptemberStartTimeField()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { countSeptemberStartTimeField };
