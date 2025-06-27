"use client";

import { redirect } from 'next/navigation';

export default function StudentPage() {
  redirect('/student/mock-exam');
  return null;
}