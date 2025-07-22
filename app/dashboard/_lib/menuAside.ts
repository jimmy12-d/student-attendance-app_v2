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
  mdiQrcodeScan,
  mdiCardAccountDetails,
  mdiCreditCard,
  mdiCashCheck
} from "@mdi/js";
import { MenuAsideItem } from "../../_interfaces";

const menuAside: MenuAsideItem[] = [
  {
    href: "/dashboard",
    icon: mdiMonitor,
    label: "Dashboard",
  },
  {
    label: 'POS',
    icon: mdiCreditCard,
    href: '/dashboard/pos-student',
  },
  {
    label: 'ABA Approvals',
    icon: mdiCashCheck,
    href: '/dashboard/aba-approvals',
  },
  {
    isDivider: true,
  },
  {
    href: "/dashboard/scan-qr",
    icon: mdiMonitor,
    label: "Scan QR",
  },
  {
    href: "/dashboard/students",
    icon: mdiAccountCircle,
    label: "Student",
  },
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
    href: "/dashboard/mock-exams",
    label: "Mock Control",
    icon: mdiNotebookEditOutline,
  },
  {
    href: "/dashboard/approvals",
    label: "Print Approvals",
    icon: mdiFileDocumentCheckOutline,
  },
  {
    href: "/dashboard/notification",
    label: "Notification",
    icon: mdiBellOutline,
  },
];

export default menuAside;
