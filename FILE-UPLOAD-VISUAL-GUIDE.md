# File Upload Feature - Visual Guide

## 🎯 Feature Overview

The file upload question type allows students to submit files as part of form responses, with full administrative control over file types, sizes, and quantities.

---

## 👨‍💼 Admin Experience

### Step 1: Create File Upload Question

```
┌─────────────────────────────────────────────────┐
│  Form Builder                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Question 1                    [File Upload ▼] │
│  ─────────────────────────────────────────────  │
│                                                 │
│  Enter your question...                         │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │
│                                                 │
│  📁 File Upload Configuration                   │
│                                                 │
│  Max files:     [1]                             │
│  Max size (MB): [10]                            │
│                                                 │
│  Accepted file types:                           │
│  ○ All files                                    │
│  ● Images only                                  │
│  ○ Documents (PDF, Word, Excel)                 │
│  ○ PDFs only                                    │
│  ○ Images & PDFs                                │
│                                                 │
│  [Required ☑]  [Duplicate]  [Delete]            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 2: View Responses with Files

```
┌─────────────────────────────────────────────────┐
│  Response from John Smith                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Q1: Please upload your assignment              │
│  ┌───────────────────────────────────────────┐ │
│  │ 📄  assignment.pdf              ⬇         │ │
│  │ ─────────────────────────────────────────  │ │
│  │ 📄  notes.pdf                   ⬇         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  [Approve]  [Reject]  [Delete]                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 👨‍🎓 Student Experience

### Step 1: View File Upload Question

```
┌─────────────────────────────────────────────────┐
│  Assignment Submission Form                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  [1] Please upload your assignment *            │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │           📤                              │ │
│  │                                           │ │
│  │    Click to upload or drag and drop      │ │
│  │                                           │ │
│  │    Accepted: images, pdf, doc            │ │
│  │    Max size: 10MB | Max files: 3         │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 2: Files Selected

```
┌─────────────────────────────────────────────────┐
│  Assignment Submission Form                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  [1] Please upload your assignment *            │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │           📤                              │ │
│  │    Click to upload or drag and drop      │ │
│  │    Max size: 10MB | Max files: 3         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Uploaded Files (2/3)                           │
│  ┌───────────────────────────────────────────┐ │
│  │ 📄  homework.pdf              2.3 MB   ✕  │ │
│  │ 📄  notes.docx                1.5 MB   ✕  │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ✓ Completed                                    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Step 3: Validation Error

```
┌─────────────────────────────────────────────────┐
│  Assignment Submission Form                     │
├─────────────────────────────────────────────────┤
│                                                 │
│  [1] Please upload your assignment *            │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │           📤                              │ │
│  │    Click to upload or drag and drop      │ │
│  │    Max size: 10MB | Max files: 1         │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  ⚠️  This field is required                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 🔄 User Flow Diagrams

### Admin Flow
```
┌──────────────┐
│ Create Form  │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Add Question     │
└──────┬───────────┘
       │
       ▼
┌──────────────────────┐
│ Select "File Upload" │
└──────┬───────────────┘
       │
       ▼
┌────────────────────┐
│ Configure Settings │
│ • Max files        │
│ • Max size         │
│ • Accepted types   │
└──────┬─────────────┘
       │
       ▼
┌──────────────┐
│ Save & Share │
└──────┬───────┘
       │
       ▼
┌────────────────────┐
│ View Responses     │
│ • Download files   │
│ • Review answers   │
└────────────────────┘
```

### Student Flow
```
┌──────────────┐
│ Open Form    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Find File Upload │
│ Question         │
└──────┬───────────┘
       │
       ▼
┌────────────────────┐
│ Select/Drop Files  │
└──────┬─────────────┘
       │
       ▼
┌────────────────┐     ┌──────────────┐
│ Validation ✓   │────▶│ Files Added  │
└────────┬───────┘     └──────┬───────┘
         │                    │
         │ ✗                  ▼
         ▼              ┌──────────────┐
┌────────────────┐     │ Review Files │
│ Error Message  │     └──────┬───────┘
└────────────────┘            │
                              ▼
                        ┌──────────────┐
                        │ Submit Form  │
                        └──────┬───────┘
                               │
                               ▼
                        ┌──────────────┐
                        │ Files Upload │
                        │ to Storage   │
                        └──────────────┘
```

---

## 🎨 UI Components

### Upload Area States

#### 1. Empty (Ready to Upload)
```
╔═══════════════════════════════════════════╗
║                                           ║
║              📤                           ║
║                                           ║
║     Click to upload or drag and drop     ║
║                                           ║
║     Accepted: images, pdf                ║
║     Max size: 10MB | Max files: 3        ║
║                                           ║
╚═══════════════════════════════════════════╝
  Blue border, clickable, hover effect
```

#### 2. Uploading
```
╔═══════════════════════════════════════════╗
║                                           ║
║              ⏳ (spinning)                ║
║                                           ║
║          Uploading files...              ║
║                                           ║
╚═══════════════════════════════════════════╝
  Disabled state, spinner animation
```

#### 3. Error State
```
╔═══════════════════════════════════════════╗
║                                           ║
║              ⚠️                           ║
║                                           ║
║     Click to upload or drag and drop     ║
║                                           ║
║     Accepted: images, pdf                ║
║     Max size: 10MB | Max files: 3        ║
║                                           ║
╚═══════════════════════════════════════════╝
  Red border, error indication
```

#### 4. Max Files Reached
```
╔═══════════════════════════════════════════╗
║                                           ║
║              📁                           ║
║                                           ║
║        Maximum 3 files reached           ║
║                                           ║
╚═══════════════════════════════════════════╝
  Gray border, disabled state
```

### File List Item
```
┌───────────────────────────────────────────┐
│ 📄  assignment.pdf         2.3 MB      ✕  │
└───────────────────────────────────────────┘
  Icon | Name | Size | Remove button
  Hover: background color change
  Click remove: removes file from list
```

---

## 📊 Validation Matrix

| Condition | Visual Feedback | Message |
|-----------|----------------|---------|
| Required field empty | ⚠️ Red border | "This field is required" |
| File too large | 🔴 Toast error | "File exceeds maximum size of XMB" |
| Wrong file type | 🔴 Toast error | "File type not accepted" |
| Too many files | 🔴 Red border | "Maximum X files allowed" |
| Success | ✅ Green check | "Completed" |

---

## 🎯 Configuration Examples

### Example 1: Single Document Upload
```yaml
Max Files: 1
Max Size: 5 MB
Types: PDFs only
Use Case: Assignment submission
```

### Example 2: Multiple Photos
```yaml
Max Files: 5
Max Size: 5 MB
Types: Images only
Use Case: Project documentation
```

### Example 3: General Portfolio
```yaml
Max Files: 10
Max Size: 20 MB
Types: All files
Use Case: Project submission
```

---

## 🔐 Security Indicators

```
┌─────────────────────────────────────────┐
│ 🔒 Secure File Upload                   │
├─────────────────────────────────────────┤
│ ✓ File type validation                  │
│ ✓ Size limit enforcement                │
│ ✓ Authenticated uploads only            │
│ ✓ Sanitized filenames                   │
│ ✓ Secure storage URLs                   │
└─────────────────────────────────────────┘
```

---

## 📱 Mobile View

```
┌─────────────────────┐
│ Assignment Form     │
├─────────────────────┤
│                     │
│ [1] Upload file *   │
│                     │
│ ┌─────────────────┐ │
│ │       📤        │ │
│ │                 │ │
│ │  Tap to upload  │ │
│ │                 │ │
│ │  Images, PDF    │ │
│ │  Max: 10MB      │ │
│ └─────────────────┘ │
│                     │
│ Files (1/3):        │
│ ┌─────────────────┐ │
│ │📄 pic.jpg    ✕ │ │
│ └─────────────────┘ │
│                     │
│ ✓ Completed         │
│                     │
└─────────────────────┘
```

---

## 💡 Tips & Best Practices

### For Admins
```
✅ DO:
• Set clear file requirements
• Use specific file types
• Test before sharing
• Monitor storage usage

❌ DON'T:
• Allow unlimited file sizes
• Accept all file types for sensitive data
• Forget to check storage costs
```

### For Students
```
✅ DO:
• Read requirements carefully
• Use descriptive filenames
• Compress large files
• Verify uploads

❌ DON'T:
• Upload wrong file types
• Exceed size limits
• Use special characters in names
• Submit without checking
```

---

## 🚀 Quick Actions

```
┌──────────────────────────────────────┐
│  Admin Quick Actions                 │
├──────────────────────────────────────┤
│  [Create Form] → [Add Question] →    │
│  [Select File Upload] → [Configure]  │
│                                      │
│  Student Quick Actions               │
├──────────────────────────────────────┤
│  [Open Form] → [Find Upload] →       │
│  [Select Files] → [Submit]           │
└──────────────────────────────────────┘
```

---

**Remember**: Files are stored securely in Firebase Storage and can be accessed via download links in the response viewer!
