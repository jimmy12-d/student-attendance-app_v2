import { redirect } from 'next/navigation';

export default function AttendancePage() {
  redirect('/student/mock-exam');
  return null; 
} 