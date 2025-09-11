/**
 * Script to fix attendance records in September where time difference > 60 minutes
 * and method is 'manual' or 'request' by setting timeIn to startTime
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
    console.log('Firebase initialized');
  } catch (error) {
    // Fallback to environment variables
    console.log('Using default credentials...');
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('Firebase initialized');
  }
}

const db = admin.firestore();

// Function to parse startTime string to minutes since midnight (24-hour format)
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

// Function to parse timeIn string to minutes since midnight (24-hour format)
function parseTimeInToMinutes(timeInString) {
  if (!timeInString) return null;

  try {
    const [hours, minutes] = timeInString.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error(`Error parsing timeIn: ${timeInString}`, error);
    return null;
  }
}

// Function to convert Firestore timestamp to minutes since midnight (Phnom Penh time - UTC+7)
function timestampToMinutesSinceMidnight(timestamp) {
  if (!timestamp) return null;

  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);

    // Firestore timestamps are stored in UTC, convert to Phnom Penh time (UTC+7)
    // Cambodia/Phnom Penh timezone offset: +7 hours from UTC
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();

    // Convert UTC to Phnom Penh time (UTC+7)
    let phnomPenhHours = utcHours + 7;

    // Handle day boundary (if UTC+7 goes to next day)
    if (phnomPenhHours >= 24) {
      phnomPenhHours -= 24;
    }

    return phnomPenhHours * 60 + utcMinutes;
  } catch (error) {
    console.error('Error converting timestamp:', error);
    return null;
  }
}

async function fixLargeTimeDifferencesInSeptember() {
  try {
    console.log('Fixing large time differences...');

    // Query for all attendance records in September 2025
    const septemberQuery = db.collection('attendance')
      .where('date', '>=', '2025-09-01')
      .where('date', '<=', '2025-09-30');

    const septemberSnapshot = await septemberQuery.get();

    if (septemberSnapshot.empty) {
      console.log('No records found');
      return;
    }

    console.log(`Found ${septemberSnapshot.size} records`);

    let recordsToFix = [];
    let recordsAnalyzed = 0;

    // Process each record
    for (const doc of septemberSnapshot.docs) {
      const data = doc.data();

      // Skip records without required fields
      if (!data.startTime || !data.timestamp || !data.timeIn) {
        continue;
      }

      // Check if method is manual or request
      const method = data.method || 'Unknown';
      if (method !== 'manual' && method !== 'request') {
        continue;
      }

      recordsAnalyzed++;

      const startTimeMinutes = parseStartTimeToMinutes(data.startTime);
      const timeInMinutes = parseTimeInToMinutes(data.timeIn);

      if (startTimeMinutes !== null && timeInMinutes !== null) {
        // Calculate time difference between timeIn and startTime
        const timeDifference = Math.abs(timeInMinutes - startTimeMinutes);

        // Check if difference is bigger than 60 minutes
        if (timeDifference > 60) {
          recordsToFix.push({
            id: doc.id,
            studentName: data.studentName || 'Unknown',
            date: data.date,
            class: data.class || 'N/A',
            startTime: data.startTime,
            originalTimeIn: data.timeIn,
            timeDifference: timeDifference,
            docRef: doc.ref
          });
        }
      }
    }

    console.log(`Analyzed: ${recordsAnalyzed}, To fix: ${recordsToFix.length}`);

    if (recordsToFix.length > 0) {
      console.log('Records to fix:');
      recordsToFix.forEach((record, index) => {
        console.log(`${index + 1}. ${record.studentName} | ${record.date} | ${record.class} | ${record.originalTimeIn} -> ${record.startTime} (${record.timeDifference}m)`);
      });

      console.log('Proceeding with fixes...');

      let successCount = 0;
      let errorCount = 0;

      for (const record of recordsToFix) {
        try {
          await record.docRef.update({
            timeIn: record.startTime
          });

          console.log(`Fixed: ${record.studentName} (${record.date}) - ${record.originalTimeIn} -> ${record.startTime}`);
          successCount++;
        } catch (error) {
          console.error(`Error: ${record.studentName}`, error.message);
          errorCount++;
        }
      }

      console.log(`Completed: ${successCount} fixed, ${errorCount} errors`);
    } else {
      console.log('No records need fixing');
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  fixLargeTimeDifferencesInSeptember()
    .then(() => {
      console.log('Script completed successfully');
    })
    .catch((error) => {
      console.error('Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixLargeTimeDifferencesInSeptember, parseStartTimeToMinutes, parseTimeInToMinutes, timestampToMinutesSinceMidnight };
