import {
  mdiAccountCircle,
  mdiMonitor,
  mdiClipboardListOutline,
  mdiMagnify,
  mdiAccountClockOutline,
  mdiFileDocumentCheckOutline,
  mdiBellOutline,
  mdiNotebookEditOutline,
  mdiCalendarClock,
  mdiCamera,
  mdiFaceRecognition,
  mdiPhone,
  mdiCardAccountDetails,
  mdiCreditCard,
  mdiCashCheck,
  mdiChartLine
} from "@mdi/js";
import { MenuAsideItem } from "../../_interfaces";

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
        label: "Attendance Records",
        icon: mdiClipboardListOutline,
      },
      {
        href: "/dashboard/check",
        label: "Check Manually",
        icon: mdiMagnify,
      },
      {
        href: "/dashboard/face-scan",
        label: "Face Scan",
        icon: mdiFaceRecognition,
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
    ]
  },
  {
    href: "/dashboard/payment-summary",
    icon: mdiChartLine,
    label: "Payment Summary",
  },
  {
    href: "/dashboard/mock-exams",
    label: "Mock Control",
    icon: mdiNotebookEditOutline,
  },
  // {
  //   href: "/dashboard/approvals",
  //   label: "Print Approvals",
  //   icon: mdiFileDocumentCheckOutline,
  // },
  // {
  //   href: "/dashboard/notification",
  //   label: "Notification",
  //   icon: mdiBellOutline,
  // },
];

export default menuAside;
