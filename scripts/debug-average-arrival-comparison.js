/**
 * Debug script to compare dashboard logic vs script logic for Class 11A Morning
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(__dirname, '../firestore-upload/serviceAccountKey.json'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with service account');
  } catch (error) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with default credentials');
  }
}

const db = admin.firestore();

// Dashboard's parseTimeInToMinutes (24-hour format only)
function dashboardParseTimeInToMinutes(timeInString) {
  if (!timeInString) return null;

  try {
    const [hours, minutes] = timeInString.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    console.error(`Error parsing timeIn: ${timeInString}`, error);
    return null;
  }
}

// Script's parseTimeInToMinutes (both 12-hour and 24-hour format)
function scriptParseTimeInToMinutes(timeInString) {
  if (!timeInString) return null;

  try {
    // First try 12-hour format with AM/PM
    const timeMatch12 = timeInString.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (timeMatch12) {
      let hours = parseInt(timeMatch12[1]);
      const minutes = parseInt(timeMatch12[2]);
      const period = timeMatch12[3].toUpperCase();

      // Convert 12-hour to 24-hour
      if (period === 'PM' && hours !== 12) {
        hours += 12;
      } else if (period === 'AM' && hours === 12) {
        hours = 0;
      }

      return hours * 60 + minutes;
    }

    // Then try 24-hour format without AM/PM
    const timeMatch24 = timeInString.match(/^(\d{1,2}):(\d{2})$/);
    if (timeMatch24) {
      const hours = parseInt(timeMatch24[1]);
      const minutes = parseInt(timeMatch24[2]);
      return hours * 60 + minutes;
    }

    return null;
  } catch (error) {
    console.error(`Error parsing timeIn: ${timeInString}`, error);
    return null;
  }
}

// Dashboard's parseStartTimeToMinutes
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

// Dashboard's formatAverageDifference
function formatAverageDifference(minutes) {
    const absMinutes = Math.abs(minutes);
    const hours = Math.floor(absMinutes / 60);
    const mins = Math.round(absMinutes % 60);
    
    let timeStr = '';
    if (hours > 0) {
        timeStr = `${hours}h ${mins}m`;
    } else {
        timeStr = `${mins}m`;
    }
    
    if (minutes > 0) {
        return `-${timeStr} late`;
    } else if (minutes < 0) {
        return `+${timeStr} early`;
    } else {
        return 'on time';
    }
}

async function debugAverageArrivalComparison() {
  try {
    console.log('🔍 Debugging average arrival time calculation differences...\n');

    // Get September 2025 attendance records
    const attendanceQuery = db.collection('attendance')
      .where('date', '>=', '2025-09-01')
      .where('date', '<=', '2025-09-30');

    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      console.log('⚠️  No September attendance records found.');
      return;
    }

    // Filter for Class 11A Morning
    const class11AMorningRecords = [];
    for (const doc of attendanceSnapshot.docs) {
      const data = doc.data();
      if (data.class === 'Class 11A' && data.shift === 'Morning') {
        class11AMorningRecords.push(data);
      }
    }

    console.log(`📊 Found ${class11AMorningRecords.length} Class 11A Morning records\n`);

    // Test parsing differences
    console.log('🔍 PARSING COMPARISON:');
    console.log('═'.repeat(80));
    
    const sampleRecords = class11AMorningRecords.slice(0, 5);
    sampleRecords.forEach((record, index) => {
      const dashboardTimeIn = dashboardParseTimeInToMinutes(record.timeIn);
      const scriptTimeIn = scriptParseTimeInToMinutes(record.timeIn);
      const startTime = parseStartTimeToMinutes(record.startTime);
      
      console.log(`${index + 1}. ${record.studentName} (${record.date})`);
      console.log(`   timeIn: "${record.timeIn}" | startTime: "${record.startTime}"`);
      console.log(`   Dashboard parsing: ${dashboardTimeIn} minutes`);
      console.log(`   Script parsing: ${scriptTimeIn} minutes`);
      console.log(`   Start time: ${startTime} minutes`);
      console.log(`   Dashboard diff: ${dashboardTimeIn !== null && startTime !== null ? dashboardTimeIn - startTime : 'N/A'}`);
      console.log(`   Script diff: ${scriptTimeIn !== null && startTime !== null ? scriptTimeIn - startTime : 'N/A'}`);
      console.log('');
    });

    // Group by student and calculate averages using both methods
    const studentRecordsDashboard = new Map();
    const studentRecordsScript = new Map();

    class11AMorningRecords.forEach(record => {
      // Skip absent or permission
      if (record.status === 'absent' || record.status === 'permission') {
        return;
      }

      // Only include records with both timeIn and startTime
      if (record.timeIn && record.startTime && record.studentName) {
        const studentName = record.studentName;

        // Dashboard calculation
        const dashboardTimeIn = dashboardParseTimeInToMinutes(record.timeIn);
        const startTimeMinutes = parseStartTimeToMinutes(record.startTime);
        
        if (dashboardTimeIn !== null && startTimeMinutes !== null) {
          let dashboardDiff = dashboardTimeIn - startTimeMinutes;
          if (dashboardDiff < -30) dashboardDiff = -30; // Cap early arrivals
          
          if (!studentRecordsDashboard.has(studentName)) {
            studentRecordsDashboard.set(studentName, []);
          }
          studentRecordsDashboard.get(studentName).push(dashboardDiff);
        }

        // Script calculation
        const scriptTimeIn = scriptParseTimeInToMinutes(record.timeIn);
        
        if (scriptTimeIn !== null && startTimeMinutes !== null) {
          let scriptDiff = scriptTimeIn - startTimeMinutes;
          if (scriptDiff < -30) scriptDiff = -30; // Cap early arrivals
          
          if (!studentRecordsScript.has(studentName)) {
            studentRecordsScript.set(studentName, []);
          }
          studentRecordsScript.get(studentName).push(scriptDiff);
        }
      }
    });

    console.log('\n📊 AVERAGE CALCULATION COMPARISON:');
    console.log('═'.repeat(100));

    const students = Array.from(new Set([...studentRecordsDashboard.keys(), ...studentRecordsScript.keys()]));
    
    students.forEach(studentName => {
      const dashboardDiffs = studentRecordsDashboard.get(studentName) || [];
      const scriptDiffs = studentRecordsScript.get(studentName) || [];
      
      const dashboardAvg = dashboardDiffs.length > 0 ? 
        dashboardDiffs.reduce((sum, diff) => sum + diff, 0) / dashboardDiffs.length : null;
      const scriptAvg = scriptDiffs.length > 0 ? 
        scriptDiffs.reduce((sum, diff) => sum + diff, 0) / scriptDiffs.length : null;

      console.log(`${studentName}:`);
      console.log(`  Dashboard: ${dashboardAvg !== null ? formatAverageDifference(dashboardAvg) : 'N/A'} (${dashboardDiffs.length} records)`);
      console.log(`  Script:    ${scriptAvg !== null ? formatAverageDifference(scriptAvg) : 'N/A'} (${scriptDiffs.length} records)`);
      console.log(`  Match:     ${Math.abs(dashboardAvg - scriptAvg) < 0.1 ? '✅' : '❌'}`);
      
      if (dashboardDiffs.length > 0 && scriptDiffs.length > 0) {
        console.log(`  Dashboard diffs: [${dashboardDiffs.join(', ')}]`);
        console.log(`  Script diffs:    [${scriptDiffs.join(', ')}]`);
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error in debug comparison:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  debugAverageArrivalComparison()
    .then(() => {
      console.log('✨ Debug comparison completed successfully!');
    })
    .catch((error) => {
      console.error('💥 Debug comparison failed:', error);
      process.exit(1);
    });
}

module.exports = { debugAverageArrivalComparison };
