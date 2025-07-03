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
} from "@mdi/js";
import { MenuAsideItem } from "../../_interfaces";

const menuAside: MenuAsideItem[] = [
  {
    href: "/dashboard",
    icon: mdiMonitor,
    label: "Dashboard",
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
    href: "/dashboard/notification",
    label: "Notification",
    icon: mdiBellOutline,
  },
];

export default menuAside;
