/**
 * Script to add "inBPClass" field to all students, set to false
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

async function addInBPClassToStudents() {
  try {
    console.log('🚀 Adding "inBPClass" field to all students...\n');

    const studentsRef = db.collection('students');
    const snapshot = await studentsRef.get();

    if (snapshot.empty) {
      console.log('❌ No students found!');
      return;
    }

    console.log(`📋 Found ${snapshot.size} students. Updating...\n`);

    const batch = db.batch();
    let updateCount = 0;

    snapshot.forEach((doc) => {
      const studentRef = studentsRef.doc(doc.id);
      batch.update(studentRef, { inBPClass: false });
      updateCount++;
    });

    await batch.commit();
    console.log(`✅ Successfully updated ${updateCount} students with "inBPClass": false`);

  } catch (error) {
    console.error('❌ Error updating students:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  addInBPClassToStudents()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addInBPClassToStudents };