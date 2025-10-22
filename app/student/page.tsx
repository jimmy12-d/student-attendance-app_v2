"use client";

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { usePWANavigation } from '../_hooks/usePWANavigation';
import LoadingScreen from '../_components/LoadingScreen';

export default function StudentPage() {
  const { navigateWithinPWA } = usePWANavigation();
  const t = useTranslations('common');

  useEffect(() => {
    // Status check is now handled in layout.tsx
    // Just redirect to attendance page
    navigateWithinPWA('/student/attendance', { replace: true });
  }, [navigateWithinPWA]);

  return <LoadingScreen message={t('loading')} />;
}