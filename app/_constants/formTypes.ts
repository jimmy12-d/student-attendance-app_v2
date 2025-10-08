import { 
  mdiClipboardTextClockOutline, 
  mdiSchool, 
  mdiCalendarStar, 
  mdiPoll, 
  mdiCommentQuote, 
  mdiFormSelect 
} from "@mdi/js";
import { FormType } from "@/app/_interfaces/forms";

export interface FormTypeConfig {
  value: FormType;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  darkBgColor: string;
  description: string;
}

export const FORM_TYPES: FormTypeConfig[] = [
  {
    value: 'class_register',
    label: 'Class Register',
    icon: mdiClipboardTextClockOutline,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50',
    darkBgColor: 'dark:bg-blue-900/20',
    description: 'Daily attendance and class registration'
  },
  {
    value: 'mock_register',
    label: 'Mock Exam Register',
    icon: mdiSchool,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50',
    darkBgColor: 'dark:bg-purple-900/20',
    description: 'Mock exam attendance registration'
  },
  {
    value: 'event',
    label: 'Event',
    icon: mdiCalendarStar,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50',
    darkBgColor: 'dark:bg-green-900/20',
    description: 'Event registration and participation'
  },
  {
    value: 'survey',
    label: 'Survey',
    icon: mdiPoll,
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-50',
    darkBgColor: 'dark:bg-orange-900/20',
    description: 'Student surveys and polls'
  },
  {
    value: 'feedback',
    label: 'Feedback',
    icon: mdiCommentQuote,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50',
    darkBgColor: 'dark:bg-pink-900/20',
    description: 'Feedback and suggestions'
  },
  {
    value: 'general',
    label: 'General',
    icon: mdiFormSelect,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50',
    darkBgColor: 'dark:bg-gray-900/20',
    description: 'General purpose form'
  }
];

export const getFormTypeConfig = (type: FormType): FormTypeConfig => {
  return FORM_TYPES.find(t => t.value === type) || FORM_TYPES[FORM_TYPES.length - 1];
};
