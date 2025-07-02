"use client";

import React, { useState } from 'react';
import Button from '@/app/_components/Button';
import DarkModeToggle from '@/app/student/_components/DarkModeToggle';
import CardBoxModal from '@/app/_components/CardBox/Modal';
import { useAppDispatch } from '@/app/_stores/hooks';
import { setUser } from '@/app/_stores/mainSlice';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase-config';
import { useRouter } from 'next/navigation';
import { InstallPWA } from '../_components/InstallPWA';

const AccountPage = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [isLogoutModalActive, setIsLogoutModalActive] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(setUser(null));
    router.push('/login');
    setIsLogoutModalActive(false);
  };

  return (
    <>
      <CardBoxModal
        title="Confirm Logout"
        buttonColor="danger"
        buttonLabel="Confirm"
        isActive={isLogoutModalActive}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalActive(false)}
      >
        <p>Are you sure you want to log out?</p>
      </CardBoxModal>

    <div>
        <h1 className="text-2xl font-bold mb-6">Account</h1>
        
        <div className="bg-white dark:bg-slate-900/70 p-6 rounded-lg shadow-lg space-y-6">
            <div>
                <h2 className="text-lg font-semibold mb-4 text-slate-500">Appearance</h2>
                <div className="flex items-center justify-between">
                    <p>Theme</p>
                    <DarkModeToggle />
                </div>
            </div>

            <hr className="border-slate-700" />

            <div>
                <h2 className="text-lg font-semibold mb-4 text-slate-500">App Installation</h2>
                <InstallPWA as_button={true} />
            </div>

            <hr className="border-slate-700" />
            
            <div>
                <h2 className="text-lg font-semibold mb-4 text-slate-500">Authentication</h2>
                <div className="flex items-center justify-between">
                    <p>Sign out from your account.</p>
                    <Button color="danger" label="Logout" onClick={() => setIsLogoutModalActive(true)} outline />
                </div>
            </div>
        </div>
    </div>
    </>
  );
};

export default AccountPage;
 