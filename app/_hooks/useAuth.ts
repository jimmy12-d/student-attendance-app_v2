"use client";

import { useEffect, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../_stores/hooks';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase-config';
import { setUser } from '../_stores/mainSlice';

export interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: {
    name: string | null;
    email: string | null;
    avatar: string | null;
    uid: string | null;
    role: 'admin' | 'teacher' | 'student' | null;
    studentDocId?: string | null;
    subject?: string | null;
    phone?: string | null;
  } | null;
}

export const useAuth = (): AuthState => {
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(true);
  
  const userName = useAppSelector((state) => state.main.userName);
  const userEmail = useAppSelector((state) => state.main.userEmail);
  const userAvatar = useAppSelector((state) => state.main.userAvatar);
  const userUid = useAppSelector((state) => state.main.userUid);
  const userRole = useAppSelector((state) => state.main.userRole);
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const userSubject = useAppSelector((state) => state.main.userSubject);
  const userPhone = useAppSelector((state) => state.main.userPhone);

  const isAuthenticated = Boolean(userName && userUid && userRole);

  const user = isAuthenticated ? {
    name: userName,
    email: userEmail,
    avatar: userAvatar,
    uid: userUid,
    role: userRole,
    studentDocId,
    subject: userSubject,
    phone: userPhone,
  } : null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (!firebaseUser && isAuthenticated) {
        // User signed out, clear the store
        dispatch(setUser(null));
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [dispatch, isAuthenticated]);

  return {
    isLoading,
    isAuthenticated,
    user,
  };
};

export default useAuth;
