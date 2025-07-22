"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import Button from '@/app/_components/Button';
import DarkModeToggle from '@/app/student/_components/DarkModeToggle';
import CardBoxModal from '@/app/_components/CardBox/Modal';
import { useAppDispatch, useAppSelector } from '@/app/_stores/hooks';
import { setUser } from '@/app/_stores/mainSlice';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase-config';
import { useRouter } from 'next/navigation';

// --- Import components for settings ---
import NotificationSettings from '../_components/NotificationSettings';
import { EnrollmentView } from '../_components/FacialEnrollment'; // Import the modal view directly
import { usePWAInstall } from '@/app/_hooks/usePWAInstall';
import { RootState } from '@/app/_stores/store';

// --- Reusable UI Components for the new design ---

const SettingsListItem = ({
  icon,
  iconSrc,
  iconBgColor,
  title,
  children,
  onClick,
  href,
}: {
  icon?: string;
  iconSrc?: string;
  iconBgColor: string;
  title: string;
  children?: React.ReactNode;
  onClick?: () => void;
  href?: string;
}) => {
  const content = (
    <>
      <div className="flex items-center">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${iconBgColor}`}
        >
          {iconSrc ? <img src={iconSrc} alt={title} className="w-6 h-6" /> : <span className="text-2xl">{icon}</span>}
        </div>
        <span className="font-semibold text-slate-700 dark:text-white">{title}</span>
      </div>
      <div className="flex items-center space-x-2 text-slate-500 dark:text-slate-400">
        {children}
        {(href || onClick) && (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </>
  );

  const itemClassName = "flex items-center justify-between p-3 transition-colors duration-150";

  if (href) {
    return (
      <Link href={href} className={`${itemClassName} hover:bg-slate-50 dark:hover:bg-slate-700/50`}>
        {content}
      </Link>
    );
  }

  return (
    <div onClick={onClick} className={`${itemClassName} ${onClick ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`}>
      {content}
    </div>
  );
};

const ListDivider = () => <hr className="border-t border-slate-200 dark:border-slate-700/50 ml-16" />;

const SettingsGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden shadow-sm">
    {children}
  </div>
);

// --- Main Account Page Component ---

const AccountPage = () => {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userUid = useAppSelector((state: RootState) => state.main.userUid);

  const [isLogoutModalActive, setIsLogoutModalActive] = useState(false);
  const [isFacialEnrollmentModalOpen, setIsFacialEnrollmentModalOpen] = useState(false);

  const { canInstallPWA: canInstall, triggerInstall: installPWA } = usePWAInstall();

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
      
      {isFacialEnrollmentModalOpen && userUid && (
        <EnrollmentView 
          userUid={userUid} 
          onCancel={() => setIsFacialEnrollmentModalOpen(false)} 
          onComplete={() => setIsFacialEnrollmentModalOpen(false)} 
        />
      )}

      <div className="pb-24">
        <h1 className="text-3xl font-bold text-center pb-8 text-slate-800 dark:text-white">Account</h1>

        <div className="space-y-5">
          <SettingsGroup>
            <SettingsListItem
              icon="🔔"
              iconBgColor="bg-red-500 text-white"
              title="Notifications"
            >
              <NotificationSettings />
            </SettingsListItem>
            <ListDivider />
            <SettingsListItem
              icon="🖌️"
              iconBgColor="bg-blue-500 text-white"
              title="Appearance"
            >
              <DarkModeToggle />
            </SettingsListItem>
          </SettingsGroup>

          <SettingsGroup>
            <SettingsListItem
              iconSrc="/face_scanning.png"
              iconBgColor="bg-green-500"
              title="Face Recognition"
              onClick={() => setIsFacialEnrollmentModalOpen(true)}
            />
            {canInstall && (
              <>
                <ListDivider />
                <SettingsListItem
                  icon="📲"
                  iconBgColor="bg-yellow-500 text-white"
                  title="Install App"
                  onClick={installPWA}
                />
              </>
            )}
          </SettingsGroup>
          
          <SettingsGroup>
            <SettingsListItem
                icon="➡️"
                iconBgColor="bg-red-500/80 text-white"
                title="Logout"
                onClick={() => setIsLogoutModalActive(true)}
            />
          </SettingsGroup>
        </div>
      </div>
    </>
  );
};

export default AccountPage;
 