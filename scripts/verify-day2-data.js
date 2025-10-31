/**
 * Script to verify day2 data in mockExam1 collection
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

async function verifyDay2Data() {
  try {
    console.log('\n🔍 Verifying day2 data in mockExam1 collection...\n');

    const snapshot = await db.collection('mockExam1').limit(10).get();

    let withDay2 = 0;
    let withoutDay2 = 0;

    console.log('📊 Sample Documents:\n');
    
    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.fullName} (${data.studentId})`);
      
      if (data.day1) {
        const day1Shifts = Object.keys(data.day1).filter(k => ['Morning', 'Afternoon', 'Evening'].includes(k));
        console.log(`   Day 1: ${day1Shifts.join(', ')}`);
      }
      
      if (data.day2) {
        withDay2++;
        const day2Shifts = Object.keys(data.day2).filter(k => ['Morning', 'Afternoon', 'Evening'].includes(k));
        console.log(`   Day 2: ${day2Shifts.join(', ')} ✅`);
        
        // Show detailed info for first document
        if (index === 0) {
          console.log('   Day 2 Details:');
          day2Shifts.forEach(shift => {
            console.log(`      ${shift}: Room ${data.day2[shift].room}, Seat ${data.day2[shift].seat}, Phone ${data.day2[shift].phone}`);
          });
        }
      } else {
        withoutDay2++;
        console.log(`   Day 2: Not found ❌`);
      }
      console.log('');
    });

    // Count total documents with day2
    const allSnapshot = await db.collection('mockExam1').get();
    let totalWithDay2 = 0;
    let totalWithoutDay2 = 0;
    const shiftDistribution = {
      day2: {
        Morning: 0,
        Afternoon: 0,
        Evening: 0
      }
    };

    allSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.day2) {
        totalWithDay2++;
        if (data.day2.Morning) shiftDistribution.day2.Morning++;
        if (data.day2.Afternoon) shiftDistribution.day2.Afternoon++;
        if (data.day2.Evening) shiftDistribution.day2.Evening++;
      } else {
        totalWithoutDay2++;
      }
    });

    console.log('📊 Overall Statistics:');
    console.log(`   Total documents: ${allSnapshot.size}`);
    console.log(`   Documents with day2: ${totalWithDay2} (${((totalWithDay2/allSnapshot.size)*100).toFixed(1)}%)`);
    console.log(`   Documents without day2: ${totalWithoutDay2} (${((totalWithoutDay2/allSnapshot.size)*100).toFixed(1)}%)`);
    console.log('\n   Day 2 Shift Distribution:');
    console.log(`   Morning: ${shiftDistribution.day2.Morning} students`);
    console.log(`   Afternoon: ${shiftDistribution.day2.Afternoon} students`);
    console.log(`   Evening: ${shiftDistribution.day2.Evening} students`);

    console.log('\n✨ Verification completed!');

  } catch (error) {
    console.error('\n💥 Verification failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  verifyDay2Data()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyDay2Data };
