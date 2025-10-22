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

async function testScheduleLogic() {
  try {
    console.log('🔍 Testing Notification Schedule Logic\n');
    
    // Get settings
    const settingsDoc = await db.collection('absentNotificationSettings').doc('default').get();
    
    if (!settingsDoc.exists) {
      console.log('❌ No settings found!');
      return;
    }
    
    const settings = settingsDoc.data();
    console.log('Settings:', JSON.stringify(settings, null, 2));
    console.log('');
    
    // Get current time in Phnom Penh timezone
    const now = new Date();
    const phnomPenhTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Phnom_Penh' }));
    const currentHour = phnomPenhTime.getHours();
    const currentMinute = phnomPenhTime.getMinutes();
    const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
    
    console.log(`⏰ Current Time in Phnom Penh: ${currentTime} (Hour: ${currentHour})\n`);
    
    // Parse trigger hours
    const morningHour = parseInt(settings.morningTriggerTime.split(':')[0]);
    const afternoonHour = parseInt(settings.afternoonTriggerTime.split(':')[0]);
    const eveningHour = parseInt(settings.eveningTriggerTime.split(':')[0]);
    
    console.log('📅 Trigger Times:');
    console.log(`  Morning:   ${settings.morningTriggerTime} (Hour: ${morningHour})`);
    console.log(`  Afternoon: ${settings.afternoonTriggerTime} (Hour: ${afternoonHour})`);
    console.log(`  Evening:   ${settings.eveningTriggerTime} (Hour: ${eveningHour})\n`);
    
    // Check which shift should trigger
    let targetShift = null;
    if (currentHour === morningHour) {
      targetShift = 'Morning';
    } else if (currentHour === afternoonHour) {
      targetShift = 'Afternoon';
    } else if (currentHour === eveningHour) {
      targetShift = 'Evening';
    }
    
    if (targetShift) {
      console.log(`✅ MATCH! Current hour ${currentHour} matches ${targetShift} shift`);
      console.log(`   The function SHOULD send notifications now for ${targetShift} shift students.\n`);
    } else {
      console.log(`⏭️ NO MATCH. Current hour ${currentHour} does not match any trigger time.`);
      console.log(`   Next triggers:`);
      console.log(`   - Morning: ${morningHour}:00`);
      console.log(`   - Afternoon: ${afternoonHour}:00`);
      console.log(`   - Evening: ${eveningHour}:00\n`);
    }
    
    // Check today's absent students
    const today = now.toISOString().split('T')[0];
    console.log(`📊 Checking absent students for ${today}...\n`);
    
    const absentQuery = await db.collection('absentFollowUps')
      .where('date', '==', today)
      .where('status', '==', 'Absent')
      .get();
    
    if (absentQuery.empty) {
      console.log('ℹ️  No absent students today.');
    } else {
      console.log(`Found ${absentQuery.size} absent student(s):`);
      
      const shiftCounts = { Morning: 0, Afternoon: 0, Evening: 0 };
      
      for (const doc of absentQuery.docs) {
        const followUp = doc.data();
        const studentDoc = await db.collection('students').doc(followUp.studentId).get();
        if (studentDoc.exists) {
          const student = studentDoc.data();
          shiftCounts[student.shift] = (shiftCounts[student.shift] || 0) + 1;
          
          const notified = followUp.parentNotificationTimestamp ? '✅ Notified' : '❌ Not notified';
          console.log(`  - ${followUp.studentName} (${student.shift} shift) ${notified}`);
        }
      }
      
      console.log(`\nBy Shift:`);
      console.log(`  Morning:   ${shiftCounts.Morning || 0} absent`);
      console.log(`  Afternoon: ${shiftCounts.Afternoon || 0} absent`);
      console.log(`  Evening:   ${shiftCounts.Evening || 0} absent`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

testScheduleLogic();
