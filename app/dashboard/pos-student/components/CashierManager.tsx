"use client";

import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../firebase-config";
import { useAuth } from "../../../_hooks/use-auth";
import LoadingSpinner from "../../../_components/LoadingSpinner";
import CustomDropdown from "../../students/components/CustomDropdown";
import Icon from "../../../_components/Icon";
import { mdiAccount, mdiAccountCash} from "@mdi/js";

interface CashierManagerProps {
  onCashierSelected: (cashierName: string) => void;
  disabled?: boolean;
}

interface AuthorizedUser {
  name?: string;
  role: string;
  addedOn?: any;
}

const CashierManager: React.FC<CashierManagerProps> = ({ 
  onCashierSelected, 
  disabled = false 
}) => {
  const { user, loading: authLoading } = useAuth();
  const [userDoc, setUserDoc] = useState<AuthorizedUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCashier, setSelectedCashier] = useState<string>("");

  // Dropdown options for rodwelllc@gmail.com
  const dropdownOptions = [
    { value: "Jimmy", label: "Jimmy" },
    { value: "Jasper", label: "Jasper" },
    { value: "Jon", label: "Jon" },
    { value: "Jason", label: "Jason" }
  ];

  useEffect(() => {
    const fetchUserDocument = async () => {
      if (!user?.email || authLoading) {
        setLoading(true);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Fetch user document from authorizedUsers collection
        const userDocRef = doc(db, "authorizedUsers", user.email);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as AuthorizedUser;
          setUserDoc(userData);

          // Handle cashier selection based on user email
          if (user.email === "rodwelllc@gmail.com") {
            // For rodwelllc@gmail.com, don't auto-select, wait for dropdown selection
            setSelectedCashier("");
          } else {
            // For other users, use their name field if available, otherwise fallback to displayName or email
            const cashierName = userData.name || user.displayName || user.email;
            setSelectedCashier(cashierName);
            onCashierSelected(cashierName);
          }
        } else {
          setError("User document not found in authorized users");
        }
      } catch (err) {
        console.error("Error fetching user document:", err);
        setError("Failed to fetch user information");
      } finally {
        setLoading(false);
      }
    };

    fetchUserDocument();
  }, [user, authLoading, onCashierSelected]);

  const handleDropdownChange = (value: string) => {
    setSelectedCashier(value);
    onCashierSelected(value);
  };

  if (authLoading || loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-blue-100 dark:border-gray-600">
        <div className="flex items-center space-x-3">
          <LoadingSpinner size="sm" />
          <div className="flex items-center space-x-2">
            <Icon path={mdiAccount} size={16} className="text-blue-500" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Loading cashier information...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-2">
          <Icon path={mdiAccount} size={0.9} className="text-red-500" />
          <span className="text-red-600 dark:text-red-400 font-medium">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (!user?.email) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
        <div className="flex items-center space-x-2">
          <Icon path={mdiAccount} size={0.9} className="text-red-500" />
          <span className="text-red-600 dark:text-red-400 font-medium">No authenticated user found</span>
        </div>
      </div>
    );
  }

  // If user is rodwelllc@gmail.com, show dropdown
  if (user.email === "rodwelllc@gmail.com") {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 border border-emerald-100 dark:border-gray-600 shadow-sm">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Icon path={mdiAccountCash} size={20} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Cashier Selection</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Select the cashier for this transaction</p>
          </div>
        </div>
        
        <CustomDropdown
          label="Select Cashier"
          value={selectedCashier}
          onChange={handleDropdownChange}
          options={dropdownOptions}
          placeholder="Choose a cashier..."
          disabled={disabled}
          required={true}
          id="cashier-dropdown"
          className="mb-3"
        />

        
        {!selectedCashier && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
            <div className="flex items-center space-x-2">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">
                Please select a cashier to continue with the transaction
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // For other users, don't show anything
  return null;
};

export default CashierManager;
