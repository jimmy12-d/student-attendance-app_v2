import { NextRequest, NextResponse } from 'next/server';

// Temporary minimal implementation to fix build issues
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    message: 'ABA pending count API not configured',
    pendingCount: 0,
    count: 0
  });
} 