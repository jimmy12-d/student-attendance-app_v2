import { NextRequest, NextResponse } from 'next/server';

// Dynamic import for Sharp (only if available)
let sharp: any = null;
try {
  sharp = require('sharp');
} catch (error) {
  console.warn('Sharp not available - HEIC conversion will not work');
}

// Function to detect HEIC format
function isHeicFormat(buffer: Uint8Array): boolean {
  // HEIC files typically start with specific byte patterns
  // Check for 'ftyp' box and HEIC/HEIX brand
  if (buffer.length < 12) return false;
  
  // Look for the 'ftyp' box (file type box) which should be at offset 4
  const ftypSignature = buffer.slice(4, 8);
  const ftypString = String.fromCharCode(...ftypSignature);
  
  if (ftypString === 'ftyp') {
    // Check the brand (major brand identifier at offset 8-12)
    const brand = buffer.slice(8, 12);
    const brandString = String.fromCharCode(...brand);
    
    // Common HEIC brands: 'heic', 'heix', 'heim', 'heis'
    return ['heic', 'heix', 'heim', 'heis'].includes(brandString);
  }
  
  return false;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 });
    }

    // Validate that it's a Google Drive URL
    if (!imageUrl.includes('drive.google.com')) {
      return NextResponse.json({ error: 'Only Google Drive URLs are supported' }, { status: 400 });
    }

    // Convert Google Drive share URL to direct download URL
    let directUrl = imageUrl;
    
    // Handle various Google Drive URL formats
    if (imageUrl.includes('/file/d/')) {
      const fileIdMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    } else if (imageUrl.includes('/open?id=')) {
      const fileIdMatch = imageUrl.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    } else if (imageUrl.includes('uc?id=')) {
      // Already in the correct format, but ensure export=download
      if (!imageUrl.includes('export=download')) {
        directUrl = imageUrl.replace('uc?id=', 'uc?export=download&id=');
      }
    } else if (imageUrl.includes('/view')) {
      // Handle /view URLs like: https://drive.google.com/file/d/FILE_ID/view?usp=sharing
      const fileIdMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        directUrl = `https://drive.google.com/uc?export=download&id=${fileIdMatch[1]}`;
      }
    }

    console.log('Original URL:', imageUrl);
    console.log('Converted URL:', directUrl);

    // Try multiple approaches for Google Drive
    const urlsToTry = [directUrl];
    
    // Add alternative URL formats if the original conversion didn't work
    if (imageUrl.includes('/file/d/')) {
      const fileIdMatch = imageUrl.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        urlsToTry.push(
          `https://drive.google.com/uc?id=${fileId}`,
          `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`,
          `https://lh3.googleusercontent.com/d/${fileId}`
        );
      }
    }

    let lastError: any = null;

    // Try each URL until one works
    for (let i = 0; i < urlsToTry.length; i++) {
      const urlToTry = urlsToTry[i];
      console.log(`Attempt ${i + 1}: Trying URL:`, urlToTry);

      try {
        // Fetch the image from Google Drive
        const response = await fetch(urlToTry, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://drive.google.com/',
          },
        });

        if (response.ok) {
          console.log(`Success with URL ${i + 1}:`, urlToTry);
          
          // Get the image data
          const imageBuffer = await response.arrayBuffer();
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          
          // Check if the image might be HEIC format
          const uint8Array = new Uint8Array(imageBuffer);
          const isHeic = isHeicFormat(uint8Array);
          
          if (isHeic && sharp) {
            console.log('Detected HEIC format, converting to JPEG...');
            try {
              // Convert HEIC to JPEG using Sharp
              const convertedBuffer = await sharp(Buffer.from(imageBuffer))
                .jpeg({ quality: 90 })
                .toBuffer();
              
              console.log(`HEIC converted: ${imageBuffer.byteLength} bytes -> ${convertedBuffer.length} bytes`);
              
              return new NextResponse(convertedBuffer, {
                status: 200,
                headers: {
                  'Content-Type': 'image/jpeg',
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': '*',
                  'Access-Control-Allow-Methods': 'GET',
                  'Access-Control-Allow-Headers': 'Content-Type',
                  'X-Converted-From': 'HEIC',
                },
              });
            } catch (conversionError) {
              console.error('HEIC conversion failed:', conversionError);
              // Fall through to return original image
            }
          } else if (isHeic && !sharp) {
            console.error('HEIC format detected but Sharp not available for conversion');
            return NextResponse.json(
              { 
                error: 'HEIC format detected but image conversion is not available. Please use JPEG, PNG, or WebP format.',
                format: 'HEIC',
                suggestion: 'Convert the image to JPEG or PNG format before uploading to Google Drive.'
              }, 
              { status: 415 }
            );
          }

          // Return the image with proper headers (non-HEIC or conversion failed)
          return new NextResponse(imageBuffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=3600',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        } else {
          console.error(`Failed attempt ${i + 1}:`, response.status, response.statusText);
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        console.error(`Error with attempt ${i + 1}:`, error);
        lastError = error;
      }
    }

    // If all attempts failed, return error
    console.error('All URL attempts failed. Last error:', lastError);
    return NextResponse.json(
      { 
        error: `Failed to fetch image after ${urlsToTry.length} attempts. Last error: ${lastError?.message || 'Unknown error'}`,
        triedUrls: urlsToTry
      }, 
      { status: 404 }
    );

  } catch (error) {
    console.error('Image proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy image' }, 
      { status: 500 }
    );
  }
}

// Handle preflight requests for CORS
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
