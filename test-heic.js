#!/usr/bin/env node

// Test HEIC detection and conversion
const sharp = require('sharp');
const https = require('https');
const http = require('http');

// Test HEIC detection function
function isHeicFormat(buffer) {
  if (buffer.length < 12) return false;
  
  const ftypSignature = buffer.slice(4, 8);
  const ftypString = String.fromCharCode(...ftypSignature);
  
  if (ftypString === 'ftyp') {
    const brand = buffer.slice(8, 12);
    const brandString = String.fromCharCode(...brand);
    return ['heic', 'heix', 'heim', 'heis'].includes(brandString);
  }
  
  return false;
}

async function testImageProxy() {
  const testUrl = 'http://localhost:3000/api/image-proxy?url=' + 
    encodeURIComponent('https://drive.google.com/file/d/1CTmQ-vlt2EryWHlWm9Bb41wshusHGGHy/view?usp=sharing');
  
  console.log('Testing URL:', testUrl);
  
  try {
    const response = await fetch(testUrl);
    console.log('Status:', response.status);
    console.log('Content-Type:', response.headers.get('content-type'));
    console.log('X-Converted-From:', response.headers.get('x-converted-from'));
    
    if (response.ok) {
      const buffer = await response.arrayBuffer();
      console.log('Response size:', buffer.byteLength, 'bytes');
      
      // Check if it's HEIC
      const uint8Array = new Uint8Array(buffer);
      const isHeic = isHeicFormat(uint8Array);
      console.log('Is HEIC format:', isHeic);
      
      if (isHeic) {
        console.log('HEIC detected - conversion should happen in proxy');
      } else {
        console.log('Not HEIC format or successfully converted');
      }
    } else {
      const errorText = await response.text();
      console.log('Error response:', errorText);
    }
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testImageProxy();
}

module.exports = { testImageProxy, isHeicFormat };
