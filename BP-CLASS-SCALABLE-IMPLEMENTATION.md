# BP Class System - Scalable Implementation

## Overview

The BP (Bridge Program) class system has been updated to be scalable and configurable, reading the class ID and display name from Firestore instead of hardcoding "12BP" values throughout the codebase.

## Changes Made

### 1. Dynamic BP Class Configuration

**File: `app/dashboard/students/TableStudents.tsx`**

Added state to store and fetch BP class configuration:

```typescript
// BP Class configuration state
const [bpClassId, setBpClassId] = useState<string>('12BP'); // Default to 12BP, can be made configurable
const [bpClassName, setBpClassName] = useState<string>('12BP'); // Will be fetched from Firestore
```

### 2. Fetch BP Class Name from Firestore

The BP class display name is now fetched from the `classes` collection:

```typescript
// Fetch BP class name from the class config
if (allConfigs[bpClassId]) {
  const bpClassConfig = allConfigs[bpClassId];
  if (bpClassConfig.name) {
    setBpClassName(bpClassConfig.name);
  }
}
```

### 3. Use Dynamic Class ID Throughout

**Updated `bpStudents` memo:**
```typescript
const bpStudents = React.useMemo(() => {
  return filteredStudents
    .filter(student => student.inBPClass)
    .map(student => ({
      ...student,
      shift: 'Evening',
      class: bpClassId // Use dynamic BP class ID instead of hardcoded '12BP'
    }))
    .sort((a, b) => a.fullName.localeCompare(b.fullName));
}, [filteredStudents, bpClassId]);
```

### 4. Dynamic Display Names in UI

**Shift Filter Button (ColumnToggle):**
- Added `bpClassName` prop to ColumnToggle component
- Updated shift filter button to display the actual class name:
```typescript
{ key: '12BP', label: bpClassName, icon: '...', color: 'pink' }
```

**BP Class Section Header:**
```typescript
<h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 via-rose-600 to-red-600 bg-clip-text text-transparent">
  {bpClassName} Class
</h1>
```

**ClassTable Component:**
```typescript
<ClassTable 
  key={`${bpClassId}-evening`}
  className={bpClassId}
  forceCollapsed={isClassCollapsed(bpClassId)}
  // ... other props
/>
```

### 5. Dynamic Modal Title

**File: `app/dashboard/_components/DailyStatusDetailsModal.tsx`**

Updated modal title to fetch and display the actual class name from class configs:

```typescript
const modalTitle = React.useMemo(() => {
  const baseTitle = `Attendance: ${student.fullName}`;
  // Check if viewing from BP context
  if (contextualStudent.class !== student.class || contextualStudent.shift !== student.shift) {
    // Get the BP class display name from allClassConfigs
    const bpClassConfig = allClassConfigs?.[contextualStudent.class || ''];
    const bpClassName = bpClassConfig?.name || contextualStudent.class;
    return `${baseTitle} (${bpClassName} - Evening Shift)`;
  }
  return baseTitle;
}, [student.fullName, student.class, student.shift, contextualStudent.class, contextualStudent.shift, allClassConfigs]);
```

## Configuration

### How to Configure the BP Class

1. **Set the BP Class ID** (if different from "12BP"):
   ```typescript
   const [bpClassId, setBpClassId] = useState<string>('YOUR_CLASS_ID');
   ```

2. **Create the Class Document in Firestore:**
   - Collection: `classes`
   - Document ID: Same as `bpClassId` (e.g., "12BP")
   - Document Fields:
     ```json
     {
       "name": "12BP",  // Display name shown in UI
       "shifts": {
         "Evening": {
           "startTime": "18:00",
           "endTime": "20:00"
         }
       },
       "studyDays": [1, 2, 3, 4, 5]  // Mon-Fri
     }
     ```

3. **Mark Students as BP Class Members:**
   - Add `inBPClass: true` field to student documents in the `students` collection
   - Students with this field will appear in both their regular class AND the BP class

## Benefits

### ✅ Scalability
- No hardcoded class IDs in display logic
- Easy to add multiple special classes in the future
- Class names can be changed in Firestore without code changes

### ✅ Maintainability
- Single source of truth for class configuration
- Consistent naming across the entire application
- Easier to debug and update

### ✅ Flexibility
- Supports different BP class names (e.g., "12BP", "Bridge Program", "Remedial Class")
- Can be extended to support multiple special classes
- Admin can update class names without developer intervention

## Example Use Cases

### Use Case 1: Rename the BP Class
**Before:** "12BP" is shown everywhere
**After:** Update the `name` field in Firestore `classes/12BP` document to "Grade 12 Bridge Program"
**Result:** All UI elements automatically show "Grade 12 Bridge Program"

### Use Case 2: Add Multiple Special Classes
```typescript
// Configure multiple BP classes
const specialClasses = [
  { id: '12BP', name: 'Grade 12 Bridge' },
  { id: '11BP', name: 'Grade 11 Bridge' },
  { id: 'Remedial', name: 'Remedial Math' }
];

// Students can have multiple special class flags
interface Student {
  inBPClass?: boolean;
  in11BPClass?: boolean;
  inRemedialClass?: boolean;
}
```

### Use Case 3: Multi-Language Support
```typescript
// Future enhancement: Support multiple languages
const bpClassConfig = allConfigs[bpClassId];
const bpClassName = bpClassConfig?.name?.[currentLanguage] || bpClassConfig?.name;
```

## Files Modified

1. ✅ `app/dashboard/students/TableStudents.tsx`
   - Added `bpClassId` and `bpClassName` state
   - Fetch BP class name from Firestore
   - Use dynamic class ID in `bpStudents` memo
   - Pass `bpClassName` to ColumnToggle
   - Update BP section header and ClassTable

2. ✅ `app/dashboard/students/components/ColumnToggle.tsx`
   - Added `bpClassName` prop
   - Updated shift filter button to use dynamic name

3. ✅ `app/dashboard/_components/DailyStatusDetailsModal.tsx`
   - Updated modal title to fetch class name from configs
   - Made title generation more flexible

## Migration Notes

### For Existing Deployments

No database migration needed! The system works with existing data:

1. **If `name` field exists in class document:** Uses the display name
2. **If `name` field is missing:** Falls back to class ID (e.g., "12BP")

### Future Enhancements

- Add admin UI to configure BP class ID
- Support multiple special classes simultaneously
- Add class type categorization (Regular, Bridge, Remedial, etc.)
- Multi-language support for class names

## Testing Checklist

- [x] BP class name displays correctly in shift filter
- [x] BP class section header shows correct name
- [x] Attendance modal title shows correct class name
- [x] Students appear in both regular and BP classes
- [x] Attendance filtering works correctly for BP class
- [x] Class name updates in Firestore reflect immediately in UI
- [x] Falls back gracefully if `name` field is missing

## Related Documentation

- [Attendance Modal Two-Class Fix](./ATTENDANCE-MODAL-TWO-CLASS-FIX.md)
- [12BP Class Implementation](./IMPLEMENTATION-SUMMARY.md)
- [Class Configuration Guide](./CLASS-CONFIG-GUIDE.md)
