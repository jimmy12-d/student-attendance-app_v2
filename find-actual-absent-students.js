const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function findActualAbsentStudents() {
  try {
    console.log('🔍 Finding ALL Actually Absent Students\n');
    
    const today = new Date().toISOString().split('T')[0];
    console.log(`Date: ${today}\n`);
    
    // 1. Get all active students
    const studentsSnapshot = await db.collection('students').get();
    let allStudents = studentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Filter out dropped, break, waitlist
    allStudents = allStudents.filter(s => !s.dropped && !s.onBreak && !s.onWaitlist);
    
    console.log(`📊 Total active students: ${allStudents.length}\n`);
    
    // 2. Get all attendance records for today
    const attendanceSnapshot = await db.collection('attendance')
      .where('date', '==', today)
      .get();
    
    const attendedStudentIds = new Set();
    attendanceSnapshot.docs.forEach(doc => {
      const data = doc.data();
      attendedStudentIds.add(data.studentId);
    });
    
    console.log(`✅ Students with attendance records: ${attendedStudentIds.size}\n`);
    
    // 3. Find students WITHOUT attendance (these are absent)
    const absentStudents = allStudents.filter(s => !attendedStudentIds.has(s.id));
    
    console.log(`❌ Students WITHOUT attendance (Absent): ${absentStudents.length}\n`);
    
    // Group by shift
    const byShift = { Morning: [], Afternoon: [], Evening: [] };
    absentStudents.forEach(s => {
      if (byShift[s.shift]) {
        byShift[s.shift].push(s);
      }
    });
    
    console.log('📋 Absent Students by Shift:\n');
    Object.keys(byShift).forEach(shift => {
      console.log(`\n${shift} Shift (${byShift[shift].length} students):`);
      byShift[shift].forEach(s => {
        console.log(`  - ${s.englishName || s.khmerName} (ID: ${s.id})`);
      });
    });
    
    // 4. Check absentFollowUps collection
    console.log('\n\n🗂️  Checking absentFollowUps collection...\n');
    const followUpsSnapshot = await db.collection('absentFollowUps')
      .where('date', '==', today)
      .where('status', '==', 'Absent')
      .get();
    
    console.log(`📝 Records in absentFollowUps: ${followUpsSnapshot.size}`);
    
    if (followUpsSnapshot.size > 0) {
      console.log('\nStudents in absentFollowUps:');
      followUpsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const notified = data.parentNotificationTimestamp ? '✅' : '❌';
        console.log(`  ${notified} ${data.studentName} (${data.studentId})`);
      });
    }
    
    console.log('\n\n⚠️  ISSUE FOUND:');
    console.log(`  - Actual absent students: ${absentStudents.length}`);
    console.log(`  - Students in absentFollowUps: ${followUpsSnapshot.size}`);
    console.log(`  - Missing from absentFollowUps: ${absentStudents.length - followUpsSnapshot.size}`);
    
    console.log('\n💡 SOLUTION:');
    console.log('  The Cloud Function should NOT query absentFollowUps.');
    console.log('  Instead, it should:');
    console.log('  1. Get all active students');
    console.log('  2. Get all attendance records for today');
    console.log('  3. Find students WITHOUT attendance records');
    console.log('  4. Send notifications to those students\' parents');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

findActualAbsentStudents();
