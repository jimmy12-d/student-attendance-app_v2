/**
 * Script to show detailed structure of documents with day2 data
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
  } catch (error) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
  }
}

const db = admin.firestore();

async function showDetailedStructure() {
  try {
    console.log('\n📋 Detailed Document Structure with Day2 Data:\n');

    const snapshot = await db.collection('mockExam1').limit(3).get();

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${'='.repeat(60)}`);
      console.log(`Document ${index + 1}: ${data.fullName}`);
      console.log(`${'='.repeat(60)}`);
      console.log(JSON.stringify({
        fullName: data.fullName,
        studentId: data.studentId,
        khmerName: data.khmerName,
        classType: data.classType,
        day1: data.day1,
        day2: data.day2,
        uploadedAt: data.uploadedAt ? 'timestamp' : undefined,
        updatedAt: data.updatedAt ? 'timestamp' : undefined
      }, null, 2));
      console.log('');
    });

    console.log('✨ Structure display completed!');

  } catch (error) {
    console.error('\n💥 Failed:', error);
    throw error;
  }
}

if (require.main === module) {
  showDetailedStructure()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

module.exports = { showDetailedStructure };
