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

/**
 * Initialize the flip-flop tracking system for August 2025
 * This is the baseline month - no flipping needed as this is the starting point
 */
async function initializeFlipFlopSystem() {
  try {
    console.log('🔄 Initializing Flip-Flop Tracking System...');
    
    // Get all students with flip-flop schedule type
    const studentsRef = db.collection('students');
    const flipFlopQuery = studentsRef.where('scheduleType', '==', 'Flip-Flop');
    const studentsSnapshot = await flipFlopQuery.get();
    
    const flipFlopStudents = [];
    studentsSnapshot.forEach(doc => {
      flipFlopStudents.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    console.log(`📊 Found ${flipFlopStudents.length} flip-flop students`);
    
    if (flipFlopStudents.length === 0) {
      console.log('⚠️  No flip-flop students found. System initialized but no data to process.');
      return;
    }
    
    // Create baseline tracking document for August 2025
    const trackingId = '2025_7'; // August 2025 (0-based month)
    const trackingRef = db.collection('flipFlopTracking').doc(trackingId);
    
    await trackingRef.set({
      year: 2025,
      month: 7, // 0-based (7 = August)
      monthName: 'August',
      isBaseline: true,
      appliedAt: admin.firestore.FieldValue.serverTimestamp(),
      appliedBy: 'system-initialization',
      studentsAffected: flipFlopStudents.length,
      description: 'Initial baseline setup for flip-flop system - no schedule changes applied',
      students: flipFlopStudents,
      settings: {
        autoApplyEnabled: true,
        gracePeriodDays: 7,
        notificationEnabled: true
      },
      nextScheduledFlip: {
        year: 2025,
        month: 8, // September
        monthName: 'September'
      }
    });

    // Create system settings
    const systemSettingsRef = db.collection('systemSettings').doc('flipFlopConfig');
    await systemSettingsRef.set({
      enabled: true,
      autoApplyEnabled: true,
      defaultCountdownSeconds: 10,
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
        targetDay: 1,
        maxGracePeriod: 15,
        minCountdown: 5,
        maxCountdown: 30
      }
    });    console.log('✅ Flip-flop tracking system initialized successfully!');
    console.log(`📅 Baseline set for August 2025 with ${flipFlopStudents.length} students`);
    console.log('🔄 Next flip scheduled for September 2025');
    
    // Log student details
    console.log('\n📋 Flip-Flop Students Registered:');
    flipFlopStudents.forEach((student, index) => {
      console.log(`${index + 1}. ${student.fullName} (${student.class}, ${student.shift} shift)`);
    });
    
    return {
      trackingId,
      studentsCount: flipFlopStudents.length,
      students: flipFlopStudents
    };
    
  } catch (error) {
    console.error('❌ Error initializing flip-flop system:', error);
    throw error;
  }
}

/**
 * Create a flip-flop settings document
 */
async function createFlipFlopSettings() {
  try {
    const settingsRef = db.collection('systemSettings').doc('flipFlopConfig');
    
    const settingsData = {
      enabled: true,
      autoApplyEnabled: true,
      defaultCountdownSeconds: 10,
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
        maxGracePeriod: 15, // Maximum grace period allowed
        minCountdown: 5, // Minimum countdown seconds
        maxCountdown: 30 // Maximum countdown seconds
      }
    };
    
    await settingsRef.set(settingsData);
    console.log('⚙️  Flip-flop settings created successfully!');
    
    return settingsData;
    
  } catch (error) {
    console.error('❌ Error creating flip-flop settings:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting Flip-Flop System Initialization...\n');
    
    // Initialize the tracking system
    await initializeFlipFlopSystem();
    
    // Create system settings
    await createFlipFlopSettings();
    
    console.log('\n🎉 Flip-Flop System Setup Complete!');
    console.log('📖 Check the README-FLIP-FLOP-SYSTEM.md for detailed documentation.');
    
  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  }
}

// Export for use in other scripts
module.exports = {
  initializeFlipFlopSystem,
  createFlipFlopSettings
};

// Run if called directly
if (require.main === module) {
  main();
}
