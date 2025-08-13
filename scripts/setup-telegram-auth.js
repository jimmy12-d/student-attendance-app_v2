/**
 * Script to set up Telegram authentication for existing students
 * This script adds username field and initializes empty chatId and passwordHash fields
 * for existing student records in Firestore
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Use service account key file if available, otherwise use default credentials
  const serviceAccountPath = path.join(__dirname, '..', 'firestore-upload', 'serviceAccountKey.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Initialized with service account credentials');
  } catch (error) {
    // Fallback to default credentials (when running in cloud environment)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Initialized with default credentials');
  }
}

const db = admin.firestore();

/**
 * Generate username from student data
 * Uses full name + random 3-digit number
 */
function generateUsername(studentData) {
  const fullName = studentData.fullName || '';
  
  // Use full name (remove spaces, lowercase) + random 3-digit number
  if (fullName) {
    const cleanName = fullName.replace(/\s+/g, '').toLowerCase();
    const randomDigits = Math.floor(Math.random() * 900) + 100; // Generates 100-999
    return `${cleanName}${randomDigits}`;
  }
  
  // Fallback: use student ID if available
  if (studentData.studentId) {
    const randomDigits = Math.floor(Math.random() * 900) + 100;
    return `${studentData.studentId.toLowerCase()}${randomDigits}`;
  }
  
  // Last resort: generate username with random name
  const randomDigits = Math.floor(Math.random() * 900) + 100;
  return `student${randomDigits}`;
}

/**
 * Process all students and add Telegram auth fields
 */
async function setupTelegramAuth() {
  try {
    console.log('Starting Telegram authentication setup...');
    
    const studentsCollection = db.collection('students');
    const snapshot = await studentsCollection.get();
    
    if (snapshot.empty) {
      console.log('No students found in the database.');
      return;
    }
    
    let processedCount = 0;
    let skippedCount = 0;
    
    const batch = db.batch();
    
    for (const doc of snapshot.docs) {
      const studentData = doc.data();
      
      // Skip if username already exists
      if (studentData.username) {
        skippedCount++;
        continue;
      }
      
      const username = generateUsername(studentData);
      
      // Check for username conflicts
      const existingUserQuery = await studentsCollection
        .where('username', '==', username)
        .get();
      
      let finalUsername = username;
      let counter = 1;
      
      while (!existingUserQuery.empty && finalUsername === username) {
        finalUsername = `${username}${counter}`;
        counter++;
        const conflictQuery = await studentsCollection
          .where('username', '==', finalUsername)
          .get();
        if (conflictQuery.empty) break;
      }
      
      // Update document with Telegram auth fields
      batch.update(doc.ref, {
        username: finalUsername,
        chatId: '', // Empty initially, will be filled when student registers via bot
        passwordHash: '', // Empty initially, will be filled when student registers via bot
        telegramAuthEnabled: true,
        telegramSetupAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      processedCount++;
      console.log(`Processed: ${studentData.fullName || 'Unknown'} -> Username: ${finalUsername}`);
    }
    
    // Commit the batch
    await batch.commit();
    
    console.log('\n=== Setup Complete ===');
    console.log(`Processed: ${processedCount} students`);
    console.log(`Skipped: ${skippedCount} students (already have usernames)`);
    console.log(`Total: ${snapshot.size} students`);
    
  } catch (error) {
    console.error('Error setting up Telegram authentication:', error);
  }
}

/**
 * Display current status of Telegram auth setup
 */
async function checkTelegramAuthStatus() {
  try {
    const studentsCollection = db.collection('students');
    const allStudents = await studentsCollection.get();
    const withUsername = await studentsCollection.where('username', '!=', '').get();
    const withChatId = await studentsCollection.where('chatId', '!=', '').get();
    const withPassword = await studentsCollection.where('passwordHash', '!=', '').get();
    
    console.log('\n=== Telegram Auth Status ===');
    console.log(`Total Students: ${allStudents.size}`);
    console.log(`With Username: ${withUsername.size}`);
    console.log(`Registered (with ChatId): ${withChatId.size}`);
    console.log(`With Password: ${withPassword.size}`);
    
  } catch (error) {
    console.error('Error checking status:', error);
  }
}

// Main execution
async function main() {
  const command = process.argv[2];
  
  switch (command) {
    case 'setup':
      await setupTelegramAuth();
      break;
    case 'status':
      await checkTelegramAuthStatus();
      break;
    case 'both':
      await checkTelegramAuthStatus();
      await setupTelegramAuth();
      await checkTelegramAuthStatus();
      break;
    default:
      console.log('Usage: node setup-telegram-auth.js [setup|status|both]');
      console.log('  setup  - Add username and auth fields to all students');
      console.log('  status - Check current Telegram auth status');
      console.log('  both   - Check status, run setup, then check status again');
  }
  
  process.exit(0);
}

main().catch(console.error);
