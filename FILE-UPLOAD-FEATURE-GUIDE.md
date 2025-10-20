# File Upload Feature Guide

## Overview
The file upload question type has been successfully added to the forms system. This feature allows administrators to create questions that require students to upload files as their answers.

## Features

### For Administrators (Form Creator)

#### Creating File Upload Questions
1. When creating a new form or editing an existing one, select "File Upload" as the question type
2. Configure the following settings:
   - **Max Files**: Number of files a student can upload (1-10)
   - **Max File Size**: Maximum size per file in MB (1-100 MB)
   - **Accepted File Types**: Choose from preset options:
     - All files
     - Images only
     - Documents (PDF, Word, Excel)
     - PDFs only
     - Images & PDFs

#### Viewing Responses with Files
- In the responses page, uploaded files are displayed with:
  - File name (original name preserved)
  - Download icon for easy access
  - Direct links to view/download files
- Files are stored securely in Firebase Storage
- Files are organized by: `form_responses/{formId}/{questionId}/{timestamp}_{filename}`

### For Students (Form Filler)

#### Uploading Files
1. Click the upload area or drag and drop files
2. Multiple files can be uploaded if allowed by the admin
3. Real-time validation ensures:
   - File size doesn't exceed the limit
   - File type is accepted
   - Number of files doesn't exceed the maximum
4. Visual feedback for:
   - Upload progress
   - File validation errors
   - Successfully uploaded files

#### File Management
- View all uploaded files before submission
- Remove individual files if needed
- See file size and name for each upload
- Clear visual indicators for required fields

## Technical Implementation

### Database Schema Updates

#### Question Interface (`forms.ts`)
```typescript
export interface Question {
  // ... existing fields
  acceptedFileTypes?: string[]; // e.g., ['image/*', 'application/pdf']
  maxFileSize?: number; // in MB
  maxFiles?: number; // default 1
}
```

#### FormAnswer Interface (`forms.ts`)
```typescript
export interface FormAnswer {
  questionId: string;
  answer: string | string[];
  fileUrls?: string[]; // Firebase Storage URLs
  fileNames?: string[]; // Original file names
}
```

### File Storage Structure
Files are stored in Firebase Storage with the following path:
```
form_responses/
  └── {formId}/
      └── {questionId}/
          └── {timestamp}_{sanitized_filename}
```

### Security Features
1. **File Type Validation**: Files are validated both client-side and by Firebase Storage rules
2. **File Size Limits**: Enforced before upload to prevent unnecessary storage usage
3. **Access Control**: Files are accessible via Firebase Storage security rules
4. **Sanitization**: File names are sanitized to prevent path traversal attacks

### Components Modified

#### 1. Type Definitions (`app/_interfaces/forms.ts`)
- Added 'file_upload' to QuestionType
- Extended Question interface with file upload properties
- Extended FormAnswer interface with file metadata

#### 2. Question Type Selector (`app/dashboard/forms/_components/QuestionTypeSelector.tsx`)
- Added File Upload option with icon
- Integrated into existing question type selection

#### 3. Question Editor (`app/dashboard/forms/_components/QuestionEditor.tsx`)
- Added configuration UI for file upload settings
- Max files input (1-10)
- Max file size input (1-100 MB)
- Radio button selection for accepted file types

#### 4. Student Form Page (`app/student/forms/[formId]/page.tsx`)
- Added file upload UI with drag-and-drop support
- Implemented file validation logic
- Added file upload to Firebase Storage
- Integrated file removal functionality
- Updated form submission to include file URLs

#### 5. Responses Page (`app/dashboard/forms/[formId]/responses/page.tsx`)
- Added file display with download links
- Shows file names and provides direct access
- Visual distinction for file upload answers

## Usage Examples

### Example 1: Document Submission
**Question**: "Please upload your assignment (PDF only)"
**Configuration**:
- Max Files: 1
- Max Size: 5 MB
- Accepted Types: PDFs only

### Example 2: Photo Upload
**Question**: "Upload photos of your project (up to 3 images)"
**Configuration**:
- Max Files: 3
- Max Size: 5 MB
- Accepted Types: Images only

### Example 3: General File Upload
**Question**: "Submit supporting documents (any format)"
**Configuration**:
- Max Files: 5
- Max Size: 20 MB
- Accepted Types: All files

## Validation Rules

### Client-Side Validation
1. **File Count**: Checks against maxFiles limit
2. **File Size**: Validates each file against maxFileSize
3. **File Type**: Matches against acceptedFileTypes array
4. **Required Fields**: Ensures files are uploaded if question is required

### User Feedback
- Success toast when files are added
- Error toast for validation failures
- Real-time validation error messages
- Visual indicators (red/green borders) for validation state

## Best Practices

### For Admins
1. Set reasonable file size limits based on expected content
2. Be specific with file type restrictions to guide students
3. Test the upload process before deploying forms
4. Consider storage costs when setting max files and sizes

### For Students
1. Compress large files before uploading if possible
2. Use descriptive file names
3. Check file requirements before uploading
4. Verify all files are uploaded before submitting

## Troubleshooting

### Common Issues

#### Files Won't Upload
- Check internet connection
- Verify file size is within limit
- Ensure file type is accepted
- Try refreshing the page

#### Can't See Uploaded Files in Responses
- Ensure form was submitted successfully
- Check Firebase Storage permissions
- Verify files were uploaded (check console for errors)

#### Upload Takes Too Long
- Consider reducing file size
- Check network speed
- Try uploading fewer files at once

## Future Enhancements

Potential improvements that could be added:
1. Image preview before upload
2. File compression for large images
3. Drag-and-drop reordering of files
4. Bulk download of all files from a response
5. Admin annotations on uploaded files
6. Virus scanning integration
7. Cloud storage integration (Google Drive, Dropbox)
8. File versioning and history

## Firebase Storage Rules

Ensure your `storage.rules` includes permissions for form file uploads:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /form_responses/{formId}/{questionId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
                   && request.resource.size < 100 * 1024 * 1024; // 100MB max
    }
  }
}
```

## API Reference

### File Upload Handler
```typescript
const handleFileChange = async (questionId: string, files: FileList | null)
```
Validates and adds files to the upload queue.

### File Removal Handler
```typescript
const handleRemoveFile = (questionId: string, fileIndex: number)
```
Removes a file from the upload queue.

### Storage Upload Function
```typescript
const uploadFilesToStorage = async (questionId: string, files: File[]): Promise<string[]>
```
Uploads files to Firebase Storage and returns download URLs.

## Support

For issues or questions about the file upload feature:
1. Check the browser console for detailed error messages
2. Verify Firebase Storage configuration
3. Review security rules for Storage
4. Check file size and type restrictions
5. Ensure proper authentication

---

**Version**: 1.0  
**Last Updated**: October 20, 2025  
**Compatibility**: Works with all modern browsers that support File API
