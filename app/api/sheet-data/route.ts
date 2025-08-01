import { NextRequest, NextResponse } from 'next/server';

// This is an API route to fetch ALL student registration data from a Google Sheet.
// It's intended for debugging purposes to see the exact data, including timestamps.

export async function GET(request: NextRequest) {
  try {
    // IMPORTANT: This uses the same environment variable as the student-registration route.
    const registrationSheetApiUrl = process.env.REGISTRATION_SHEET_API_URL;
    if (!registrationSheetApiUrl) {
      return NextResponse.json(
        { error: 'Registration Sheet API URL not configured. Please set REGISTRATION_SHEET_API_URL in your environment variables.' },
        { status: 500 }
      );
    }
    
    console.log('Fetching all registration data from Google Apps Script:', registrationSheetApiUrl);

    // Make the request to Google Apps Script from the server (without any parameters)
    const response = await fetch(registrationSheetApiUrl, {
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
    
    return NextResponse.json(data, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error in sheet-data API route:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch all registration data from sheet',
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