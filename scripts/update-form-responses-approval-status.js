/**
 * Script to update form_responses with specific formId and registrationStatus
 * Set approvalStatus to "approved" for matching documents
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

async function updateFormResponsesApprovalStatus() {
  try {
    console.log('🚀 Updating form_responses with formId "7CZKFrFOTYxYWJX8yCNY" and registrationStatus "approved"...\n');

    const formResponsesRef = db.collection('form_responses');
    const query = formResponsesRef
      .where('formId', '==', '7CZKFrFOTYxYWJX8yCNY')
      .where('registrationStatus', '==', 'approved');

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('❌ No form responses found matching the criteria!');
      return;
    }

    console.log(`📋 Found ${snapshot.size} form responses. Updating...\n`);

    const batch = db.batch();
    let updateCount = 0;

    snapshot.forEach((doc) => {
      const formResponseDocRef = formResponsesRef.doc(doc.id);
      batch.update(formResponseDocRef, { approvalStatus: 'approved' });
      updateCount++;
      console.log(`📝 Updating document ${doc.id} for student: ${doc.data().studentName || doc.data().studentId}`);
    });

    await batch.commit();
    console.log(`\n✅ Successfully updated ${updateCount} form responses to set approvalStatus: "approved"`);

  } catch (error) {
    console.error('❌ Error updating form responses:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  updateFormResponsesApprovalStatus()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { updateFormResponsesApprovalStatus };