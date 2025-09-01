/**
 * Test script to verify Firebase Admin setup before running the main fix
 */

const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function testConnection() {
  console.log('🧪 Testing Firebase Admin connection...');
  
  try {
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
    
    // Test basic read access
    console.log('📊 Testing read access to students collection...');
    const studentsSnapshot = await db.collection('students').limit(1).get();
    console.log(`✅ Success! Found ${studentsSnapshot.size} student record(s)`);
    
    console.log('📊 Testing read access to attendance collection...');
    const attendanceSnapshot = await db.collection('attendance').limit(1).get();
    console.log(`✅ Success! Found ${attendanceSnapshot.size} attendance record(s)`);
    
    console.log('✅ All tests passed! You can now run the authUID fix script.');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.log('\n📋 Troubleshooting:');
    console.log('1. Make sure you have Firebase Admin credentials configured');
    console.log('2. Run: gcloud auth application-default login');
    console.log('3. Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    console.log('4. Ensure your account has Firestore read/write permissions');
    process.exit(1);
  }
}

if (require.main === module) {
  testConnection()
    .then(() => {
      console.log('\n🎉 Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testConnection };
