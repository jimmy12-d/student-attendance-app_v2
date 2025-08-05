// Finance Password Setup Guide
// This script provides instructions for setting up the financePW collection
// Since the app uses environment variables, manual setup is recommended

console.log(`
🔐 Finance Password Setup Guide
================================

To set up the finance dashboard password protection, follow these steps:

1. Go to your Firebase Console: https://console.firebase.google.com
2. Navigate to your project
3. Go to Firestore Database
4. Click "Start collection"
5. Collection ID: "financePW"
6. Document ID: "access"
7. Add these fields:

   Field Name: password
   Type: string
   Value: "finance2025"  // ⚠️ CHANGE THIS TO YOUR SECURE PASSWORD

   Field Name: createdAt
   Type: string
   Value: "${new Date().toISOString()}"

   Field Name: description
   Type: string
   Value: "Finance dashboard access password"

   Field Name: lastUpdated
   Type: string
   Value: "${new Date().toISOString()}"

8. Click "Save"

⚠️  IMPORTANT SECURITY NOTES:
- Change "finance2025" to a strong, unique password
- Only share this password with authorized personnel
- Consider updating the password periodically
- Record the password in a secure location

✅ Once completed, users can access the Payment Summary dashboard
   by clicking the "Payment Summary" button in the POS page header.

🔍 To update the password later:
1. Go to Firestore Database > financePW > access
2. Edit the "password" field
3. Update the "lastUpdated" field to current timestamp
`);

// Alternative: If you want to use a script with your own Firebase config
// Uncomment and modify the following section:

/*
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Replace with your actual Firebase configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

async function setupFinancePassword() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const financeDocRef = doc(db, "financePW", "access");
    
    // CHANGE THIS PASSWORD TO YOUR SECURE PASSWORD
    const password = "your-secure-password-here";
    
    await setDoc(financeDocRef, {
      password: password,
      createdAt: new Date().toISOString(),
      description: "Finance dashboard access password",
      lastUpdated: new Date().toISOString()
    });
    
    console.log("✅ Finance password collection created successfully!");
    console.log(`🔑 Password set to: ${password}`);
    
  } catch (error) {
    console.error("❌ Error setting up finance password:", error);
  }
}

// Uncomment the line below to run the script
// setupFinancePassword();
*/
