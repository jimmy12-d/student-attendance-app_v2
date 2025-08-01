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
  school?: string; // School
  motherName?: string; // Mother's Name
  motherPhone?: string; // Mother's Phone
  fatherName?: string; // Father's Name
  fatherPhone?: string; // Father's Phone
  photoUrl?: string; // Photo URL
  lastPaymentMonth?: string; // e.g., "YYYY-MM"
  discount?: number; // Scholarship amount in dollars (stored as discount field for backward compatibility)
  note?: string; // Admin note for the student
  warning?: boolean; // Warning flag for problematic students
  createdAt?: Timestamp | Date; // Firestore timestamp or Date object
  gracePeriodMinutes?: number; // Optional, as it wasn't in the display list
}

export interface PermissionRecord {
  id: string; // Firestore document ID
  studentId: string;
  studentName: string;
  permissionStartDate: string; // "YYYY-MM-DD"
  permissionEndDate: string;   // "YYYY-MM-DD"
  reason: string;
  details?: string;
  status: 'pending' | 'approved' | 'rejected';
  requestDate: Timestamp;
  reviewedBy?: string;
  reviewedAt?: Timestamp;
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

// Keep these interfaces here as they are specific to this component's view model
export interface DailyStatusInfo {
  date: string;
  status?: "Present" | "Late" | "Absent" | "Permission" | "Not Applicable (Holiday/Weekend)" | "No School" |"Not Yet Enrolled" | "Pending" | "Unknown" | "Absent (Config Missing)";
  time?: string;
}