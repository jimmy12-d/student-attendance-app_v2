/**
 * Script to find top 10 earliest and latest attendance times compared to class start times
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

// Helper function to parse time string to minutes
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;

  // Handle different time formats
  const formats = [
    /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i,  // 07:00 AM, 7:00, 07:00
    /^(\d{1,2}):(\d{2})$/,              // 07:00
    /^(\d{1,2})(\d{2})$/,               // 0700
  ];

  for (const format of formats) {
    const match = timeStr.match(format);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3];

      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hours !== 12) {
          hours += 12;
        } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
          hours = 0;
        }
      }

      return hours * 60 + minutes;
    }
  }

  return null;
}

// Helper function to format minutes back to time string
function formatMinutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`;
}

// Helper function to format difference in minutes to readable string
function formatTimeDifference(minutes) {
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = absMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${mins}m`;
  } else {
    return `${mins}m`;
  }
}

async function analyzeAttendanceTiming() {
  try {
    console.log('🚀 Analyzing attendance timing differences from class start times...\n');

    // Query for records in September 2025
    const septemberQuery = db.collection('attendance')
      .where('date', '>=', '2025-09-01')
      .where('date', '<=', '2025-09-30');

    const septemberSnapshot = await septemberQuery.get();

    if (septemberSnapshot.empty) {
      console.log('⚠️  No attendance records found for September 2025.');
      return;
    }

    console.log(`📊 Processing ${septemberSnapshot.size} attendance records...\n`);

    let processedRecords = [];
    let failedParsing = [];

    // Process each attendance record
    for (const doc of septemberSnapshot.docs) {
      const attendanceData = doc.data();
      const className = attendanceData.class || '';
      const shift = attendanceData.shift || '';
      const timeIn = attendanceData.timeIn || '';

      // Skip if missing required data
      if (!className || !shift || !timeIn) {
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
            const startTimeStr = shifts[shift].startTime;

            // Parse both times
            const startTimeMinutes = parseTimeToMinutes(startTimeStr);
            const timeInMinutes = parseTimeToMinutes(timeIn);

            if (startTimeMinutes !== null && timeInMinutes !== null) {
              // Calculate difference (positive = late, negative = early)
              const differenceMinutes = timeInMinutes - startTimeMinutes;

              processedRecords.push({
                id: doc.id,
                studentName: attendanceData.studentName || 'Unknown',
                date: attendanceData.date,
                class: className,
                cleanClassName: cleanClassName,
                shift: shift,
                classStartTime: startTimeStr,
                timeIn: timeIn,
                differenceMinutes: differenceMinutes,
                status: differenceMinutes > 0 ? 'Late' : differenceMinutes < 0 ? 'Early' : 'On Time'
              });
            } else {
              failedParsing.push({
                id: doc.id,
                studentName: attendanceData.studentName || 'Unknown',
                date: attendanceData.date,
                classStartTime: startTimeStr,
                timeIn: timeIn,
                issue: 'Time parsing failed'
              });
            }
          }
        }
      } catch (error) {
        console.log(`   ⚠️  Error processing ${cleanClassName}:`, error.message);
      }
    }

    console.log('📈 Attendance Timing Analysis:');
    console.log('=' .repeat(100));
    console.log(`   📊 Total records processed: ${processedRecords.length}`);
    console.log(`   ❌ Failed parsing: ${failedParsing.length}`);

    if (processedRecords.length === 0) {
      console.log('⚠️  No valid records found for timing analysis.');
      return;
    }

    // Sort by difference (earliest first, then latest)
    const sortedByDifference = processedRecords.sort((a, b) => a.differenceMinutes - b.differenceMinutes);

    // Get top 10 earliest (most negative difference)
    const top10Earliest = sortedByDifference.slice(0, 10);

    // Get top 10 latest (most positive difference)
    const top10Latest = sortedByDifference.slice(-10).reverse();

    console.log('\n🏆 TOP 10 EARLIEST ARRIVALS (compared to class start time):');
    console.log('-'.repeat(100));

    top10Earliest.forEach((record, index) => {
      const diffStr = formatTimeDifference(record.differenceMinutes);
      console.log(`${index + 1}. ${record.studentName}`);
      console.log(`   📅 Date: ${record.date}`);
      console.log(`   📚 Class: ${record.cleanClassName} (${record.shift})`);
      console.log(`   ⏰ Class Start: ${record.classStartTime}`);
      console.log(`   🕒 Time In: ${record.timeIn}`);
      console.log(`   ⏱️  Difference: ${diffStr} early`);
      console.log('');
    });

    console.log('\n🐌 TOP 10 LATEST ARRIVALS (compared to class start time):');
    console.log('-'.repeat(100));

    top10Latest.forEach((record, index) => {
      const diffStr = formatTimeDifference(record.differenceMinutes);
      console.log(`${index + 1}. ${record.studentName}`);
      console.log(`   📅 Date: ${record.date}`);
      console.log(`   📚 Class: ${record.cleanClassName} (${record.shift})`);
      console.log(`   ⏰ Class Start: ${record.classStartTime}`);
      console.log(`   🕒 Time In: ${record.timeIn}`);
      console.log(`   ⏱️  Difference: ${diffStr} late`);
      console.log('');
    });

    // Summary statistics
    const onTimeCount = processedRecords.filter(r => r.differenceMinutes === 0).length;
    const earlyCount = processedRecords.filter(r => r.differenceMinutes < 0).length;
    const lateCount = processedRecords.filter(r => r.differenceMinutes > 0).length;

    console.log('📊 TIMING SUMMARY:');
    console.log(`   ⏰ On Time: ${onTimeCount} records (${((onTimeCount / processedRecords.length) * 100).toFixed(1)}%)`);
    console.log(`   🏆 Early: ${earlyCount} records (${((earlyCount / processedRecords.length) * 100).toFixed(1)}%)`);
    console.log(`   🐌 Late: ${lateCount} records (${((lateCount / processedRecords.length) * 100).toFixed(1)}%)`);

    if (failedParsing.length > 0) {
      console.log('\n⚠️  TIME PARSING ISSUES:');
      failedParsing.slice(0, 5).forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.studentName} (${record.date}) - ${record.issue}`);
      });
      if (failedParsing.length > 5) {
        console.log(`   ... and ${failedParsing.length - 5} more`);
      }
    }

    console.log('\n🎉 Attendance timing analysis complete!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  analyzeAttendanceTiming()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzeAttendanceTiming };
