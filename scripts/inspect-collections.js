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

async function inspectFormDocument(formId) {
  try {
    console.log(`\n🔍 Inspecting form document: ${formId}...\n`);

    const docRef = db.collection('forms').doc(formId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`📭 Form document ${formId} not found`);
      return;
    }

    const data = doc.data();
    console.log(`📊 Form Document: ${formId}\n`);
    console.log('Full data:', JSON.stringify(data, null, 2));

    // If there are questions, display them in detail
    if (data.questions && Array.isArray(data.questions)) {
      console.log(`\n📝 Questions (${data.questions.length} total):\n`);
      data.questions.forEach((question, index) => {
        console.log(`Question ${index + 1}:`);
        console.log(`  ID: ${question.id}`);
        console.log(`  Text: ${question.text || question.question || 'N/A'}`);
        console.log(`  Type: ${question.type || 'N/A'}`);
        if (question.classType) {
          console.log(`  ClassType: ${question.classType}`);
        }
        if (question.subject) {
          console.log(`  Subject: ${question.subject}`);
        }
        console.log('---');
      });
    }

  } catch (error) {
    console.error(`❌ Error inspecting form document:`, error.message);
  }
}

async function inspectCollection(collectionName) {
  try {
    console.log(`\n🔍 Inspecting all documents in ${collectionName} collection...\n`);

    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();

    if (snapshot.empty) {
      console.log(`📭 No documents found in ${collectionName} collection`);
      return;
    }

    console.log(`📊 Found ${snapshot.size} documents in ${collectionName} collection:\n`);

    snapshot.forEach((doc) => {
      console.log(`Document ID: ${doc.id}`);
      const structure = analyzeDocumentStructure(doc);

      // Display structure
      Object.entries(structure).forEach(([field, type]) => {
        console.log(`   ${field}: ${type}`);
      });
      console.log('---');
    });

  } catch (error) {
    console.error(`❌ Error inspecting collection ${collectionName}:`, error.message);
  }
}

async function listAllCollections() {
  try {
    console.log('\n🔍 Listing all collections in the database...\n');
    const collections = await db.listCollections();
    console.log('📚 Available collections:');
    collections.forEach(collection => { 
      console.log(`  - ${collection.id}`);
    });
    return collections.map(c => c.id);
  } catch (error) {
    console.error('❌ Error listing collections:', error.message);
    return [];
  }
}

async function main() {
  try {
    const collections = await listAllCollections();
    
    // Check for mockResults or mockExam collections
    const mockCollections = collections.filter(c => 
      c.toLowerCase().includes('mock') || c.toLowerCase().includes('exam')
    );
    
    console.log('\n📊 Mock/Exam related collections:', mockCollections);
    
    // Inspect mockExam1 collection
    if (collections.includes('mockExam1')) {
      console.log('\n\n📊 Inspecting mockExam1 collection...');
      await inspectCollection('mockExam1');
    }
    
    // Inspect mockResults if it exists
    if (collections.includes('mockResults')) {
      console.log('\n\n📊 Inspecting first 3 documents from mockResults collection in detail...');
      const mockResultsRef = db.collection('mockResults');
      const snapshot = await mockResultsRef.limit(3).get();
      
      snapshot.forEach((doc) => {
        console.log(`\n📄 Document ID: ${doc.id}`);
        console.log(JSON.stringify(doc.data(), null, 2));
        console.log('---');
      });
    }
    
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

module.exports = { inspectCollection, analyzeDocumentStructure, inspectFormDocument, listAllCollections };