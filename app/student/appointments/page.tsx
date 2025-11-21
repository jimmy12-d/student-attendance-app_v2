"use client";

import React, { useState, useEffect } from 'react';
import { db } from '../../../firebase-config';
import { collection, getDocs, where, query } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../_stores/hooks';
import { useTranslations } from 'next-intl';
import Icon from '../../_components/Icon';
import { mdiArrowLeft } from '@mdi/js';
import AppointmentBookingForm from '../mock-exam/_components/appointments/AppointmentBookingForm';
import MyAppointments from '../mock-exam/_components/appointments/MyAppointments';
import { AdminAvailability } from '../../_interfaces';
import { toast } from 'sonner';

const AppointmentsPage = () => {
  const router = useRouter();
  const t = useTranslations('student.appointments');
  const tCommon = useTranslations('common');
  
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentName = useAppSelector((state) => state.main.userName);
  const studentUid = useAppSelector((state) => state.main.userUid);
  const studentClassType = useAppSelector((state) => state.main.studentClassType);

  const [adminAvailability, setAdminAvailability] = useState<AdminAvailability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [appointmentRefreshTrigger, setAppointmentRefreshTrigger] = useState(0);

  // Fetch admin availability on mount
  useEffect(() => {
    const fetchAdminAvailability = async () => {
      try {
        setIsLoading(true);
        const availabilityQuery = query(
          collection(db, 'adminAvailability'),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(availabilityQuery);
        const availability = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as AdminAvailability[];
        setAdminAvailability(availability);
      } catch (error) {
        console.error('Error fetching admin availability:', error);
        toast.error(t('messages.requestError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdminAvailability();
  }, [t]);

  const handleBookingSuccess = () => {
    setAppointmentRefreshTrigger(prev => prev + 1);
    toast.success(t('messages.requestSuccess'));
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              aria-label="Go back"
            >
              <Icon path={mdiArrowLeft} size={24} />
            </button>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white truncate">
                {t('appointments.bookWithAdmin')}
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 truncate">
                {t('appointments.noTeachersAvailable')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 sm:p-8 text-center">
            <div className="w-8 h-8 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">{tCommon('loading')}</p>
          </div>
        ) : (
          <AppointmentBookingForm
            availability={adminAvailability}
            studentDocId={studentDocId || ''}
            studentName={studentName || ''}
            studentClass={studentClassType || undefined}
            authUid={studentUid || ''}
            onClose={() => router.back()}
            onSuccess={handleBookingSuccess}
          />
        )}
      </div>
    </div>
  );
};

export default AppointmentsPage;
