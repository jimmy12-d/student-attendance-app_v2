#!/bin/bash

# Firebase Backup System Setup Script
# This script helps set up the Firebase backup system for your application

echo "🔧 Firebase Backup System Setup"
echo "================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# Install required dependencies
echo ""
echo "📦 Installing required dependencies..."
npm install node-cron

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Create necessary directories
echo ""
echo "📁 Creating backup directories..."
mkdir -p backups/firestore
mkdir -p logs

echo "✅ Directories created:"
echo "   - backups/firestore/ (for storing backups)"
echo "   - logs/ (for backup logs)"

# Check for environment variables
echo ""
echo "🔐 Checking environment variables..."

if [ -f ".env.local" ]; then
    echo "✅ .env.local file found"
    
    # Check for required variables
    if grep -q "NEXT_PUBLIC_FIREBASE_PROJECT_ID" .env.local; then
        echo "✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID found"
    else
        echo "⚠️  NEXT_PUBLIC_FIREBASE_PROJECT_ID not found in .env.local"
    fi
    
    if grep -q "FIREBASE_CLIENT_EMAIL" .env.local; then
        echo "✅ FIREBASE_CLIENT_EMAIL found"
    else
        echo "⚠️  FIREBASE_CLIENT_EMAIL not found in .env.local"
    fi
    
    if grep -q "FIREBASE_PRIVATE_KEY" .env.local; then
        echo "✅ FIREBASE_PRIVATE_KEY found"
    else
        echo "⚠️  FIREBASE_PRIVATE_KEY not found in .env.local"
    fi
else
    echo "⚠️  .env.local file not found"
    echo ""
    echo "Please create a .env.local file with the following variables:"
    echo "NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id"
    echo "FIREBASE_CLIENT_EMAIL=your-service-account-email"
    echo "FIREBASE_PRIVATE_KEY=\"-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\""
fi

# Test Firebase connection
echo ""
echo "🔌 Testing Firebase connection..."
node -e "
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

try {
    if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        const app = initializeApp({
            credential: cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\n'),
            }),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        const db = getFirestore(app);
        console.log('✅ Firebase connection successful');
    } else {
        console.log('⚠️  Firebase credentials not found in environment');
    }
} catch (error) {
    console.log('❌ Firebase connection failed:', error.message);
}
" 2>/dev/null

# Create a sample backup script
echo ""
echo "📝 Creating quick-start scripts..."

cat > scripts/quick-backup.sh << 'EOF'
#!/bin/bash
echo "🚀 Creating Firebase backup..."
node scripts/firebase-backup.js --compress
echo "✅ Backup completed! Check the backups/firestore/ directory."
EOF

chmod +x scripts/quick-backup.sh

cat > scripts/setup-cron.sh << 'EOF'
#!/bin/bash
echo "⏰ Setting up automatic daily backups..."
echo "This will add a cron job to run backups daily at 2 AM"
echo ""
read -p "Do you want to continue? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Add cron job
    (crontab -l 2>/dev/null; echo "0 2 * * * cd $(pwd) && npm run backup:once >> logs/cron-backup.log 2>&1") | crontab -
    echo "✅ Cron job added! Backups will run daily at 2 AM"
    echo "📝 Logs will be saved to logs/cron-backup.log"
else
    echo "❌ Cron setup cancelled"
fi
EOF

chmod +x scripts/setup-cron.sh

echo "✅ Quick-start scripts created:"
echo "   - scripts/quick-backup.sh (manual backup)"
echo "   - scripts/setup-cron.sh (setup automatic backups)"

# Summary
echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Make sure your .env.local file has the required Firebase credentials"
echo "2. Test your first backup:"
echo "   npm run backup:create"
echo ""
echo "3. View all backup commands:"
echo "   npm run backup:help"
echo ""
echo "4. Access the web interface at:"
echo "   http://localhost:3000/admin/backup"
echo ""
echo "5. Set up automatic backups:"
echo "   ./scripts/setup-cron.sh"
echo ""
echo "📖 Full documentation: BACKUP-SYSTEM-DOCS.md"
echo ""
echo "Happy backing up! 🔒"
