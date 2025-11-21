import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/app/api/firebase-admin-utils';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { studentId, inBPClass } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    // Get Firestore database
    const db = await getAdminDb();
    const docRef = db.collection('students').doc(studentId);
    
    // Check if document exists first
    const docSnapshot = await docRef.get();
    if (!docSnapshot.exists) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      );
    }

    // Update the document
    await docRef.update({
      inBPClass: Boolean(inBPClass),
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({
      success: true,
      message: `Student BP class status updated to ${inBPClass}`,
      studentId,
      inBPClass,
    });
  } catch (error) {
    console.error('Error updating BP class:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update BP class status' },
      { status: 500 }
    );
  }
}
