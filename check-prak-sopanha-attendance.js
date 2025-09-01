const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./firestore-upload/serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function checkPrakSopanhaAttendance() {
  try {
    console.log('🔍 Checking attendance records for Prak Sopanha...');
    
    // Get today's date
    const today = new Date().toISOString().split('T')[0];
    console.log(`📅 Today's date: ${today}`);
    
    // Check by student ID
    console.log('\n--- Checking by Student ID: BlKD5htPzEeCvQcpuqim ---');
    const attendanceByStudentId = await db.collection('attendance')
      .where('studentId', '==', 'BlKD5htPzEeCvQcpuqim')
      .get();
    
    console.log(`Found ${attendanceByStudentId.docs.length} total attendance records for student ID BlKD5htPzEeCvQcpuqim`);
    
    attendanceByStudentId.docs.forEach(doc => {
      const data = doc.data();
      const recordDate = data.date ? data.date.split('T')[0] : 'Unknown';
      const isToday = recordDate === today;
      console.log(`  📝 Record ${doc.id}:`, {
        date: data.date,
        recordDate: recordDate,
        isToday: isToday,
        status: data.status,
        authUid: data.authUid,
        studentName: data.studentName,
        method: data.method,
        timestamp: data.timestamp
      });
    });
    
    // Check specifically for today's records
    console.log('\n--- Checking today\'s attendance records for Prak Sopanha ---');
    const todaysRecords = attendanceByStudentId.docs.filter(doc => {
      const data = doc.data();
      const recordDate = data.date ? data.date.split('T')[0] : '';
      return recordDate === today;
    });
    
    console.log(`Found ${todaysRecords.length} attendance records for today (${today})`);
    
    if (todaysRecords.length > 0) {
      todaysRecords.forEach(doc => {
        const data = doc.data();
        console.log(`  ✅ Today's record ${doc.id}:`, data);
      });
    } else {
      console.log('  ❌ No attendance records found for today');
    }
    
    // Check by name (in case there are duplicate records with different student IDs)
    console.log('\n--- Checking by Student Name: Prak Sopanha ---');
    const attendanceByName = await db.collection('attendance')
      .where('studentName', '==', 'Prak Sopanha')
      .get();
    
    console.log(`Found ${attendanceByName.docs.length} total attendance records for name "Prak Sopanha"`);
    
    attendanceByName.docs.forEach(doc => {
      const data = doc.data();
      const recordDate = data.date ? data.date.split('T')[0] : 'Unknown';
      const isToday = recordDate === today;
      console.log(`  📝 Record ${doc.id}:`, {
        studentId: data.studentId,
        date: data.date,
        recordDate: recordDate,
        isToday: isToday,
        status: data.status,
        authUid: data.authUid,
        method: data.method
      });
    });
    
    // Check student document
    console.log('\n--- Checking Student Document: BlKD5htPzEeCvQcpuqim ---');
    const studentDoc = await db.collection('students').doc('BlKD5htPzEeCvQcpuqim').get();
    
    if (studentDoc.exists) {
      const studentData = studentDoc.data();
      console.log('  ✅ Student document exists:', {
        fullName: studentData.fullName,
        authUid: studentData.authUid,
        class: studentData.class,
        shift: studentData.shift,
        ay: studentData.ay,
        dropped: studentData.dropped,
        onBreak: studentData.onBreak,
        onWaitlist: studentData.onWaitlist
      });
    } else {
      console.log('  ❌ Student document does not exist');
    }
    
    // Check all today's attendance records to see if any are missing from the dashboard
    console.log('\n--- Checking ALL today\'s attendance records ---');
    const allTodaysAttendance = await db.collection('attendance')
      .get();
    
    const todaysAttendanceRecords = allTodaysAttendance.docs.filter(doc => {
      const data = doc.data();
      const recordDate = data.date ? data.date.split('T')[0] : '';
      return recordDate === today;
    });
    
    console.log(`Found ${todaysAttendanceRecords.length} total attendance records for today`);
    
    // Group by method to see distribution
    const methodDistribution = {};
    todaysAttendanceRecords.forEach(doc => {
      const data = doc.data();
      const method = data.method || 'unknown';
      methodDistribution[method] = (methodDistribution[method] || 0) + 1;
    });
    
    console.log('Today\'s attendance by method:', methodDistribution);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking attendance:', error);
    process.exit(1);
  }
}

checkPrakSopanhaAttendance();
