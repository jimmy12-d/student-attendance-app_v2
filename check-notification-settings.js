const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();

async function checkSettings() {
  try {
    console.log('🔍 Checking absentNotificationSettings...\n');
    
    const settingsDoc = await db.collection('absentNotificationSettings').doc('default').get();
    
    if (!settingsDoc.exists) {
      console.log('❌ Settings document does NOT exist!');
      console.log('This is why automatic notifications are not working.\n');
      return;
    }
    
    const settings = settingsDoc.data();
    console.log('✅ Settings document exists:');
    console.log(JSON.stringify(settings, null, 2));
    console.log('\n');
    
    if (settings.enabled === true) {
      console.log('✅ Notifications are ENABLED');
    } else if (settings.enabled === false) {
      console.log('❌ Notifications are DISABLED');
    } else {
      console.log('⚠️  enabled field is:', settings.enabled);
    }
    
    console.log('\nTrigger Times:');
    console.log('  Morning:', settings.morningTriggerTime);
    console.log('  Afternoon:', settings.afternoonTriggerTime);
    console.log('  Evening:', settings.eveningTriggerTime);
    
    if (settings.updatedAt) {
      console.log('\nLast updated:', settings.updatedAt.toDate());
    }
    if (settings.updatedBy) {
      console.log('Updated by:', settings.updatedBy);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkSettings();
