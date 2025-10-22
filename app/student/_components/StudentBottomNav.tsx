'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/app/_components/Icon';
import { mdiHome, mdiFileDocumentEdit, mdiAccountCircle, mdiCalendarStar } from '@mdi/js';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../../firebase-config';
import { useAppSelector } from '@/app/_stores/hooks';
import { useTranslations, useLocale } from 'next-intl';

export const navItems = [
  { name: 'Home', href: '/student/attendance', icon: mdiHome, translationKey: 'home' },
  { name: 'Mock Exam', href: '/student/mock-exam', icon: mdiFileDocumentEdit, translationKey: 'mockExam' },
  { name: 'Activities', href: '/student/activities', icon: mdiCalendarStar, translationKey: 'activities' },
  { name: 'Account', href: '/student/account', icon: mdiAccountCircle, translationKey: 'account' },
];

export default function StudentBottomNav() {
  const pathname = usePathname();
  const [currentNavItems, setCurrentNavItems] = useState(navItems);
  const isBottomNavVisible = useAppSelector((state) => state.main.isBottomNavVisible);
  const t = useTranslations('navigation');
  const locale = useLocale();


  useEffect(() => {
    const navSettingsRef = doc(db, 'appSettings', 'studentBottomNav');

    const unsubscribe = onSnapshot(navSettingsRef, (docSnap) => {
      if (docSnap.exists()) {
        const settings = docSnap.data().navItems;
        const updatedNavItems = navItems.filter(item => settings[item.name] !== false);
        setCurrentNavItems(updatedNavItems);
      } else {
        // If the document doesn't exist, show all default items
        setCurrentNavItems(navItems);
      }
    }, (error) => {
      console.error("Error fetching nav settings:", error);
      // Fallback to default nav items on error
      setCurrentNavItems(navItems);
    });

    return () => unsubscribe();
  }, []);

  if (!isBottomNavVisible) {
    return null;
  }

  return (
    <nav
      // Use iOS safe area inset to keep the nav clearly separated from any system UI
      style={{ 
        bottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
        transform: 'translate3d(-50%, 0, 0)',
        willChange: 'transform'
      }}
      className="fixed left-1/2 w-[280px] sm:w-[320px] mx-auto z-40"
    >
      <div className="relative flex items-center justify-around bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-full shadow-lg border border-white/20 px-2">
        {currentNavItems.map((item) => {
          // Special handling for Home button (attendance page)
          const isActive = item.href === '/student/attendance' 
            ? (pathname === '/student' || pathname === '/student/attendance')
            : item.href === '/student/account'
            ? (pathname.startsWith(item.href) || pathname === '/student/payment-history')
            : item.href === '/student/activities'
            ? pathname.startsWith(item.href)
            : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative z-10 flex flex-col items-center justify-center flex-1 h-14 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
                {isActive && (
                    <div
                        className="absolute inset-1 bg-white dark:bg-gray-700 rounded-full shadow-inner"
                    />
                )}
              <div className="flex flex-col items-center">
                <div 
                  className={`relative ${isActive ? 'pt-2.5' : 'pb-2'}` }
                  >
                  <Icon path={item.icon} size="24" className={isActive ? 'text-company-purple' : ''} />
                </div>
                  {!isActive && (
                    <span
                      className={`absolute bottom-1 text-xs ${locale === 'kh' ? 'khmer-font' : ''}`}
                    >
                  {t(item.translationKey)}
                    </span>
                  )}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 