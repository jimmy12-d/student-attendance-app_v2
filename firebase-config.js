// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // If you need authentication for admins
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check"; // <-- Import App Check


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Initialize Firestore
// const appCheck = initializeAppCheck(app, {
//   provider: new ReCaptchaV3Provider('6LefUVwrAAAAAHKd5hwlHPowbt0HLgwiCuwtI1U5'),
  

//   // Optional argument. If true, the SDK automatically refreshes App Check
//   // tokens as needed.
//   isTokenAutoRefreshEnabled: true
// });


const db = getFirestore(app);
// Initialize Firebase Authentication (optional, but recommended for admin)
const auth = getAuth(app);

export { db, auth }; // Export db and auth