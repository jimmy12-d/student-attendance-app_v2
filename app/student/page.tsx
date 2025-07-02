"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/student/mock-exam');
  }, [router]);

  return null;
}