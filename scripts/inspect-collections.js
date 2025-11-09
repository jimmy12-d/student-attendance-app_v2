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

async function createGrade12ESettings() {
  try {
    console.log('\n� Creating examSettings documents for Grade 12E...\n');

    const examSettingsRef = db.collection('examSettings');
    const subjects = ['math', 'chemistry', 'physics', 'biology'];
    
    for (const subject of subjects) {
      const docId = `mock1_Grade 12E_${subject}`;
      
      // Check if document already exists
      const existingDoc = await examSettingsRef.doc(docId).get();
      if (existingDoc.exists) {
        console.log(`⚠️  Document ${docId} already exists, skipping...`);
        continue;
      }
      
      const docData = {
        type: 'Grade 12E',
        subject: subject,
        maxScore: 75,
        mock: 'mock1'
      };
      
      console.log(`Creating document: ${docId}`);
      console.log(`Data:`, JSON.stringify(docData, null, 2));
      
      await examSettingsRef.doc(docId).set(docData);
      console.log(`✅ Created ${docId}\n`);
    }
    
    console.log('✨ All Grade 12E examSettings documents created successfully!');
  } catch (error) {
    console.error('❌ Error creating Grade 12E settings:', error.message);
  }
}

async function addSubjectFieldToMockExam1() {
  try {
    console.log('\n🔧 Adding subject field to mockExam1 documents...\n');

    const mockExam1Ref = db.collection('mockExam1');
    const snapshot = await mockExam1Ref.get();
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Define subject mapping based on classType
    const subjectMapping = {
      'Grade 7': 'math',
      'Grade 8': 'math', 
      'Grade 9': 'math',
      'Grade 10': 'math',
      'Grade 11A': 'math',
      'Grade 11E': 'math',
      'Grade 12': 'math',
      'Grade 12E': 'math',
      'Grade 12S': 'math'
    };
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      // Check if document already has any subject scores
      const hasSubjectScores = [
        'math', 'chemistry', 'physics', 'biology', 'history', 'khmer', 
        'geometry', 'earth', 'geography', 'moral'
      ].some(subject => data[subject] !== undefined);
      
      if (hasSubjectScores) {
        console.log(`⏭️  Skipping ${docId} - already has subject scores`);
        skippedCount++;
        continue;
      }
      
      // Get the subject based on classType
      const classType = data.classType;
      const subject = subjectMapping[classType] || 'math'; // default to math if classType not found
      
      // Add subject field with actual subject name
      await mockExam1Ref.doc(docId).update({
        subject: subject
      });
      
      console.log(`✅ Added subject: "${subject}" to ${docId} (${classType})`);
      updatedCount++;
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount} documents`);
    console.log(`   Skipped: ${skippedCount} documents`);
    console.log(`   Total: ${snapshot.size} documents`);
    
    console.log('\n✨ Subject field addition completed successfully!');
  } catch (error) {
    console.error('❌ Error adding subject field:', error.message);
  }
}

async function removeSubjectFieldFromMockExam1() {
  try {
    console.log('\n🗑️  Removing subject field from mockExam1 documents...\n');

    const mockExam1Ref = db.collection('mockExam1');
    const snapshot = await mockExam1Ref.get();

    let updatedCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;

      // Check if document has subject field
      if (data.subject !== undefined) {
        // Remove the subject field
        await mockExam1Ref.doc(docId).update({
          subject: admin.firestore.FieldValue.delete()
        });

        console.log(`✅ Removed subject field from ${docId}`);
        updatedCount++;
      } else {
        console.log(`⏭️  No subject field found in ${docId}`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updatedCount} documents`);
    console.log(`   Total: ${snapshot.size} documents`);

    console.log('\n✨ Subject field removal completed successfully!');
  } catch (error) {
    console.error('❌ Error removing subject field:', error.message);
  }
}

async function getAllUniqueFieldsInMockExam1() {
  try {
    console.log('\n🔍 Analyzing all unique fields in mockExam1 collection...\n');
    
    const mockExam1Ref = db.collection('mockExam1');
    const snapshot = await mockExam1Ref.get();
    
    const allFields = new Set();
    
    function extractFields(obj, prefix = '') {
      for (const key in obj) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        allFields.add(fullPath);
        
        const value = obj[key];
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          // Check if it's a Firestore Timestamp
          if (value.toDate && typeof value.toDate === 'function') {
            // It's a timestamp, don't recurse
            continue;
          }
          // Recurse into nested objects
          extractFields(value, fullPath);
        }
      }
    }
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      extractFields(data);
    });
    
    // Convert Set to sorted array
    const sortedFields = Array.from(allFields).sort();
    
    console.log(`📊 Total unique fields found: ${sortedFields.length}\n`);
    console.log('📋 List of all unique fields:\n');
    
    sortedFields.forEach((field, index) => {
      console.log(`  ${index + 1}. ${field}`);
    });
    
    // Categorize fields
    console.log('\n\n📊 Field Categories:\n');
    
    const categories = {
      basic: [],
      schedule: [],
      scores: [],
      metadata: [],
      other: []
    };
    
    sortedFields.forEach(field => {
      if (['fullName', 'studentId', 'khmerName', 'classType', 'uploadedAt'].includes(field)) {
        categories.basic.push(field);
      } else if (field.startsWith('day1') || field.startsWith('day2') || field.startsWith('day3')) {
        categories.schedule.push(field);
      } else if (field.includes('_teacher') || field.includes('_timestamp') || 
                 ['math', 'chemistry', 'physics', 'biology', 'history', 'khmer', 'english', 
                  'geometry', 'earth', 'geography', 'moral'].some(subject => field.startsWith(subject))) {
        categories.scores.push(field);
      } else if (['updatedAt', 'createdAt'].includes(field)) {
        categories.metadata.push(field);
      } else {
        categories.other.push(field);
      }
    });
    
    console.log('🏷️  Basic Info Fields:', categories.basic.length);
    categories.basic.forEach(f => console.log(`    - ${f}`));
    
    console.log('\n� Schedule Fields:', categories.schedule.length);
    console.log(`    (${categories.schedule.length} schedule-related fields)`);
    
    console.log('\n📊 Score-related Fields:', categories.scores.length);
    categories.scores.forEach(f => console.log(`    - ${f}`));
    
    console.log('\n⏰ Metadata Fields:', categories.metadata.length);
    categories.metadata.forEach(f => console.log(`    - ${f}`));
    
    if (categories.other.length > 0) {
      console.log('\n❓ Other Fields:', categories.other.length);
      categories.other.forEach(f => console.log(`    - ${f}`));
    }
    
    return sortedFields;
    
  } catch (error) {
    console.error('❌ Error analyzing fields:', error.message);
    return [];
  }
}

async function countStudentsByClassAndShift() {
  try {
    console.log('\n🔍 Counting students in Class 12 with morning/afternoon shifts...\n');

    const studentsRef = db.collection('students');

    // First, let's get a sample of students to understand the classType format
    console.log('🔍 Getting sample of students to understand data structure...\n');
    const sampleSnapshot = await studentsRef.limit(10).get();

    console.log('📋 Sample student records:');
    sampleSnapshot.forEach((doc) => {
      const data = doc.data();
      console.log(`   ID: ${doc.id}`);
      console.log(`   classType: "${data.classType || 'N/A'}"`);
      console.log(`   shift: "${data.shift || 'N/A'}"`);
      console.log(`   fullName: "${data.fullName || 'N/A'}"`);
      console.log('   ---');
    });

    // Since Firestore requires composite indexes for complex queries,
    // we'll fetch all students and filter client-side
    console.log('\n🔍 Fetching all students for client-side filtering...\n');
    const allSnapshot = await studentsRef.get();

    console.log(`📊 Retrieved ${allSnapshot.size} total students from database\n`);

    const matchingStudents = [];
    const breakdown = {};

    allSnapshot.forEach((doc) => {
      const data = doc.data();
      const classType = data.classType || '';
      const shift = data.shift || '';

      // Check if classType starts with "Grade 12" and shift is Morning or Afternoon
      if (classType.startsWith('Grade 12') && (shift === 'Morning' || shift === 'Afternoon')) {
        const key = `${classType} - ${shift}`;
        if (!breakdown[key]) {
          breakdown[key] = [];
        }
        breakdown[key].push({
          id: doc.id,
          fullName: data.fullName || 'N/A',
          studentId: data.studentId || 'N/A'
        });

        matchingStudents.push({
          id: doc.id,
          data: data,
          classType: classType,
          shift: shift
        });
      }
    });

    const totalCount = matchingStudents.length;
    console.log(`📊 Found ${totalCount} students matching the criteria:\n`);

    // Display breakdown
    Object.entries(breakdown).forEach(([category, students]) => {
      console.log(`\n📚 ${category}: ${students.length} students`);
      students.slice(0, 5).forEach(student => {  // Show first 5 students per category
        console.log(`   - ${student.fullName} (${student.studentId})`);
      });
      if (students.length > 5) {
        console.log(`   ... and ${students.length - 5} more students`);
      }
    });

    console.log(`\n📈 Total: ${totalCount} students across all matching classes and shifts`);

    return {
      total: totalCount,
      breakdown: breakdown
    };

  } catch (error) {
    console.error('❌ Error counting students:', error.message);
    return { total: 0, breakdown: {} };
  }
}

async function main() {
  try {
    const collections = await listAllCollections();

    // Inspect students collection
    if (collections.includes('students')) {
      console.log('\n🔍 Inspecting students collection...\n');
      await inspectCollection('students');
    } else {
      console.log('\n⚠️  students collection not found');
    }

    // Count students by class and shift
    if (collections.includes('students')) {
      console.log('\n🔍 Counting students collection...\n');
      await countStudentsByClassAndShift();
    } else {
      console.log('\n⚠️  students collection not found');
    }

    // Inspect examSettings collection
    if (collections.includes('examSettings')) {
      console.log('\n🔍 Inspecting examSettings collection...\n');
      await inspectCollection('examSettings');
    } else {
      console.log('\n⚠️  examSettings collection not found');
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

module.exports = { inspectCollection, analyzeDocumentStructure, inspectFormDocument, listAllCollections, countStudentsByClassAndShift };