#!/usr/bin/env node

/**
 * Add Username Mappings for All Students
 * This script creates username mappings for all existing students
 * to ensure new user login works properly
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
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'rodwell-attendance'
    });
    console.log('✅ Firebase Admin initialized with application default credentials');
  }
}

const db = admin.firestore();

// Generate username from fullName
function generateUsername(fullName) {
  if (!fullName) return null;

  return fullName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove non-alphanumeric except spaces
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

// Check if username exists and add suffix if needed
async function getUniqueUsername(baseUsername, studentId) {
  if (!baseUsername) return null;

  let username = baseUsername;
  let counter = 1;

  while (true) {
    // Check if this username is already taken by another student
    const existingMapping = await db.collection('usernameMappings')
      .doc(username)
      .get();

    if (!existingMapping.exists) {
      // Username is available
      return username;
    }

    // Check if it's the same student (in case we're updating)
    const mappingData = existingMapping.data();
    if (mappingData && mappingData.studentId === studentId) {
      // Same student, can reuse
      return username;
    }

    // Username taken by different student, try next number
    counter++;
    username = `${baseUsername}_${counter}`;
  }
}

async function addUsernameMappings() {
  console.log('🔍 Fetching all students...');

  try {
    const studentsSnapshot = await db.collection('students').get();
    const students = [];

    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      students.push({
        id: doc.id,
        fullName: data.fullName,
        phone: data.phone,
        username: data.username // May be undefined for older students
      });
    });

    console.log(`📊 Found ${students.length} students`);

    let processed = 0;
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Process in batches to avoid overwhelming Firestore
    const batchSize = 50;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      console.log(`\n🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(students.length/batchSize)} (${batch.length} students)`);

      const batchPromises = batch.map(async (student) => {
        try {
          // Generate base username from fullName
          const baseUsername = generateUsername(student.fullName);
          if (!baseUsername) {
            console.log(`⚠️  Skipping student ${student.id}: Invalid fullName "${student.fullName}"`);
            skipped++;
            return;
          }

          // Get unique username (handles duplicates)
          const uniqueUsername = await getUniqueUsername(baseUsername, student.id);

          // Check if mapping already exists
          const existingMapping = await db.collection('usernameMappings')
            .doc(uniqueUsername)
            .get();

          if (existingMapping.exists) {
            const mappingData = existingMapping.data();
            if (mappingData && mappingData.studentId === student.id) {
              // Mapping exists and is correct
              console.log(`✅ Student ${student.id} (${student.fullName}): Mapping already exists`);
              skipped++;
              return;
            } else {
              // Username taken by different student - this shouldn't happen with our logic
              console.log(`⚠️  Student ${student.id} (${student.fullName}): Username "${uniqueUsername}" taken by different student`);
              skipped++;
              return;
            }
          }

          // Create the mapping
          await db.collection('usernameMappings').doc(uniqueUsername).set({
            studentId: student.id,
            phone: student.phone || '',
            fullName: student.fullName,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Update the student document with username if not already set
          if (!student.username) {
            await db.collection('students').doc(student.id).update({
              username: uniqueUsername,
              usernameUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            updated++;
          }

          console.log(`✅ Student ${student.id} (${student.fullName}): Created mapping "${uniqueUsername}"`);
          created++;

        } catch (error) {
          console.error(`❌ Error processing student ${student.id}:`, error);
        }
      });

      await Promise.all(batchPromises);
      processed += batch.length;

      // Small delay between batches
      if (i + batchSize < students.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log('\n🎉 Username mapping creation completed!');
    console.log(`📈 Summary:`);
    console.log(`   • Total students: ${students.length}`);
    console.log(`   • Mappings created: ${created}`);
    console.log(`   • Student docs updated: ${updated}`);
    console.log(`   • Skipped: ${skipped}`);

  } catch (error) {
    console.error('❌ Error in addUsernameMappings:', error);
    process.exit(1);
  }
}

// Run the script
addUsernameMappings()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });