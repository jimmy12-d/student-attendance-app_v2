#!/bin/bash

# FaceIO Setup Script for Student Attendance System
# This script helps configure FaceIO integration

echo "🎭 FaceIO Integration Setup"
echo "=========================="
echo ""

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d "app" ]; then
    echo "❌ Error: Please run this script from the root of your Next.js project"
    exit 1
fi

echo "📋 Setup Checklist:"
echo ""

# Step 1: FaceIO Account
echo "1️⃣  FaceIO Account Setup"
echo "   ✅ Visit: https://console.faceio.net/"
echo "   ✅ Create account or sign in"
echo "   ✅ Create a new application"
echo "   ✅ Note your Application ID (fioapiXXX...)"
echo ""

# Step 2: Configuration
echo "2️⃣  Application Configuration"
echo "   The following files need your FaceIO App ID:"
echo "   📁 app/dashboard/face-scan-faceio/page.tsx"
echo ""
echo "   Replace 'YOUR_FACEIO_APP_ID' with your actual App ID"
echo ""

# Step 3: Domain Configuration
echo "3️⃣  Domain Configuration (In FaceIO Console)"
echo "   ✅ Add your domain(s) to permitted domains:"
echo "   - localhost:3000 (for development)"
echo "   - your-production-domain.com"
echo ""

# Step 4: Security Settings
echo "4️⃣  Security Settings (Recommended)"
echo "   ✅ Enable anti-spoofing features"
echo "   ✅ Configure enrollment/authentication flows"
echo "   ✅ Set appropriate security levels"
echo ""

# Interactive App ID setup
echo "🔧 Interactive Setup"
echo "=================="
echo ""

read -p "Do you have your FaceIO Application ID ready? (y/n): " has_app_id

if [ "$has_app_id" = "y" ] || [ "$has_app_id" = "Y" ]; then
    echo ""
    read -p "Enter your FaceIO Application ID: " app_id
    
    if [ ! -z "$app_id" ]; then
        # Create backup of the original file
        cp "app/dashboard/face-scan-faceio/page.tsx" "app/dashboard/face-scan-faceio/page.tsx.backup"
        
        # Replace the placeholder with actual App ID
        if [[ "$OSTYPE" == "darwin"* ]]; then
            # macOS
            sed -i '' "s/YOUR_FACEIO_APP_ID/$app_id/g" "app/dashboard/face-scan-faceio/page.tsx"
        else
            # Linux
            sed -i "s/YOUR_FACEIO_APP_ID/$app_id/g" "app/dashboard/face-scan-faceio/page.tsx"
        fi
        
        echo "✅ App ID configured successfully!"
        echo "📁 Backup created: app/dashboard/face-scan-faceio/page.tsx.backup"
    else
        echo "❌ No App ID provided. Please manually update the file."
    fi
else
    echo "ℹ️  Please complete FaceIO account setup first, then run this script again."
fi

echo ""
echo "📝 Environment Variables (Optional but Recommended)"
echo "=================================================="
echo ""
echo "For better security, you can use environment variables:"
echo ""
echo "1. Create or update .env.local:"
echo "   NEXT_PUBLIC_FACEIO_APP_ID=your_app_id_here"
echo ""
echo "2. Update the code to use:"
echo "   process.env.NEXT_PUBLIC_FACEIO_APP_ID"
echo ""

# Database preparation
echo "🗄️  Database Preparation"
echo "======================="
echo ""
echo "Ensure your Firestore has the required collections:"
echo "✅ students (with firstName, lastName, email fields)"
echo "✅ attendance (for attendance records)"
echo ""
echo "The system will automatically add FaceIO fields to existing students."
echo ""

# Testing
echo "🧪 Testing Your Setup"
echo "===================="
echo ""
echo "1. Start your development server:"
echo "   npm run dev"
echo ""
echo "2. Navigate to: http://localhost:3000/dashboard/face-attendance-selector"
echo ""
echo "3. Test the FaceIO Scanner with a sample student"
echo ""

# Troubleshooting
echo "🔧 Troubleshooting"
echo "=================="
echo ""
echo "Common issues and solutions:"
echo ""
echo "❓ 'FaceIO not initialized' error:"
echo "   - Check internet connectivity"
echo "   - Verify App ID is correct"
echo "   - Check browser console for script loading errors"
echo ""
echo "❓ 'Face not detected' error:"
echo "   - Ensure good lighting"
echo "   - Check camera permissions"
echo "   - Try different browser or device"
echo ""
echo "❓ 'Domain not permitted' error:"
echo "   - Add your domain to FaceIO console"
echo "   - Check for typos in domain name"
echo ""

echo "📚 Documentation"
echo "==============="
echo ""
echo "📖 Full Integration Guide: ./FACEIO-INTEGRATION-GUIDE.md"
echo "🌐 FaceIO Documentation: https://faceio.net/getting-started"
echo "💬 Support: https://discord.gg/faceio"
echo ""

echo "✨ Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Configure your FaceIO App ID (if not done above)"
echo "2. Test with development server"
echo "3. Configure domain permissions in FaceIO console"
echo "4. Deploy and test in production"
echo ""
echo "Happy coding! 🚀"
