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

export async function POST(request: NextRequest) {
  try {
    const { studentUid, studentName } = await request.json();

    console.log('📥 Generate QR API called:', { studentUid, studentName });

    if (!studentUid || !studentName) {
      console.log('❌ Missing required fields');
      return NextResponse.json(
        { error: 'Student UID and name are required' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    const db = await getAdminDb();
    console.log('✅ Firebase Admin initialized');

    // Generate unique token
    const token = generateAttendanceToken();
    const expiresAt = new Date(Date.now() + 30 * 1000); // 30 seconds from now

    console.log('🎫 Token generated:', { token, expiresAt });

    // Store temporary attendance token in Firestore
    await db.collection('tempAttendanceTokens').doc(token).set({
      studentUid,
      studentName,
      token,
      createdAt: new Date(),
      expiresAt,
      used: false,
      type: 'attendance' // To distinguish from registration tokens
    });

    console.log('✅ Token saved to Firestore');

    return NextResponse.json({
      success: true,
      token,
      expiresAt: expiresAt.toISOString()
    });
  } catch (error) {
    console.error('❌ Error generating attendance QR token:', error);
    return NextResponse.json(
      { error: 'Failed to generate QR token' },
      { status: 500 }
    );
  }
}
