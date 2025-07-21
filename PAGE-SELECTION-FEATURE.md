# Page Selection Feature for Print Requests

## Overview
The print request system now supports dynamic page selection based on the uploaded PDF file. Teachers can specify which pages to print when requesting document printing.

## Features

### 1. Automatic PDF Analysis
- When a PDF file is uploaded, the system automatically:
  - Extracts the total number of pages using `pdfjs-dist`
  - Displays the page count to the user
  - Auto-enables "Multiple Pages" option for PDFs with more than 1 page
  - Disables "Print Both Sides" for single-page documents

### 2. Dynamic Print Settings
- **Multiple Pages Checkbox**: 
  - Automatically enabled for multi-page PDFs
  - Disabled for single-page PDFs
- **Print Both Sides Checkbox**:
  - Disabled for single-page PDFs (you can't print both sides of a single page)
  - Available for multi-page PDFs

### 3. Page Range Selection
- **When Available**: Only shown when "Multiple Pages" is checked and PDF has >1 page
- **Format**: Supports flexible page range formats:
  - Single pages: `1, 3, 5`
  - Page ranges: `1-3, 7-10`
  - Mixed: `1-3, 5, 8-10`
- **Validation**: Form validates the page range format using regex
- **Optional**: If left empty, all pages will be printed

### 4. Admin Interface Integration
- Print requests now display the selected page range in the approval interface
- Admins can see the exact pages that will be printed before approving
- Page range is passed to PrintNode API for precise printing

## Technical Implementation

### Frontend (Print Request Form)
- Added `customPageRange` field to form validation schema
- Integrated `pdfjs-dist` for PDF page counting
- Dynamic UI that shows/hides page range input based on PDF content
- Real-time PDF processing with loading indicators

### Backend (PrintNode Integration)
- Updated PrintNode API route to accept `customPageRange` parameter
- Page range is passed to PrintNode as `pages` option in print job
- PrintNode handles the actual page selection during printing

### Database
- Added `customPageRange` field to PrintRequest interface
- Field is optional and only stored when page selection is used

## Usage Example

1. **Teacher uploads a 10-page PDF**
   - System shows "10 pages" indicator
   - "Multiple Pages" checkbox is auto-enabled
   - Page range input becomes available

2. **Teacher wants to print pages 1-3 and page 7**
   - Checks "Multiple Pages" 
   - Enters `1-3, 7` in the page range field
   - Submits the print request

3. **Admin reviews and approves**
   - Sees "Page Range: 1-3, 7" in the request details
   - Clicks "Approve and Print"
   - PrintNode prints only the specified pages

## Benefits

- **Cost Savings**: Print only needed pages, reducing paper and ink usage
- **Efficiency**: No need to print entire documents when only specific pages are needed
- **User Experience**: Dynamic interface adapts to document content
- **Validation**: Prevents invalid page range submissions
- **Professional Printing**: Uses PrintNode's robust page selection capabilities

## Error Handling

- Invalid PDF files show appropriate error messages
- Malformed page ranges are caught by form validation
- PrintNode API errors are properly handled and displayed
- Fallback to full document printing if page range processing fails 