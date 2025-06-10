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
  menu?: MenuAsideItem[];
  onClick?: (item: MenuAsideItem) => void;
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
  | "void";

export type BgKey = "purplePink" | "pinkRed";

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
  fullName: string;
  phone?: string; // Optional, as it wasn't in the display list
  class: string;
  shift: string;
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

// Keep these interfaces here as they are specific to this component's view model
export interface DailyStatusInfo {
  date: string;
  status?: "Present" | "Late" | "Absent" | "Permission" | "Not Applicable (Holiday/Weekend)" | "No School" |"Not Yet Enrolled" | "Pending" | "Unknown" | "Absent (Config Missing)";
  time?: string;
}