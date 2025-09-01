// Firebase Admin SDK initialization utility for Firebase Hosting
import { initializeApp, getApps, cert, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let adminApp: any = null;
let adminDb: any = null;

export async function getAdminDb() {
  if (adminDb) {
    return adminDb;
  }

  try {
    console.log('🔥 [Utils] Initializing Firebase Admin SDK for Firebase Hosting...');
    
    // Clean up any existing apps
    const existingApps = getApps();
    console.log(`🧹 [Utils] Found ${existingApps.length} existing Firebase apps, cleaning up...`);
    
    for (const app of existingApps) {
      try {
        await deleteApp(app);
        console.log(`🗑️ [Utils] Deleted app: ${app.name}`);
      } catch (deleteError) {
        console.warn(`⚠️ [Utils] Could not delete app ${app.name}:`, deleteError);
      }
    }

    // Create fresh admin app
    const credentials = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    console.log('🔧 [Utils] Creating admin app with credentials...', {
      projectId: credentials.projectId ? 'SET' : 'MISSING',
      clientEmail: credentials.clientEmail ? 'SET' : 'MISSING',
      privateKey: credentials.privateKey ? `SET (${credentials.privateKey.length} chars)` : 'MISSING'
    });

    adminApp = initializeApp({
      credential: cert(credentials),
    }, 'qr-admin-app');

    adminDb = getFirestore(adminApp);
    console.log('✅ [Utils] Firebase Admin SDK initialized successfully');
    
    return adminDb;
  } catch (error) {
    console.error('❌ [Utils] Firebase Admin initialization failed:', error);
    adminDb = null;
    adminApp = null;
    return null;
  }
}

export function isAdminDbAvailable(): boolean {
  return adminDb !== null;
}
