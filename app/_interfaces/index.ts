import { Timestamp } from "firebase/firestore"; // Import Timestamp

export type UserPayloadObject = {
  name: string;
  email: string;
};

export type MenuAsideItem = {
  label: string;
  icon?: string;
  href?: string;
  target?: string;
  color?: ColorButtonKey;
  isLogout?: boolean;
  isDivider?: boolean;
  menu?: MenuAsideItem[];
  onClick?: (item: MenuAsideItem) => void;
  notificationCount?: number; // Add this line
  iconSize?: string | number;
};

export type MenuNavBarItem = {
  label?: string;
  icon?: string;
  href?: string;
  target?: string;
  isDivider?: boolean;
  isLogout?: boolean;
  isDesktopNoLabel?: boolean;
  isToggleLightDark?: boolean;
  isCurrentUser?: boolean;
  menu?: MenuNavBarItem[];
};

export type ColorKey =
  | "white"
  | "light"
  | "contrast"
  | "success"
  | "danger"
  | "warning"
  | "info";

export type ColorButtonKey =
  | "white"
  | "whiteDark"
  | "lightDark"
  | "contrast"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "void"
  | "glowing-purple"
  | "glowing-red"
  | "facebook"
  | "outline"
  | "company-purple";

export type BgKey = "purplePink" | "pinkRed" | "white";

export type TrendType =
  | "up"
  | "down"
  | "success"
  | "danger"
  | "warning"
  | "info";

export type WarningStudent = {
  id: number;
  login: string;
  name: string;
  company: string;
  city: string;
  progress: number;
  created: string;
  created_mm_dd_yyyy: string;
};

export type UserForm = {
  name: string | null;
  email: string | null;
};

export interface Student {
  id: string; // Firestore document ID
  studentId: string;
  fullName: string;
  nameKhmer?: string; // Optional Khmer name
  phone?: string; // Optional, as it wasn't in the display list
  grade?: string; // Grade level (from classTypes collection)
  class: string;
  classType?: string; // Class type from classes collection
  shift: string;
  ay?: string; // Academic Year
  scheduleType?: string; // Schedule Type
  lastFlipFlopUpdate?: Timestamp | Date; // When flip-flop schedule was last updated
  school?: string; // School
  motherName?: string; // Mother's Name
  motherPhone?: string; // Mother's Phone
  fatherName?: string; // Father's Name
  fatherPhone?: string; // Father's Phone
  dateOfBirth?: string; // Date of Birth in "YYYY-MM-DD" format
  photoUrl?: string; // Photo URL
  faceDescriptor?: number[]; // Stored as array of numbers (Float32Array serialized)
  lastPaymentMonth?: string; // e.g., "YYYY-MM"
  discount?: number; // Discount amount in dollars
  note?: string; // Admin note for the student
  warning?: boolean; // Warning flag for problematic students
  onWaitlist?: boolean; // Waitlist flag - true if student is on waitlist
  waitlistDate?: Date | Timestamp; // When the student was added to waitlist
  waitlistReason?: string; // Reason for being on waitlist
  dropped?: boolean; // Soft delete flag - true if student is dropped
  droppedAt?: Date | Timestamp; // When the student was dropped
  restoredAt?: Date | Timestamp; // When the student was restored (if applicable)
  onBreak?: boolean; // Flag to indicate if student is on break
  breakStartDate?: Date | Timestamp; // When the student went on break
  expectedReturnMonth?: string; // Expected return month in "YYYY-MM" format
  breakReason?: string; // Reason for taking the break
  createdAt?: Timestamp | Date; // Firestore timestamp or Date object
  gracePeriodMinutes?: number; // Optional, as it wasn't in the display list
  hasTelegramUsername?: boolean; // Whether the student has a Telegram username
  telegramUsername?: string; // The student's Telegram username
  // Telegram bot registration fields
  registrationToken?: string; // One-time registration token for QR code
  tokenGeneratedAt?: Timestamp | Date; // When the token was generated
  tokenExpiresAt?: Timestamp | Date; // When the token expires (7 days from generation)
  chatId?: string; // Telegram chat ID (filled when student registers)
  passwordHash?: string; // bcrypt hashed password (filled when student registers)
  authUid?: string; // Firebase Auth UID for legitimate authentication
  telegramAuthEnabled?: boolean; // Flag indicating Telegram auth is set up
  registeredAt?: Timestamp | Date; // When student registered via Telegram
  username?: string; // Username for login (for self-registered students)
  registrationStatus?: 'pending' | 'approved' | 'rejected'; // Registration status for self-registrations
  registrationSource?: 'telegram' | 'self-registration' | 'admin'; // Source of registration
  isActive?: boolean; // Whether account is active (approved by admin)
  lastLoginAt?: Timestamp | Date; // Last login timestamp
  passwordUpdatedAt?: Timestamp | Date; // When password was last changed
  migratedToPhoneAuth?: Timestamp | Date; // When migrated from username to phone auth
  
  // Flip-flop tracking
  flipFlopHistory?: Record<string, {
    previousShift: string;
    newShift: string;
    updatedAt: Timestamp | Date;
    updatedBy: string;
  }>; // History of flip-flop changes by month (key: "YYYY_MM")
  // Flip preview flag for UI (not stored in database)
  isFlipPreview?: boolean;
  
  // BP Class flag - true if student is in the special 12BP class
  inBPClass?: boolean;
  
  // Notification system version tracking (from fcmTokens collection)
  notificationVersion?: string; // Service worker version (e.g., 'v2.2.0-android-fix')
  notificationPlatform?: 'iOS' | 'Android' | 'other'; // Platform from FCM token
  notificationLastUpdated?: Timestamp | Date; // When FCM token was last updated
}

// Notification Log Interface - Tracks delivery of Telegram notifications to parents
export interface NotificationLog {
  chatId: string; // Telegram chat ID of the parent
  parentName?: string; // Name of the parent (if available)
  sentAt: Timestamp; // When the notification was sent
  success: boolean; // Whether the notification was successfully delivered
  errorMessage?: string; // Error message if delivery failed
  errorCode?: number; // Telegram API error code if applicable
  deactivated?: boolean; // Whether the parent notification was deactivated due to error
}

export interface PermissionRecord {
  id: string; // Firestore document ID
  studentId: string;
  studentName: string;
  studentClass?: string; // Added from actual data
  studentShift?: string; // Added from actual data
  permissionStartDate: string; // "YYYY-MM-DD"
  permissionEndDate: string;   // "YYYY-MM-DD"
  duration?: number; // Added from actual data
  reason: string;
  // Optional translation key for the reason (preferred). If present, UI will
  // use this key to look up translations under `student.attendance.reasons`.
  reasonKey?: string;
  details?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp; // Changed from requestDate to match actual data
  requestedBy?: string; // Added from actual data
  reviewedBy?: string;
  reviewedAt?: Timestamp;
  notificationLogs?: NotificationLog[]; // Array of notification delivery logs
  authUid?: string; // Firebase Auth UID of the student
}

// Contact Task Management Interface - For tracking follow-ups with students
export interface ContactTask {
  id: string; // Firestore document ID
  studentId: string;
  studentName: string;
  class: string;
  shift: string;
  taskType: 'consecutive' | 'warning'; // Type of issue requiring follow-up
  reason: string; // Detailed reason for the task (admin fills in manually)
  assignedTo: 'Jimmy' | 'Jon' | 'Jasper' | 'Jason' | ''; // Assigned staff member
  status: 'unresolved' | 'contacted' | 'resolved'; // Current status of the task
  createdAt: Timestamp | Date; // When the task was created
  updatedAt: Timestamp | Date; // When the task was last updated
  completedAt?: Timestamp | Date; // When the task was marked as resolved
  notes?: string; // Additional notes about the task
  consecutiveDays?: number; // Number of consecutive absence days (for consecutive type)
  lastAbsentDate?: string; // Last date of absence (YYYY-MM-DD)
  autoGenerated?: boolean; // Whether task was auto-generated by system
}

// Leave Early Request System Interface
export interface LeaveEarlyRequest {
  id: string; // Firestore document ID
  studentId: string;
  studentName?: string; // Added for display purposes
  studentClass?: string; // Added for display purposes
  studentShift?: string; // Added for display purposes
  authUid?: string; // Firebase Auth UID of the student
  date?: string; // Date of the leave early request (YYYY-MM-DD)
  shift?: string; // Shift of the student
  leaveTime: string; // Time they want to leave early (e.g., "14:30")
  reason: string;
  details?: string; // Additional details
  adminNote?: string; // Admin's note after review
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp;
  requestedBy?: string; // User who requested it
  reviewedBy?: string; // Admin who reviewed it
  reviewedAt?: Timestamp; // When it was reviewed
  notificationLogs?: NotificationLog[]; // Array of notification delivery logs
}

// Absent Follow-up System Interface
export type AbsentStatus = 'Absent' | 'Contacted' | 'Waiting for Response' | 'Resolved';

export interface AbsentFollowUp {
  id?: string; // Firestore document ID
  studentId: string;
  studentName: string;
  date: string; // YYYY-MM-DD
  status: AbsentStatus;
  notes?: string;
  updatedAt: Date | Timestamp;
  updatedBy: string; // Admin identifier
  // Parent notification fields
  parentNotificationStatus?: 'success' | 'failed' | 'pending' | 'no_parent' | null;
  parentNotificationTimestamp?: Date | Timestamp | null;
  parentNotificationsSent?: number;
  parentNotificationError?: string | null;
}

// Absent Parent Notification Settings
export interface AbsentNotificationSettings {
  id?: string; // Document ID (usually 'default')
  morningTriggerTime: string; // HH:mm format (e.g., "09:00")
  afternoonTriggerTime: string; // HH:mm format (e.g., "14:00")
  eveningTriggerTime: string; // HH:mm format (e.g., "18:00")
  enabled: boolean;
  updatedAt?: Date | Timestamp;
  updatedBy?: string;
}

// Print Request System Interfaces
export interface Teacher {
  id: string; // Firestore document ID
  fullName: string;
  subject: string;
  email?: string;
  createdAt?: Timestamp;
}

export interface Document {
  id: string; // Firestore document ID
  fileName: string;
  pdfUrl: string; // URL from Firebase Storage
  uploadedAt: Timestamp;
  pageCount?: number;
  subject: string;
  chapter: string;
  lessonNumber: string;
  description?: string;
  teacherName: string; // Teacher's full name
  teacherId: string; // Reference to teacher document ID
}

export interface PrintRequest {
  id: string; // Firestore document ID
  documentId: string; // Reference to documents collection
  pdfUrl: string; // Direct URL for easy access
  amountToPrint: number;
  isMultiplePages: boolean;
  isBothSides: boolean;
  customPageRange?: string; // For selecting specific pages when isMultiplePages is true
  effectivePageCount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'printing' | 'printed';
  requestedAt: Timestamp;
  requestedBy?: string; // User ID or name
  approvedBy?: string;
  approvedAt?: Timestamp;
  errorMessage?: string;
  rejectionReason?: string;
}

// Star Management System Interfaces
export interface StarReward {
  id: string; // Firestore document ID
  name: string; // e.g., "Early Bird Star"
  color: 'white' | 'pink' | 'yellow' | 'orange' | 'blue'; // Color options
  amount: number; // Number of stars awarded
  setLimit: number; // Maximum times this reward can be claimed
  isActive: boolean; // Whether the reward is currently active
  createdAt: Timestamp;
  createdBy: string; // Admin who created it
  updatedAt?: Timestamp;
  updatedBy?: string;
}

// Claimed Star Interface (sub-collection under students)
export interface ClaimedStar {
  id: string; // Firestore document ID
  starRewardId: string; // Reference to starRewards collection
  starRewardName: string; // For easy display
  starRewardColor: 'white' | 'pink' | 'yellow' | 'orange' | 'blue';
  amount: number; // Stars earned
  claimedAt: Timestamp;
  claimedBy: string; // Admin who granted it
  reason?: string; // Optional reason for granting
}

// Star Request Interface (for student requests)
export interface StarRequest {
  id: string; // Firestore document ID
  studentId: string; // Student document ID
  studentName: string; // Student name for display
  studentClass?: string; // Student class
  studentShift?: string; // Student shift
  authUid: string; // Student auth UID
  starRewardId: string; // Reference to starRewards collection
  starRewardName: string; // Reward name
  starRewardColor: 'white' | 'pink' | 'yellow' | 'orange' | 'blue';
  starRewardAmount: number; // Stars to be earned
  reason?: string; // Optional reason for requesting
  status: 'pending' | 'approved' | 'rejected'; // Request status
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string; // Admin who approved/rejected
  rejectionReason?: string; // Reason for rejection
}

// Student with star totals (for UI display)
export interface StudentWithStars extends Student {
  totalStars: number; // Calculated from claimedStars sub-collection
  claimedStars?: ClaimedStar[]; // Array of claimed stars
}

// Admin Appointment System Interfaces
export interface AdminAvailability {
  id: string; // Firestore document ID
  date: string; // Specific date in YYYY-MM-DD format (e.g., "2025-11-08")
  startTime: string; // Time in HH:mm format (e.g., "15:00")
  endTime: string; // Time in HH:mm format (e.g., "17:00")
  slotDuration: number; // Duration of each slot in minutes (e.g., 15, 30)
  minPriorHours: number; // Minimum hours required before appointment (e.g., 2 means must book at least 2 hours before appointment time)
  isActive: boolean; // Whether this availability is currently active
  createdAt: Timestamp;
  createdBy: string; // Admin who created it
  updatedAt?: Timestamp;
  updatedBy?: string;
}

export interface AppointmentRequest {
  id: string; // Firestore document ID
  studentId: string; // Student document ID
  studentName: string; // Student name for display
  studentClass?: string; // Student class
  studentShift?: string; // Student shift
  authUid: string; // Student auth UID
  availabilityId: string; // Reference to adminAvailability document
  appointmentDate: string; // Date in YYYY-MM-DD format
  appointmentTime: string; // Time in HH:mm format
  duration: number; // Duration in minutes
  reason?: string; // Reason for the meeting (optional)
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'; // Request status
  requestedAt: Timestamp;
  processedAt?: Timestamp;
  processedBy?: string; // Admin who approved/rejected
  rejectionReason?: string; // Reason for rejection
  notificationLogs?: NotificationLog[]; // Array of notification delivery logs
  attendanceStatus?: 'met' | 'no-show'; // Track if student attended the appointment
  attendanceMarkedAt?: Timestamp; // When attendance was marked
  attendanceMarkedBy?: string; // Admin who marked attendance
}

// Helper type for displaying time slots in the calendar
export interface TimeSlot {
  time: string; // HH:mm format
  available: boolean; // Whether the slot is available
  appointmentId?: string; // If booked, the appointment ID
}

// Keep these interfaces here as they are specific to this component's view model
export interface DailyStatusInfo {
  date: string;
  status?: "Present" | "Late" | "Absent" | "Permission" | "No School" | "Not Yet Enrolled" | "Pending" | "Unknown" | "Absent (Config Missing)" | "Send Home";
  time?: string;
}