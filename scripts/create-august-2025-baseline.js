/**
 * Script to create the baseline flip-flop tracking record for August 2025
 * This should be run once to establish the starting point for the flip-flop system
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

async function createAugust2025Baseline() {
  try {
    console.log('🚀 Creating August 2025 baseline for flip-flop system...\n');

    // Get all students with flip-flop schedule type
    const studentsSnapshot = await db.collection('students')
      .where('scheduleType', '==', 'Flip-Flop')
      .where('ay', '==', '2026')
      .get();

    const flipFlopStudents = [];
    studentsSnapshot.forEach(doc => {
      const data = doc.data();
      // Filter out dropped, on break, or on waitlist students in JavaScript
      if (data.dropped !== true && data.onBreak !== true && data.onWaitlist !== true) {
        flipFlopStudents.push({
          id: doc.id,
          fullName: data.fullName,
          class: data.class,
          shift: data.shift,
          scheduleType: data.scheduleType
        });
      }
    });

    console.log(`📊 Found ${flipFlopStudents.length} active flip-flop students:`);
    flipFlopStudents.forEach((student, index) => {
      console.log(`  ${index + 1}. ${student.fullName} (${student.class}, ${student.shift} shift)`);
    });

    if (flipFlopStudents.length === 0) {
      console.log('⚠️  No flip-flop students found. Creating baseline record anyway...');
    }

    // Create the baseline tracking record for August 2025
    const august2025Key = '2025_7'; // August is month 7 (0-based)
    
    const baselineData = {
      year: 2025,
      month: 7, // August (0-based)
      monthName: 'August',
      isBaseline: true,
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      appliedBy: 'system-baseline-setup',
      studentsAffected: flipFlopStudents.length,
      description: 'Initial baseline setup for flip-flop system - August 2025. No schedule changes applied as this is the starting month.',
      students: flipFlopStudents.map(student => ({
        studentId: student.id,
        fullName: student.fullName,
        class: student.class,
        originalShift: student.shift,
        newShift: student.shift, // No change for baseline
        wasFlipped: false
      })),
      settings: {
        gracePeriodDays: 7,
        notificationEnabled: true
      },
      nextScheduledFlip: {
        year: 2025,
        month: 8, // September
        monthName: 'September'
      },
      systemInfo: {
        version: '1.0.0',
        createdBy: 'baseline-script',
        purpose: 'First month establishment - no flips applied'
      }
    };

    // Check if already exists
    const existingDoc = await db.collection('flipFlopTracking').doc(august2025Key).get();
    if (existingDoc.exists) {
      console.log('⚠️  August 2025 baseline already exists!');
      console.log('   If you want to recreate it, delete the existing document first.');
      
      const existingData = existingDoc.data();
      console.log(`   Existing record: ${existingData.studentsAffected} students, created ${existingData.appliedAt?.toDate?.()}`);
      return;
    }

    // Create the baseline record
    await db.collection('flipFlopTracking').doc(august2025Key).set(baselineData);

    console.log('\n✅ August 2025 baseline created successfully!');
    console.log(`📅 Document ID: ${august2025Key}`);
    console.log(`👥 Students recorded: ${flipFlopStudents.length}`);
    console.log('🔄 Next scheduled flip: September 2025');
    console.log('📝 Status: Baseline established (no shifts changed)');

    // Create system settings if they don't exist
    const settingsDoc = await db.collection('systemSettings').doc('flipFlopConfig').get();
    if (!settingsDoc.exists) {
      console.log('\n⚙️  Creating system settings...');
      
      const systemSettings = {
        enabled: true,
        defaultGracePeriodDays: 7,
        notificationsEnabled: true,
        systemVersion: '1.0.0',
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        features: {
          previewMode: true,
          batchProcessing: true,
          historyTracking: true,
          autoDetection: true
        },
        schedule: {
          targetDay: 1, // First day of each month
          maxGracePeriod: 15,
          minCountdown: 5,
          maxCountdown: 30
        },
        baseline: {
          month: 'August 2025',
          studentsAtBaseline: flipFlopStudents.length,
          establishedAt: admin.firestore.FieldValue.serverTimestamp()
        }
      };

      await db.collection('systemSettings').doc('flipFlopConfig').set(systemSettings);
      console.log('✅ System settings created!');
    } else {
      console.log('⚙️  System settings already exist, skipping...');
    }

    console.log('\n🎉 Flip-flop system baseline setup complete!');
    console.log('📖 Next steps:');
    console.log('   1. System is ready for September 2025 flip');
    console.log('   2. Students will be automatically prompted on Sept 1-7');
    console.log('   3. Check README-FLIP-FLOP-SYSTEM.md for details');

  } catch (error) {
    console.error('❌ Error creating baseline:', error);
    throw error;
  }
}

// Main execution
if (require.main === module) {
  createAugust2025Baseline()
    .then(() => {
      console.log('\n✨ Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createAugust2025Baseline };
