/**
 * Script to check visibility of forms in the "forms" collection
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

async function checkFormsVisibility() {
  try {
    console.log('🚀 Counting visibility of forms in the "forms" collection...\n');

    const formsRef = db.collection('forms');
    const snapshot = await formsRef.get();

    if (snapshot.empty) {
      console.log('❌ No forms found in the collection!');
      return;
    }

    console.log(`📋 Found ${snapshot.size} forms. Counting visibility...\n`);

    let visibleCount = 0;
    let invisibleCount = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.isVisible) {
        visibleCount++;
      } else {
        invisibleCount++;
      }
    });

    console.log(`Visible forms: ${visibleCount}`);
    console.log(`Invisible forms: ${invisibleCount}`);
    console.log(`✅ Successfully counted visibility for ${snapshot.size} forms`);

  } catch (error) {
    console.error('❌ Error checking forms visibility:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  checkFormsVisibility()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { checkFormsVisibility };