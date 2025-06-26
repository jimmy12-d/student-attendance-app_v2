import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('student_id');
    const secret = searchParams.get('secret');
    const examName = searchParams.get('exam_name');

    // Validate required parameters
    if (!studentId || !secret) {
      return NextResponse.json(
        { error: 'Missing required parameters: student_id and secret' },
        { status: 400 }
      );
    }

    // Get the Google Apps Script URL from environment variables
    const sheetApiUrl = process.env.NEXT_PUBLIC_SHEET_API_URL;
    if (!sheetApiUrl) {
      return NextResponse.json(
        { error: 'Sheet API URL not configured' },
        { status: 500 }
      );
    }

    // Build the URL for the Google Apps Script
    const googleScriptUrl = new URL(sheetApiUrl);
    googleScriptUrl.searchParams.set('student_id', studentId);
    googleScriptUrl.searchParams.set('secret', secret);
    if (examName) {
      googleScriptUrl.searchParams.set('exam_name', examName);
    }

    console.log('Fetching from Google Apps Script:', googleScriptUrl.toString());

    // Make the request to Google Apps Script from the server
    const response = await fetch(googleScriptUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'NextJS-Server/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Google Apps Script responded with status: ${response.status}`);
    }

    const data = await response.json();

    // Return the data with CORS headers
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in sheet-data API route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch data from sheet',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 