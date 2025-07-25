// app/dashboard/layout.tsx
"use client"; // Already a client component, which is good

import React, { ReactNode, useState, useEffect } from "react"; // Added useEffect
import { useRouter, usePathname } from "next/navigation"; // For redirection and current path

// Firebase Authentication
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../../firebase-config"; // Adjust path to your firebase-config.js
import { collection, query, where, onSnapshot } from "firebase/firestore";

// Redux
import { useAppDispatch } from "../_stores/hooks"; // Assuming this is your typed dispatch hook
import { setUser } from "../_stores/mainSlice"; // Your setUser action

// Your existing imports
import { mdiForwardburger, mdiBackburger, mdiMenu } from "@mdi/js";
import menuAside from "./_lib/menuAside";
import menuNavBar from "./_lib/menuNavBar";
import Icon from "../_components/Icon";
import NavBar from "./_components/NavBar";
import NavBarItemPlain from "./_components/NavBar/Item/Plain";
import AsideMenu from "./_components/AsideMenu";
import FooterBar from "./_components/FooterBar";
import FormField from "../_components/FormField";
import { Field, Form, Formik } from "formik";
//import Spinner from "../_components/Spinner"; // Optional: for loading state

type Props = {
  children: ReactNode;
};

export default function LayoutAuthenticated({ children }: Props) {
  const [isAsideMobileExpanded, setIsAsideMobileExpanded] = useState(false);
  const [isAsideLgActive, setIsAsideLgActive] = useState(false);

  // --- NEW AUTHENTICATION STATES AND HOOKS ---
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname(); // Get current path

  const [isAuthLoading, setIsAuthLoading] = useState(true); // True while checking auth status
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track if user is authenticated
  const [pendingAttendanceCount, setPendingAttendanceCount] = useState(0);
  const [pendingPermissionsCount, setPendingPermissionsCount] = useState(0);
  const [pendingPrintRequestsCount, setPendingPrintRequestsCount] = useState(0);
  // --- END OF NEW AUTHENTICATION STATES AND HOOKS ---

  const handleRouteChange = () => {
    setIsAsideMobileExpanded(false);
    setIsAsideLgActive(false);
  };

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

  // --- NEW useEffect for Firebase Auth State Changes ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // User is signed in
        dispatch(
          setUser({ // Dispatch to Redux
            name: user.displayName,
            email: user.email,
            avatar: user.photoURL,
            uid: user.uid,
          })
        );
        setIsAuthenticated(true);
      } else {
        // User is signed out
        dispatch(setUser(null)); // Clear user in Redux
        setIsAuthenticated(false);
        // Only redirect if actually on a dashboard page and not already going to login
        if (pathname.startsWith('/dashboard')) {
          router.replace("/login"); // Use replace to prevent back button to protected route
        }
      }
      setIsAuthLoading(false); // Finished checking auth state
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [dispatch, router, pathname]); // Dependencies for the effect
  // --- END OF NEW useEffect ---

  const layoutAsidePadding = "xl:pl-60";

  // --- LOADING STATE ---
  if (isAuthLoading) {
    // You can replace this with a more sophisticated loading spinner component
    return (
      <div className="flex justify-center items-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // --- AUTHENTICATED CONTENT ---
  // If authenticated, render the dashboard layout
  if (isAuthenticated) {

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
      return item;
    });

    return (
      <div className={`overflow-hidden lg:overflow-visible`}>
        <div
          className={`${layoutAsidePadding} ${
            isAsideMobileExpanded ? "ml-60 lg:ml-0" : ""
          } pt-14 min-h-screen w-screen transition-position lg:w-auto bg-gray-50 dark:bg-slate-800 dark:text-slate-100`}
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
            onRouteChange={handleRouteChange} // This prop should now be fine
          />
          {children} {/* This is where your actual dashboard page content goes */}
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

  // Fallback if not authenticated and not loading (e.g. if on a path that somehow uses this layout but isn't /dashboard/*)
  // Or if the redirect to /login is still processing.
  return null; 
}