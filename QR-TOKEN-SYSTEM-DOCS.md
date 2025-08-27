## QR Code and Token Registration System

## Overview
The QR code and token registration system allows students to register for Telegram notifications through QR codes that appear on payment receipts. The system is designed to be secure, temporary, and efficient.

**QR codes are displayed for payments from August 2025 onwards.** Code and Token Registration System

## Overview
The QR code and token registration system allows students to register for Telegram notifications through QR codes that appear on payment receipts. The system is designed to be secure, temporary, and efficient.

## Key Features

### 1. On-Demand Token Generation
- Tokens are generated **only** when needed (during receipt generation for unlinked students)
- Tokens are **never** stored permanently in student records
- Tokens are stored temporarily in a separate `tempRegistrationTokens` collection

### 2. Token Expiration
- Tokens expire after **72 hours** (259,200,000 milliseconds)
- Expired tokens are automatically cleaned up by Firebase Functions
- Students must use QR codes within 72 hours of receipt generation

### 3. Registration Status Logic
- QR codes appear **only** for students who haven't linked their Telegram account
- Students are considered "registered" if they have both `chatId` and `passwordHash` fields
- Registration status is checked dynamically at receipt generation time

### 4. Admin QR Recovery
- Admins can generate QR codes for students who lost their receipts
- Available through the "Register QR" column in the students dashboard
- Only shows for unlinked students
- Uses the same 72-hour expiration logic

## Technical Implementation

### Database Structure

#### Students Collection
```javascript
{
  fullName: "Student Name",
  chatId: null | number,        // Telegram chat ID when registered
  passwordHash: null | string,  // Password hash when registered
  // ... other student fields
  // NO persistent token fields (cleaned up)
}
```

#### TempRegistrationTokens Collection
```javascript
{
  studentId: "student_document_id",
  token: "unique_random_token",
  expiresAt: Timestamp,
  createdAt: Timestamp
}
```

### Registration Flow

1. **Receipt Generation**: When generating a receipt, check if `isStudentRegistered = !!(student.chatId && student.passwordHash)`
2. **Token Creation**: If not registered, generate a temporary token and store in `tempRegistrationTokens`
3. **QR Code**: Generate QR code with registration URL containing the token
4. **Student Registration**: Student scans QR, enters password, gets linked
5. **Token Cleanup**: Used/expired tokens are automatically removed

### API Endpoints

#### Receipt Generation (`/api/printnode`)
- Checks `transactionData.isStudentRegistered` field
- Generates token and QR code only for unlinked students
- Returns PDF with or without QR code based on registration status

#### Firebase Functions (`/functions/index.js`)
- `storeRegistrationToken`: Creates temporary tokens with 72h expiration
- `cleanupExpiredTokens`: Automatically removes expired tokens (runs every 24 hours)
- `adminGenerateQR`: Allows admins to generate QR codes for lost receipts

### Frontend Integration

#### POS System (`/app/dashboard/pos-student/page.tsx`)
- Passes `isStudentRegistered` to receipt API during transaction creation
- Downloads and prints always use current registration status
- Reprints check current registration status dynamically

#### Admin Dashboard (`/app/dashboard/students/`)
- Shows "Register QR" button for unlinked students
- Displays registration status in student table
- Provides QR modal for lost receipt recovery

## Security Features

1. **Temporary Storage**: Tokens are not permanently stored with student data
2. **Time-Limited**: 72-hour expiration prevents stale tokens
3. **One-Time Use**: Tokens are removed after successful registration
4. **Dynamic Checks**: Registration status always checked at generation time

## Migration Notes

### Legacy Token Cleanup
- All legacy `registrationToken`, `tokenExpiresAt`, and `tokenGeneratedAt` fields removed from students collection
- Migration completed for 198 students on 2025-01-11
- System now uses clean, temporary token approach

## Usage Examples

### For Unlinked Student
1. Student makes payment
2. Receipt shows QR code with registration URL
3. Student scans QR, registers via Telegram
4. Future receipts won't show QR codes

### For Linked Student
1. Student makes payment
2. Receipt shows no QR code (already registered)
3. Notifications sent directly to their Telegram

### Admin Recovery
1. Admin opens student dashboard
2. Finds unlinked student, clicks "Generate QR"
3. QR modal appears with fresh 72-hour token
4. Admin can share QR with student for registration

## Troubleshooting

### QR Not Appearing on Receipt
- Check if student has `chatId` and `passwordHash` (indicates already registered)
- Verify `isStudentRegistered` is being passed correctly to receipt API
- Ensure receipt generation logic checks registration status

### Admin Can't Generate QR
- Verify student is not already registered (no `chatId`/`passwordHash`)
- Check that QR modal event listeners are properly attached
- Ensure Firebase Functions are deployed and accessible

### Token Expired Error
- Tokens automatically expire after 72 hours
- Generate new QR code through admin dashboard
- Student must complete registration within time limit
