// app/dashboard/layout.tsx
"use client";

import React, { ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

// Firebase
import { db } from "../../firebase-config";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// Redux
import { useAppSelector } from "../_stores/hooks";

// Auth Context
import { useAuthContext } from "../_contexts/AuthContext";

// Your existing imports
import { mdiForwardburger, mdiBackburger, mdiMenu } from "@mdi/js";
import menuAside from "./_lib/menuAside";
import menuNavBar from "./_lib/menuNavBar";
import Icon from "../_components/Icon";
import NavBar from "./_components/NavBar";
import NavBarItemPlain from "./_components/NavBar/Item/Plain";
import AsideMenu from "./_components/AsideMenu";
import FooterBar from "./_components/FooterBar";
import DashboardLoading from "../_components/DashboardLoading";

type Props = {
  children: ReactNode;
};

export default function LayoutAuthenticated({ children }: Props) {
  const [isAsideMobileExpanded, setIsAsideMobileExpanded] = useState(false);
  const [isAsideLgActive, setIsAsideLgActive] = useState(false);

  // --- AUTHENTICATION & NOTIFICATION STATES ---
  const router = useRouter();
  const pathname = usePathname();
  
  // Use centralized auth context
  const { isAuthenticated, isAuthorizedAdmin, isLoading: isAuthLoading } = useAuthContext();
  
  // States for notification counts
  const [pendingAttendanceCount, setPendingAttendanceCount] = useState(0);
  const [pendingPermissionsCount, setPendingPermissionsCount] = useState(0);
  const [pendingPrintRequestsCount, setPendingPrintRequestsCount] = useState(0);
  const [pendingAbaApprovalsCount, setPendingAbaApprovalsCount] = useState(0);

  const handleRouteChange = () => {
    setIsAsideMobileExpanded(false);
    setIsAsideLgActive(false);
  };

  // --- DATA FETCHING EFFECTS ---

  // Firestore listeners for real-time counts
  useEffect(() => {
    // Only set up the listener if user is authenticated and authorized
    if (!isAuthenticated || !isAuthorizedAdmin) return;
    
    const q = query(collection(db, "attendance"), where("status", "==", "requested"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingAttendanceCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching attendance count:", error);
      setPendingAttendanceCount(0); // Reset to 0 on error
    });
    return () => unsubscribe();
  }, [isAuthenticated, isAuthorizedAdmin]);

  useEffect(() => {
    // Only set up the listener if user is authenticated and authorized
    if (!isAuthenticated || !isAuthorizedAdmin) return;
    
    const q = query(collection(db, "permissions"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingPermissionsCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching permissions count:", error);
      setPendingPermissionsCount(0); // Reset to 0 on error
    });
    return () => unsubscribe();
  }, [isAuthenticated, isAuthorizedAdmin]);

  useEffect(() => {
    // Only set up the listener if user is authenticated and authorized
    if (!isAuthenticated || !isAuthorizedAdmin) return;
    
    const q = query(collection(db, "printRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingPrintRequestsCount(snapshot.size);
    }, (error) => {
      console.error("Error fetching print requests count:", error);
      setPendingPrintRequestsCount(0); // Reset to 0 on error
    });
    return () => unsubscribe();
  }, [isAuthenticated, isAuthorizedAdmin]);

  // Polling for ABA pending count from the dedicated API endpoint
  // useEffect(() => {
  //   const fetchAbaCount = async () => {
  //     try {
  //       const response = await fetch('/api/aba/pending-count');
  //       if (response.ok) {
  //         const data = await response.json();
  //         setPendingAbaApprovalsCount(data.pendingCount || 0);
  //       }
  //     } catch (error) {
  //       console.error("Failed to fetch ABA pending count:", error);
  //       setPendingAbaApprovalsCount(0);
  //     }
  //   };

  //   fetchAbaCount(); // Fetch on initial load
  //   const interval = setInterval(fetchAbaCount, 60000); // Re-fetch every 60 seconds

  //   return () => clearInterval(interval); // Cleanup on unmount
  // }, []);

  // Redirect unauthorized users
  useEffect(() => {
    if (!isAuthLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (!isAuthorizedAdmin) {
        // User is authenticated but not authorized for admin access
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isAuthorizedAdmin, isAuthLoading, router]);
  
  // --- RENDER LOGIC ---

  const layoutAsidePadding = "xl:pl-60";

  if (isAuthLoading) {
    return <DashboardLoading />;
  }

  if (isAuthenticated && isAuthorizedAdmin) {
    // Dynamically update menu with notification counts before rendering
    const updatedMenuAside = menuAside.map(item => {
      if (item.label === "Attendance" && item.menu) {
        const totalPending = pendingPermissionsCount;
        const updatedSubMenu = item.menu.map(subItem => {
          if (subItem.href === "/dashboard/permission" && pendingPermissionsCount > 0) {
            return { ...subItem, notificationCount: pendingPermissionsCount };
          }
          return subItem;
        });
        return totalPending > 0
          ? { ...item, notificationCount: totalPending, menu: updatedSubMenu }
          : { ...item, menu: updatedSubMenu };
      }
      if (item.href === "/dashboard/approvals" && pendingPrintRequestsCount > 0) {
        return { ...item, notificationCount: pendingPrintRequestsCount };
      }
      if (item.href === "/dashboard/aba-approvals" && pendingAbaApprovalsCount > 0) {
        return { ...item, notificationCount: pendingAbaApprovalsCount };
      }
      return item;
    });

    return (
      <div>
        <div
          className={`${layoutAsidePadding} ${
            isAsideMobileExpanded ? "ml-60 lg:ml-0" : ""
          } pt-16 w-screen transition-position lg:w-auto bg-white dark:bg-slate-800 dark:text-slate-100`}
        >
          <NavBar
            menu={menuNavBar}
            className={`${layoutAsidePadding} ${isAsideMobileExpanded ? "ml-60 lg:ml-0" : ""}`}
          >
            <NavBarItemPlain
              display="flex lg:hidden"
              onClick={() => setIsAsideMobileExpanded(!isAsideMobileExpanded)}
            >
              <Icon
                path={isAsideMobileExpanded ? mdiBackburger : mdiForwardburger}
                size="24"
              />
            </NavBarItemPlain>
            <NavBarItemPlain
              display="hidden lg:flex xl:hidden"
              onClick={() => setIsAsideLgActive(true)}
            >
              <Icon path={mdiMenu} size="24" />
            </NavBarItemPlain>
          </NavBar>
          <AsideMenu
            isAsideMobileExpanded={isAsideMobileExpanded}
            isAsideLgActive={isAsideLgActive}
            menu={updatedMenuAside}
            onAsideLgClose={() => setIsAsideLgActive(false)}
            onRouteChange={handleRouteChange}
          />
          {children}
          <FooterBar>
            Get more with{` `}
            <a
              href="https://tailwind-react.justboil.me/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600"
            >
              Premium version
            </a>
          </FooterBar>
        </div>
      </div>
    );
  }

  return null;
}
