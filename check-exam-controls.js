const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env.local') });

if (!admin.apps.length) {
  try {
    const serviceAccount = require(path.join(__dirname, 'firestore-upload/serviceAccountKey.json'));
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

async function checkExamControls() {
  const examControlsRef = db.collection('examControls');
  const snapshot = await examControlsRef.get();

  console.log('ExamControls documents:');
  snapshot.forEach(doc => {
    console.log(`${doc.id}: `, doc.data());
  });
}

checkExamControls().then(() => process.exit(0)).catch(console.error);