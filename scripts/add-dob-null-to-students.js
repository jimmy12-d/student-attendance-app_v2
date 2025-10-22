/**
 * Script to remove isReady and isReadyToPublished fields from all examControls
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

async function setExamControlsReadyStatus() {
  try {
    console.log('🚀 Updating examControls: removing isReady and isReadyToPublished fields...\n');

    // Query for all examControls
    const examControlsQuery = db.collection('examControls');

    const examControlsSnapshot = await examControlsQuery.get();

    if (examControlsSnapshot.empty) {
      console.log('⚠️  No examControls found.');
      return;
    }

    console.log(`📊 Found ${examControlsSnapshot.size} total examControls...\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Process each examControl
    for (const doc of examControlsSnapshot.docs) {
      const data = doc.data();
      const examName = data.examName || 'Unknown Exam';

      // Update the document: remove isReady and isReadyToPublished fields
      try {
        await doc.ref.update({ 
          isReady: admin.firestore.FieldValue.delete(),
          isReadyToPublished: admin.firestore.FieldValue.delete()
        });
        console.log(`✅ Updated ${examName} (ID: ${doc.id}) - isReady and isReadyToPublished fields removed`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update ${doc.id}:`, error);
        skippedCount++;
      }
    }

    console.log('\n📋 Exam Controls Update Summary:');
    console.log(`   📊 Total examControls processed: ${examControlsSnapshot.size}`);
    console.log(`   ✅ ExamControls updated: ${updatedCount}`);
    console.log(`   ⚠️  ExamControls skipped: ${skippedCount}`);

    console.log('\n🎉 Exam controls update complete!');

  } catch (error) {
    console.error('❌ Error during operation:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  setExamControlsReadyStatus()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { setExamControlsReadyStatus };