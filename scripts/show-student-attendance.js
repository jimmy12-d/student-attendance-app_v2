/**
 * Script to show attendance records for student "test testing" in September 2025
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

async function showStudentAttendance() {
  try {
    const studentName = 'Test Testing';
    console.log(`🚀 Searching for attendance records for student "${studentName}" in September 2025...\n`);

    // First, let's search for students with similar names to find the correct spelling
    console.log('🔍 Searching for students with "test" in their name...\n');

    const allStudentsQuery = db.collection('attendance').limit(1000); // Get a sample to find student names
    const allStudentsSnapshot = await allStudentsQuery.get();

    const studentNames = new Set();
    allStudentsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.studentName) {
        studentNames.add(data.studentName);
      }
    });

    const matchingStudents = Array.from(studentNames).filter(name =>
      name && name.toLowerCase().includes('test')
    );

    if (matchingStudents.length > 0) {
      console.log('📋 Found students with "test" in their name:');
      matchingStudents.forEach((name, index) => {
        console.log(`   ${index + 1}. "${name}"`);
      });
      console.log();
    } else {
      console.log('⚠️  No students found with "test" in their name.\n');
    }

    // Now try the original query
    const attendanceQuery = db.collection('attendance')
      .where('studentName', '==', studentName);

    const attendanceSnapshot = await attendanceQuery.get();

    if (attendanceSnapshot.empty) {
      console.log(`⚠️  No attendance records found for "${studentName}".`);
      return;
    }

    console.log(`📊 Found ${attendanceSnapshot.size} total attendance records for "${studentName}" (all time).\n`);

    // Filter for September 2025 records
    const septemberRecords = [];
    attendanceSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.date >= '2025-09-01' && data.date <= '2025-09-30') {
        septemberRecords.push({ id: doc.id, ...data });
      }
    });

    if (septemberRecords.length === 0) {
      console.log(`⚠️  No attendance records found for "${studentName}" in September 2025.`);
      return;
    }

    console.log(`📊 Found ${septemberRecords.length} attendance records for "${studentName}" in September 2025:\n`);

    let recordsWithStartTime = [];
    let recordsWithoutStartTime = [];
    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;

    // Process each September record
    septemberRecords.forEach((record) => {
      const data = record;

      const attendanceRecord = {
        id: data.id,
        date: data.date,
        startTime: data.startTime || 'N/A',
        timeIn: data.timeIn || 'N/A',
        cutoffTime: data.cutoffTime || 'N/A',
        method: data.method || 'Unknown',
        class: data.class || 'N/A',
        shift: data.shift || 'N/A',
        status: data.status || 'Unknown'
      };

      if (data.startTime !== undefined && data.startTime !== null && data.startTime !== '') {
        recordsWithStartTime.push(attendanceRecord);
      } else {
        recordsWithoutStartTime.push(attendanceRecord);
      }

      // Count attendance status
      if (data.status === 'present' || data.method === 'face' || data.method === 'manual') {
        totalPresent++;
      } else if (data.status === 'late') {
        totalLate++;
      } else if (data.status === 'absent') {
        totalAbsent++;
      }
    });

    // Display summary
    console.log('📈 ATTENDANCE SUMMARY:');
    console.log(`   📊 Total Records: ${septemberRecords.length}`);
    console.log(`   ✅ Present: ${totalPresent}`);
    console.log(`   ⏰ Late: ${totalLate}`);
    console.log(`   ❌ Absent: ${totalAbsent}`);
    console.log(`   📋 Records with startTime: ${recordsWithStartTime.length}`);
    console.log(`   📋 Records without startTime: ${recordsWithoutStartTime.length}\n`);

    // Display detailed records
    console.log('📋 DETAILED ATTENDANCE RECORDS:');
    console.log('=' .repeat(100));

    const allRecords = [...recordsWithStartTime, ...recordsWithoutStartTime];
    allRecords.sort((a, b) => a.date.localeCompare(b.date));

    allRecords.forEach((record, index) => {
      const recordDate = new Date(record.date);
      const dayName = recordDate.toLocaleDateString('en-US', { weekday: 'long' });

      console.log(`${index + 1}. ${record.date} (${dayName})`);
      console.log(`   Student: ${studentName}`);
      console.log(`   Class: ${record.class} | Shift: ${record.shift}`);
      console.log(`   Method: ${record.method} | Status: ${record.status}`);
      console.log(`   Start Time: ${record.startTime}`);
      console.log(`   Time In: ${record.timeIn}`);
      console.log(`   Cutoff Time: ${record.cutoffTime}`);
      console.log('-'.repeat(50));
    });

    // Additional analysis
    if (recordsWithStartTime.length > 0) {
      console.log('\n📋 RECORDS WITH START TIME:');
      recordsWithStartTime.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.date} - Start: ${record.startTime} - Time In: ${record.timeIn} - Method: ${record.method}`);
      });
    }

    if (recordsWithoutStartTime.length > 0) {
      console.log('\n📋 RECORDS WITHOUT START TIME:');
      recordsWithoutStartTime.forEach((record, index) => {
        console.log(`   ${index + 1}. ${record.date} - Time In: ${record.timeIn} - Method: ${record.method} - Status: ${record.status}`);
      });
    }

    console.log('\n🎉 Attendance analysis for student "test testing" completed!');

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  showStudentAttendance()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { showStudentAttendance };
