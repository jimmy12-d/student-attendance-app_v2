import { NextRequest, NextResponse } from 'next/server';

// Temporary minimal implementation to fix build issues
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    message: 'ABA API not configured',
    transactions: []
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    success: false, 
    message: 'ABA API not configured' 
  });
}