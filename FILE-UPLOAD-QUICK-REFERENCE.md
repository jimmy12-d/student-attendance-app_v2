# File Upload Feature - Quick Reference

## Quick Start

### For Admins: Adding File Upload to Forms

1. **Create/Edit Form** → Navigate to Dashboard > Forms
2. **Add Question** → Click "Add Question"
3. **Select Type** → Choose "File Upload" from question type dropdown
4. **Configure Settings**:
   - Set max number of files (default: 1)
   - Set max file size in MB (default: 5MB)
   - Choose accepted file types
5. **Save Form**

### For Students: Uploading Files

1. **Open Form** → Navigate to the form from student dashboard
2. **Find File Upload Question** → Scroll to the file upload field
3. **Upload Files**:
   - Click upload area, OR
   - Drag and drop files
4. **Review Uploads** → See list of uploaded files
5. **Remove if Needed** → Click X icon to remove files
6. **Submit Form** → Files upload automatically on submission

## Configuration Options

| Setting | Range | Default | Description |
|---------|-------|---------|-------------|
| Max Files | 1-10 | 1 | Maximum number of files student can upload |
| Max Size | 1-100 MB | 5 MB | Maximum size per file |
| File Types | Various | All | Restrict to specific file types |

## File Type Presets

| Preset | Accepted Types |
|--------|---------------|
| All files | Any file type |
| Images only | .jpg, .jpeg, .png, .gif, .webp, etc. |
| Documents | .pdf, .doc, .docx, .xls, .xlsx |
| PDFs only | .pdf only |
| Images & PDFs | Images + PDF files |

## Validation Messages

| Message | Cause | Solution |
|---------|-------|----------|
| "Maximum X files allowed" | Too many files selected | Remove some files before adding more |
| "File exceeds maximum size" | File too large | Compress or choose smaller file |
| "File type not accepted" | Wrong file format | Choose accepted file type |
| "This field is required" | No files uploaded | Upload at least one file |

## Student View Features

✅ **Drag & Drop Support** - Drop files directly onto upload area  
✅ **Multiple Files** - Upload multiple files if allowed  
✅ **Visual Feedback** - See file name and size  
✅ **Progress Indicator** - Loading animation during upload  
✅ **Easy Removal** - Remove files before submission  
✅ **Validation** - Real-time error checking  

## Admin View Features

✅ **File Preview** - See uploaded file names  
✅ **Download Links** - Direct download access  
✅ **File Metadata** - View file names and count  
✅ **Flexible Config** - Customize upload restrictions  
✅ **CSV Export** - File URLs included in exports  

## Common Use Cases

### 1. Assignment Submission
```
Question: "Submit your homework assignment"
Max Files: 1
Max Size: 5 MB
Type: PDFs only
```

### 2. Photo Documentation
```
Question: "Upload photos of your experiment"
Max Files: 5
Max Size: 5 MB
Type: Images only
```

### 3. Project Portfolio
```
Question: "Submit project files and documentation"
Max Files: 10
Max Size: 20 MB
Type: All files
```

### 4. Identity Verification
```
Question: "Upload ID document"
Max Files: 2
Max Size: 5 MB
Type: Images & PDFs
```

## Technical Limits

| Limit | Value | Notes |
|-------|-------|-------|
| Max Files Per Question | 10 | Configurable by admin |
| Max File Size | 100 MB | Configurable by admin |
| Supported Browsers | All modern browsers | Requires File API support |
| Storage Location | Firebase Storage | Organized by form/question |

## File Organization

Files are stored with this structure:
```
form_responses/
  └── {form-id}/
      └── {question-id}/
          ├── 1697123456789_document.pdf
          ├── 1697123457890_photo.jpg
          └── 1697123458991_assignment.docx
```

## Troubleshooting Checklist

**Upload not working?**
- [ ] Check file size (must be under limit)
- [ ] Check file type (must be accepted)
- [ ] Check internet connection
- [ ] Try refreshing the page
- [ ] Check browser console for errors

**Can't see uploaded files?**
- [ ] Verify form was submitted
- [ ] Check Firebase Storage permissions
- [ ] Ensure files uploaded successfully
- [ ] Clear browser cache

**Slow upload?**
- [ ] Check file sizes
- [ ] Test internet speed
- [ ] Upload fewer files at once
- [ ] Compress files before uploading

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open file picker | Click upload area or Space when focused |
| Remove file | Tab to X button, press Enter |
| Submit form | Tab to Submit button, press Enter |

## Mobile Support

✅ Works on iOS Safari  
✅ Works on Android Chrome  
✅ Touch-optimized UI  
✅ Camera access (when selecting images)  
✅ Responsive design  

## Best Practices

### For Admins
1. ✅ Set clear file requirements in question text
2. ✅ Use appropriate file size limits
3. ✅ Be specific with file type restrictions
4. ✅ Test upload process before sharing form
5. ✅ Monitor storage usage

### For Students
1. ✅ Read file requirements carefully
2. ✅ Use descriptive file names
3. ✅ Compress large files when possible
4. ✅ Upload files one at a time if having issues
5. ✅ Verify uploads before submitting

## Security Features

🔒 **File Type Validation** - Prevents unauthorized file types  
🔒 **Size Limits** - Prevents storage abuse  
🔒 **Authentication Required** - Only authenticated users can upload  
🔒 **Sanitized Filenames** - Prevents path traversal attacks  
🔒 **Secure URLs** - Files stored with secure Firebase Storage URLs  

## Performance Tips

⚡ **Upload Speed**
- Smaller files upload faster
- Good internet connection helps
- Upload during off-peak hours

⚡ **Storage Management**
- Set appropriate file size limits
- Choose specific file types when possible
- Regularly review and archive old forms

⚡ **User Experience**
- Keep max files reasonable (1-5 typically)
- Provide clear instructions
- Test on mobile devices

## Need Help?

1. Check the full guide: `FILE-UPLOAD-FEATURE-GUIDE.md`
2. Review browser console for errors
3. Verify Firebase configuration
4. Check internet connection
5. Test with different file types/sizes

---

**Quick Tip**: Start with conservative limits (1 file, 10MB, specific types) and adjust based on actual usage patterns.
