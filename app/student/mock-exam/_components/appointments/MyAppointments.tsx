"use client";

import React, { useState, useEffect } from 'react';
import { db } from '../../../../../firebase-config';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { AppointmentRequest } from '../../../../_interfaces';
import { useTranslations } from 'next-intl';
import Icon from '../../../../_components/Icon';
import { mdiCalendarClock, mdiCheck, mdiClose, mdiClockOutline, mdiCancel, mdiChevronRight } from '@mdi/js';

interface MyAppointmentsProps {
  authUid: string;
  refreshTrigger?: number; // Optional prop to trigger refresh
  onBookingDisabled?: (disabled: boolean) => void; // Callback to notify parent about booking disabled state
}

const MyAppointments: React.FC<MyAppointmentsProps> = ({ authUid, refreshTrigger, onBookingDisabled }) => {
  const t = useTranslations('student.mockExam.appointments');
  const [appointments, setAppointments] = useState<AppointmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAppointments();
  }, [authUid, refreshTrigger]);

  const loadAppointments = async () => {
    if (!authUid) return;
    
    setIsLoading(true);
    try {
      const appointmentsQuery = query(
        collection(db, 'appointmentRequests'),
        where('authUid', '==', authUid),
        orderBy('requestedAt', 'desc')
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentsData = appointmentsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AppointmentRequest));
      
      setAppointments(appointmentsData);
      
      // Determine if booking should be disabled (true if any pending or approved appointment exists)
      const bookingDisabled = appointmentsData.some(apt => apt.status === 'pending' || apt.status === 'approved');
      if (onBookingDisabled) {
        onBookingDisabled(bookingDisabled);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200 dark:border-yellow-700';
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return mdiClockOutline;
      case 'approved':
        return mdiCheck;
      case 'rejected':
        return mdiClose;
      case 'cancelled':
        return mdiCancel;
      default:
        return mdiClockOutline;
    }
  };

  const upcomingAppointments = appointments.filter(apt => {
    if (apt.status !== 'approved') return false;
    const appointmentDate = new Date(apt.appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return appointmentDate >= today;
  });

  if (isLoading) {
    return (
      <div className="space-y-6 px-2">
        <div className="flex items-center gap-4 pt-2 mb-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          </div>
        </div>
        <div className="animate-pulse px-2">
          <div className="space-y-3">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-3xl"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-3xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-2">
      <div className="flex items-center gap-4 pt-2 mb-4">
        <h2 className="font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2">
          <Icon path={mdiCalendarClock} size={24} />
          {t('myAppointments')}
        </h2>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400 px-2">
          <Icon path={mdiCalendarClock} size={48} className="mx-auto mb-3 opacity-50" />
          <p className="font-medium">{t('noAppointments')}</p>
          <p className="text-sm">{t('noAppointmentsMessage')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 px-2">
          {appointments.map(appointment => {
            const appointmentDate = new Date(appointment.appointmentDate);
            const isPast = appointmentDate < new Date();
            
            return (
              <div
                key={appointment.id}
                className={`group relative overflow-hidden touch-manipulation bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm px-4 py-4 rounded-3xl shadow-xl border border-gray-100/80 dark:border-slate-600/80 min-h-[80px] flex items-center active:scale-[0.98] transition-transform duration-150 ${isPast ? 'opacity-60' : ''}`}
              >
                {/* Background gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 rounded-3xl opacity-0 group-active:opacity-100 transition-opacity duration-150"></div>
                
                <div className="flex items-center w-full space-x-4 relative z-10">
                  {/* Icon Section */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-16 h-16 bg-gradient-to-br rounded-2xl flex items-center justify-center shadow-lg ${
                      appointment.status === 'approved' ? 'from-green-500 to-emerald-600' :
                      appointment.status === 'pending' ? 'from-yellow-500 to-orange-600' :
                      appointment.status === 'rejected' ? 'from-red-500 to-pink-600' :
                      'from-gray-500 to-slate-600'
                    }`}>
                      <div className="absolute inset-0 bg-white/15 rounded-2xl backdrop-blur-sm"></div>
                      <Icon path={getStatusIcon(appointment.status)} size={26} className="text-white relative z-10" />
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="text-left flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white mb-1">
                      {t('adminAppointment')}
                    </h3>
                    <div className="flex items-center space-x-2 mb-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${
                        appointment.status === 'approved' ? 'bg-green-500' :
                        appointment.status === 'pending' ? 'bg-yellow-500' :
                        appointment.status === 'rejected' ? 'bg-red-500' : 'bg-gray-500'
                      }`}></div>
                      <span className={`text-xs font-medium ${
                        appointment.status === 'approved' ? 'text-green-600 dark:text-green-400' :
                        appointment.status === 'pending' ? 'text-yellow-600 dark:text-yellow-400' :
                        appointment.status === 'rejected' ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {t(appointment.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{appointment.reason}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>{appointmentDate.getDate().toString().padStart(2, '0')}/{(appointmentDate.getMonth() + 1).toString().padStart(2, '0')}/{appointmentDate.getFullYear()}</span>
                      <span>{appointment.appointmentTime} ({appointment.duration} {t('minutes')})</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="text-gray-400 dark:text-gray-500 flex-shrink-0">
                    <Icon path={mdiChevronRight} size={24} />
                  </div>
                </div>

                {/* Rejection reason if applicable */}
                {appointment.status === 'rejected' && appointment.rejectionReason && (
                  <div className="absolute bottom-2 right-4 text-xs text-red-600 dark:text-red-400 font-medium">
                    {t('rejected')}
                  </div>
                )}

                {/* Pending message if applicable */}
                {appointment.status === 'pending' && (
                  <div className="absolute bottom-2 right-4 text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                    {t('awaitingApproval')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyAppointments;
