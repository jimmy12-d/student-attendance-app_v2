/**
 * Migration script to change from username-based auth to phone-based auth
 * This script:
 * 1. Removes username field from all student documents
 * 2. Ensures phone field exists and is properly formatted
 * 3. Updates any existing registered students to use phone instead of username
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccountPath = path.join(__dirname, '..', 'firestore-upload', 'serviceAccountKey.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Initialized with service account credentials');
  } catch (error) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Initialized with default credentials');
  }
}

const db = admin.firestore();

/**
 * Format phone number to ensure consistency
 * Converts various formats to "015914377" style
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove all non-digits
  let cleaned = phone.toString().replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('855')) {
    // +855... format, convert to 0...
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.length === 8) {
    // 8-digit format, add leading 0
    cleaned = '0' + cleaned;
  } else if (cleaned.length === 9 && cleaned.startsWith('0')) {
    // Already in correct format
    // Do nothing
  }
  
  return cleaned;
}

/**
 * Remove username fields and ensure phone fields are properly formatted
 */
async function migrateToPhoneAuth() {
  try {
    console.log('Starting migration from username auth to phone auth...');
    
    const studentsCollection = db.collection('students');
    const snapshot = await studentsCollection.get();
    
    if (snapshot.empty) {
      console.log('No students found in the database.');
      return;
    }
    
    let processedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;
    
    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const studentData = doc.data();
      const docId = doc.id;
      
      console.log(`\nProcessing: ${studentData.fullName || 'Unknown'} (${docId})`);
      
      // Check if phone exists
      if (!studentData.phone) {
        console.log(`  -> SKIPPED: No phone number found`);
        skippedCount++;
        continue;
      }
      
      // Format phone number
      const formattedPhone = formatPhoneNumber(studentData.phone);
      if (!formattedPhone) {
        console.log(`  -> ERROR: Could not format phone: ${studentData.phone}`);
        errorCount++;
        continue;
      }
      
      // Prepare update data
      const updateData = {};
      
      // Remove username field
      if (studentData.username) {
        updateData.username = admin.firestore.FieldValue.delete();
        console.log(`  -> Removing username: ${studentData.username}`);
      }
      
      // Update phone if it changed
      if (studentData.phone !== formattedPhone) {
        updateData.phone = formattedPhone;
        console.log(`  -> Updating phone: ${studentData.phone} -> ${formattedPhone}`);
      }
      
      // Update migration timestamp
      updateData.migratedToPhoneAuth = admin.firestore.FieldValue.serverTimestamp();
      
      // Add to batch if there are updates
      if (Object.keys(updateData).length > 1) { // More than just timestamp
        batch.update(doc.ref, updateData);
        processedCount++;
        console.log(`  -> Marked for update`);
      } else {
        console.log(`  -> No changes needed`);
      }
    }
    
    // Commit the batch
    if (processedCount > 0) {
      await batch.commit();
      console.log('\n=== Batch commit successful ===');
    }
    
    console.log('\n=== Migration Complete ===');
    console.log(`Processed: ${processedCount} students`);
    console.log(`Skipped (no phone): ${skippedCount} students`);
    console.log(`Errors: ${errorCount} students`);
    console.log(`Total: ${snapshot.size} students`);
    
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

/**
 * Display current status after migration
 */
async function checkMigrationStatus() {
  try {
    const studentsCollection = db.collection('students');
    const allStudents = await studentsCollection.get();
    const withPhone = await studentsCollection.where('phone', '!=', '').get();
    const withUsername = await studentsCollection.where('username', '!=', '').get();
    const withChatId = await studentsCollection.where('chatId', '!=', '').get();
    const withPassword = await studentsCollection.where('passwordHash', '!=', '').get();
    const migrated = await studentsCollection.where('migratedToPhoneAuth', '!=', null).get();
    
    console.log('\n=== Phone Auth Migration Status ===');
    console.log(`Total Students: ${allStudents.size}`);
    console.log(`With Phone: ${withPhone.size}`);
    console.log(`With Username (should be 0): ${withUsername.size}`);
    console.log(`Registered (with ChatId): ${withChatId.size}`);
    console.log(`With Password: ${withPassword.size}`);
    console.log(`Migrated: ${migrated.size}`);
    
    // Show some sample phone numbers
    console.log('\nSample phone numbers:');
    let count = 0;
    for (const doc of allStudents.docs) {
      if (count >= 5) break;
      const data = doc.data();
      if (data.phone) {
        console.log(`  ${data.fullName || 'Unknown'}: ${data.phone}`);
        count++;
      }
    }
    
  } catch (error) {
    console.error('Error checking migration status:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'migrate':
      await migrateToPhoneAuth();
      break;
    case 'status':
      await checkMigrationStatus();
      break;
    case 'both':
      await checkMigrationStatus();
      console.log('\n' + '='.repeat(50));
      await migrateToPhoneAuth();
      console.log('\n' + '='.repeat(50));
      await checkMigrationStatus();
      break;
    default:
      console.log('Usage: node migrate-to-phone-auth.js [migrate|status|both]');
      console.log('  migrate - Remove username fields and format phone numbers');
      console.log('  status  - Check current migration status');
      console.log('  both    - Check status, migrate, then check status again');
  }
  
  process.exit(0);
}

main().catch(console.error);
