"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase-config';
import { useAppDispatch, useAppSelector } from '../_stores/hooks';
import { setUser } from '../_stores/mainSlice';

interface AuthContextType {
  currentUser: User | null;
  userRole: 'admin' | 'teacher' | 'student' | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAuthorizedAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userRole: null,
  isAuthenticated: false,
  isLoading: true,
  isAuthorizedAdmin: false,
});

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const dispatch = useAppDispatch();

  // Get user role from Redux store (set by login components)
  const userRole = useAppSelector((state) => state.main.userRole);

  useEffect(() => {
    // Single auth state listener for the entire app
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (user) {
        // Check if user is authorized admin (only for admin role verification)
        if (user.email && (!userRole || userRole === 'admin')) {
          try {
            const authorizedUserRef = doc(db, "authorizedUsers", user.email);
            const authorizedUserSnap = await getDoc(authorizedUserRef);
            
            if (authorizedUserSnap.exists()) {
              // User is an authorized admin
              setIsAuthorizedAdmin(true);
              
              // Only set admin user data if not already set or if role is admin
              if (!userRole || userRole === 'admin') {
                dispatch(setUser({
                  name: user.displayName,
                  email: user.email,
                  avatar: user.photoURL,
                  uid: user.uid,
                  role: "admin",
                }));
              }
            } else if (userRole === 'admin') {
              // User was set as admin but is not authorized
              setIsAuthorizedAdmin(false);
              dispatch(setUser(null));
            }
          } catch (error) {
            console.error('Error checking admin authorization:', error);
            if (userRole === 'admin') {
              setIsAuthorizedAdmin(false);
              dispatch(setUser(null));
            }
          }
        }
        
        // For teacher/student roles, the authorization is handled by their login flows
        // We just maintain the Firebase user session here
      } else {
        // User is not authenticated - clear everything
        setIsAuthorizedAdmin(false);
        dispatch(setUser(null));
      }
      
      // Reduce loading time by setting loading to false faster
      setIsLoading(false);
    }, (error) => {
      // Handle auth errors by setting loading to false
      console.error('Auth state change error:', error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch, userRole]);

  const value: AuthContextType = {
    currentUser,
    userRole,
    isAuthenticated: !!currentUser,
    isLoading,
    isAuthorizedAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
