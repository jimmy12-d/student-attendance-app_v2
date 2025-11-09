/**
 * Script to update Firebase Auth UID to a random string and sync with document
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

const auth = admin.auth();
const db = admin.firestore();

// Generate a random string for authUid (similar to Firebase Auth UIDs)
function generateRandomAuthUid(length = 28) {
  // Generate a random string similar to Firebase Auth UIDs
  // Firebase UIDs are typically 28 characters long
  return crypto.randomBytes(length).toString('base64url').substring(0, length);
}

async function updateFirebaseAuthUidToRandom() {
  try {
    const targetPhone = '015362722';
    const email = `${targetPhone}@teacher.local`;
    const newRandomUid = generateRandomAuthUid();

    console.log(`\n🔧 Updating Firebase Auth UID to random string and syncing document\n`);

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
    console.log(`   New Firebase Auth UID: ${newRandomUid}`);

    // Delete the existing Firebase Auth account (with phone number UID)
    const oldUid = '015362722';
    try {
      console.log(`🔄 Deleting existing Firebase Auth account with UID: ${oldUid}...`);
      await auth.deleteUser(oldUid);
      console.log(`✅ Deleted old Firebase Auth account`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  Old Firebase Auth account not found (already deleted)`);
      } else {
        console.error('❌ Error deleting old Firebase Auth account:', error.message);
        throw error;
      }
    }

    // Create new Firebase Auth user with random UID
    console.log(`🔄 Creating new Firebase Auth account with random UID: ${newRandomUid}...`);
    const userRecord = await auth.createUser({
      uid: newRandomUid, // Random UID
      email: email,
      displayName: teacherData.fullName,
      disabled: false
      // Note: No password specified - null provider
    });
    console.log(`✅ Created Firebase Auth account with random UID: ${userRecord.uid}`);

    // Update the teacher document with the new random authUid
    const updateData = {
      authUid: userRecord.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await teacherDoc.ref.update(updateData);
    console.log(`✅ Updated teacher document with authUid: ${userRecord.uid}`);

    console.log('\n✨ Firebase Auth UID update to random string completed successfully!');
    console.log(`   Teacher: ${teacherData.fullName}`);
    console.log(`   New Firebase Auth UID: ${userRecord.uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password Provider: null (no password set)`);

  } catch (error) {
    console.error('❌ Error updating Firebase Auth UID:', error.message);
    throw error;
  }
}

async function previewFirebaseAuthUidUpdate() {
  try {
    const targetPhone = '015362722';
    const email = `${targetPhone}@teacher.local`;
    const newRandomUid = generateRandomAuthUid();

    console.log(`\n🔍 Previewing Firebase Auth UID update to random string\n`);

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

    console.log(`📋 Firebase Auth changes:`);
    console.log(`   Will delete account with UID: 015362722`);
    console.log(`   Will create new account with UID: ${newRandomUid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Display Name: ${teacherData.fullName}`);
    console.log(`   Password Provider: null (no password set)`);

    console.log(`📋 Document changes:`);
    console.log(`   Will update authUid to: ${newRandomUid}`);

    console.log('\n💡 This was a preview. Run with --execute to make actual changes.\n');
  } catch (error) {
    console.error('❌ Error previewing Firebase Auth UID update:', error.message);
    throw error;
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const shouldExecute = args.includes('--execute');

    if (shouldExecute) {
      await updateFirebaseAuthUidToRandom();
    } else {
      await previewFirebaseAuthUidUpdate();
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

module.exports = { updateFirebaseAuthUidToRandom };