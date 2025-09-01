const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firestore-upload/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Import the attendance logic
const { getStudentDailyStatus, isSchoolDay } = require('./app/dashboard/_lib/attendanceLogic.ts');

async function debugAugustAttendance() {
  try {
    console.log('🔍 Debugging August attendance issue...');
    
    // Get a sample student
    const studentsSnapshot = await db.collection('students')
      .where('ay', '==', '2026')
      .limit(1)
      .get();
    
    if (studentsSnapshot.empty) {
      console.log('No students found');
      return;
    }
    
    const student = { id: studentsSnapshot.docs[0].id, ...studentsSnapshot.docs[0].data() };
    console.log(`Sample student: ${student.fullName} (Class: ${student.class}, Shift: ${student.shift})`);
    
    // Get class configurations
    const classesSnapshot = await db.collection('classes').get();
    const allClassConfigs = {};
    classesSnapshot.forEach(doc => {
      allClassConfigs[doc.id] = doc.data();
    });
    
    // Extract class ID by removing "Class " prefix
    const studentClassKey = student.class?.replace(/^Class\s+/i, '') || '';
    const classConfig = allClassConfigs[studentClassKey];
    
    console.log(`\nClass configuration for ${studentClassKey}:`, classConfig);
    
    // Get August attendance records for this student
    const augustAttendance = await db.collection('attendance')
      .where('studentId', '==', student.id)
      .where('date', '>=', '2025-08-01')
      .where('date', '<=', '2025-08-31')
      .get();
    
    console.log(`\nAugust attendance records for ${student.fullName}: ${augustAttendance.docs.length}`);
    
    const attendanceMap = new Map();
    augustAttendance.docs.forEach(doc => {
      const data = doc.data();
      attendanceMap.set(data.date, data);
      console.log(`  - ${data.date}: ${data.status} at ${data.timestamp ? new Date(data.timestamp.seconds * 1000).toLocaleTimeString() : 'N/A'}`);
    });
    
    // Test specific August dates
    console.log('\n📅 Testing August dates with attendance logic:');
    const testDates = ['2025-08-01', '2025-08-05', '2025-08-10', '2025-08-15', '2025-08-20', '2025-08-25', '2025-08-30'];
    
    testDates.forEach(dateStr => {
      const checkDate = new Date(dateStr);
      const attendanceRecord = attendanceMap.get(dateStr);
      
      // Check if it's a school day
      const studyDays = classConfig?.studyDays;
      const isSchoolDayResult = isSchoolDay(checkDate, studyDays);
      
      console.log(`\n${dateStr} (${checkDate.toLocaleDateString('en-US', { weekday: 'long' })}):`);
      console.log(`  - Is school day: ${isSchoolDayResult} (study days: [${studyDays?.join(', ') || 'N/A'}])`);
      console.log(`  - Has attendance record: ${!!attendanceRecord}`);
      if (attendanceRecord) {
        console.log(`  - Record status: ${attendanceRecord.status}`);
      }
      
      // Get calculated status
      try {
        const result = getStudentDailyStatus(
          student,
          dateStr,
          attendanceRecord,
          allClassConfigs,
          [] // No permissions for this test
        );
        console.log(`  - Calculated status: ${result.status}`);
        
        if (result.status === 'Absent' && !attendanceRecord && isSchoolDayResult) {
          console.log(`  ⚠️  This date shows as Absent - likely because it's a past school day with no attendance record`);
        }
      } catch (error) {
        console.log(`  ❌ Error calculating status: ${error.message}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

debugAugustAttendance();
