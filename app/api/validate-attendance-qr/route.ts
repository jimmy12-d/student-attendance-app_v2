import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/firebase-admin-utils';

export async function POST(request: NextRequest) {
  try {
    const { token, studentUid } = await request.json();

    console.log('🔍 Validating QR token:', { token, studentUid });

    if (!token || !studentUid) {
      console.log('❌ Missing token or studentUid');
      return NextResponse.json(
        { error: 'Token and student UID are required' },
        { status: 400 }
      );
    }

    // Initialize Firebase Admin
    const db = await getAdminDb();

    // Check if token exists and is valid
    const tokenDoc = await db.collection('tempAttendanceTokens').doc(token).get();

    if (!tokenDoc.exists) {
      console.log('❌ Token not found in database:', token);
      return NextResponse.json(
        { error: 'Invalid QR code' },
        { status: 404 }
      );
    }

    const tokenData = tokenDoc.data();
    console.log('📋 Token data:', {
      studentUid: tokenData?.studentUid,
      used: tokenData?.used,
      expiresAt: tokenData?.expiresAt?.toDate?.()
    });

    // Validate token hasn't expired
    const now = new Date();
    if (!tokenData?.expiresAt || tokenData.expiresAt.toDate() < now) {
      console.log('❌ Token expired:', {
        expiresAt: tokenData?.expiresAt?.toDate?.(),
        now
      });
      return NextResponse.json(
        { error: 'QR code has expired. Please generate a new one.' },
        { status: 400 }
      );
    }

    // Verify the student UID matches
    if (tokenData?.studentUid !== studentUid) {
      console.log('❌ Student UID mismatch:', {
        expected: tokenData?.studentUid,
        received: studentUid
      });
      return NextResponse.json(
        { error: 'QR code does not match this student' },
        { status: 403 }
      );
    }

    // Check if token has already been used
    if (tokenData?.used) {
      console.log('❌ Token already used');
      return NextResponse.json(
        { error: 'QR code has already been used' },
        { status: 409 }
      );
    }

    // Mark token as used
    await tokenDoc.ref.update({
      used: true,
      usedAt: new Date()
    });

    console.log('✅ Token validated successfully');

    // Return success
    return NextResponse.json({
      success: true,
      studentUid: tokenData.studentUid,
      studentName: tokenData.studentName
    });
  } catch (error) {
    console.error('❌ Error validating attendance QR token:', error);
    return NextResponse.json(
      { error: 'Failed to validate QR token' },
      { status: 500 }
    );
  }
}
