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
  class: string;
  shift: string;
  ay?: string; // Academic Year
  scheduleType?: string; // Schedule Type
  lastFlipFlopUpdate?: Timestamp | Date; // When flip-flop schedule was last updated
  school?: string; // School
  motherName?: string; // Mother's Name
  motherPhone?: string; // Mother's Phone
  fatherName?: string; // Father's Name
  fatherPhone?: string; // Father's Phone
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
  details?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedAt: Timestamp; // Changed from requestDate to match actual data
  requestedBy?: string; // Added from actual data
  reviewedBy?: string;
  reviewedAt?: Timestamp;
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
  color: 'white' | 'pink' | 'orange' | 'blue'; // Color options
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
  starRewardColor: 'white' | 'pink' | 'orange' | 'blue';
  amount: number; // Stars earned
  claimedAt: Timestamp;
  claimedBy: string; // Admin who granted it
  reason?: string; // Optional reason for granting
}

// Student with star totals (for UI display)
export interface StudentWithStars extends Student {
  totalStars: number; // Calculated from claimedStars sub-collection
  claimedStars?: ClaimedStar[]; // Array of claimed stars
}

// Keep these interfaces here as they are specific to this component's view model
export interface DailyStatusInfo {
  date: string;
  status?: "Present" | "Late" | "Absent" | "Permission" | "No School" | "Not Yet Enrolled" | "Pending" | "Unknown" | "Absent (Config Missing)";
  time?: string;
}