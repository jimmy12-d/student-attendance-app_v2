# MockExamScoresTable Component

## Overview
The `MockExamScoresTable` component displays exam scores from form responses stored in the `form_responses` collection. It reads data for a specific form (default: `q57n4s6X6pMAX6yHRoQ0`) and displays student scores with filtering, sorting, and export capabilities.

## Features
- ✅ Reads from `form_responses` collection with specific `formId`
- ✅ Automatically extracts scores from form answers based on question ID mapping
- ✅ Displays student information (name, ID, class, shift)
- ✅ Shows individual subject scores and calculated totals/averages
- ✅ Search functionality (by name or student ID)
- ✅ Class filter
- ✅ Sortable columns
- ✅ Export to CSV
- ✅ Statistics cards (total students, average score, highest score, pass rate)
- ✅ Responsive design with dark mode support

## Usage

### Basic Usage
```tsx
import { MockExamScoresTable } from './components';

export default function ExamResultsPage() {
  return (
    <div>
      <h1>Mock Exam Results</h1>
      <MockExamScoresTable />
    </div>
  );
}
```

### With Custom Form ID
```tsx
import { MockExamScoresTable } from './components';

export default function ExamResultsPage() {
  return (
    <div>
      <h1>Mock Exam Results</h1>
      <MockExamScoresTable formId="your-form-id-here" />
    </div>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `formId` | `string` | `'q57n4s6X6pMAX6yHRoQ0'` | The form ID to fetch responses from |

## Data Structure

### Form Response (from Firestore)
```typescript
interface FormResponse {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  shift: string;
  answers: Array<{
    questionId: string;
    answer: string | string[];
  }>;
  submittedAt: Timestamp;
  approvalStatus: string;
  registrationStatus?: string;
  paymentStatus?: string;
}
```

### Question ID to Subject Mapping
The component uses the following mapping to extract subject scores from form answers:

**Grade 12 Science:**
- `q_1761298889704_ry0vs9` → Khmer
- `q_1761298959004_xr53dh` → Math
- `q_1761298974654_ti02hf` → Physics
- `q_1761298992770_x74nnh` → Chemistry
- `q_1761299006371_6tcg56` → Biology
- `q_1761299012871_p1qejj` → English

**Grade 12 Technology:**
- `q_1761304490669_qchcls` → Khmer
- `q_1761304490669_v55ltg` → Math
- `q_1761304490669_1y6jzq` → Physics
- `q_1761304490669_tdgeg7` → Technology
- `q_1761304490669_aracq` → Earth/Environmental Science
- `q_1761304490669_p9rmr` → English

**Grade 11:**
- `q_1761299572863_wqy7hd` → Khmer
- `q_1761299572863_49mee` → Math
- `q_1761299796963_aqmlx` → Physics
- `q_1761299804279_zq4r3s` → Chemistry

## Customization

### Adding New Question Mappings
To add support for additional forms or subjects, update the `QUESTION_SUBJECT_MAP` constant in the component:

```typescript
const QUESTION_SUBJECT_MAP: { [key: string]: string } = {
  'your-question-id': 'SubjectName',
  // ... existing mappings
};
```

### Updating Subject Display Names
Modify the `SUBJECT_DISPLAY_NAMES` constant to change how subjects appear in the table:

```typescript
const SUBJECT_DISPLAY_NAMES: { [key: string]: string } = {
  'SubjectName': 'Display Name',
  // ... existing mappings
};
```

## Statistics Calculated
- **Total Students**: Count of all filtered students
- **Average Score**: Mean of all student total scores
- **Highest Score**: Maximum total score
- **Pass Rate**: Percentage of students with average score ≥ 50%

## Features in Detail

### Search
- Search by student name (case-insensitive)
- Search by student ID

### Filters
- Filter by class (dropdown with all available classes)

### Sorting
- Click column headers to sort
- Toggle between ascending and descending order
- Sortable fields: name, class, total score, average score, individual subjects

### Export
- Export filtered results to CSV
- Includes all student data and scores
- Filename format: `mock_exam_scores_{formId}_{date}.csv`

## Styling
- Responsive design
- Dark mode support
- Sticky header for scrolling
- Sticky first column (student name)
- Hover effects and transitions
- Color-coded statistics cards

## Dependencies
- React
- Firebase/Firestore
- @mdi/react (icons)
- react-hot-toast (notifications)

## Notes
- The component automatically handles different answer formats (string or array)
- Scores are parsed as floats and displayed with appropriate precision
- Empty scores are shown as "-"
- The table is fully responsive and scrollable
- Loading state is displayed while fetching data
