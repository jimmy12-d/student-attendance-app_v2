/**
 * Script to inspect the structure of students and mockExam1 collections
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

async function inspectCollection(collectionName, limit = null) {
  try {
    console.log(`\n🔍 Inspecting ${collectionName} collection...\n`);

    const collectionRef = db.collection(collectionName);
    const query = limit ? collectionRef.limit(limit) : collectionRef;
    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log(`📭 No documents found in ${collectionName} collection`);
      return;
    }

    console.log(`📊 Analyzing first ${snapshot.size} documents:\n`);

    const allStructures = [];
    const fieldCounts = {};

    snapshot.forEach((doc, index) => {
      console.log(`📄 Document ${index + 1} (${doc.id}):`);
      const structure = analyzeDocumentStructure(doc);

      // Count field occurrences
      Object.keys(structure).forEach(field => {
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
      });

      allStructures.push(structure);

      // Display structure
      Object.entries(structure).forEach(([field, type]) => {
        console.log(`   ${field}: ${type}`);
      });
      console.log('');
    });

    // Summary
    console.log(`📊 ${collectionName} Collection Summary:`);
    console.log(`   Total documents sampled: ${snapshot.size}`);

    const totalFields = Object.keys(fieldCounts).length;
    console.log(`   Unique fields found: ${totalFields}`);

    console.log(`\n   Field frequencies (across ${snapshot.size} documents):`);
    Object.entries(fieldCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([field, count]) => {
        const percentage = ((count / snapshot.size) * 100).toFixed(1);
        console.log(`   ${field}: ${count}/${snapshot.size} (${percentage}%)`);
      });

  } catch (error) {
    console.error(`❌ Error inspecting ${collectionName}:`, error.message);
  }
}

async function main() {
  try {
    await inspectCollection('mockExam1');
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