/**
 * Script to fix existing attendance records by adding authUid field
 * Maps studentId to authUid from the students collection
 * Only updates records with method "face-api" that are missing authUid
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

async function fixAttendanceAuthUid() {
  console.log('🚀 Starting attendance records authUid fix...');
  
  try {
    // Step 1: Create a map of studentId -> authUid from students collection
    console.log('📋 Building student ID to authUid mapping...');
    const studentsSnapshot = await db.collection('students').get();
    const studentIdToAuthUid = new Map();
    
    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      const studentId = doc.id; // Firestore document ID
      const authUid = data.authUid;
      
      if (authUid) {
        studentIdToAuthUid.set(studentId, authUid);
        console.log(`   ✓ Mapped student ${studentId} -> ${authUid}`);
      } else {
        console.log(`   ⚠️  Student ${studentId} (${data.fullName}) has no authUid`);
      }
    });
    
    console.log(`📊 Found ${studentIdToAuthUid.size} students with authUid out of ${studentsSnapshot.size} total students`);
    
    // Step 2: Find attendance records with method "face-api" that need authUid
    console.log('\n🔍 Finding attendance records that need fixing...');
    const attendanceQuery = db.collection('attendance')
      .where('method', '==', 'face-api');
    
    const attendanceSnapshot = await attendanceQuery.get();
    console.log(`📝 Found ${attendanceSnapshot.size} face-api attendance records`);
    
    // Step 3: Filter records that need updating (missing authUid or have placeholder)
    const recordsToUpdate = [];
    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      const currentAuthUid = data.authUid;
      const studentId = data.studentId;
      
      // Check if record needs updating
      const needsUpdate = !currentAuthUid || 
                         currentAuthUid === 'manual-entry' || 
                         currentAuthUid === null;
      
      if (needsUpdate && studentIdToAuthUid.has(studentId)) {
        recordsToUpdate.push({
          docId: doc.id,
          studentId: studentId,
          studentName: data.studentName,
          date: data.date,
          currentAuthUid: currentAuthUid,
          newAuthUid: studentIdToAuthUid.get(studentId)
        });
      } else if (needsUpdate && !studentIdToAuthUid.has(studentId)) {
        console.log(`   ⚠️  Cannot fix record for student ${studentId} (${data.studentName}) - no authUid mapping found`);
      }
    });
    
    console.log(`\n🔧 Found ${recordsToUpdate.length} records that need authUid updates`);
    
    if (recordsToUpdate.length === 0) {
      console.log('✅ No records need updating. All done!');
      return;
    }
    
    // Step 4: Update records in batches
    console.log('\n📝 Updating attendance records...');
    const batchSize = 500; // Firestore batch limit
    let updatedCount = 0;
    
    for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
      const batch = db.batch();
      const batchRecords = recordsToUpdate.slice(i, i + batchSize);
      
      console.log(`   Processing batch ${Math.floor(i / batchSize) + 1} (${batchRecords.length} records)...`);
      
      batchRecords.forEach(record => {
        const docRef = db.collection('attendance').doc(record.docId);
        batch.update(docRef, {
          authUid: record.newAuthUid,
          updatedBy: 'fix_method_api_script',
          updatedAt: new Date()
        });
        
        console.log(`     ✓ ${record.studentName} (${record.date}) - Adding authUid: ${record.newAuthUid}`);
      });
      
      await batch.commit();
      updatedCount += batchRecords.length;
      console.log(`   ✅ Batch committed successfully (${updatedCount}/${recordsToUpdate.length} total)`);
    }
    
    // Step 5: Verification
    console.log('\n🔍 Verifying updates...');
    const verificationQuery = db.collection('attendance')
      .where('method', '==', 'face-api')
      .where('updatedBy', '==', 'fix_method_api_script');
    
    const verificationSnapshot = await verificationQuery.get();
    console.log(`✅ Verification: ${verificationSnapshot.size} records were successfully updated`);
    
    // Step 6: Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   • Students with authUid: ${studentIdToAuthUid.size}`);
    console.log(`   • Face-api attendance records found: ${attendanceSnapshot.size}`);
    console.log(`   • Records updated: ${updatedCount}`);
    console.log(`   • Records verified: ${verificationSnapshot.size}`);
    
    console.log('\n🎉 Attendance records authUid fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing attendance records:', error);
    throw error;
  }
}

// Run the script if called directly
if (require.main === module) {
  fixAttendanceAuthUid()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixAttendanceAuthUid };