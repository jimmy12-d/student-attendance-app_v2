"use client";

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAppSelector } from '../../_stores/hooks';
import { db } from '../../../firebase-config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Student } from '../../_interfaces';
import StudentFormsList from './_components/StudentFormsList';
import StudentEvents from './_components/StudentEvents';

export default function ActivitiesPage() {
  const t = useTranslations('student.activities');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [studentData, setStudentData] = useState<Student | null>(null);

  const { studentUid, studentDocId } = useAppSelector((state) => ({
    studentUid: state.main.userUid,
    studentDocId: state.main.studentDocId,
  }));

  // Fetch student data
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!studentDocId) return;

      try {
        const studentsQuery = query(
          collection(db, "students"),
          where("__name__", "==", studentDocId)
        );
        const studentSnap = await getDocs(studentsQuery);
        
        if (!studentSnap.empty) {
          const studentDataFromDb = studentSnap.docs[0].data() as Student;
          setStudentData(studentDataFromDb);
        }
      } catch (error) {
        console.error("Error fetching student data:", error);
      }
    };

    fetchStudentData();
  }, [studentDocId]);

  // Centralized khmer font utility
  const khmerFont = (additionalClasses: string = '') => {
    const baseClasses = locale === 'kh' ? 'khmer-font' : '';
    return additionalClasses ? `${baseClasses} ${additionalClasses}`.trim() : baseClasses;
  };

  // Ripple effect for interactions
  const createRipple = (event: React.MouseEvent<HTMLButtonElement>, color: string = 'rgba(59, 130, 246, 0.3)') => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 600ms linear;
      background-color: ${color};
      left: ${x}px;
      top: ${y}px;
      width: ${size}px;
      height: ${size}px;
      pointer-events: none;
      z-index: 0;
    `;
    
    button.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  };

  return (
    <>
      <style jsx global>{`
        @keyframes ripple {
          to {
            transform: scale(4);
            opacity: 0;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }
      `}</style>

      <div className="space-y-5">
        {/* Active Forms Section */}
        {studentUid && (
          <div className="pt-4">
            <StudentFormsList
              studentUid={studentUid}
              studentClassType={studentData?.classType}
              khmerFont={khmerFont}
              createRipple={createRipple as any}
            />
          </div>
        )}

        {/* Events Section */}
        {studentUid && (
          <div className="pt-4">
            <div className="flex items-center gap-4 mb-4">
              <h2 className={khmerFont('font-bold text-xl text-gray-900 dark:text-white')}>{t('eventsTitle')}</h2>
            </div>
            <StudentEvents studentUid={studentUid} />
          </div>
        )}
      </div>
    </>
  );
}
