/**
 * Script to remove 'history' and 'khmer' fields from mockExam1 documents
 * where classType is "Grade 11E" or "Grade 12E"
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

async function removeFieldsFromMockExam1() {
  try {
    console.log('\n🗑️  Removing history and khmer fields from Grade 11E and Grade 12E documents in mockExam1...\n');

    const collectionRef = db.collection('mockExam1');
    const query = collectionRef.where('classType', 'in', ['Grade 11E', 'Grade 12E']);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('📭 No documents found with classType "Grade 11E" or "Grade 12E"');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents to update\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const doc of snapshot.docs) {
      const docId = doc.id;
      const data = doc.data();

      const updateData = {};

      // Check if history field exists
      if (data.history !== undefined) {
        updateData.history = admin.firestore.FieldValue.delete();
        console.log(`📝 Removing history field from document ${docId}`);
      }

      // Check if khmer field exists
      if (data.khmer !== undefined) {
        updateData.khmer = admin.firestore.FieldValue.delete();
        console.log(`📝 Removing khmer field from document ${docId}`);
      }

      // Only update if there are fields to remove
      if (Object.keys(updateData).length > 0) {
        await doc.ref.update(updateData);
        updatedCount++;
        console.log(`✅ Updated document ${docId}`);
      } else {
        skippedCount++;
        console.log(`⏭️  No history or khmer fields found in document ${docId}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount} documents`);
    console.log(`   Skipped: ${skippedCount} documents`);
    console.log(`   Total: ${snapshot.size} documents`);

  } catch (error) {
    console.error('❌ Error removing fields:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await removeFieldsFromMockExam1();
    console.log('\n✨ Field removal completed successfully!');
  } catch (error) {
    console.error('\n💥 Field removal failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => process.exit(0));
}

module.exports = { removeFieldsFromMockExam1 };