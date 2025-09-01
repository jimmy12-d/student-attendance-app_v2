"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import DarkModeToggle from '@/app/student/_components/DarkModeToggle';
import LanguageToggle from '@/app/student/_components/LanguageToggle';
import CardBoxModal from '@/app/_components/CardBox/Modal';
import { useAppDispatch } from '@/app/_stores/hooks';
import { setUser } from '@/app/_stores/mainSlice';
import { signOut } from 'firebase/auth';
import { auth } from '@/firebase-config';
import { useRouter } from 'next/navigation';
import { usePWANavigation } from '@/app/_hooks/usePWANavigation';
import { usePWAInstall } from '@/app/_hooks/usePWAInstall';
import { useTranslations, useLocale } from 'next-intl';
import { motion } from 'framer-motion';

// --- Import components for settings ---
import NotificationSettings from '../_components/NotificationSettings';
import { mdiChevronRight, mdiBell, mdiPalette, mdiLogout, mdiDownload, mdiCheckCircle, mdiWeb } from '@mdi/js';
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
  titleClassName = '',
  subtitleClassName = '',
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
  titleClassName?: string;
  subtitleClassName?: string;
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
          <h3 className={`font-semibold text-lg ${isDestructive ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'} ${titleClassName}`}>
            {title}
          </h3>
          {subtitle && (
            <p className={`text-sm text-gray-500 dark:text-gray-400 mt-0.5 ${subtitleClassName}`}>
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
  const { navigateWithinPWA } = usePWANavigation();
  const { canInstallPWA, isStandalone, isIOS, triggerInstall } = usePWAInstall();
  const t = useTranslations('student.account');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  // Utility function for Khmer font styling
  const khmerFont = (additionalClasses = '') => {
    const baseClasses = locale === 'kh' ? 'khmer-font' : '';
    return additionalClasses ? `${baseClasses} ${additionalClasses}`.trim() : baseClasses;
  };

  const [isLogoutModalActive, setIsLogoutModalActive] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handlePWAInstall = () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      triggerInstall();
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    dispatch(setUser(null));
    navigateWithinPWA('/login');
    setIsLogoutModalActive(false);
  };

  return (
    <>
      <CardBoxModal
        title={t('confirmLogoutTitle')}
        buttonColor="danger"
        buttonLabel={tCommon('confirm')}
        isActive={isLogoutModalActive}
        onConfirm={handleLogout}
        onCancel={() => setIsLogoutModalActive(false)}
      >
        <p className={khmerFont()}>{t('confirmLogoutDescription')}</p>
      </CardBoxModal>

      <CardBoxModal
        title={t('installIOSTitle')}
        buttonColor="info"
        buttonLabel={t('installIOSButton')}
        isActive={showIOSInstructions}
        onConfirm={() => setShowIOSInstructions(false)}
        onCancel={() => setShowIOSInstructions(false)}
      >
        <motion.div 
          key={locale}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className={khmerFont('space-y-3 text-sm')}
        >
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {t('installIOSIntro')}
          </motion.p>
          <motion.ol 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-300"
          >
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className={khmerFont()}
            >
              {t.rich('installIOSStep1', {
                strong: (chunks) => <strong>{chunks}</strong>
              })}
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className={khmerFont()}
            >
              {t.rich('installIOSStep2', {
                strong: (chunks) => <strong>{chunks}</strong>
              })}
            </motion.li>
            <motion.li 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className={khmerFont()}
            >
              {t.rich('installIOSStep3', {
                strong: (chunks) => <strong>{chunks}</strong>
              })}
            </motion.li>
          </motion.ol>
        </motion.div>
      </CardBoxModal>

      <motion.div 
        key={locale}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
        className="px-1"
      >
        {/* Modern Header */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-center mb-6"
        >
            <div className="flex items-center justify-center space-x-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            </div>
            <h1 className={khmerFont('text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent')}>
              {t('pageTitle')}
            </h1>
          </div>
          <p className={khmerFont('text-gray-500 dark:text-gray-400 text-sm')}>
            {t('pageDescription')}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-6"
        >
          {/* Preferences Group */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className={khmerFont('text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4')}>
              {t('preferencesHeading')}
            </h2>
            <SettingsGroup>
              <SettingsListItem
                iconPath={mdiBell}
                iconBgColor="bg-gradient-to-br from-red-500 to-pink-600"
                title={t('notifications')}
                subtitle={t('notificationsSubtitle')}
                titleClassName={khmerFont()}
                subtitleClassName={khmerFont()}
              >
                <NotificationSettings />
              </SettingsListItem>
              <ListDivider />
              <SettingsListItem
                iconPath={mdiWeb}
                iconBgColor="bg-gradient-to-br from-orange-500 to-red-600"
                title={t('language')}
                subtitle={t('languageSubtitle')}
                titleClassName={khmerFont()}
                subtitleClassName={khmerFont()}
              >
                <LanguageToggle />
              </SettingsListItem>
              <ListDivider />
              <SettingsListItem
                iconPath={mdiPalette}
                iconBgColor="bg-gradient-to-br from-indigo-500 to-purple-600"
                title={t('appearanceTitle')}
                subtitle={t('appearanceSubtitle')}
                titleClassName={khmerFont()}
                subtitleClassName={khmerFont()}
              >
                <DarkModeToggle />
              </SettingsListItem>
            </SettingsGroup>
          </motion.div>
          
          {/* App Installation Group */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <h2 className={khmerFont('text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4')}>
              {t('installationHeading')}
            </h2>
            <SettingsGroup>
              {isStandalone ? (
                <SettingsListItem
                  iconPath={mdiCheckCircle}
                  iconBgColor="bg-gradient-to-br from-green-500 to-emerald-600"
                  title={t('appInstalledTitle')}
                  subtitle={t('appInstalledSubtitle')}
                  titleClassName={khmerFont()}
                  subtitleClassName={khmerFont()}
                >
                  <div className={khmerFont('text-green-600 dark:text-green-400 text-sm font-medium')}>
                    {t('installedBadge')}
                  </div>
                </SettingsListItem>
              ) : canInstallPWA ? (
                <SettingsListItem
                  iconPath={mdiDownload}
                  iconBgColor="bg-gradient-to-br from-blue-500 to-cyan-600"
                  title={t('installAppTitle')}
                  subtitle={isIOS ? t('installAppSubtitleIOS') : t('installAppSubtitleDefault')}
                  onClick={handlePWAInstall}
                  titleClassName={khmerFont()}
                  subtitleClassName={khmerFont()}
                >
                  <div className={khmerFont('bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors')}>
                    {t('installButton')}
                  </div>
                </SettingsListItem>
              ) : (
                <SettingsListItem
                  iconPath={mdiDownload}
                  iconBgColor="bg-gradient-to-br from-gray-400 to-gray-500"
                  title={t('appInstallationTitle')}
                  subtitle={t('appInstallationUnavailable')}
                  titleClassName={khmerFont()}
                  subtitleClassName={khmerFont()}
                >
                  <div className={khmerFont('text-gray-500 dark:text-gray-400 text-sm')}>
                    {t('unavailableLabel')}
                  </div>
                </SettingsListItem>
              )}
            </SettingsGroup>
          </motion.div>
          
          {/* Account Actions Group */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.5 }}
          >
            <h2 className={khmerFont('text-base font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-4')}>
              {t('accountHeading')}
            </h2>
            <SettingsGroup>
              <SettingsListItem
                iconPath={mdiLogout}
                iconBgColor="bg-gradient-to-br from-red-500 to-rose-600"
                title={tCommon('logout')}
                subtitle={t('logoutSubtitle')}
                onClick={() => setIsLogoutModalActive(true)}
                isDestructive={true}
                titleClassName={khmerFont()}
                subtitleClassName={khmerFont()}
              />
            </SettingsGroup>
          </motion.div>
        </motion.div>
      </motion.div>
    </>
  );
};

export default AccountPage;
 