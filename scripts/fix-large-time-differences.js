/**
 * Script to fix timeIn AM/PM when difference with startTime is > 12 hours
 * Flips AM to PM or PM to AM for records with large time differences
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

// Function to parse timeIn string (12-hour format like "03:36 PM") to minutes since midnight
function parseTimeInToMinutes(timeInString) {
  if (!timeInString) return null;

  try {
    // Handle both formats: "03:36 PM" and "3:36 PM"
    const timeMatch = timeInString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) return null;

    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const period = timeMatch[3].toUpperCase();

    // Convert 12-hour to 24-hour
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }

    return hours * 60 + minutes;
  } catch (error) {
    console.error(`Error parsing timeIn: ${timeInString}`, error);
    return null;
  }
}

// Function to parse startTime string (24-hour format like "07:00") to minutes since midnight
function parseStartTimeToMinutes(startTimeString) {
  if (!startTimeString) return null;

  try {
    const [hours, minutes] = startTimeString.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error(`Error parsing startTime: ${startTimeString}`, error);
    return null;
  }
}

// Function to flip AM/PM in timeIn string
function flipTimeInPeriod(timeInString) {
  if (!timeInString) return null;

  try {
    // Extract time components
    const timeMatch = timeInString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!timeMatch) return null;

    const hours = timeMatch[1];
    const minutes = timeMatch[2];
    const currentPeriod = timeMatch[3].toUpperCase();

    // Flip AM to PM or PM to AM
    const newPeriod = currentPeriod === 'AM' ? 'PM' : 'AM';

    return `${hours}:${minutes} ${newPeriod}`;
  } catch (error) {
    console.error(`Error flipping timeIn period: ${timeInString}`, error);
    return null;
  }
}

async function fixLargeTimeDifferences() {
  try {
    console.log('🚀 Fixing timeIn AM/PM for records with >12h differences...\n');

    // Query for all attendance records
    const attendanceQuery = db.collection('attendance');
    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      console.log('⚠️  No attendance records found.');
      return;
    }

    console.log(`📊 Found ${attendanceSnapshot.size} total attendance records...\n`);

    let recordsToFix = [];
    let totalAnalyzed = 0;

    // First pass: identify records that need fixing
    for (const doc of attendanceSnapshot.docs) {
      const data = doc.data();
      totalAnalyzed++;

      // Skip records without both timeIn and startTime
      if (!data.timeIn || !data.startTime) {
        continue;
      }

      const timeInMinutes = parseTimeInToMinutes(data.timeIn);
      const startTimeMinutes = parseStartTimeToMinutes(data.startTime);

      if (timeInMinutes !== null && startTimeMinutes !== null) {
        // Calculate absolute difference in minutes
        const differenceMinutes = Math.abs(timeInMinutes - startTimeMinutes);

        // Check if difference is > 12 hours (720 minutes)
        if (differenceMinutes > 720) {
          recordsToFix.push({
            id: doc.id,
            studentName: data.studentName || 'Unknown',
            date: data.date,
            class: data.class || 'N/A',
            shift: data.shift || 'N/A',
            timeIn: data.timeIn,
            startTime: data.startTime,
            method: data.method || 'Unknown',
            status: data.status || 'N/A',
            timeInMinutes: timeInMinutes,
            startTimeMinutes: startTimeMinutes,
            differenceMinutes: differenceMinutes,
            flippedTimeIn: flipTimeInPeriod(data.timeIn)
          });
        }
      }
    }

    console.log('📈 ANALYSIS COMPLETE:');
    console.log(`   📊 Total records analyzed: ${totalAnalyzed}`);
    console.log(`   🔧 Records needing AM/PM flip (>12h difference): ${recordsToFix.length}`);
    console.log('');

    if (recordsToFix.length === 0) {
      console.log('✅ No records found that need AM/PM correction!');
      return;
    }

    console.log('🔄 PREVIEW OF CHANGES:');
    console.log('═'.repeat(120));

    // Show first 10 examples of what will be changed
    const previewRecords = recordsToFix.slice(0, 10);
    previewRecords.forEach((record, index) => {
      console.log(`${(index + 1).toString().padStart(2, ' ')}. ${record.studentName.padEnd(25)} | ${record.date} | ${record.class.padEnd(10)}`);
      console.log(`    BEFORE: timeIn: ${record.timeIn} | startTime: ${record.startTime} | Diff: ${Math.floor(record.differenceMinutes / 60)}h ${record.differenceMinutes % 60}m`);
      console.log(`    AFTER:  timeIn: ${record.flippedTimeIn} | startTime: ${record.startTime}`);
      console.log('─'.repeat(120));
    });

    if (recordsToFix.length > 10) {
      console.log(`   ... and ${recordsToFix.length - 10} more records will be updated\n`);
    }

    // Ask for confirmation (in a real scenario, you'd want user confirmation)
    console.log('⚡ STARTING BULK UPDATE...\n');

    let updatedCount = 0;
    let batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500;

    for (const record of recordsToFix) {
      const docRef = db.collection('attendance').doc(record.id);

      // Add to batch
      batch.update(docRef, { timeIn: record.flippedTimeIn });
      batchCount++;

      // Commit batch when it reaches the limit
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        updatedCount += batchCount;
        console.log(`   ✅ Updated ${updatedCount} records so far...`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining records
    if (batchCount > 0) {
      await batch.commit();
      updatedCount += batchCount;
    }

    console.log(`\n🎉 UPDATE COMPLETE!`);
    console.log(`   ✅ Successfully updated ${updatedCount} records`);
    console.log(`   🔄 Flipped AM/PM in timeIn for records with >12h differences`);

    // Verification: check a few updated records
    console.log('\n🔍 VERIFICATION - Checking updated records:');
    console.log('═'.repeat(120));

    let verificationCount = 0;
    for (const record of recordsToFix.slice(0, 5)) {
      try {
        const docRef = db.collection('attendance').doc(record.id);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
          const updatedData = docSnap.data();
          const newTimeInMinutes = parseTimeInToMinutes(updatedData.timeIn);
          const startTimeMinutes = parseStartTimeToMinutes(updatedData.startTime);
          const newDifference = Math.abs(newTimeInMinutes - startTimeMinutes);

          console.log(`${(verificationCount + 1).toString().padStart(2, ' ')}. ${record.studentName.padEnd(25)} | ${record.date}`);
          console.log(`    Original: ${record.timeIn} → Updated: ${updatedData.timeIn}`);
          console.log(`    Difference: ${Math.floor(record.differenceMinutes / 60)}h ${record.differenceMinutes % 60}m → ${Math.floor(newDifference / 60)}h ${newDifference % 60}m`);
          console.log('─'.repeat(120));
          verificationCount++;
        }
      } catch (error) {
        console.error(`Error verifying record ${record.id}:`, error);
      }
    }

  } catch (error) {
    console.error('❌ Error fixing large time differences:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  fixLargeTimeDifferences()
    .then(() => {
      console.log('\n✨ Large time difference correction completed successfully!');
    })
    .catch((error) => {
      console.error('\n💥 Correction failed:', error);
      process.exit(1);
    });
}

module.exports = { fixLargeTimeDifferences, parseTimeInToMinutes, parseStartTimeToMinutes, flipTimeInPeriod };
