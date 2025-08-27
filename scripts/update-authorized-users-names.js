// Script to add name fields to authorizedUsers collection
// This is a one-time setup script to ensure the name field exists

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// Firebase config (you'll need to adjust this to match your config)
const firebaseConfig = {
  // Add your Firebase config here
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateAuthorizedUsers() {
  try {
    // Update rodwelllc@gmail.com - this user will have dropdown selection
    const rodwellRef = doc(db, 'authorizedUsers', 'rodwelllc@gmail.com');
    const rodwellSnap = await getDoc(rodwellRef);
    
    if (rodwellSnap.exists()) {
      await updateDoc(rodwellRef, {
        name: 'Rodwell' // This will be overridden by dropdown selection
      });
      console.log('✅ Updated rodwelllc@gmail.com');
    }

    // Update other authorized user with their actual name
    const jasperRef = doc(db, 'authorizedUsers', 'chhorngjasper@gmail.com');
    const jasperSnap = await getDoc(jasperRef);
    
    if (jasperSnap.exists()) {
      await updateDoc(jasperRef, {
        name: 'Jasper Chhorng'
      });
      console.log('✅ Updated chhorngjasper@gmail.com');
    }

    console.log('🎉 All authorized users updated with name fields');
  } catch (error) {
    console.error('❌ Error updating authorized users:', error);
  }
}

updateAuthorizedUsers();
