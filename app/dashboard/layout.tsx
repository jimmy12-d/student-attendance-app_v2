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
    const q = query(collection(db, "attendance"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingAttendanceCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "permissions"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingPermissionsCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "printRequests"), where("status", "==", "pending"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingPrintRequestsCount(snapshot.size);
    });
    return () => unsubscribe();
  }, []);

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
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="relative mx-auto w-20 h-20 mb-6">
            <div className="absolute inset-0 border-4 border-gray-200 dark:border-slate-700 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center animate-pulse">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center space-x-1 mb-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2 animate-pulse">
            Loading Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Preparing your admin interface...
          </p>
        </div>
      </div>
    );
  }

  if (isAuthenticated && isAuthorizedAdmin) {
    // Dynamically update menu with notification counts before rendering
    const updatedMenuAside = menuAside.map(item => {
      if (item.label === "Attendance" && item.menu) {
        const totalPending = pendingAttendanceCount + pendingPermissionsCount;
        const updatedSubMenu = item.menu.map(subItem => {
          if (subItem.href === "/dashboard/record" && pendingAttendanceCount > 0) {
            return { ...subItem, notificationCount: pendingAttendanceCount };
          }
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
          } pt-14 w-screen transition-position lg:w-auto bg-gray-50 dark:bg-slate-800 dark:text-slate-100`}
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
