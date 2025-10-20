/**
 * Script to find all students who didn't attend on 2025-10-14 and write to JSON file
 */

const admin = require('firebase-admin');
const fs = require('fs');
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

// Cambodian holidays for 2025
const cambodianHolidaysSet = new Set([
  "2025-01-01", "2025-01-07", "2025-03-08", "2025-05-01",
  "2025-05-14", "2025-05-15", "2025-05-16",
  "2025-06-18",
  "2025-08-01", "2025-08-02",
  "2025-09-22","2025-09-23","2025-09-24",
  "2025-11-07", "2025-11-08", "2025-11-09",
  "2025-10-15",
  "2025-10-29",
  "2025-11-09",
  "2025-11-20", "2025-11-21", "2025-11-22",
]);

// Function to check if a date is a school day
const isSchoolDay = (date, classStudyDays) => {
  const dayOfWeek = date.getDay();
  const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  if (cambodianHolidaysSet.has(dateString)) return false;
  if (classStudyDays && classStudyDays.length > 0) return classStudyDays.includes(dayOfWeek);
  return dayOfWeek !== 0; // Not Sunday
};

async function findAbsentStudents() {
  try {
    const targetDate = '2025-10-14';
    console.log(`🚀 Finding students who didn't attend on ${targetDate}...\n`);

    // Get all class configurations
    const classesSnapshot = await db.collection('classes').get();
    const allClassConfigs = {};
    classesSnapshot.forEach(doc => {
      allClassConfigs[doc.id] = doc.data();
    });
    console.log(`📊 Loaded ${Object.keys(allClassConfigs).length} class configurations\n`);

    // Get all active students (not dropped, not onBreak, not onWaitlist)
    // Note: Using simple query to avoid composite index requirements
    const studentsSnapshot = await db.collection('students').get();

    if (studentsSnapshot.empty) {
      console.log('⚠️  No students found.');
      return;
    }

    console.log(`📊 Found ${studentsSnapshot.size} total students\n`);

    // Filter active students in code
    const activeStudents = [];
    studentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isActive !== false && !data.dropped && !data.onBreak && !data.onWaitlist) {
        activeStudents.push({ id: doc.id, ...data });
      }
    });

    console.log(`📊 Found ${activeStudents.length} active students after filtering\n`);

    // Get all attendance records for the target date
    const attendanceQuery = db.collection('attendance')
      .where('date', '==', targetDate);

    const attendanceSnapshot = await attendanceQuery.get();
    console.log(`📊 Found ${attendanceSnapshot.size} attendance records for ${targetDate}\n`);

    // Create a map of studentId to attendance record
    const attendanceMap = new Map();
    attendanceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.studentId) {
        attendanceMap.set(data.studentId, data);
      }
    });

    // Find absent students
    const absentStudents = [];
    const targetDateObj = new Date(targetDate);

    for (const student of activeStudents) {

      // Check if student has attendance record
      const attendanceRecord = attendanceMap.get(student.id);

      if (attendanceRecord) {
        // Student has attendance record, skip
        continue;
      }

      // Check if it's a school day for this student's class
      const studentClassKey = student.class?.replace(/^Class\s+/i, '') || '';
      const classConfig = allClassConfigs[studentClassKey];
      const classStudyDays = classConfig?.studyDays;

      const isSchoolDayResult = isSchoolDay(targetDateObj, classStudyDays);

      if (isSchoolDayResult) {
        // It's a school day and no attendance record = absent
        absentStudents.push({
          studentId: student.id,
          studentName: student.fullName || student.name || 'Unknown',
          class: student.class,
          shift: student.shift,
          date: targetDate,
          status: 'absent',
          reason: 'No attendance record on school day'
        });
      }
    }

    console.log(`📊 Found ${absentStudents.length} absent students on ${targetDate}\n`);

    // Write to JSON file
    const outputPath = path.join(__dirname, `absent-students-${targetDate}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(absentStudents, null, 2));

    console.log(`✅ Absent students data written to: ${outputPath}`);
    console.log(`📄 Total absent students: ${absentStudents.length}`);

    // Show sample of results
    if (absentStudents.length > 0) {
      console.log('\n📋 Sample of absent students:');
      absentStudents.slice(0, 5).forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.studentName} (${student.class})`);
      });
      if (absentStudents.length > 5) {
        console.log(`   ... and ${absentStudents.length - 5} more`);
      }
    }

  } catch (error) {
    console.error('❌ Error finding absent students:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  findAbsentStudents()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { findAbsentStudents };