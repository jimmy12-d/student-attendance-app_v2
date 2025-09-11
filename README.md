# Student Attendance Management System

A comprehensive web-based attendance management system built with Next.js, React, TypeScript, and Firebase. The system features face recognition technology, real-time attendance tracking, and advanced reporting capabilities.

## 🌟 Features

### Core Functionality
- **Face Recognition Attendance**: Automated attendance marking using face-api.js
- **Manual Attendance**: Teachers can manually mark attendance for students
- **Real-time Dashboard**: Live attendance monitoring and statistics
- **Multi-shift Support**: Morning, Afternoon, and Evening shifts
- **Class Management**: Support for multiple classes with individual configurations

### Advanced Features
- **Smart Late Detection**: Configurable grace periods and late cutoff times
- **Attendance Analytics**: Monthly reports, consecutive absence tracking
- **Average Arrival Time**: Calculate student punctuality patterns
- **Permission Management**: Handle approved absences and permissions
- **Timestamp Editing**: Retroactive attendance corrections
- **Data Export**: Print-friendly attendance reports

### User Roles
- **Admin**: Full system access and configuration
- **Teacher**: Class-specific attendance management
- **Student**: Personal attendance history (via student portal)

## 🏗️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Face Recognition**: face-api.js
- **UI Components**: Custom components with MDI icons
- **State Management**: React Context API
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
student-attendance-app-main_v2/
├── app/                          # Next.js App Router
│   ├── dashboard/               # Main dashboard application
│   │   ├── _components/         # Reusable UI components
│   │   ├── _contexts/          # React contexts
│   │   ├── _hooks/             # Custom React hooks
│   │   ├── _interfaces/        # TypeScript interfaces
│   │   ├── _lib/               # Utility functions and logic
│   │   │   ├── attendanceLogic.ts  # Core attendance calculations
│   │   │   └── configForAttendanceLogic.ts  # Class configurations
│   │   ├── _stores/            # State management
│   │   ├── admin/              # Admin panel
│   │   ├── students/           # Student management
│   │   ├── teacher/            # Teacher dashboard
│   │   └── api/                # API routes
│   ├── login/                  # Authentication pages
│   └── layout.tsx              # Root layout
├── scripts/                    # Database scripts and utilities
├── face-recognition-service/   # Python face recognition service
├── public/                     # Static assets
├── firestore-upload/          # Database seeding scripts
└── database-backups/          # Backup storage
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase project
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/jimmy12-d/student-attendance-app_v2.git
   cd student-attendance-app_v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. **Set up Firebase**
   - Create a Firebase project
   - Enable Authentication and Firestore
   - Download service account key to `firestore-upload/serviceAccountKey.json`

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:3000`

## 📊 Core Features

### Attendance Logic
The system uses sophisticated attendance calculations defined in `attendanceLogic.ts`:

- **Daily Status Calculation**: Determines if a student is Present, Late, Absent, or has Permission
- **Monthly Statistics**: Tracks absences, late arrivals, and attendance patterns
- **Average Arrival Time**: Calculates how early/late students typically arrive
- **Consecutive Absences**: Monitors attendance streaks for early intervention

### Average Arrival Time Calculation
```typescript
// Example usage in attendanceLogic.ts
const avgArrival = calculateAverageArrivalTime(
  student,
  attendanceRecords,
  '2025-09',
  classConfigs
);
// Returns: { averageTime: "+5m late", details: "Avg arrival: +5m late (15 days in September 2025)" }
```

### Face Recognition
- Uses face-api.js for browser-based face detection
- Stores face descriptors securely in Firestore
- Real-time recognition with confidence scoring
- Fallback to manual attendance when needed

### Class Configuration
Each class can have custom settings:
- Study days (which days of the week)
- Shift schedules with start times
- Grace periods for late marking
- Special rules (e.g., Saturday schedules for specific classes)

## 🎯 Key Components

### TableAttendance.tsx
- Main attendance display and editing interface
- Shows warning rows for large time discrepancies
- Uses `timeIn` field for display and editing
- Calculates differences between arrival and start times

### TableStudents.tsx
- Student management with column toggling
- Always shows student name (non-toggleable)
- Calculates and displays average arrival times
- Filters students by enrollment status

### StudentRow.tsx
- Individual student record display
- Handles various data columns (name, stats, enrollment)
- Supports average arrival time display

### ColumnToggle.tsx
- UI for toggling column visibility
- Locks essential columns during special modes
- Clean interface without showing always-visible columns

## 📈 Attendance Analytics

### Monthly Reports
- Absence counts and trends
- Late arrival statistics
- Attendance percentage calculations
- Permission tracking

### Time Difference Analysis
- Monitors discrepancies between `timeIn` and `startTime`
- Flags records with differences > 90 minutes
- Provides data for attendance accuracy improvements

## 🔧 Configuration

### Class Setup
Classes are configured in `configForAttendanceLogic.ts`:
```typescript
export const AllClassConfigs = {
  "12A": {
    studyDays: [1, 2, 3, 4, 5], // Monday to Friday
    shifts: {
      "Morning": { startTime: "07:00" },
      "Afternoon": { startTime: "13:00" }
    }
  }
  // ... more classes
};
```

### Environment Configuration
- Development: `http://localhost:3000`
- Production: Configure in Vercel or your hosting platform
- Database: Firebase Firestore with security rules

## 🛠️ Scripts and Utilities

### Database Scripts
Located in `/scripts/`:
- `find-timein-starttime-differences.js`: Analyze time discrepancies
- `update-attendance-starttime.js`: Bulk update start times
- `check-september6-records.js`: Query specific date records
- `list-attendance-records.js`: General database exploration

### Face Recognition Service
Python-based service in `/face-recognition-service/`:
- Flask API for advanced face processing
- Docker containerization
- Requirements optimization for deployment

## 📱 Responsive Design

The application is fully responsive and works across:
- Desktop computers (primary interface)
- Tablets (teacher mobile interface)
- Smartphones (student portal access)

## 🔐 Security

- Firebase Authentication for user management
- Firestore security rules for data protection
- Role-based access control
- Secure face descriptor storage
- Environment variable protection

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Manual Deployment
```bash
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team
- Check the documentation in `/docs/` (if available)

## 🔄 Version History

- **v2.0**: Major refactor with TypeScript and improved analytics
- **v1.5**: Added face recognition capabilities
- **v1.0**: Initial release with basic attendance tracking

## 🎯 Future Roadmap

- [ ] Mobile app for iOS/Android
- [ ] Advanced analytics dashboard
- [ ] Integration with school management systems
- [ ] Automated reporting and notifications
- [ ] Multi-language support
- [ ] Enhanced face recognition accuracy
- [ ] Offline mode support

---

**Built with ❤️ for educational institutions**

### Mobile & tablet

Mobile layout with hidden aside menu and collapsable cards & tables

[![Free React Tailwind CSS 4 admin dashboard](https://static.justboil.me/templates/one/one-tailwind-vue-mobile.png)](https://justboil.github.io/admin-one-react-tailwind/)

### Small laptops 1024px

Small laptop layout with show/hide aside menu option

[![Free React Tailwind CSS 4 admin dashboard](https://static.justboil.me/templates/one/one-tailwind-vue-1024.png)](https://justboil.github.io/admin-one-react-tailwind/)

[![Free React Tailwind CSS 4 admin dashboard](https://static.justboil.me/templates/one/one-tailwind-vue-1024-menu-open.png)](https://justboil.github.io/admin-one-react-tailwind/)

### Laptops & desktops

Classic layout with aside menus on the left

[![Free React Tailwind CSS 4 admin dashboard](https://static.justboil.me/templates/one/one-tailwind-vue-widescreen.png)](https://justboil.github.io/admin-one-react-tailwind/)

## Demo

### Free Dashboard Demo

https://justboil.github.io/admin-one-react-tailwind/

### Premium Dashboard Demo

Premium version is coming soon

## Quick Start

Get code & install. Then `dev` or `build`

* [Get code & install](#get-code--install)
* [Builds](#builds)
* [Linting and formatting](#linting-and-formatting)

### Get code & install

#### Get the repo

* [Create new repo](https://github.com/justboil/admin-one-react-tailwind/generate) with this template
* &hellip; or clone this repo on GitHub
* &hellip; or [download .zip](https://github.com/justboil/admin-one-react-tailwind/archive/master.zip) from GitHub

#### Install

`cd` to project's dir and run `npm install`

### Builds

Build are handled by Next.js CLI &mdash; [Info](https://nextjs.org/docs/app/api-reference/cli/next)

#### Hot-reloads for development

```
npm run dev
```

#### Builds and minifies for production

```
npm run build
```

#### Exports build for static hosts

Set `IS_OUTPUT_EXPORT` environment variable to `true` (or set `output` in next.config.ts)

### Linting & Formatting

#### Lint

```
npm run lint
```

#### Format with prettier

```
npm run format
```

## Docs

Docs are coming soon

## Browser Support

We try to make sure Dashboard works well in the latest versions of all major browsers

<img src="https://justboil.me/images/browsers-svg/chrome.svg" width="64" height="64" alt="Chrome"> <img src="https://justboil.me/images/browsers-svg/firefox.svg" width="64" height="64" alt="Firefox"> <img src="https://justboil.me/images/browsers-svg/edge.svg" width="64" height="64" alt="Edge"> <img src="https://justboil.me/images/browsers-svg/safari.svg" width="64" height="64" alt="Safari"> <img src="https://justboil.me/images/browsers-svg/opera.svg" width="64" height="64" alt="Opera">

## Reporting Issues

JustBoil's free items are limited to community support on GitHub.

The issue list is reserved exclusively for bug reports and feature requests. That means we do not accept usage questions. If you open an issue that does not conform to the requirements, it will be closed.

1. Make sure that you are using the latest version of the Dashboard. Issues for outdated versions are irrelevant
2. Provide steps to reproduce
3. Provide an expected behavior
4. Describe what is actually happening
5. Platform, Browser & version as some issues may be browser specific

## Licensing

- Copyright &copy; 2019-2025 JustBoil.me (https://justboil.me)
- Licensed under MIT

## Useful Links

- [JustBoil.me](https://justboil.me/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Next.js Docs](https://nextjs.org/docs/app/getting-started)
- [React.js Docs](https://react.dev/learn)
- [Redux Docs](https://redux.js.org/introduction/getting-started) & [React-Redux Docs](https://react-redux.js.org/introduction/getting-started)
- [TypeScript Docs](https://www.typescriptlang.org/docs/)
- [TypeScript ESLint Docs](https://typescript-eslint.io/docs/)
