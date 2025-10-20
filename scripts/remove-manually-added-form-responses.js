/**
 * Script to remove all documents from form_responses collection where manuallyAdded is true
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

async function removeManuallyAddedFormResponses() {
  try {
    console.log('🚀 Removing all form_responses documents where manuallyAdded is true...\n');

    const formResponsesRef = db.collection('form_responses');
    const query = formResponsesRef.where('manuallyAdded', '==', true);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('❌ No form responses found with manuallyAdded: true');
      return;
    }

    console.log(`📋 Found ${snapshot.size} form responses with manuallyAdded: true. Deleting...\n`);

    const batch = db.batch();
    let deleteCount = 0;

    snapshot.forEach((doc) => {
      const formResponseDocRef = formResponsesRef.doc(doc.id);
      batch.delete(formResponseDocRef);
      deleteCount++;
      console.log(`🗑️  Deleting document ${doc.id} for student: ${doc.data().studentName || doc.data().studentId || 'Unknown'}`);
    });

    await batch.commit();
    console.log(`\n✅ Successfully deleted ${deleteCount} form responses with manuallyAdded: true`);

  } catch (error) {
    console.error('❌ Error removing form responses:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  removeManuallyAddedFormResponses()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { removeManuallyAddedFormResponses };