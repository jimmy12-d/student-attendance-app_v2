import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (only if not already initialized)
let db: any = null;
let firebaseInitError: string | null = null;

try {
  console.log('🔥 [Diagnostic] Initializing Firebase Admin SDK...');
  
  if (!process.env.FIREBASE_PROJECT_ID) {
    throw new Error('FIREBASE_PROJECT_ID environment variable is missing');
  }
  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('FIREBASE_CLIENT_EMAIL environment variable is missing');
  }
  if (!process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('FIREBASE_PRIVATE_KEY environment variable is missing');
  }

  // Force create a new app with a unique name for Firebase Hosting
  const appName = 'diagnostic-app-' + Date.now();
  console.log(`🚀 [Diagnostic] Creating Firebase Admin app with name: ${appName}...`);
  
  const app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  }, appName);
  
  db = getFirestore(app);
  console.log('✅ [Diagnostic] Firebase Admin SDK initialized successfully');
} catch (error) {
  console.error('❌ [Diagnostic] Firebase Admin initialization failed:', error);
  firebaseInitError = error instanceof Error ? error.message : 'Unknown error';
  db = null;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testToken = searchParams.get('token') || 'TEST123TOKEN456';
  
  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    firebase: {
      available: !!db,
      projectId: process.env.FIREBASE_PROJECT_ID ? 
        `${process.env.FIREBASE_PROJECT_ID.substring(0, 10)}...` : 'NOT_SET',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 
        `${process.env.FIREBASE_CLIENT_EMAIL.substring(0, 15)}...` : 'NOT_SET',
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? 
        'SET (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'NOT_SET',
      initializationError: firebaseInitError,
      connectionTest: 'pending' as string,
      documentsFound: 0 as number,
      connectionError: null as string | null
    },
    qrTest: {
      status: 'pending',
      url: '',
      fetchable: false,
      error: null
    }
  };

  // Test QR code generation
  try {
    const qrCodeURL = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`https://t.me/rodwell_portal_password_bot?start=${testToken}`)}`;
    diagnostics.qrTest.url = qrCodeURL;
    
    const qrResponse = await fetch(qrCodeURL);
    diagnostics.qrTest.fetchable = qrResponse.ok;
    diagnostics.qrTest.status = qrResponse.ok ? 'success' : 'failed';
    
    if (!qrResponse.ok) {
      diagnostics.qrTest.error = `${qrResponse.status} ${qrResponse.statusText}`;
    }
  } catch (error) {
    diagnostics.qrTest.status = 'error';
    diagnostics.qrTest.error = error instanceof Error ? error.message : 'Unknown error';
  }

  // Test Firebase connection if available
  if (db) {
    try {
      // Try to read from a collection
      const testDoc = await db.collection('tempRegistrationTokens').limit(1).get();
      diagnostics.firebase.connectionTest = 'success';
      diagnostics.firebase.documentsFound = testDoc.size;
    } catch (error) {
      diagnostics.firebase.connectionTest = 'failed';
      diagnostics.firebase.connectionError = error instanceof Error ? error.message : 'Unknown error';
    }
  } else {
    diagnostics.firebase.connectionTest = 'skipped - db not available';
  }

  return NextResponse.json(diagnostics, { 
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}