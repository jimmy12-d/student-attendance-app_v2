# Form Builder Feature - Complete Documentation

## Overview
A comprehensive Google Forms-inspired form builder system for your PWA, with separate admin (form creator) and student (form filler) experiences.

## 🎯 Features Implemented

### Admin Features
- ✅ Create, edit, and delete forms
- ✅ Dynamic question builder with 6 question types
- ✅ Set form title, description, and deadline
- ✅ Toggle form active/inactive status
- ✅ View all form responses with statistics
- ✅ Export responses to CSV
- ✅ Real-time form list updates

### Student Features
- ✅ View active forms (before deadline)
- ✅ Fill and submit forms
- ✅ Prevent duplicate submissions
- ✅ Mobile-optimized responsive design
- ✅ Integrated into attendance page

### Question Types Supported
1. **Short Answer** - Single-line text input
2. **Paragraph** - Multi-line text area
3. **Multiple Choice** - Radio buttons
4. **Checkboxes** - Multiple selections
5. **Dropdown** - Select from options
6. **Linear Scale** - Numeric rating scale

## 📁 Files Created

### Type Definitions
- `app/_interfaces/forms.ts` - TypeScript interfaces for forms, questions, and responses

### Admin Pages
- `app/dashboard/forms/page.tsx` - List all forms
- `app/dashboard/forms/[formId]/page.tsx` - Create/edit form builder
- `app/dashboard/forms/[formId]/responses/page.tsx` - View responses with analytics

### Admin Components
- `app/dashboard/forms/_components/QuestionEditor.tsx` - Edit individual questions
- `app/dashboard/forms/_components/QuestionTypeSelector.tsx` - Question type dropdown

### Student Pages
- `app/student/forms/[formId]/page.tsx` - Fill and submit form

### Student Components
- `app/student/attendance/_components/StudentFormsList.tsx` - Display active forms

### Database Configuration
- `firestore.rules` - Updated with forms and form_responses security rules
- `firestore.indexes.json` - Added indexes for efficient queries

### Navigation
- `app/dashboard/_lib/menuAside.ts` - Added "Forms" menu item

## 🗄️ Database Schema

### `forms` Collection
```typescript
{
  id: string;
  title: string;
  description: string;
  deadline: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin UID
  questions: Question[];
  isActive: boolean;
  targetAudience?: 'all' | 'specific_class'; // Future use
  targetClasses?: string[]; // Future use
}
```

### `form_responses` Collection
```typescript
{
  id: string;
  formId: string;
  studentId: string;
  studentName: string;
  studentUid: string;
  answers: FormAnswer[];
  submittedAt: Timestamp;
  class?: string;
  shift?: string;
}
```

### Question Structure
```typescript
{
  id: string;
  text: string;
  type: 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'linear_scale';
  required: boolean;
  options?: QuestionOption[]; // For choice-based questions
  minScale?: number; // For linear_scale
  maxScale?: number; // For linear_scale
  minLabel?: string; // For linear_scale
  maxLabel?: string; // For linear_scale
}
```

## 🔒 Security Rules

### Forms Collection
- **Read**: Admins can read all; students can only read active forms
- **Write**: Only admins can create, update, or delete

### Form Responses Collection
- **Read**: Admins can read all; students can only read their own
- **Create**: Students can create their own responses
- **Update/Delete**: Only admins

## 🚀 How to Use

### For Admins

#### Creating a Form
1. Navigate to **Dashboard → Forms**
2. Click **"Create New Form"**
3. Fill in form title and description
4. Set a deadline using the date/time picker
5. Toggle "Active" to make it visible to students
6. Click **"Add Question"** to add questions
7. For each question:
   - Enter question text
   - Select question type
   - Check "Required" if needed
   - Add options (for multiple choice, checkboxes, dropdown)
   - Configure scale (for linear scale)
8. Click **"Save Form"**

#### Viewing Responses
1. Go to **Dashboard → Forms**
2. Click **"Responses"** on any form card
3. View statistics or individual responses
4. Click **"Export CSV"** to download all responses

#### Editing a Form
1. Click **"Edit"** on any form card
2. Make your changes
3. Click **"Save Form"**

#### Deleting a Form
1. Click the **delete icon** on any form card
2. Confirm deletion

### For Students

#### Viewing Available Forms
- Active forms appear automatically in the **"Active Forms"** section on the attendance page
- Forms show a countdown to the deadline
- Submitted forms show a green checkmark

#### Filling Out a Form
1. Tap on any active form in the list
2. Read the form title and description
3. Answer all required questions (marked with *)
4. Click **"Submit Form"**
5. You'll be redirected back to the attendance page

## 📊 Analytics Features

### Response Statistics
- **Multiple Choice/Checkboxes/Dropdown**: Shows percentage distribution with visual bars
- **Linear Scale**: Shows average rating out of max value
- **Short Answer/Paragraph**: View individual text responses

### CSV Export
Includes:
- Student name, ID, class, shift
- Submission timestamp
- All question answers

## 🎨 Design Features

### Admin Interface
- Modern gradient backgrounds
- Card-based layout
- Real-time updates
- Responsive grid layout
- Color-coded status indicators
- Smooth animations and transitions

### Student Interface
- Mobile-first design
- Touch-optimized buttons
- Ripple effects on interaction
- Clean, distraction-free form filling
- Progress indicators
- Deadline warnings

## 🔄 Real-Time Features

- Forms list updates automatically when forms are created/edited/deleted
- Response count updates in real-time
- Student sees immediate confirmation after submission
- Admin sees new responses without page refresh

## 🌐 Internationalization Ready

The system uses the existing `khmerFont()` utility function to support Khmer language throughout the student interface.

## 🔮 Future Enhancements

Potential features you could add:

1. **Conditional Logic** - Show/hide questions based on previous answers
2. **File Upload** - Allow students to upload files
3. **Form Templates** - Pre-built form templates
4. **Response Validation** - Email, phone number validation
5. **Anonymous Responses** - Option for anonymous submissions
6. **Response Editing** - Allow students to edit after submission
7. **Form Duplication** - Copy existing forms
8. **Question Bank** - Save and reuse questions
9. **Scheduled Publishing** - Auto-activate forms at a specific time
10. **Email Notifications** - Notify students of new forms
11. **Response Limits** - Limit number of responses per form
12. **Branching** - Different paths based on answers
13. **Response Quotas** - Close form after X responses
14. **PDF Export** - Export individual responses as PDF

## 🐛 Troubleshooting

### Forms not showing for students
- Check if form `isActive` is `true`
- Verify deadline is in the future
- Check Firestore rules are deployed

### Responses not saving
- Verify student is authenticated
- Check browser console for errors
- Ensure Firestore indexes are created

### CSV export not working
- Check browser allows file downloads
- Ensure there are responses to export

## 📝 Notes

- All timestamps are stored in Firestore Timestamp format
- Form IDs are auto-generated by Firestore
- Students cannot submit the same form twice (enforced in both frontend and backend)
- Forms with expired deadlines automatically become invisible to students
- CSV export uses UTF-8 encoding to support all characters

## 🎓 Testing Checklist

### Admin Testing
- [ ] Create a new form
- [ ] Add all 6 types of questions
- [ ] Mark some questions as required
- [ ] Save and verify form appears in list
- [ ] Edit existing form
- [ ] Delete a form
- [ ] View empty responses page
- [ ] View populated responses page
- [ ] Export CSV with responses

### Student Testing
- [ ] View active forms on attendance page
- [ ] Open and fill out a form
- [ ] Try submitting with missing required fields
- [ ] Successfully submit a form
- [ ] Verify can't submit same form twice
- [ ] Check form disappears after deadline
- [ ] Test on mobile device

## 🚢 Deployment

1. Deploy Firestore rules:
   ```bash
   firebase deploy --only firestore:rules
   ```

2. Deploy Firestore indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

3. Build and deploy your app:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## 🎉 Success!

Your form builder system is now complete and ready to use! Students can now receive and fill out forms directly in the app, and admins have full control over form creation and response analysis.
