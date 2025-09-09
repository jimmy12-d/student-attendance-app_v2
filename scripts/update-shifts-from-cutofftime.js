/**
 * Script to update shift field based on cutoffTime values
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

// Function to determine shift based on cutoffTime
function determineShiftFromCutoffTime(cutoffTime) {
  if (!cutoffTime || cutoffTime === 'N/A') {
    return null;
  }

  // Specific cutoffTime mappings as provided by user
  const timeMappings = {
    '07:15 AM': 'Morning',
    '01:15 PM': 'Afternoon',
    '02:45 AM': 'Afternoon',
    '06:00 PM': 'Evening'
  };

  // Check for exact matches
  if (timeMappings[cutoffTime]) {
    return timeMappings[cutoffTime];
  }

  // If no exact match, try to parse and determine based on time ranges
  const timeMatch = cutoffTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!timeMatch) {
    return null;
  }

  let hours = parseInt(timeMatch[1]);
  const minutes = parseInt(timeMatch[2]);
  const period = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period === 'AM' && hours === 12) {
    hours = 0;
  }

  const totalMinutes = hours * 60 + minutes;

  // Define shift time ranges as fallback
  const morningEnd = 12 * 60; // 12:00 PM
  const afternoonEnd = 18 * 60; // 6:00 PM

  if (totalMinutes < morningEnd) {
    return 'Morning';
  } else if (totalMinutes < afternoonEnd) {
    return 'Afternoon';
  } else {
    return 'Evening';
  }
}

async function updateShiftsFromCutoffTime() {
  try {
    console.log('🚀 Updating shift field based on cutoffTime values...\n');

    // Get all attendance records
    const attendanceQuery = db.collection('attendance');
    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      console.log('⚠️  No attendance records found.');
      return;
    }

    console.log(`📊 Processing ${attendanceSnapshot.size} total attendance records...\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let shiftUpdates = {
      Morning: 0,
      Afternoon: 0,
      Evening: 0
    };

    // Process each record
    const updatePromises = attendanceSnapshot.docs.map(async (doc) => {
      try {
        const data = doc.data();
        const docRef = doc.ref;

        // Skip if no cutoffTime
        if (!data.cutoffTime || data.cutoffTime === 'N/A' || data.cutoffTime === '') {
          skippedCount++;
          return;
        }

        // Determine new shift based on cutoffTime
        const newShift = determineShiftFromCutoffTime(data.cutoffTime);

        if (!newShift) {
          console.log(`   ⚠️  Could not parse cutoffTime: ${data.cutoffTime} for ${data.studentName || 'Unknown'} (${data.date})`);
          skippedCount++;
          return;
        }

        // Update the shift field
        await docRef.update({
          shift: newShift
        });

        updatedCount++;
        shiftUpdates[newShift]++;

        console.log(`   ✅ Updated ${data.studentName || 'Unknown'} (${data.date}) - ${data.cutoffTime} → ${newShift}`);

      } catch (error) {
        console.error(`   ❌ Error updating record ${doc.id}:`, error.message);
        skippedCount++;
      }
    });

    // Wait for all updates to complete
    await Promise.all(updatePromises);

    console.log('\n📈 Update Results:');
    console.log(`   ✅ Successfully updated: ${updatedCount} records`);
    console.log(`   ⏭️  Skipped: ${skippedCount} records (no cutoffTime or parse error)`);
    console.log(`   📊 Total processed: ${attendanceSnapshot.size} records`);

    console.log('\n📋 Shift Distribution After Update:');
    Object.entries(shiftUpdates).forEach(([shift, count]) => {
      if (count > 0) {
        const percentage = ((count / updatedCount) * 100).toFixed(1);
        console.log(`   ${shift}: ${count} records (${percentage}%)`);
      }
    });

    console.log('\n🎉 Shift update from cutoffTime complete!');

  } catch (error) {
    console.error('❌ Error during update:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  updateShiftsFromCutoffTime()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateShiftsFromCutoffTime };
