import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/firebase-admin-utils';

// Helper function to generate a random token
function generateAttendanceToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = '';
  for (let i = 0; i < 12; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Helper function to retry an async operation with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt + 1}/${maxRetries} failed:`, error);
      
      // Don't retry on the last attempt
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const { studentUid, studentName } = await request.json();

    console.log('📥 Generate QR API called:', { studentUid, studentName });

    if (!studentUid || !studentName) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Student UID and name are required', errorType: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin with retry
    const db = await retryWithBackoff(async () => {
      const adminDb = await getAdminDb();
      if (!adminDb) {
        throw new Error('Failed to initialize Firebase Admin');
      }
      return adminDb;
    }, 3, 500);
    
    console.log('✅ Firebase Admin initialized');

    // Generate unique token
    const token = generateAttendanceToken();
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds from now

    console.log('🎫 Token generated:', { token, expiresAt });

    // Store temporary attendance token in Firestore with retry
    await retryWithBackoff(async () => {
      await db.collection('tempAttendanceTokens').doc(token).set({
        studentUid,
        studentName,
        token,
        createdAt: new Date(),
        expiresAt,
        used: false,
        type: 'attendance' // To distinguish from registration tokens
      });
    }, 3, 500);

    console.log('✅ Token saved to Firestore');

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error: any) {
    console.error('❌ Error generating attendance QR token:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to generate QR token';
    let errorType = 'UNKNOWN_ERROR';
    
    if (error?.message?.includes('Firebase Admin')) {
      errorMessage = 'Database connection failed. Please check your internet connection.';
      errorType = 'CONNECTION_ERROR';
    } else if (error?.code === 'ECONNREFUSED' || error?.code === 'ETIMEDOUT') {
      errorMessage = 'Network connection failed. Please check your internet connection.';
      errorType = 'NETWORK_ERROR';
    } else if (error?.message?.includes('credentials')) {
      errorMessage = 'Authentication failed. Please try again.';
      errorType = 'AUTH_ERROR';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        errorType,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
