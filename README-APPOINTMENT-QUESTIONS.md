# 🎓 Appointment Questions Feature - Complete Documentation

> A comprehensive appointment system enhancement that allows admins to add validation questions with bilingual word count support.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
- [Implementation Details](#implementation-details)
- [Usage Guide](#usage-guide)
- [Technical Details](#technical-details)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This feature extends the existing appointment booking system by adding a question validation step. Administrators can create questions for specific appointment slots, and students must answer these questions (meeting minimum word count requirements) before submitting their appointment requests.

**Key Benefit:** Better quality appointment requests with guaranteed minimum information from students.

### What's New?

- ✅ **Admin Question Management** - Add, edit, remove questions from appointments
- ✅ **Word Count Validation** - Set minimum requirements in English and/or Khmer
- ✅ **Real-time Feedback** - Students see live word count updates
- ✅ **Bilingual Support** - Full support for both English and Khmer languages
- ✅ **Data Storage** - All answers stored for admin review

---

## ✨ Features

### For Administrators

| Feature | Description |
|---------|-------------|
| **Add Questions** | Create questions directly in the availability form |
| **Set Requirements** | Define minimum word counts for English and Khmer separately |
| **Multiple Questions** | Add unlimited questions per appointment |
| **Edit/Delete** | Modify or remove questions at any time |
| **View in List** | See question count and previews in availability list |
| **Review Answers** | Access student responses when reviewing appointments |

### For Students

| Feature | Description |
|---------|-------------|
| **Question Panel** | Clear, organized interface for answering questions |
| **Real-time Validation** | See word counts update as you type |
| **Language Support** | Answer in English, Khmer, or both |
| **Visual Feedback** | ✓ indicator shows when answer is valid |
| **Error Prevention** | Cannot submit until all requirements met |

---

## 🚀 Getting Started

### For Admins

#### Step 1: Create Appointment with Questions

1. Go to **Dashboard** → **Appointment Management** → **Admin Availability** tab
2. Click **"Add Availability"**
3. Fill in the basic details:
   - Date
   - Start/End Time
   - Slot Duration
   - Minimum Prior Hours
   - Optional: Break Time

#### Step 2: Add Questions

4. Scroll to **"Questions (Optional)"** section
5. In the **Add Question Form**:
   - Type your question in the textarea
   - Set **Minimum English Words** (0 = no requirement)
   - Set **Minimum Khmer Words** (0 = no requirement)
   - Click **"Add Question"**

#### Step 3: Manage Questions

6. Added questions appear in the **"Existing Questions List"**
7. Remove any question using the **[Delete]** button
8. Add as many questions as needed
9. Click **"Create"** to save

### For Students

#### Step 1: Start Booking

1. Go to **Student Dashboard** → **Appointments**
2. Click **"Book Appointment"**

#### Step 2: Select Date & Time

3. **Select Date**: Choose a date from the calendar
4. **Select Time**: Choose a time slot
5. A **"Answer Questions"** panel appears automatically

#### Step 3: Answer Questions

6. For each question:
   - Read the question carefully
   - Type your answer in the textarea
   - **Watch the word counts**:
     - English: `Current Count / Required Count`
     - Khmer: `Current Count / Required Count`
   - When both meet requirements, a **✓ Valid** indicator appears

#### Step 4: Submit

7. Once all questions are valid:
   - Click **"Submit Request"** button
   - Your answers are saved with your appointment

---

## 💻 Implementation Details

### New Files Created

```
app/_utils/wordCountUtils.ts
```
Utility functions for counting words in mixed Khmer/English text.

**Exports:**
- `countWords(text)` - Count words by language
- `meetsWordCountRequirement()` - Validate against requirements
- `formatWordCountMessage()` - Format for display

### Files Modified

#### 1. `app/_interfaces/index.ts`

Added two new interfaces:

```typescript
interface AppointmentQuestion {
  id: string;                  // Unique ID
  question: string;            // Question text
  minWordCountEnglish: number;  // English minimum
  minWordCountKhmer: number;    // Khmer minimum
  required: boolean;           // Always true for now
  order: number;               // Question order
}

interface QuestionAnswer {
  questionId: string;          // References the question
  question: string;            // Question text (copied)
  answer: string;              // Student's answer
  wordCountEnglish: number;     // Counted English words
  wordCountKhmer: number;       // Counted Khmer words
  meetsRequirement: boolean;    // Validation result
}
```

Updated existing interfaces:

```typescript
interface AdminAvailability {
  // ... existing fields ...
  questions?: AppointmentQuestion[];  // NEW
}

interface AppointmentRequest {
  // ... existing fields ...
  answers?: QuestionAnswer[];  // NEW
}
```

#### 2. `app/dashboard/appointments/page.tsx`

Admin dashboard updates:

- Added question form UI section
- New state: `newQuestion` for form inputs
- New functions:
  - `handleAddQuestion()` - Add question to list
  - `handleRemoveQuestion(id)` - Remove from list
- Questions saved with availability documents
- Questions displayed in availability list

#### 3. `app/student/mock-exam/_components/appointments/AppointmentBookingForm.tsx`

Student booking form updates:

- New states for questions management
- Question panel UI component
- Real-time word count validation
- Answer collection and submission
- Updated validation to check questions

---

## 📊 Technical Details

### Word Counting Algorithm

#### English Words
- Split by whitespace
- Remove punctuation
- Count remaining sequences
- Simple standard word count

#### Khmer Words
- Use Unicode range detection (U+1780 to U+17FF)
- Count clusters of Khmer characters
- Each cluster = 1 word (handles lack of word spacing)
- More sophisticated for non-space-delimited language

#### Mixed Language
- Automatically separate by character type
- Count each language independently
- Both must meet their minimums

### Database Schema

#### adminAvailability Document
```json
{
  "date": "2025-11-20",
  "startTime": "09:00",
  "endTime": "17:00",
  "slotDuration": 30,
  "questions": [
    {
      "id": "q_1700481920_abc123",
      "question": "Why do you want this appointment?",
      "minWordCountEnglish": 10,
      "minWordCountKhmer": 5,
      "required": true,
      "order": 1
    }
  ]
}
```

#### appointmentRequests Document
```json
{
  "studentId": "student123",
  "studentName": "John Doe",
  "appointmentDate": "2025-11-20",
  "appointmentTime": "09:00",
  "answers": [
    {
      "questionId": "q_1700481920_abc123",
      "question": "Why do you want this appointment?",
      "answer": "I need help with mathematics...",
      "wordCountEnglish": 12,
      "wordCountKhmer": 3,
      "meetsRequirement": true
    }
  ]
}
```

---

## 📚 Usage Guide

### Admin Examples

#### Example 1: English Only Question
```
Question: "What is your main concern?"
Min English: 20 words
Min Khmer: 0 (not required)
```
Students must answer in at least 20 English words.

#### Example 2: Khmer Only Question
```
Question: "តើលោកអ្នកត្រូវការជំនួយក្នុងបញ្ហាអ្វី?"
Min English: 0 (not required)
Min Khmer: 10 words
```
Students must answer in at least 10 Khmer words.

#### Example 3: Bilingual Question
```
Question: "Tell us about yourself"
Min English: 5 words
Min Khmer: 3 words
```
Students must provide at least 5 English words AND 3 Khmer words.

### Student Examples

#### Scenario 1: English Answer
```
Question: "What is your main concern?"
Student types: "I have problems with mathematics and need help understanding algebra"
Count: English 12 words ✓
Result: VALID
```

#### Scenario 2: Khmer Answer
```
Question: "តើលោកអ្នកត្រូវការជំនួយក្នុងបញ្ហាអ្វី?"
Student types: "ខ្ញុំ ត្រូវការ ជំនួយ ក្នុង វិទ្យាសាស្ត្រ ដើម្បី យល់ ឱ្យ ល្អ"
Count: Khmer 10 words ✓
Result: VALID
```

#### Scenario 3: Mixed Language
```
Question: "Tell us about yourself"
Student types: "My name is Mark and I ចូលចិត្ត mathematics និង រូបវិទ្យា"
Count: English 7 words ✓, Khmer 3 words ✓
Result: VALID (meets both)
```

#### Scenario 4: Invalid Answer
```
Question: "What is your main concern?" (Min: 20 words)
Student types: "I need help"
Count: English 3 words ❌ (need 17 more)
Result: INVALID - Cannot submit until more words added
```

---

## 🧪 Testing Guide

### Test Checklist

#### Admin Functionality
- [ ] Admin can open availability form
- [ ] Question section is visible
- [ ] Can add questions with various word count combinations
- [ ] Can remove questions from the list
- [ ] Added questions persist when editing availability
- [ ] Questions display in availability list with count badge
- [ ] Questions display with preview text in list items

#### Student Functionality
- [ ] Question panel appears after selecting time
- [ ] All questions from availability are shown
- [ ] Text area accepts both English and Khmer input
- [ ] English word count updates in real-time
- [ ] Khmer word count updates in real-time
- [ ] ✓ indicator appears when word count met
- [ ] ✓ indicator disappears if word count drops below minimum
- [ ] Submit button disabled when any answer invalid
- [ ] Submit button enabled when all answers valid
- [ ] Answers are saved with the appointment

#### Edge Cases
- [ ] Empty answer (should show 0 words)
- [ ] Mixed English and Khmer in single answer
- [ ] Punctuation is handled correctly
- [ ] Minimum is exactly met (edge case)
- [ ] Minimum exceeded (should still pass)
- [ ] Only English required (Khmer minimum = 0)
- [ ] Only Khmer required (English minimum = 0)
- [ ] Both required (both must pass)

### Example Test Cases

```gherkin
Scenario: Admin adds English-only question
  Given admin is creating new availability
  When admin adds question "Why do you want this appointment?"
  And sets English minimum to 10
  And sets Khmer minimum to 0
  Then question should be added to list
  And can be saved successfully

Scenario: Student answers valid English question
  Given student is booking appointment with questions
  And question requires 10 English words minimum
  When student types "I need help with my studies and want to improve"
  Then word count should show "English: 11/10" with ✓
  And submit button should be enabled

Scenario: Student answer too short
  Given student is booking appointment
  And question requires 10 words minimum
  When student types "Help me please"
  Then word count should show "English: 3/10" with ❌
  And submit button should be disabled
  When student adds "I really need to understand this better"
  Then word count updates to "English: 10/10" with ✓
  And submit button should be enabled
```

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Questions not showing in form | Admin didn't create questions | Add questions before saving |
| Word count not updating | Real-time validation may be slow | Try typing more text |
| Submit disabled when questions valid | Browser cache issue | Refresh page |
| Khmer words not counting | Input not actual Khmer Unicode | Copy-paste from Khmer keyboard |
| Question panel not appearing | No questions for this slot | Create questions in availability |

### Debug Tips

1. **Check console** for any JavaScript errors
2. **Verify Firestore** - Questions saved in availability document?
3. **Check student input** - Is it actually Khmer or Latin characters?
4. **Clear cache** - Hard refresh browser (Cmd+Shift+R on Mac)
5. **Test in incognito** - Eliminates extension/cache issues

---

## 📈 Performance Considerations

- Word counting is done client-side (fast)
- No database queries during typing
- Only Firestore writes on submission
- Suitable for any number of questions
- Real-time feedback is instant

---

## 🔒 Security Notes

- Questions are stored as plain text
- Answers are stored as-is (no filtering)
- Admin should not include sensitive questions
- All data visible to admin when reviewing
- Consider GDPR implications of storing student responses

---

## 🚀 Future Enhancements

Potential features to add later:

- [ ] Optional questions (not all required)
- [ ] Question categories/tags
- [ ] Question templates library
- [ ] Multiple choice questions
- [ ] File upload in answers
- [ ] Answer quality scoring
- [ ] Admin analytics dashboard
- [ ] Automatic follow-up emails with question feedback

---

## 📞 Support

For issues or questions:

1. Check this documentation
2. Review test cases for similar scenarios
3. Check browser console for errors
4. Verify Firestore data structure

---

## 📄 Related Files

- **Feature Documentation**: `APPOINTMENT-QUESTIONS-FEATURE.md`
- **Quick Start**: `APPOINTMENT-QUESTIONS-QUICK-START.md`
- **Visual Guide**: `VISUAL-GUIDE.md`
- **Implementation Summary**: `IMPLEMENTATION-COMPLETE.md`

---

**Status:** ✅ Complete and Ready for Testing

**Last Updated:** November 20, 2025
