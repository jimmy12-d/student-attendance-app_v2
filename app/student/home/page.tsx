"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentHomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student');
  }, [router]);

  return null;
}

const StudentHomePageOld = () => {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student');
  }, [router]);

  return null;
};
 