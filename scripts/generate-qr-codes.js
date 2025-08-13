/**
 * QR Code Generator Script for Student Registration
 * This script generates secure QR codes for student registration
 * Teachers can use this to create QR codes for their students
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Use service account key file if available, otherwise use default credentials
  const serviceAccountPath = path.join(__dirname, '..', 'firestore-upload', 'serviceAccountKey.json');
  
  try {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('Initialized with service account credentials');
  } catch (error) {
    // Fallback to default credentials (when running in cloud environment)
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
    console.log('Initialized with default credentials');
  }
}

const db = admin.firestore();

/**
 * Generate a secure one-time token
 */
function generateOneTimeToken() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 16; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

/**
 * Generate QR code URL for the token
 * Using the actual bot username: rodwell_portal_password_bot
 */
function generateQRCodeURL(token) {
    const botUsername = 'rodwell_portal_password_bot';
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://t.me/${botUsername}?start=${token}`;
}

/**
 * Generate QR codes for specific students
 */
async function generateQRCodes(studentIds = null, className = null) {
    try {
        console.log('Starting QR code generation...');
        
        let studentsQuery = db.collection('students');
        
        // Filter by class if specified
        if (className) {
            studentsQuery = studentsQuery.where('class', '==', className);
            console.log(`Filtering by class: ${className}`);
        }
        
        const snapshot = await studentsQuery.get();
        
        if (snapshot.empty) {
            console.log('No students found.');
            return;
        }
        
        const qrCodes = [];
        const batch = db.batch();
        let processedCount = 0;
        
        for (const doc of snapshot.docs) {
            const studentData = doc.data();
            const studentId = doc.id;
            
            // Skip if specific student IDs provided and this student is not in the list
            if (studentIds && !studentIds.includes(studentId)) {
                continue;
            }
            
            // Generate one-time registration token
            const token = generateOneTimeToken();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            
            // Update student with registration token
            batch.update(doc.ref, {
                registrationToken: token,
                tokenGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
                tokenExpiresAt: expiresAt
            });
            
            // Generate QR code URL
            const qrCodeURL = generateQRCodeURL(token);
            
            const qrCodeData = {
                studentId: studentId,
                studentName: studentData.fullName || 'Unknown',
                username: studentData.username || 'N/A',
                class: studentData.class || 'N/A',
                token: token,
                qrCodeURL: qrCodeURL,
                expiresAt: expiresAt.toISOString()
            };
            
            qrCodes.push(qrCodeData);
            processedCount++;
            
            console.log(`Generated QR code for: ${studentData.fullName} (${studentData.class})`);
            console.log(`Token: ${token}`);
            console.log(`QR Code: ${qrCodeURL}`);
            console.log('---');
        }
        
        // Commit all token updates
        await batch.commit();
        
        console.log('\n=== QR Code Generation Complete ===');
        console.log(`Generated: ${processedCount} QR codes`);
        console.log(`Tokens valid for: 7 days`);
        
        // Optionally save to file
        const fs = require('fs');
        const outputFile = path.join(__dirname, '..', `qr-codes-${Date.now()}.json`);
        fs.writeFileSync(outputFile, JSON.stringify(qrCodes, null, 2));
        console.log(`\nQR codes saved to: ${outputFile}`);
        
        return qrCodes;
        
    } catch (error) {
        console.error('Error generating QR codes:', error);
    }
}

/**
 * Clean up expired tokens
 */
async function cleanupExpiredTokens() {
    try {
        console.log('Cleaning up expired tokens...');
        
        const now = new Date();
        const expiredTokensQuery = await db.collection('students')
            .where('tokenExpiresAt', '<', now)
            .get();
            
        if (expiredTokensQuery.empty) {
            console.log('No expired tokens found.');
            return;
        }
        
        const batch = db.batch();
        let cleanedCount = 0;
        
        for (const doc of expiredTokensQuery.docs) {
            batch.update(doc.ref, {
                registrationToken: admin.firestore.FieldValue.delete(),
                tokenGeneratedAt: admin.firestore.FieldValue.delete(),
                tokenExpiresAt: admin.firestore.FieldValue.delete()
            });
            cleanedCount++;
        }
        
        await batch.commit();
        console.log(`Cleaned up ${cleanedCount} expired tokens.`);
        
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
    }
}

/**
 * Display current token status
 */
async function checkTokenStatus() {
    try {
        const studentsCollection = db.collection('students');
        const allStudents = await studentsCollection.get();
        const withTokens = await studentsCollection.where('registrationToken', '!=', '').get();
        
        const now = new Date();
        let activeTokens = 0;
        let expiredTokens = 0;
        
        for (const doc of withTokens.docs) {
            const data = doc.data();
            if (data.tokenExpiresAt && data.tokenExpiresAt.toDate() > now) {
                activeTokens++;
            } else {
                expiredTokens++;
            }
        }
        
        console.log('\n=== Token Status ===');
        console.log(`Total Students: ${allStudents.size}`);
        console.log(`With Tokens: ${withTokens.size}`);
        console.log(`Active Tokens: ${activeTokens}`);
        console.log(`Expired Tokens: ${expiredTokens}`);
        
    } catch (error) {
        console.error('Error checking token status:', error);
    }
}

// Main execution
async function main() {
    const command = process.argv[2];
    const param = process.argv[3];
    
    switch (command) {
        case 'generate':
            if (param && param.startsWith('class:')) {
                const className = param.replace('class:', '');
                await generateQRCodes(null, className);
            } else {
                await generateQRCodes();
            }
            break;
        case 'status':
            await checkTokenStatus();
            break;
        case 'cleanup':
            await cleanupExpiredTokens();
            break;
        case 'all':
            await checkTokenStatus();
            await generateQRCodes();
            await checkTokenStatus();
            break;
        default:
            console.log('Usage: node generate-qr-codes.js [generate|status|cleanup|all] [class:ClassName]');
            console.log('');
            console.log('Commands:');
            console.log('  generate              - Generate QR codes for all students');
            console.log('  generate class:7A     - Generate QR codes for specific class');
            console.log('  status                - Check current token status');
            console.log('  cleanup               - Remove expired tokens');
            console.log('  all                   - Status + Generate + Status');
            console.log('');
            console.log('Examples:');
            console.log('  node generate-qr-codes.js generate');
            console.log('  node generate-qr-codes.js generate class:7A');
            console.log('  node generate-qr-codes.js status');
    }
    
    process.exit(0);
}

main().catch(console.error);
