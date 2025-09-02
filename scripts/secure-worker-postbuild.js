const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Read environment variables
require('dotenv').config({ path: '.env.local' });

const replacements = {
  '__FIREBASE_API_KEY__': process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  '__FIREBASE_AUTH_DOMAIN__': process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  '__FIREBASE_PROJECT_ID__': process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  '__FIREBASE_STORAGE_BUCKET__': process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  '__FIREBASE_MESSAGING_SENDER_ID__': process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  '__FIREBASE_APP_ID__': process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
  '__FIREBASE_MEASUREMENT_ID__': process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || ''
};

// Find the built worker file
const publicDir = path.resolve(process.cwd(), 'public');
const workerFiles = glob.sync(path.join(publicDir, 'worker-*.js'));

if (workerFiles.length === 0) {
  console.log('⚠️  No worker files found to process');
  process.exit(0);
}

workerFiles.forEach(workerFile => {
  try {
    let content = fs.readFileSync(workerFile, 'utf8');
    
    // Replace all placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      const regex = new RegExp(placeholder, 'g');
      content = content.replace(regex, value);
    });
    
    // Write the updated content
    fs.writeFileSync(workerFile, content, 'utf8');
    
    console.log(`✅ Secure credentials injected into: ${path.basename(workerFile)}`);
  } catch (error) {
    console.error(`❌ Error processing ${workerFile}:`, error);
  }
});

console.log('🔒 All service worker files secured!');
console.log(`✅ Successfully Built`);
