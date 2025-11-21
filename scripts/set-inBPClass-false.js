/**
 * Script to set inBPClass field to false for all students
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

async function setInBPClassFalseForAllStudents() {
  try {
    console.log('\n🔧 Setting inBPClass to false for all students...\n');

    const studentsRef = db.collection('students');
    const snapshot = await studentsRef.get();

    if (snapshot.empty) {
      console.log('📭 No students found');
      return;
    }

    console.log(`📊 Found ${snapshot.size} students\n`);

    let updatedCount = 0;
    let errorCount = 0;

    // Use batch writes for better performance
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      try {
        batch.update(doc.ref, { inBPClass: false });
        batchCount++;
        updatedCount++;

        // Commit batch when it reaches the size limit
        if (batchCount === batchSize) {
          await batch.commit();
          console.log(`✅ Batch committed: ${updatedCount}/${snapshot.size} students updated`);
          batch = db.batch();
          batchCount = 0;
        }
      } catch (error) {
        console.error(`❌ Error updating student ${doc.id}:`, error.message);
        errorCount++;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Final batch committed`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount} students`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Total: ${snapshot.size} students`);

    console.log('\n✨ inBPClass field set to false for all students successfully!');
  } catch (error) {
    console.error('❌ Error setting inBPClass to false:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setInBPClassFalseForAllStudents().then(() => process.exit(0));
}

module.exports = { setInBPClassFalseForAllStudents };
