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
import { RootState } from '@/app/_stores/store';
import { mdiChevronRight, mdiBell, mdiPalette, mdiFaceRecognition, mdiLogout } from '@mdi/js';
import Icon from '@/app/_components/Icon';

// --- Reusable UI Components for the new design ---

const SettingsListItem = ({
  icon,
  iconPath,
  iconBgColor,
  title,
  subtitle,
  children,
  onClick,
  href,
  isDestructive = false,
}: {
  icon?: string;
  iconPath?: string;
  iconBgColor: string;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  href?: string;
  isDestructive?: boolean;
}) => {
  const content = (
    <>
      <div className="flex items-center flex-1 min-w-0">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mr-4 shadow-sm ${iconBgColor}`}>
          {iconPath ? (
            <Icon path={iconPath} size={24} className="text-white" />
          ) : (
            <span className="text-xl">{icon}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`font-semibold text-lg ${isDestructive ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </h3>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-3">
        {children}
        {(href || onClick) && (
          <div className="text-gray-400 dark:text-gray-500">
            <Icon path={mdiChevronRight} size={20} />
          </div>
        )}
      </div>
    </>
  );

  const itemClassName = "flex items-center justify-between p-5 transition-all duration-200 touch-manipulation";

  if (href) {
    return (
      <Link 
        href={href} 
        className={`${itemClassName} hover:bg-gray-50 dark:hover:bg-slate-700/50 active:scale-[0.99]`}
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div 
      onClick={onClick} 
      className={`${itemClassName} ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/50 active:scale-[0.99]' : ''}`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {content}
    </div>
  );
};

const ListDivider = () => <hr className="border-t border-gray-100 dark:border-slate-700/30 ml-20" />;

const SettingsGroup = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-white dark:bg-slate-800/90 backdrop-blur-sm rounded-3xl overflow-hidden shadow-lg border border-gray-100/80 dark:border-slate-700/50">
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

      <div className="pb-24 px-1">
        {/* Modern Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Account Settings
            </h1>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Manage your preferences and account details
          </p>
        </div>

        <div className="space-y-6">
          {/* Preferences Group */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4">
              Preferences
            </h2>
            <SettingsGroup>
              <SettingsListItem
                iconPath={mdiBell}
                iconBgColor="bg-gradient-to-br from-red-500 to-pink-600"
                title="Notifications"
                subtitle="Manage your alert preferences"
              >
                <NotificationSettings />
              </SettingsListItem>
              <ListDivider />
              <SettingsListItem
                iconPath={mdiPalette}
                iconBgColor="bg-gradient-to-br from-indigo-500 to-purple-600"
                title="Appearance"
                subtitle="Toggle dark mode theme"
              >
                <DarkModeToggle />
              </SettingsListItem>
            </SettingsGroup>
          </div>

          {/* Security & Features Group */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4">
              Security & Features
            </h2>
            <SettingsGroup>
              <SettingsListItem
                iconPath={mdiFaceRecognition}
                iconBgColor="bg-gradient-to-br from-emerald-500 to-teal-600"
                title="Face Recognition"
                subtitle="Set up biometric authentication"
                onClick={() => setIsFacialEnrollmentModalOpen(true)}
              />
            </SettingsGroup>
          </div>
          
          {/* Account Actions Group */}
          <div>
            <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4">
              Account
            </h2>
            <SettingsGroup>
              <SettingsListItem
                iconPath={mdiLogout}
                iconBgColor="bg-gradient-to-br from-red-500 to-rose-600"
                title="Sign Out"
                subtitle="Log out of your account"
                onClick={() => setIsLogoutModalActive(true)}
                isDestructive={true}
              />
            </SettingsGroup>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountPage;
 