import { Timestamp } from "firebase/firestore";

export type QuestionType = 'short_answer' | 'paragraph' | 'multiple_choice' | 'checkboxes' | 'dropdown' | 'linear_scale';

export type FormType = 'class_register' | 'mock_register' | 'event' | 'survey' | 'feedback' | 'general';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface QuestionOption {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  type: QuestionType;
  required: boolean;
  options?: QuestionOption[]; // For multiple_choice, checkboxes, dropdown
  minScale?: number; // For linear_scale
  maxScale?: number; // For linear_scale
  minLabel?: string; // For linear_scale
  maxLabel?: string; // For linear_scale
  targetClassTypes?: string[]; // Class types that should see this question (empty/undefined = all)
}

export interface Form {
  id: string;
  title: string;
  description: string;
  formType: FormType; // Type of form (class register, mock register, event, etc.)
  deadline: Timestamp | Date;
  createdAt: Timestamp | Date;
  updatedAt: Timestamp | Date;
  createdBy: string; // Admin UID
  questions: Question[];
  isActive: boolean;
  maxResponses?: number; // Optional limit on number of responses (null/undefined = unlimited)
  requiresApproval?: boolean; // Whether admin needs to approve/reject each response
  targetClassTypes?: string[]; // Class types that can see this form (empty/undefined = all)
  submittedBy?: string[]; // Array of student UIDs who have submitted (for tracking)
  targetAudience?: 'all' | 'specific_class'; // Future enhancement
  targetClasses?: string[]; // Future enhancement
}

export interface FormAnswer {
  questionId: string;
  answer: string | string[]; // string for text/single choice, string[] for checkboxes
}

export interface FormResponse {
  id: string;
  formId: string;
  studentId: string;
  studentName: string;
  studentUid: string;
  answers: FormAnswer[];
  submittedAt: Timestamp | Date;
  class?: string;
  shift?: string;
  classType?: string; // Student's class type
  approvalStatus?: ApprovalStatus; // For forms that require approval
  approvedBy?: string; // Admin UID who approved/rejected
  approvalNote?: string; // Optional note from admin
  approvedAt?: Timestamp | Date; // When the approval decision was made
}

export interface FormWithResponseStatus extends Form {
  hasResponded?: boolean;
  isFull?: boolean;
  responseCount?: number;
  approvalStatus?: ApprovalStatus; // Student's response approval status
}
