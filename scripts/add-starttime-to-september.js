/**
 * Script to add startTime field to all September attendance records
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

async function addStartTimeToSeptemberAttendance() {
  try {
    console.log('🚀 Adding startTime field to September attendance records...\n');

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

    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let recordsAlreadyHaveStartTime = 0;
    let failedLookups = [];

    // Process each attendance record
    for (const doc of septemberSnapshot.docs) {
      const attendanceData = doc.data();
      const className = attendanceData.class || '';
      const shift = attendanceData.shift || '';
      const currentStartTime = attendanceData.startTime;

      // Skip if already has startTime
      if (currentStartTime !== undefined && currentStartTime !== null && currentStartTime !== '') {
        recordsAlreadyHaveStartTime++;
        continue;
      }

      // Skip if missing required fields
      if (!className || !shift) {
        recordsSkipped++;
        continue;
      }

      // Remove "Class " prefix from class name
      const cleanClassName = className.replace(/^Class\s+/, '');

      try {
        // Look up class document
        const classDoc = await db.collection('classes').doc(cleanClassName).get();

        if (classDoc.exists) {
          const classData = classDoc.data();
          const shifts = classData.shifts || {};

          if (shifts[shift] && shifts[shift].startTime) {
            let startTimeToSet = shifts[shift].startTime;

            // Special case: Class 12NKGS on Saturday should be 13:00
            if (cleanClassName === '12NKGS') {
              const date = new Date(attendanceData.date);
              if (date.getDay() === 6) { // Saturday
                startTimeToSet = '13:00';
              }
            }

            // Update the attendance record with startTime
            await db.collection('attendance').doc(doc.id).update({
              startTime: startTimeToSet
            });

            console.log(`   ✅ Updated ${attendanceData.studentName || 'Unknown'} (${attendanceData.date}) - ${cleanClassName} ${shift} → ${startTimeToSet}`);
            recordsUpdated++;
          } else {
            failedLookups.push({
              id: doc.id,
              studentName: attendanceData.studentName || 'Unknown',
              date: attendanceData.date,
              class: cleanClassName,
              shift: shift,
              issue: 'Shift not found in class document'
            });
          }
        } else {
          failedLookups.push({
            id: doc.id,
            studentName: attendanceData.studentName || 'Unknown',
            date: attendanceData.date,
            class: cleanClassName,
            shift: shift,
            issue: 'Class document not found'
          });
        }
      } catch (error) {
        console.log(`   ❌ Error updating ${attendanceData.studentName || 'Unknown'}: ${error.message}`);
        failedLookups.push({
          id: doc.id,
          studentName: attendanceData.studentName || 'Unknown',
          date: attendanceData.date,
          class: cleanClassName,
          shift: shift,
          issue: error.message
        });
      }
    }

    console.log('\n📊 Update Results:');
    console.log(`   ✅ Records updated with startTime: ${recordsUpdated}`);
    console.log(`   ⏭️  Records already had startTime: ${recordsAlreadyHaveStartTime}`);
    console.log(`   ⏭️  Records skipped (missing class/shift): ${recordsSkipped}`);
    console.log(`   ❌ Failed lookups: ${failedLookups.length}`);

    if (failedLookups.length > 0) {
      console.log('\n❌ Failed Lookups:');
      failedLookups.slice(0, 10).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - ${record.class} ${record.shift}: ${record.issue}`);
      });

      if (failedLookups.length > 10) {
        console.log(`   ... and ${failedLookups.length - 10} more`);
      }
    }

    console.log('\n🎉 StartTime field addition complete!');

  } catch (error) {
    console.error('❌ Error during update process:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  addStartTimeToSeptemberAttendance()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addStartTimeToSeptemberAttendance };
