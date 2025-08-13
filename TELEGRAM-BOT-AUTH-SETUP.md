# Telegram Bot Authentication System - Student Login Only

This system implements secure phone/password authentication via Telegram bot for student accounts. Students must use the Telegram bot for registration and password management, then log in via the web app using their phone number and password.

## 🔐 Security Features

- **No Plain Text Passwords**: All passwords are hashed using bcrypt with salt rounds of 10
- **Strong Password Generation**: 12-character passwords with uppercase, lowercase, numbers, and special characters
- **Custom Password Option**: Users can set their own secure passwords with strength validation
- **Phone-based Authentication**: Students use their phone numbers (e.g., 015914377) instead of usernames
- **Telegram Integration**: Registration and password changes managed via Telegram bot

## 🚀 Setup Process

### 1. Database Migration (Required for existing installations)

Run the migration script to remove username fields and standardize phone numbers:

```bash
cd /Users/jimmy/student-attendance-app-main_v2/scripts
node migrate-to-phone-auth.js migrate
```

This will:
- Remove `username` field from all student records
- Standardize phone numbers to format "015914377"
- Add migration timestamp for tracking

### 2. Telegram Bot Configuration

1. **Create Telegram Bot**:
   - Message @BotFather on Telegram
   - Use `/newbot` command
   - Get your bot token

2. **Configure Firebase Functions**:
   ```bash
   firebase functions:secrets:set TELEGRAM_BOT_TOKEN
   # Enter your bot token when prompted
   ```

3. **Set Webhook**:
   After deploying functions, set the webhook URL:
   ```bash
   curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
        -H "Content-Type: application/json" \
        -d '{"url": "https://asia-southeast1-rodwell-attendance.cloudfunctions.net/telegramWebhook"}'
   ```

   **Note**: Replace `<YOUR_BOT_TOKEN>` with your actual bot token from BotFather.

### 3. Deploy Functions

```bash
cd /Users/jimmy/student-attendance-app-main_v2/functions
npm run deploy
```

### 4. Generate Student QR Codes

After deployment, teachers can generate QR codes for students:

```bash
cd /Users/jimmy/student-attendance-app-main_v2/scripts

# Generate QR codes for all students
node generate-qr-codes.js generate

# Or generate for specific class
node generate-qr-codes.js generate class:7A

# Check status
node generate-qr-codes.js status
```

**Important**: Update the bot username in the QR code script:
- Edit `scripts/generate-qr-codes.js`
- Replace `'your_bot_username'` with your actual Telegram bot username
- This ensures QR codes direct to the correct bot

## 📱 Student Registration Flow

### Via Telegram Bot (QR Code Method - Secure)

1. **Teacher Generates QR Codes**: Admin generates personal QR codes for each student
2. **Student Scans QR Code**: Each QR code contains a unique, one-time registration token
3. **Bot Registration**: Student opens Telegram bot and sends `/start`
4. **Token Submission**: Student sends the token from QR code (or scans QR to auto-send)
5. **Account Linking**: Bot verifies token and links student's Telegram chat to their account
6. **Password Generation**: Bot generates secure 12-character password and sends it to student
7. **Ready to Use**: Student can now log in via web app using **phone number** and password

### Security Benefits of QR Code System

- **No Username Guessing**: Students can't input random usernames or use friends' accounts
- **One-Time Use**: Each QR code token can only be used once
- **Expiration**: Tokens expire after 7 days for security
- **Personal**: Each student gets their own unique QR code
- **Secure**: 16-character tokens are cryptographically random

### For Teachers/Admins

Generate QR codes for students:
```bash
# Generate QR codes for all students
node scripts/generate-qr-codes.js generate

# Generate QR codes for specific class
node scripts/generate-qr-codes.js generate class:7A

# Check token status
node scripts/generate-qr-codes.js status
```

### Password Management

- **Change Password**: Student sends `/changepassword` to bot and chooses:
  - **Generate Random**: Bot creates a secure 12-character password with mixed characters
  - **Set Custom**: Student inputs their own password (must meet security requirements)
- **Password Requirements**: Custom passwords must have:
  - At least 8 characters
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*...)
- **Secure Storage**: Only hashed passwords stored in database

## 🌐 Web Login Integration

The web application now uses **Telegram bot authentication as the primary method** for students:

1. **Phone/Password** (Primary - Telegram Bot Required)
   - Student enters phone number and password obtained from Telegram bot
   - System authenticates against hashed password in database
   - Creates Firebase Auth user if needed
   - Returns custom token for session

2. **Google Sign-In** (Fallback)
   - Available as alternative method
   - Links to existing student records if available

## 🔧 Database Schema Updates

Each student document now includes:

```javascript
{
  // Existing fields...
  phone: "015914377",             // Student phone number (standardized format)
  chatId: "123456789",            // Telegram chat ID (empty until registration)
  passwordHash: "$2b$10$...",     // bcrypt hashed password (empty until registration)
  telegramAuthEnabled: true,      // Flag indicating Telegram auth is set up
  registeredAt: Timestamp,        // When student registered via Telegram
  lastLoginAt: Timestamp,         // Last login timestamp
  passwordUpdatedAt: Timestamp,   // When password was last changed
  migratedToPhoneAuth: Timestamp  // When migrated from username to phone auth
}
```

## 🛡️ Security Considerations

1. **Password Strength**: 12-character passwords with uppercase, lowercase, numbers, and special characters
2. **Custom Password Validation**: Strong requirements for user-defined passwords
3. **Hash Security**: bcrypt with salt rounds of 10
4. **No Password Storage**: Plain text passwords never stored
5. **Telegram Security**: Relies on Telegram's security for user verification
6. **Session Management**: Firebase Auth handles session tokens

## 📋 Admin Tasks

### Check Migration Status
```bash
node migrate-to-phone-auth.js status
```

### Migrate from Username to Phone Auth (if needed)
```bash
node migrate-to-phone-auth.js migrate
```

### Generate QR Codes for Students
Generate QR codes after system setup.

### Monitor Bot Activity
Check Firebase Functions logs for bot interactions and authentication attempts.

## 🎯 Bot Commands Reference

### For Students:
- `/start` - Begin registration process (enter token from QR code)
- `/changepassword` - Change password with options:
  - `/generate` - Get a new random 12-character password
  - `/setpassword` - Set your own custom password
  - `/cancel` - Cancel current operation

### Password Requirements (for custom passwords):
- Minimum 8 characters
- Must include uppercase letters (A-Z)
- Must include lowercase letters (a-z) 
- Must include numbers (0-9)
- Must include special characters (!@#$%^&*...)

## 🚨 Troubleshooting

### Common Issues

1. **Bot Not Responding**:
   - Check if webhook is set correctly
   - Verify TELEGRAM_BOT_TOKEN secret is configured
   - Check Firebase Functions logs

2. **QR Code Issues**:
   - Ensure bot username is correctly set in generate-qr-codes.js
   - Check that tokens haven't expired (7-day limit)
   - Verify QR codes are readable and not corrupted

3. **Token Problems**:
   - Students should scan QR code and copy the complete token
   - Tokens are case-insensitive but must be complete
   - Each token can only be used once

4. **Registration Failures**:
   - Check if student already has an account linked to another Telegram
   - Ensure student document exists in database
   - Verify token hasn't been used or expired

5. **Password Issues**:
   - Students can always use `/changepassword` to get a new password
   - Both random generation and custom passwords are supported

### Debug Commands

```bash
# Check Firebase Functions logs
firebase functions:log

# Test bot webhook
curl -X POST "YOUR_WEBHOOK_URL" -H "Content-Type: application/json" -d '{"message":{"chat":{"id":123},"text":"/start","from":{"id":123}}}'

# Check Firestore for student data
# Use Firebase Console or admin scripts
```

## 🔄 Migration from Old System

For existing installations:

1. **Backup Database**: Always backup before running migration scripts
2. **Run Migration Script**: Remove username fields and standardize phone numbers
3. **Deploy Functions**: Update Firebase Functions with new phone-based authentication
4. **Update Frontend**: Deploy updated login interface (phone instead of username)
5. **Configure Bot**: Ensure Telegram bot is working with QR codes
6. **Test Flow**: Verify complete registration and login flow with phone numbers

**Important**: Username authentication has been removed from the student login interface. Students now must use phone numbers for authentication. The system automatically formats phone numbers to ensure consistency (e.g., "015914377").
