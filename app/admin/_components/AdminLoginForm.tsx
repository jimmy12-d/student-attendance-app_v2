"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useAppDispatch } from "../../_stores/hooks";
import { setUser } from "../../_stores/mainSlice";
import { auth, db } from "../../../firebase-config";
import Button from "../../_components/Button";
import { mdiGoogle } from "@mdi/js";
import Icon from "../../_components/Icon";

const AdminLoginForm = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (!firebaseUser.email) {
        setError("Could not retrieve email from Google account.");
        await signOut(auth);
        setIsLoading(false);
        return;
      }

      const authorizedUserRef = doc(db, "authorizedUsers", firebaseUser.email);
      const authorizedUserSnap = await getDoc(authorizedUserRef);

      if (authorizedUserSnap.exists()) {
        dispatch(
          setUser({
            name: firebaseUser.displayName,
            email: firebaseUser.email,
            avatar: firebaseUser.photoURL,
            uid: firebaseUser.uid,
            role: "admin",
          })
        );
        router.push("/dashboard");
      } else {
        setError(`Access Denied. Your account (${firebaseUser.email}) is not authorized.`);
        await signOut(auth);
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        setError(error.message || "Failed to sign in with Google.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-center">Admin Login</h2>
      {error && (
        <div className="p-3 my-2 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          {error}
        </div>
      )}
      <Button
        onClick={handleGoogleSignIn}
        label={isLoading ? "Signing in..." : "Sign in with Google"}
        color="contrast"
        icon={mdiGoogle}
        className="w-full"
        disabled={isLoading}
      />
    </div>
  );
};

export default AdminLoginForm; 