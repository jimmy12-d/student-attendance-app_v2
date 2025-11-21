/**
 * Script to inspect appointmentRequests and adminAvailability collections
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

async function inspectCollection(collectionName, limit = 5) {
  try {
    console.log(`\n🔍 Inspecting ${collectionName} collection...\n`);

    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.limit(limit).get();

    if (snapshot.empty) {
      console.log(`📭 No documents found in ${collectionName} collection`);
      return;
    }

    console.log(`📊 Found ${snapshot.size} sample documents in ${collectionName} collection:\n`);

    snapshot.forEach((doc, index) => {
      console.log(`\n📄 Document ${index + 1}: ${doc.id}`);
      console.log('━'.repeat(80));
      
      const data = doc.data();
      const structure = analyzeDocumentStructure(doc);

      // Display full data
      console.log('Full Data:');
      console.log(JSON.stringify(data, null, 2));
      
      console.log('\n' + '━'.repeat(80));
    });

  } catch (error) {
    console.error(`❌ Error inspecting collection ${collectionName}:`, error.message);
  }
}

async function main() {
  try {
    // Inspect appointmentRequests collection
    await inspectCollection('appointmentRequests', 3);
    
    // Inspect adminAvailability collection
    await inspectCollection('adminAvailability', 3);

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

module.exports = { inspectCollection, analyzeDocumentStructure };
