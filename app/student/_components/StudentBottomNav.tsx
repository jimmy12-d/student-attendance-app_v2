'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '@/app/_components/Icon';
import { mdiCalendarCheck, mdiFileDocumentEdit, mdiAccountCircle,  } from '@mdi/js';

export const navItems = [
  // { name: 'Attendance', href: '/student/attendance', icon: mdiCalendarCheck },
  { name: 'Mock Exam', href: '/student/mock-exam', icon: mdiFileDocumentEdit },
  { name: 'Account', href: '/student/account', icon: mdiAccountCircle },
];

export default function StudentBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[75%] max-w-sm mx-auto">
      <div className="relative flex items-center justify-around bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg rounded-full shadow-lg border border-white/20">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative z-10 flex flex-col items-center justify-center w-1/3 h-14 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
            >
                {isActive && (
                    <motion.div
                        layoutId="active-nav-highlight"
                        className="absolute inset-1 bg-white dark:bg-gray-700 rounded-full shadow-inner"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                )}
              <div className="flex flex-col items-center">
                <motion.div 
                  animate={{ scale: isActive ? 1.5 : 1, y: isActive ? -5 : 0 }} 
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }} 
                  className={`relative ${isActive ? 'pt-2.5' : 'pb-2'}` }
                  >
                  <Icon path={item.icon} size="24" className={isActive ? 'text-company-purple' : ''} />
                </motion.div>
                <AnimatePresence>
                  {!isActive && (
                    <motion.span
                      className="absolute bottom-1 text-xs"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                  {item.name}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
} 