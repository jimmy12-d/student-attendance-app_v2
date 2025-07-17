// setup-teachers-data.js
// Quick script to add sample teachers to Firestore
// Run: node setup-teachers-data.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (set GOOGLE_APPLICATION_CREDENTIALS environment variable)
try {
  admin.initializeApp();
} catch (error) {
  console.log('Firebase already initialized or error:', error.message);
}

const db = admin.firestore();

const sampleTeachers = [
  {
    fullName: "Kov Rodwell",
    subject: "Math",
    email: "kov.rodwell@school.edu",
  },
  {
    fullName: "Sarah Johnson", 
    subject: "English",
    email: "sarah.johnson@school.edu",
  },
  {
    fullName: "Michael Chen",
    subject: "Science", 
    email: "michael.chen@school.edu",
  },
  {
    fullName: "Maria Rodriguez",
    subject: "History",
    email: "maria.rodriguez@school.edu",
  }
];

async function addTeachers() {
  console.log('Adding sample teachers...');
  
  try {
    for (const teacher of sampleTeachers) {
      const docRef = await db.collection('teachers').add({
        ...teacher,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Added: ${teacher.fullName} - ${teacher.subject} (ID: ${docRef.id})`);
    }
    
    console.log('\n🎉 All teachers added successfully!');
    console.log('You can now use the print request system.');
    
  } catch (error) {
    console.error('❌ Error adding teachers:', error);
  }
  
  process.exit();
}

addTeachers(); 