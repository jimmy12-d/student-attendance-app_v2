/**
 * Script to create class 12BP by copying class 12E
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

async function createClass12BP() {
  try {
    console.log('🚀 Creating class 12BP by copying class 12E...\n');

    // Get class 12E data
    const class12ERef = db.collection('classes').doc('12E');
    const class12EDoc = await class12ERef.get();

    if (!class12EDoc.exists) {
      console.log('❌ Class 12E not found!');
      return;
    }

    const class12EData = class12EDoc.data();
    console.log('📋 Class 12E data:');
    console.log(JSON.stringify(class12EData, null, 2));
    console.log('');

    // Create new data for 12BP
    const class12BPData = {
      ...class12EData,
      name: "Class 12BP",
      type: "Grade 12BP",
      // Keep all other fields the same
    };

    console.log('📋 Class 12BP data to be created:');
    console.log(JSON.stringify(class12BPData, null, 2));
    console.log('');

    // Check if 12BP already exists
    const class12BPRef = db.collection('classes').doc('12BP');
    const class12BPDoc = await class12BPRef.get();

    if (class12BPDoc.exists) {
      console.log('⚠️  Class 12BP already exists! Overwriting...');
    }

    // Create/update class 12BP
    await class12BPRef.set(class12BPData);
    console.log('✅ Successfully created/updated Class 12BP');

  } catch (error) {
    console.error('❌ Error creating class 12BP:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  createClass12BP()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createClass12BP };