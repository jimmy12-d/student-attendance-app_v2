// app/dashboard/layout.tsx
"use client";

import React, { ReactNode, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// Firebase
import { db } from "../../firebase-config";
import { collection, query, where, onSnapshot } from "firebase/firestore";

// Auth Context
import { useAuthContext } from "../_contexts/AuthContext";

// Your existing imports
import { mdiForwardburger, mdiBackburger, mdiMenu, mdiTimerSand } from "@mdi/js";
import menuAside from "./_lib/menuAside";
import menuNavBar from "./_lib/menuNavBar";
import Icon from "../_components/Icon";
import NavBar from "./_components/NavBar";
import NavBarItemPlain from "./_components/NavBar/Item/Plain";
import AsideMenu from "./_components/AsideMenu";
import FooterBar from "./_components/FooterBar";
import DashboardLoading from "../_components/DashboardLoading";
import { getInactivitySettings, getTimeoutInMs, formatTimeout, type InactivitySettings } from "../_utils/inactivitySettings";

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

  // State for inactivity modal
  const [showInactiveModal, setShowInactiveModal] = useState(false);
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [inactivitySettings, setInactivitySettings] = useState<InactivitySettings>(() => getInactivitySettings());

  // State for keyboard shortcuts help dialog
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setShowInactiveModal(false);
    
    // Only set timer if inactivity detection is enabled
    const timeoutMs = getTimeoutInMs(inactivitySettings);
    if (timeoutMs > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowInactiveModal(true);
      }, timeoutMs);
    }
  };

  // Handler for when settings change
  const handleInactivitySettingsChange = (newSettings: InactivitySettings) => {
    setInactivitySettings(newSettings);
    // Reset timer with new settings
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    setShowInactiveModal(false);
    
    const timeoutMs = getTimeoutInMs(newSettings);
    if (timeoutMs > 0) {
      inactivityTimerRef.current = setTimeout(() => {
        setShowInactiveModal(true);
      }, timeoutMs);
    }
  };

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

  // Inactivity detection
  useEffect(() => {
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Set initial timer
    resetInactivityTimer();

    // Add event listeners for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Cleanup
    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [inactivitySettings]); // Re-run when settings change

  // Keyboard shortcuts navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if Ctrl key is pressed
      if (!event.ctrlKey) return;

      const key = event.key.toLowerCase();

      console.log('Key pressed:', key, 'Ctrl pressed:', event.ctrlKey);

      // Prevent default browser behavior for our shortcuts
      if (['d', 'r', 'p', 's', 'e', 'h', '?'].includes(key)) {
        event.preventDefault();
      }

      switch (key) {
        case 'd':
          router.push('/dashboard');
          break;
        case 'r':
          router.push('/dashboard/record');
          break;
        case 'p':
          router.push('/dashboard/pos-student');
          break;
        case 's':
          router.push('/dashboard/students');
          break;
        case 'e':
          router.push('/dashboard/events');
          break;
        case 'h':
          setShowHelpDialog(true);
          console.log('Help dialog opened via keyboard shortcut');
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [router]);
  
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
            onInactivitySettingsChange={handleInactivitySettingsChange}
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

        {/* Inactive Screen Modal */}
        {showInactiveModal && inactivitySettings.enabled && (
          <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-lg flex items-center justify-center z-110">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-md w-full mx-4 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon path={mdiTimerSand} size={32} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Session Inactive
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  You have been inactive for {formatTimeout(inactivitySettings.timeoutSeconds)}. Please interact with the page to continue.
                </p>
              </div>
              <button
                onClick={() => resetInactivityTimer()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
              >
                I'm Back
              </button>
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts Help Dialog */}
        {showHelpDialog && (
          <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] flex items-center justify-center z-[120]">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 max-w-lg w-full mx-4">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">
                  Keyboard Shortcuts
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300">Dashboard</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                      Ctrl + D
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300">Record Page</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                      Ctrl + R
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300">POS Page</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                      Ctrl + P
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300">Student Page</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                      Ctrl + S
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-600">
                    <span className="text-gray-700 dark:text-gray-300">Event Page</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                      Ctrl + E
                    </kbd>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-700 dark:text-gray-300">Show Help</span>
                    <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm font-mono">
                      Ctrl + H
                    </kbd>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setShowHelpDialog(false)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
