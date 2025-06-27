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

    <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Account</h1>
        
        <div className="bg-white dark:bg-slate-900/70 p-6 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
                <p className="font-semibold">Appearance</p>
                <DarkModeToggle />
            </div>
            <hr className="my-6 border-slate-700" />
            <div className="flex items-center justify-between">
                <p className="font-semibold">Authentication</p>
                <Button color="danger" label="Logout" onClick={() => setIsLogoutModalActive(true)} outline />
            </div>
        </div>
    </div>
    </>
  );
};

export default AccountPage;
 