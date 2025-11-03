import {
  mdiAccountCircle,
  mdiMonitor,
  mdiClipboardListOutline,
  mdiAccountClockOutline,
  mdiFileDocumentCheckOutline,
  mdiNotebookEditOutline,
  mdiCalendarClock,
  mdiFaceRecognition,
  mdiCreditCard,
  mdiChartLine,
  mdiAccountPlus,
  mdiStar,
  mdiBellOutline,
  mdiFormSelect,
  mdiAccountTie
} from "@mdi/js";
import { MenuAsideItem } from "../../_interfaces";

const customChartIcon = "M5.5 18C5.5 17.7239 5.72386 17.5 6 17.5H18C18.2761 17.5 18.5 17.7239 18.5 18C18.2761 18.5 18 18.5H6C5.72386 18.5 5.5 18.2761 5.5 18Z M6.5 11.5 L9.5 11.5 L9.5 18.5 L6.5 18.5 Z M10.5 5.5 L13.5 5.5 L13.5 18.5 L10.5 18.5 Z M14.5 8.5 L17.5 8.5 L17.5 18.5 L14.5 18.5 Z";

const menuAside: MenuAsideItem[] = [
  {
    href: "/dashboard",
    icon: mdiMonitor,
    label: "Dashboard",
  },
  {
    href: "/dashboard/students",
    icon: mdiAccountCircle,
    label: "Student",
  },
  {
    href: "/dashboard/pos-student",
    icon: mdiCreditCard,
    label: "POS",
  },
  {
    isDivider: true,
    label: "",
  },
  // {
  //   label: 'ABA Approvals',
  //   icon: mdiCashCheck,
  //   href: '/dashboard/aba-approvals',
  // },
  {
    label: "Attendance",
    icon: mdiCalendarClock,
    menu: [
      {
        href: "/dashboard/record",
        label: "Records",
        icon: mdiClipboardListOutline,
      },
      // {
      //   href: "/dashboard/check",
      //   label: "Check Manually",
      //   icon: mdiMagnify,
      // },
      {
        href: "/dashboard/face-scan-faceapi",
        label: "Face Scanner",
        icon: mdiFaceRecognition,
      },
      {
        href: "/dashboard/face-enrollment",
        label: "Face Enrollment",
        icon: mdiAccountPlus,
      },
      {
        href: "/dashboard/permission",
        label: "Permission",
        icon: mdiFileDocumentCheckOutline,
      },
      {
        href: "/dashboard/manage-excuses",
        label: "Late Permission",
        icon: mdiAccountClockOutline,
      },
      {
        href: "/dashboard/attendance-score",
        label: "Attendance Score",
        icon: customChartIcon,
      },
    ]
  },
  {
    label: "Academic",
    icon: mdiNotebookEditOutline,
    menu: [
      {
        href: "/dashboard/class-management",
        label: "Class Management",
        icon: mdiAccountCircle,
      },
      {
        href: "/dashboard/teacher-management",
        label: "Teacher Management",
        icon: mdiAccountTie,
      },
      {
        href: "/dashboard/mock-exams",
        label: "Mock Control",
        icon: mdiClipboardListOutline,
      },
      {
        href: "/dashboard/mock-results",
        label: "Result",
        icon: mdiChartLine,
      },
      {
        href: "/dashboard/stars",
        label: "Star Management",
        icon: mdiStar,
      },
      {
        href: "/dashboard/events",
        label: "Events",
        icon: mdiBellOutline,
      },
    ]
  },
  // {
  //   href: "/dashboard/approvals",
  //   label: "Print Approvals",
  //   icon: mdiFileDocumentCheckOutline,
  // },
];

export default menuAside;
