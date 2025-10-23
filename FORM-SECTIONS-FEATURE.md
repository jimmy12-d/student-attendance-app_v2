# Form Builder Section Feature 📋

## Overview
The form builder now supports **section-based organization** similar to Google Forms! This allows you to organize questions into logical groups with titles and descriptions, making forms more structured and easier to navigate.

## Key Features

### 1. **Two Modes**
- **Simple Mode**: Traditional single-level question list (backward compatible)
- **Section Mode**: Organize questions into multiple sections with titles and descriptions

### 2. **Easy Toggle**
Switch between modes with a single click:
- **Simple → Section**: Automatically wraps existing questions into a default section
- **Section → Simple**: Flattens all sections into a single question list

### 3. **Section Management**
- ✅ Add multiple sections
- ✅ Edit section titles and descriptions
- ✅ Drag & drop to reorder sections
- ✅ Duplicate sections (including all questions)
- ✅ Delete sections
- ✅ Collapse/expand sections for easier editing
- ✅ **NEW: Section-level class type filtering** - Control which students see each section

### 4. **Question Management Within Sections**
- ✅ Add questions to any section
- ✅ Drag & drop questions within a section
- ✅ All existing question types supported
- ✅ File uploads work within sections
- ⚠️ **Class type filtering moved to section level** - Questions inherit section visibility

### 5. **Student View**
- Beautiful visual section separators
- Section titles and descriptions displayed prominently
- Questions numbered by section (e.g., 1.1, 1.2, 2.1, 2.2)
- Smooth animations and transitions
- Progress tracking across all sections
- Sections automatically hidden if student's class type doesn't match

## How to Use

### Creating a Sectioned Form

1. **Create or Edit a Form**
   - Go to Dashboard → Forms → Create New Form (or edit existing)

2. **Enable Section Mode**
   - Click the "Section Mode" button near the top
   - Your existing questions (if any) will be wrapped into a default section

3. **Add Sections**
   - Click "Add Section" button
   - Enter a descriptive title (required)
   - Add an optional description for context
   - **NEW:** Set target class types for the section (optional)
     - Click "Visible to all class types" button
     - Select which class types should see this section
     - Students not in selected class types won't see the section at all

4. **Add Questions to Sections**
   - Each section has its own "Add Question" button
   - Create questions just like before
   - All question types are supported
   - **Note:** Questions inherit section visibility - no need to set class types per question

5. **Organize**
   - Drag sections to reorder them
   - Drag questions within sections to reorder
   - Collapse sections to focus on specific parts
   - Duplicate sections to reuse similar question groups

6. **Save**
   - Click "Save Form" as usual
   - Sections are automatically saved

### Converting Between Modes

#### Simple → Section Mode
- Click "Section Mode" button
- Existing questions are placed in a "Main Section"
- You can now add more sections

#### Section → Simple Mode  
- Click "Simple Mode" button
- All questions from all sections are flattened into one list
- Section titles and descriptions are removed
- ⚠️ This action cannot be easily undone

## Data Structure

### FormSection Interface (Updated)
```typescript
interface FormSection {
  id: string;
  title: string;
  description?: string;
  questions: Question[];
  targetClassTypes?: string[]; // NEW: Section-level class filtering
}
```

### Question Interface (Updated)
```typescript
interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[];
  // ... other fields ...
  // REMOVED: targetClassTypes - now at section level only
}
```

### Form Interface (Updated)
```typescript
interface Form {
  // ... existing fields ...
  questions: Question[];      // Legacy: For backward compatibility
  sections?: FormSection[];   // New: Organized sections
}
```

## Important Changes (v2.0)

### ⚠️ Breaking Changes
1. **Class Type Filtering Moved to Section Level**
   - Previously: Each question could have its own `targetClassTypes`
   - Now: Only sections have `targetClassTypes`
   - All questions within a section inherit the section's visibility rules
   - This provides better organization and easier management

### Migration Notes
- Old forms with question-level `targetClassTypes` will continue to work in Simple Mode
- When converting to Section Mode, you'll need to set class types at the section level
- This change simplifies form management and makes visibility rules clearer

## Backward Compatibility

✅ **Old forms without sections continue to work**
- Forms with only `questions` array display normally
- No data migration required
- Existing forms can be edited in either mode

✅ **Student forms handle both structures**
- Automatically detects if form uses sections
- Renders appropriate UI for each mode
- All features work in both modes

## Visual Design

### Section Headers (Student View)
- Beautiful gradient backgrounds (indigo to purple)
- Left border accent
- Clear typography hierarchy
- Optional descriptions for context

### Question Numbering
- **Section Mode**: Questions numbered by section (1.1, 1.2, 2.1, etc.)
- **Simple Mode**: Sequential numbering (1, 2, 3, etc.)

### Status Indicators
- ✅ Green: Completed questions
- 🔴 Red: Required questions with errors
- 🔵 Blue: In-progress questions

## Technical Details

### Files Modified
1. `/app/_interfaces/forms.ts` - Added FormSection interface
2. `/app/dashboard/forms/_components/SectionEditor.tsx` - New section editor component
3. `/app/dashboard/forms/[formId]/page.tsx` - Form builder with section support
4. `/app/student/forms/[formId]/page.tsx` - Student view with section rendering

### Key Functions

#### Form Builder
- `addSection()` - Create new section
- `updateSection()` - Update section data
- `deleteSection()` - Remove section
- `duplicateSection()` - Copy section with all questions
- `convertToSections()` - Convert simple list to sections
- `convertToQuestions()` - Flatten sections to simple list

#### Student View
- `getAllQuestions()` - Get all questions (flattened)
- `getVisibleQuestions()` - Filter by student's class type
- `getVisibleSections()` - Get sections with filtered questions

## Best Practices

### When to Use Sections
✅ Forms with multiple logical parts (e.g., Personal Info, Academic Details, Preferences)
✅ Long forms that benefit from organization
✅ Forms where context changes between question groups
✅ Event registrations with different information types

### When to Use Simple Mode
✅ Short forms (< 10 questions)
✅ Single-topic surveys
✅ Quick feedback forms
✅ Forms where all questions are related

## Examples

### Example 1: Event Registration
```
Section 1: Personal Information
  - Full Name
  - Email
  - Phone Number

Section 2: Event Preferences  
  - Session Selection
  - Meal Preference
  - T-Shirt Size

Section 3: Additional Information
  - Special Requirements
  - How did you hear about us?
```

### Example 2: Course Feedback
```
Section 1: Course Content
  - Rate the course material
  - Rate the difficulty level
  - Most useful topics

Section 2: Instructor Evaluation
  - Rate the instructor
  - Teaching effectiveness
  - Availability for help

Section 3: Suggestions
  - What can be improved?
  - Would you recommend this course?
```

## Troubleshooting

### Issue: Can't see section mode button
**Solution**: Make sure you're in the form editor (Dashboard → Forms → Edit Form)

### Issue: Questions disappeared after converting
**Solution**: Check if you're in the right mode. Toggle back to see questions.

### Issue: Section titles not showing to students
**Solution**: Make sure the section has both a title AND at least one visible question

### Issue: Drag and drop not working
**Solution**: Ensure you're grabbing the drag handle (⋮⋮ icon) at the top of each section/question

## Future Enhancements

🔮 Potential future features:
- Conditional sections (show/hide based on answers)
- Section-level class type filtering
- Section templates
- Import/export sections between forms
- Section progress indicators
- Multi-page forms with section pagination

## Support

For questions or issues with the section feature, please refer to:
- This documentation
- Code comments in the modified files
- Test the feature in a development environment first

---

**Happy Form Building! 🎉**
