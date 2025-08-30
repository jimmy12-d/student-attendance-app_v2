# Star Management System

A comprehensive reward system for students that allows administrators to create and manage star-based rewards, track student achievements, and motivate students through a point-based system.

## Features

### Admin Features

#### Star Rewards Management (`/dashboard/stars`)
- Create, edit, and delete star reward types
- Configure reward properties:
  - **Name**: Descriptive name (e.g., "Early Bird Star", "Perfect Attendance Star")
  - **Color**: Visual identifier (White, Pink, Orange, Blue)
  - **Amount**: Number of stars awarded (1-100)
  - **Set Limit**: Maximum times a reward can be claimed per student (1-1000)
  - **Active/Inactive**: Toggle reward availability
- Real-time updates across all admin interfaces

#### Student Management Integration
- **Star Management Section** in Student Details Modal:
  - View student's total stars
  - Award new stars with optional reason
  - View complete star history with dates and details
  - Prevent over-awarding based on set limits
  - Real-time star count updates

#### Star Rewards Admin Interface
- Grid layout with reward cards showing:
  - Reward name with colored star icon
  - Active/inactive status
  - Stars awarded and claim limit
  - Color preview
  - Quick action buttons (Edit, Delete, Toggle Status)

### Student Features

#### Attendance Page Integration
- **Star Display Component** shows:
  - Total stars earned with prominent display
  - Recent star history (last 5 by default)
  - Expandable full history
  - Reward details including reason and date
  - Empty state encouragement

#### Star History
- Chronological list of claimed rewards
- Color-coded star icons matching reward types
- Award reason and date information
- Responsive design for mobile PWA

## Technical Implementation

### Database Structure

#### Collections

**`starRewards`** (Top-level collection)
```typescript
{
  id: string;
  name: string;
  color: 'white' | 'pink' | 'orange' | 'blue';
  amount: number;
  setLimit: number;
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}
```

**`students/{studentId}/claimedStars`** (Sub-collection)
```typescript
{
  id: string;
  starRewardId: string;
  starRewardName: string;
  starRewardColor: 'white' | 'pink' | 'orange' | 'blue';
  amount: number;
  claimedAt: Timestamp;
  claimedBy: string;
  reason?: string;
}
```

### Security Rules

#### Firestore Rules
```javascript
// Star rewards - readable by all authenticated users, writable by admins only
match /starRewards/{rewardId} {
  allow read: if request.auth != null;
  allow write: if isAuthorizedUser();
}

// Claimed stars - readable by student owner and admins, writable by admins only
match /students/{studentId}/claimedStars/{claimedStarId} {
  allow read: if isAuthorizedUser() || 
                 (request.auth != null && 
                  request.auth.uid == get(/databases/$(database)/documents/students/$(studentId)).data.authUid);
  allow write: if isAuthorizedUser();
}
```

### Components

#### Admin Components
- **`StarManagementPage`** (`/app/dashboard/stars/page.tsx`)
  - Main admin interface for managing star rewards
  - CRUD operations with real-time updates
  - Form validation and error handling

- **`StarManagementSection`** (`/app/dashboard/students/components/StarManagementSection.tsx`)
  - Integrated into Student Details Modal
  - Award stars with validation
  - Display student's star history

- **`StudentStarCount`** (`/app/dashboard/students/components/StudentStarCount.tsx`)
  - Lightweight component for displaying total stars
  - Can be integrated into student tables/lists

#### Student Components
- **`StarDisplay`** (`/app/student/_components/StarDisplay.tsx`)
  - Main student interface for viewing stars
  - Responsive design with history expansion
  - Real-time updates

### Key Features

#### Validation & Limits
- Prevent awarding stars beyond set limits
- Real-time validation in admin interface
- Clear feedback on remaining allowances

#### Real-time Updates
- Instant synchronization across all interfaces
- Firestore onSnapshot listeners
- Optimistic UI updates with error handling

#### Color System
- Consistent color coding across all interfaces
- CSS classes for easy theming
- Visual distinction between reward types

## Usage

### Creating Star Rewards

1. Navigate to **Dashboard > Star Management**
2. Click **"Create New Reward"**
3. Fill in reward details:
   - Enter descriptive name
   - Select color identifier
   - Set star amount (1-100)
   - Set claim limit (1-1000)
4. Click **"Create Reward"**

### Awarding Stars to Students

1. Navigate to **Dashboard > Students**
2. Click on a student to open details modal
3. Scroll to **"Star Management"** section
4. Select reward from dropdown
5. Optionally add reason
6. Click **"Award Star"**

### Student View

Students can view their stars by:
1. Opening the PWA
2. Navigating to **Attendance** page
3. Scrolling to **"My Stars"** section
4. Expanding history for full details

## Best Practices

### Admin Guidelines
- Use descriptive reward names that clearly indicate the achievement
- Set appropriate limits to prevent inflation
- Use colors consistently (e.g., blue for academic achievement, green for attendance)
- Add meaningful reasons when awarding stars

### Reward Design
- Start with simple, achievable rewards
- Gradually introduce more challenging achievements
- Consider seasonal or special event rewards
- Balance frequency to maintain motivation

### System Maintenance
- Regularly review and update reward types
- Monitor star distribution to ensure fairness
- Deactivate outdated rewards rather than deleting
- Keep claim limits reasonable for semester/year duration

## Future Enhancements

- Star redemption system (exchange stars for privileges)
- Leaderboards and class competitions
- Automated star awarding based on attendance patterns
- Parent/guardian notifications for star achievements
- Export star data for reporting
- Bulk star operations for class-wide rewards
