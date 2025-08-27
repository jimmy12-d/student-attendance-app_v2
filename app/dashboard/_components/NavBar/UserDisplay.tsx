"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { useAuth } from "../../../_hooks/use-auth";
import Icon from "../../../_components/Icon";
import { mdiAccount, mdiAccountCircle } from "@mdi/js";

interface AuthorizedUser {
  name?: string;
  role: string;
  addedOn?: any;
}

interface UserDisplayProps {
  isMobile?: boolean;
}

const UserDisplay: React.FC<UserDisplayProps> = ({ isMobile = false }) => {
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<AuthorizedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDocument = async () => {
      if (!user?.email || authLoading) {
        setLoading(true);
        return;
      }

      // For rodwelllc@gmail.com, just set loading to false (no need to fetch from DB)
      if (user.email === "rodwelllc@gmail.com") {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Fetch user document from authorizedUsers collection
        const userDocRef = doc(db, "authorizedUsers", user.email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as AuthorizedUser;
          setUserDoc(userData);
        }
      } catch (err) {
        console.error("Error fetching user document:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDocument();
  }, [user, authLoading]);

  // Don't render anything when loading or no user
  if (authLoading || loading || !user?.email) {
    return null;
  }

  // Get display name with fallbacks
  const displayName = user.email === "rodwelllc@gmail.com" 
    ? "Admin" 
    : userDoc?.name || user.displayName || user.email.split('@')[0];

  return (
    <>
      {/* Desktop Version */}
      {!isMobile && (
        <div className="hidden lg:flex items-center px-3 py-2 text-sm">
          <div className="group flex items-center space-x-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-3 py-1.5 rounded-full border border-blue-200/50 dark:border-blue-700/50 shadow-sm hover:shadow-md hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/30 dark:hover:to-indigo-900/30 transition-all duration-200">
            <div className="p-1 bg-blue-100 dark:bg-blue-900/40 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-900/60 transition-colors duration-200">
              <Icon 
                path={mdiAccountCircle} 
                size={20} 
                className="text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors duration-200" 
              />
            </div>
            <span className="font-medium text-blue-800 dark:text-blue-200 whitespace-nowrap group-hover:text-blue-900 dark:group-hover:text-blue-100 transition-colors duration-200">
              {displayName}
            </span>
            <div className="w-2 h-2 bg-green-400 rounded-full opacity-75 animate-pulse"></div>
          </div>
        </div>
      )}

      {/* Mobile Version */}
      {isMobile && (
        <div className="lg:hidden px-3 py-2 border-b border-gray-200 dark:border-gray-600">
          <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-4 py-3 rounded-lg border border-blue-200/50 dark:border-blue-700/50">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-full">
              <Icon 
                path={mdiAccountCircle} 
                size={1.1} 
                className="text-blue-600 dark:text-blue-400" 
              />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-blue-800 dark:text-blue-200">
                {displayName}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center space-x-1">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                <span>Online</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDisplay;
