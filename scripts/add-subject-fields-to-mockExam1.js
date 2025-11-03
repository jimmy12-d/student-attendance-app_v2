/**
 * Script to add subject fields with null values to mockExam1 documents
 * based on their classType, only if the subject score hasn't been filled yet
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

// Define subject mapping based on classType
// This maps the classType to the subjects that should be present
const classTypeSubjects = {
  'Grade 7': ['math', 'chemistry', 'physics', 'geometry'],
  'Grade 8': ['math', 'chemistry', 'physics', 'geometry'],
  'Grade 9': ['math', 'chemistry', 'physics', 'geometry'],
  'Grade 10': ['math', 'chemistry', 'physics', 'biology', 'geometry'],
  'Grade 11A': ['math', 'chemistry', 'physics', 'biology', 'history', 'khmer'],
  'Grade 11E': ['math', 'chemistry', 'physics', 'biology', 'history', 'khmer'],
  'Grade 12': ['math', 'chemistry', 'physics', 'biology', 'history', 'khmer'],
  'Grade 12E': ['math', 'chemistry', 'physics', 'biology'],
  'Grade 12S': ['math', 'history', 'khmer', 'geography', 'earth', 'moral'],
  'Grade 12 Social': ['math', 'history', 'khmer', 'geography', 'earth', 'moral']
};

async function addSubjectFieldsToMockExam1() {
  try {
    console.log('\n🔧 Adding subject fields to mockExam1 documents...\n');

    const mockExam1Ref = db.collection('mockExam1');
    const snapshot = await mockExam1Ref.get();

    let updatedCount = 0;
    let skippedCount = 0;
    let noMappingCount = 0;

    const batch = db.batch();
    let batchCount = 0;
    const BATCH_LIMIT = 500;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      const classType = data.classType;

      // Get the subjects for this classType
      const subjects = classTypeSubjects[classType];

      if (!subjects) {
        console.log(`⚠️  No subject mapping found for classType: ${classType} (${docId})`);
        noMappingCount++;
        continue;
      }

      // Check which subjects need to be added
      const fieldsToAdd = {};
      let hasFieldsToAdd = false;

      for (const subject of subjects) {
        // Only add if the subject doesn't exist or is undefined
        if (data[subject] === undefined) {
          fieldsToAdd[subject] = null;
          hasFieldsToAdd = true;
        }
      }

      if (hasFieldsToAdd) {
        batch.update(mockExam1Ref.doc(docId), fieldsToAdd);
        batchCount++;

        console.log(`✅ Adding fields to ${docId} (${classType}):`, Object.keys(fieldsToAdd).join(', '));
        updatedCount++;

        // Commit batch if we reach the limit
        if (batchCount >= BATCH_LIMIT) {
          await batch.commit();
          console.log(`📦 Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }
      } else {
        console.log(`⏭️  All subjects already present in ${docId} (${classType})`);
        skippedCount++;
      }
    }

    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`📦 Committed final batch of ${batchCount} updates`);
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount} documents`);
    console.log(`   Skipped: ${skippedCount} documents (all fields present)`);
    console.log(`   No mapping: ${noMappingCount} documents`);
    console.log(`   Total: ${snapshot.size} documents`);

    console.log('\n✨ Subject field addition completed successfully!');
  } catch (error) {
    console.error('❌ Error adding subject fields:', error.message);
    throw error;
  }
}

async function previewChanges() {
  try {
    console.log('\n🔍 Previewing changes (no database modifications)...\n');

    const mockExam1Ref = db.collection('mockExam1');
    const snapshot = await mockExam1Ref.limit(10).get();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      const classType = data.classType;

      const subjects = classTypeSubjects[classType];

      if (!subjects) {
        console.log(`Document: ${docId}`);
        console.log(`  ClassType: ${classType}`);
        console.log(`  ⚠️  No subject mapping found`);
        console.log('---');
        continue;
      }

      const fieldsToAdd = {};
      const existingFields = [];

      for (const subject of subjects) {
        if (data[subject] === undefined) {
          fieldsToAdd[subject] = null;
        } else {
          existingFields.push(`${subject}: ${data[subject]}`);
        }
      }

      console.log(`Document: ${docId}`);
      console.log(`  ClassType: ${classType}`);
      console.log(`  Existing subjects: ${existingFields.length > 0 ? existingFields.join(', ') : 'none'}`);
      console.log(`  Will add: ${Object.keys(fieldsToAdd).length > 0 ? Object.keys(fieldsToAdd).join(', ') : 'none'}`);
      console.log('---');
    }

    console.log('\n💡 This was a preview. Run with --execute to make actual changes.\n');
  } catch (error) {
    console.error('❌ Error previewing changes:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const shouldExecute = args.includes('--execute');

    if (shouldExecute) {
      await addSubjectFieldsToMockExam1();
    } else {
      await previewChanges();
    }

    process.exit(0);
  } catch (error) {
    console.error('\n💥 Operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { addSubjectFieldsToMockExam1 };
