"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { useAuth } from "../../../_hooks/use-auth";
import Icon from "../../../_components/Icon";
import { mdiAccountCircle } from "@mdi/js";

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
      {/* Desktop Version - Clean with subtle styling */}
      {!isMobile && (
        <div className="flex items-center px-3 py-2">
          <div className="flex items-center space-x-3 bg-gray-50 dark:bg-slate-700/50 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700/70 transition-colors duration-200 cursor-pointer">
            {/* Avatar with subtle background */}
            <div className="relative">
              <div className="p-1 bg-gray-200 dark:bg-slate-600 rounded-full">
                <Icon
                  path={mdiAccountCircle}
                  size={18}
                  className="text-gray-600 dark:text-gray-400"
                />
              </div>
              {/* Small online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-white dark:border-slate-700"></div>
            </div>

            {/* User info */}
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {displayName}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Administrator
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Version - Clean with subtle styling */}
      {isMobile && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-slate-700/30">
          <div className="flex items-center space-x-3 bg-white dark:bg-slate-600/50 px-3 py-2 rounded-lg">
            {/* Avatar with subtle background */}
            <div className="relative">
              <div className="p-1.5 bg-gray-200 dark:bg-slate-500 rounded-full">
                <Icon
                  path={mdiAccountCircle}
                  size={20}
                  className="text-gray-600 dark:text-gray-400"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white dark:border-slate-600"></div>
            </div>

            {/* User info */}
            <div className="flex-1">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {displayName}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Administrator
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDisplay;
