"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // This is a placeholder for your actual auth check.
    // You might use Firebase's onAuthStateChanged or a similar method here.
    const isLoggedIn = localStorage.getItem('token'); 

    if (isLoggedIn) {
      router.push('/student/mock-exam');
    } else {
      router.push('/login');
    }
  }, [router]);

  return null;
}