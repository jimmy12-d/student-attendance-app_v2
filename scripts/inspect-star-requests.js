/**
 * Script to inspect the starRequests collection
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

function analyzeDocumentStructure(doc) {
  const data = doc.data();
  const structure = {};

  function analyzeValue(value, path = '') {
    if (value === null || value === undefined) {
      structure[path] = 'null/undefined';
      return;
    }

    const type = typeof value;
    if (type === 'object') {
      if (Array.isArray(value)) {
        structure[path] = `array[${value.length}]`;
        if (value.length > 0) {
          analyzeValue(value[0], `${path}[0]`);
        }
      } else if (value.toDate && typeof value.toDate === 'function') {
        structure[path] = 'timestamp';
      } else {
        structure[path] = 'object';
        Object.keys(value).forEach(key => {
          analyzeValue(value[key], path ? `${path}.${key}` : key);
        });
      }
    } else {
      structure[path] = type;
    }
  }

  analyzeValue(data);
  return structure;
}

async function inspectStarRequests() {
  try {
    console.log('\n🔍 Inspecting starRequests collection...\n');

    const starRequestsRef = db.collection('starRequests');
    const snapshot = await starRequestsRef.get();

    if (snapshot.empty) {
      console.log('📭 No documents found in starRequests collection');
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents in starRequests collection:\n`);

    // Show document structure
    snapshot.forEach((doc, index) => {
      console.log(`Document ${index + 1} - ID: ${doc.id}`);
      const data = doc.data();
      console.log('Full data:', JSON.stringify(data, null, 2));
      
      const structure = analyzeDocumentStructure(doc);
      console.log('\nStructure:');
      Object.entries(structure).forEach(([field, type]) => {
        console.log(`   ${field}: ${type}`);
      });
      console.log('---\n');
    });

    // Summary statistics
    console.log('\n📊 Summary Statistics:\n');
    let statusBreakdown = {};
    let typeBreakdown = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status || 'unknown';
      const type = data.type || 'unknown';

      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    });

    console.log('Status Breakdown:');
    Object.entries(statusBreakdown).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\nType Breakdown:');
    Object.entries(typeBreakdown).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });

  } catch (error) {
    console.error('❌ Error inspecting starRequests collection:', error.message);
  }
}

async function inspectParentNotifications() {
  try {
    console.log('\n🔍 Inspecting parentNotifications collection in detail...\n');

    const parentNotificationsRef = db.collection('parentNotifications');
    const snapshot = await parentNotificationsRef.limit(5).get();

    if (snapshot.empty) {
      console.log('📭 No documents found in parentNotifications collection');
      return;
    }

    console.log(`📊 Showing ${snapshot.size} sample documents from parentNotifications:\n`);

    snapshot.forEach((doc, index) => {
      console.log(`Document ${index + 1} - ID: ${doc.id}`);
      const data = doc.data();
      console.log('Full data:', JSON.stringify(data, null, 2));
      
      const structure = analyzeDocumentStructure(doc);
      console.log('\nStructure:');
      Object.entries(structure).forEach(([field, type]) => {
        console.log(`   ${field}: ${type}`);
      });
      console.log('---\n');
    });

    // Count total documents
    const totalSnapshot = await parentNotificationsRef.get();
    console.log(`\n📊 Total parentNotifications documents: ${totalSnapshot.size}\n`);

  } catch (error) {
    console.error('❌ Error inspecting parentNotifications collection:', error.message);
  }
}

async function main() {
  try {
    console.log('🚀 Starting detailed collection inspection...\n');

    // Inspect starRequests
    await inspectStarRequests();

    // Inspect parentNotifications in detail
    await inspectParentNotifications();

    console.log('\n✨ Inspection completed successfully!');
  } catch (error) {
    console.error('\n💥 Inspection failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => process.exit(0));
}
