/**
 * Script to add classType field to all students based on their class
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

async function addClassTypeToStudents() {
  try {
    console.log('🚀 Adding classType field to all students based on their class...\n');

    // First, build a map of class names to types
    const classesSnapshot = await db.collection('classes').get();
    const classMap = {};
    classesSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.name && data.type) {
        classMap[data.name] = data.type;
      }
    });

    console.log(`📊 Loaded ${Object.keys(classMap).length} class mappings\n`);

    // Now query students
    const studentsSnapshot = await db.collection('students').get();

    if (studentsSnapshot.empty) {
      console.log('⚠️  No students found.');
      return;
    }

    console.log(`📊 Found ${studentsSnapshot.size} total students...\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each student
    for (const doc of studentsSnapshot.docs) {
      const data = doc.data();
      const studentClass = data.class;

      if (!studentClass || typeof studentClass !== 'string') {
        console.log(`⚠️  Skipping student ${doc.id}: no valid class field`);
        skippedCount++;
        continue;
      }

      const classType = classMap[studentClass];

      if (!classType) {
        console.log(`⚠️  Skipping student ${doc.id}: no matching classType for class "${studentClass}"`);
        skippedCount++;
        continue;
      }

      // Check if classType already exists
      if (data.classType === classType) {
        console.log(`⚠️  Skipping student ${doc.id}: classType already set to "${classType}"`);
        skippedCount++;
        continue;
      }

      // Update the document with classType
      try {
        await doc.ref.update({ classType });
        console.log(`✅ Updated ${doc.id} (${studentClass}) -> ${classType}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${doc.id}:`, error);
        skippedCount++;
      }
    }

    console.log('\n📊 ClassType Addition Summary:');
    console.log(`   📊 Total students processed: ${studentsSnapshot.size}`);
    console.log(`   ✅ Students updated: ${updatedCount}`);
    console.log(`   ⚠️  Students skipped: ${skippedCount}`);

    console.log('\n✨ ClassType addition complete!');

  } catch (error) {
    console.error('❌ Error during addition:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  addClassTypeToStudents()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { addClassTypeToStudents };
