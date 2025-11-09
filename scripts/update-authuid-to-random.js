/**
 * Script to update teacher document authUid to a random string
 */

const admin = require('firebase-admin');
const path = require('path');
const crypto = require('crypto');
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

// Generate a random string for authUid
function generateRandomAuthUid(length = 28) {
  // Generate a random string similar to Firebase Auth UIDs
  // Firebase UIDs are typically 28 characters long
  return crypto.randomBytes(length).toString('base64url').substring(0, length);
}

async function updateAuthUidToRandom() {
  try {
    const targetPhone = '015362722';
    const randomAuthUid = generateRandomAuthUid();

    console.log(`\n🔧 Updating teacher document authUid to random string\n`);

    // Find the teacher document by phone number
    const teachersRef = db.collection('teachers');
    const querySnapshot = await teachersRef.where('phone', '==', targetPhone).get();

    if (querySnapshot.empty) {
      console.log(`❌ No teacher found with phone number: ${targetPhone}`);
      return;
    }

    if (querySnapshot.size > 1) {
      console.log(`⚠️  Found ${querySnapshot.size} teachers with phone ${targetPhone}. Using the first one.`);
    }

    const teacherDoc = querySnapshot.docs[0];
    const teacherData = teacherDoc.data();
    const docId = teacherDoc.id;

    console.log(`📋 Found teacher:`);
    console.log(`   Document ID: ${docId}`);
    console.log(`   Full Name: ${teacherData.fullName}`);
    console.log(`   Phone: ${teacherData.phone}`);
    console.log(`   Current authUid: ${teacherData.authUid || 'NOT SET'}`);
    console.log(`   New random authUid: ${randomAuthUid}`);

    // Update the teacher document with the random authUid
    const updateData = {
      authUid: randomAuthUid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await teacherDoc.ref.update(updateData);
    console.log(`✅ Updated teacher document with random authUid: ${randomAuthUid}`);

    console.log('\n✨ Document authUid update to random string completed successfully!');
    console.log(`   Teacher: ${teacherData.fullName}`);
    console.log(`   New Auth UID: ${randomAuthUid}`);
    console.log(`   Note: This authUid does not correspond to any Firebase Auth account`);

  } catch (error) {
    console.error('❌ Error updating authUid:', error.message);
    throw error;
  }
}

async function previewAuthUidUpdate() {
  try {
    const targetPhone = '015362722';
    const randomAuthUid = generateRandomAuthUid();

    console.log(`\n🔍 Previewing teacher document authUid update to random string\n`);

    // Find the teacher document by phone number
    const teachersRef = db.collection('teachers');
    const querySnapshot = await teachersRef.where('phone', '==', targetPhone).get();

    if (querySnapshot.empty) {
      console.log(`❌ No teacher found with phone number: ${targetPhone}`);
      return;
    }

    if (querySnapshot.size > 1) {
      console.log(`⚠️  Found ${querySnapshot.size} teachers with phone ${targetPhone}. Using the first one.`);
    }

    const teacherDoc = querySnapshot.docs[0];
    const teacherData = teacherDoc.data();
    const docId = teacherDoc.id;

    console.log(`📋 Teacher document:`);
    console.log(`   Document ID: ${docId}`);
    console.log(`   Full Name: ${teacherData.fullName}`);
    console.log(`   Phone: ${teacherData.phone}`);
    console.log(`   Current authUid: ${teacherData.authUid || 'NOT SET'}`);
    console.log(`   Will change to random authUid: ${randomAuthUid}`);

    console.log('\n💡 This was a preview. Run with --execute to make actual changes.\n');
    console.log('⚠️  WARNING: The new authUid will not correspond to any Firebase Auth account!');
  } catch (error) {
    console.error('❌ Error previewing authUid update:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const shouldExecute = args.includes('--execute');

    if (shouldExecute) {
      await updateAuthUidToRandom();
    } else {
      await previewAuthUidUpdate();
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

module.exports = { updateAuthUidToRandom };