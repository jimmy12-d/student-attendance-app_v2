import { NextRequest, NextResponse } from 'next/server';

// This is a new API route to fetch student registration data from a Google Sheet
// based on a timestamp. The admin will provide the timestamp, and this endpoint
// will query a Google Apps Script to get the corresponding student's data.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timestamp = searchParams.get('timestamp');

    // Validate required parameter
    if (!timestamp) {
      return NextResponse.json(
        { error: 'Missing required parameter: timestamp' },
        { status: 400 }
      );
    }

    // IMPORTANT: You need to set this environment variable to the URL of your 
    // new Google Apps Script for the student registration sheet.
    const registrationSheetApiUrl = process.env.REGISTRATION_SHEET_API_URL;
    if (!registrationSheetApiUrl) {
      return NextResponse.json(
        { error: 'Registration Sheet API URL not configured. Please set REGISTRATION_SHEET_API_URL in your environment variables.' },
        { status: 500 }
      );
    }

    // Build the URL for the Google Apps Script
    const googleScriptUrl = new URL(registrationSheetApiUrl);
    googleScriptUrl.searchParams.set('timestamp', timestamp);
    
    // Make the request to Google Apps Script from the server
    const response = await fetch(googleScriptUrl.toString(), {
      method: 'GET',
      headers: {
        'User-Agent': 'NextJS-Server/1.0',
      },
      // Adding a revalidate option to ensure fresh data is fetched
      next: { revalidate: 0 } 
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Apps Script Error Response:', errorText);
        throw new Error(`Google Apps Script responded with status: ${response.status}. Details: ${errorText}`);
    }

    const data = await response.json();
    
    // The Google Apps Script should return data in this format:
    // {
    //   "timestamp": "...",
    //   "name": "...",
    //   "nameKhmer": "...",
    //   "phoneNumber": "...",
    //   "grade": "...",
    //   "shift": "...",
    //   "school": "...",
    //   "motherName": "...",
    //   "motherPhone": "...",
    //   "fatherName": "...",
    //   "fatherPhone": "...",
    //   "photoUrl": "..."
    // }

    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in student-registration API route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch registration data from sheet',
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 