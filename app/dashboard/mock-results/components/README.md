# Mock Results Components

This folder contains reusable utility functions and components for the Mock Results dashboard that can be used across other pages in the application.

## Components Overview

### 📊 `gradeCalculations.ts`
- **Grade calculation logic** (A, B, C, D, E, F)
- **Student total score calculation** with English bonus logic
- **Max scores configuration** based on class type and exam settings
- **Class statistics calculation** (average, highest, lowest, pass rate)

### 🎨 `gradeStyles.ts`
- **Grade color schemes** for badges and UI elements
- **Hover effects** for interactive elements
- **Score color coding** based on performance
- **Consistent styling** across light/dark themes

### 📚 `subjectConfig.ts`
- **Subject ordering** for different grade types (Grade 12, Grade 12 Social)
- **Subject label mapping** (Math/Khmer field mapping)
- **Dynamic subject visibility** logic
- **Grade-specific configurations**

### 📤 `dataExport.ts`
- **CSV export functionality** with proper formatting
- **File download utilities**
- **Dynamic filename generation**
- **Configurable export headers**

### 🔥 `firebaseUtils.ts`
- **Firestore data fetching** for mocks, settings, and students
- **Available mocks detection** from examControls
- **Exam settings retrieval** for all grade types
- **Error handling** and fallback logic

### 🔍 `filterUtils.ts`
- **Student filtering** by search, class, shift, grade
- **Sorting functionality** for all table columns
- **Unique value extraction** for dropdown filters
- **Advanced search capabilities**

### 📦 `index.ts`
- **Centralized exports** for easy importing
- **TypeScript interfaces** and type definitions
- **Component organization**

## Usage Examples

### Import specific utilities:
```typescript
import { calculateGrade, getGradeColor } from './components/gradeCalculations';
import { exportStudentsToCSV } from './components/dataExport';
```

### Import everything:
```typescript
import * as MockUtils from './components';
```

### Use in other pages:
```typescript
// In any other dashboard page
import { 
  calculateStudentTotals, 
  getGradeStyles, 
  getCurrentSubjectLabels 
} from '../mock-results/components';
```

## Features

✅ **Reusable** - All functions can be used across different pages  
✅ **Type-safe** - Full TypeScript support with interfaces  
✅ **Modular** - Import only what you need  
✅ **Consistent** - Unified styling and calculation logic  
✅ **Documented** - Clear function descriptions and examples  
✅ **Error-handled** - Robust error handling and fallbacks  

## Future Extensions

These components can be easily extended for:
- Student individual results pages
- Teacher grade input pages
- Administrative reports
- Grade analytics dashboards
- Export to other formats (PDF, Excel)
- Real-time grade calculations
