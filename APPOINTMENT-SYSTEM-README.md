# Teacher Appointment Booking System

## Overview
A PWA feature that allows students to book appointments with teachers. The system includes availability management for admins/teachers and a booking interface for students.

## Features

### Admin/Teacher Features
- **Availability Management**
  - Create and manage weekly availability schedules
  - Set specific days and time ranges (e.g., "Mondays 3-5 PM")
  - Configure appointment slot durations (15, 30, 45, or 60 minutes)
  - Enable/disable availability schedules
  - Edit and delete existing schedules

- **Appointment Request Dashboard**
  - View all appointment requests from students
  - Filter by pending, approved, or rejected status
  - Approve appointments with a single click
  - Reject appointments with a reason
  - Real-time notification badge for pending requests

### Student Features
- **Teacher Selection**
  - Browse available teachers with their subjects
  - View teacher availability schedules
  - Expandable cards showing detailed time slots
  - Only shows teachers with active availability

- **Appointment Booking**
  - Interactive calendar to select appointment date
  - Visual indication of available vs unavailable dates
  - Time slot picker showing available times
  - Booked slots are automatically disabled
  - Minimum 10-word reason requirement
  - Form validation with clear error messages

- **My Appointments**
  - View all past and upcoming appointments
  - Filter by upcoming or all appointments
  - Status indicators (Pending, Approved, Rejected)
  - Display rejection reasons when applicable
  - Awaiting approval notifications

## Technical Implementation

### Firestore Collections

#### `teacherAvailability`
```typescript
{
  id: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  slotDuration: number; // Minutes (15, 30, 45, 60)
  isActive: boolean;
  createdAt: Timestamp;
  createdBy: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}
```

#### `appointmentRequests`
```typescript
{
  id: string;
  studentId: string;
  studentName: string;
  studentClass?: string;
  studentShift?: string;
  authUid: string;
  teacherId: string;
  teacherName: string;
  availabilityId: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:mm
  duration: number; // Minutes
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string;
  rejectionReason?: string;
}
```

### Security Rules

#### Teacher Availability
- **Read**: Public (needed for student booking)
- **Write**: Admin only

#### Appointment Requests
- **Read**: Admins (all) or Students (own requests only)
- **Create**: Authenticated students (status must be 'pending')
- **Update**: Admin only (for approval/rejection)
- **Delete**: Admin only

#### Teachers
- **Read**: Public (needed for browsing)
- **Write**: Admin only

### Firestore Indexes

Created composite indexes for:
1. `teacherAvailability`: `isActive` + `dayOfWeek` + `startTime`
2. `appointmentRequests`: `authUid` + `requestedAt` (DESC)
3. `appointmentRequests`: `teacherId` + `status`
4. `appointmentRequests`: `requestedAt` (DESC)

## File Structure

```
app/
├── dashboard/
│   └── appointments/
│       └── page.tsx                    # Admin appointment management
├── student/
│   └── mock-exam/
│       ├── page.tsx                    # Integrated appointment UI
│       └── _components/
│           └── appointments/
│               ├── TeacherSelector.tsx        # Teacher browsing
│               ├── AppointmentBookingForm.tsx # Booking calendar
│               └── MyAppointments.tsx         # Student's appointments
├── _interfaces/
│   └── index.ts                        # TypeScript interfaces
└── dashboard/
    └── _lib/
        └── menuAside.ts                # Admin menu with appointments link
```

## Internationalization

Translation keys added to both `en.json` and `kh.json`:
- `student.mockExam.appointments.*`

Key translations include:
- UI labels and buttons
- Validation messages
- Status labels
- Success/error messages

## Usage

### For Admins
1. Navigate to Dashboard → Academic → Appointments
2. Click "Add Availability" to create a new schedule
3. Select teacher, day, time range, and slot duration
4. Switch to "Appointment Requests" tab to manage bookings
5. Approve or reject pending requests

### For Students
1. Navigate to Exam page
2. Scroll to "Teacher Appointments" section
3. View "My Appointments" to see existing bookings
4. Browse available teachers
5. Click "Book Appointment" on desired teacher
6. Select date and time from calendar
7. Provide reason (minimum 10 words)
8. Submit request and wait for approval

## PWA Considerations

### Offline Support
- All components handle loading states gracefully
- Data is cached locally where possible
- Error messages guide users when offline

### Mobile Optimization
- Responsive design for all screen sizes
- Touch-friendly calendar and time slot selection
- Fixed header in booking form for better UX
- Scrollable content within modal

### Performance
- Lazy loading of appointment data
- Efficient Firestore queries with proper indexes
- Memoized calculations for time slots
- Real-time updates only for critical data

## Future Enhancements

1. **Notifications**
   - Push notifications for appointment approvals/rejections
   - Email notifications to teachers for new requests
   - Reminders before scheduled appointments

2. **Calendar Integration**
   - Export to Google Calendar/iCal
   - Sync with device calendar

3. **Advanced Features**
   - Recurring availability templates
   - Appointment cancellation by students
   - Rescheduling functionality
   - Video call integration
   - Rating system for completed appointments

4. **Analytics**
   - Most booked teachers
   - Peak appointment times
   - Average approval time
   - Student engagement metrics

## Deployment Checklist

- [x] TypeScript interfaces defined
- [x] Admin UI created
- [x] Student UI created
- [x] Firestore security rules added
- [x] Firestore indexes configured
- [x] Translations added (EN & KH)
- [x] Menu integration completed
- [ ] Test with real data
- [ ] Deploy to production
- [ ] Monitor performance
- [ ] Collect user feedback

## Support

For issues or questions, please contact the development team or create an issue in the project repository.
