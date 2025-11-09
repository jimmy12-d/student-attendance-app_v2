"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../../firebase-config';
import { collection, query, getDocs, addDoc, where, Timestamp } from 'firebase/firestore';
import { AdminAvailability, AppointmentRequest, TimeSlot } from '../../../../_interfaces';
import { useTranslations } from 'next-intl';
import Icon from '../../../../_components/Icon';
import { mdiCalendar, mdiClock, mdiClose, mdiChevronLeft, mdiChevronRight, mdiAlertCircle } from '@mdi/js';
import { toast } from 'sonner';
import { formatDateToLocalString } from '../../../../_utils/dateUtils';

interface AppointmentBookingFormProps {
  availability: AdminAvailability[];
  studentDocId: string;
  studentName: string;
  studentClass?: string;
  studentShift?: string;
  authUid: string;
  onClose: () => void;
  onSuccess: () => void;
}

const AppointmentBookingForm: React.FC<AppointmentBookingFormProps> = ({
  availability,
  studentDocId,
  studentName,
  studentClass,
  studentShift,
  authUid,
  onClose,
  onSuccess,
}) => {
  const t = useTranslations('student.mockExam.appointments');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<AdminAvailability | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<{ [date: string]: string[] }>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [validationError, setValidationError] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    loadBookedSlots();
  }, []);

  const loadBookedSlots = async () => {
    try {
      const appointmentsQuery = query(
        collection(db, 'appointmentRequests'),
        where('status', 'in', ['pending', 'approved'])
      );
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      
      const slots: { [date: string]: string[] } = {};
      appointmentsSnapshot.docs.forEach(doc => {
        const appointment = doc.data() as AppointmentRequest;
        const dateKey = appointment.appointmentDate;
        if (!slots[dateKey]) {
          slots[dateKey] = [];
        }
        slots[dateKey].push(appointment.appointmentTime);
      });
      
      setBookedSlots(slots);
    } catch (error) {
      console.error('Error loading booked slots:', error);
    }
  };

  // Generate calendar days for the current month
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Add empty slots for days before the month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentMonth]);

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !selectedAvailability) return [];
    
    // Format date as YYYY-MM-DD in local timezone
    const dateKey = formatDateToLocalString(selectedDate);
    
    const bookedTimes = bookedSlots[dateKey] || [];
    const now = new Date();
    
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = selectedAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = selectedAvailability.endTime.split(':').map(Number);
    
    let currentTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const minute = currentTime % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Check if slot meets minimum prior hours requirement
      let isAvailable = !bookedTimes.includes(timeString);
      
      if (isAvailable && selectedAvailability.minPriorHours > 0) {
        const slotDateTime = new Date(selectedDate);
        slotDateTime.setHours(hour, minute, 0, 0);
        const hoursDifference = (slotDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (hoursDifference < selectedAvailability.minPriorHours) {
          isAvailable = false;
        }
      }
      
      slots.push({
        time: timeString,
        available: isAvailable,
      });
      
      currentTime += selectedAvailability.slotDuration;
    }
    
    return slots;
  }, [selectedDate, selectedAvailability, bookedSlots]);

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return; // Don't allow past dates

    // Format date as YYYY-MM-DD in local timezone to match admin's date format
    const dateKey = formatDateToLocalString(date);
    
    const availabilityForDate = availability.find(a => a.date === dateKey && a.isActive);

    if (!availabilityForDate) return; // Admin not available on this date

    setSelectedDate(date);
    setSelectedAvailability(availabilityForDate);
    setSelectedTime('');
    setValidationError('');
    setIsAnimating(true);

    // Start the slide animation
    setTimeout(() => {
      setShowTimePicker(true);
      setIsAnimating(false);
    }, 150);
  };

  const handleTimeClick = (timeSlot: TimeSlot) => {
    if (!timeSlot.available) return;
    setSelectedTime(timeSlot.time);
    setValidationError('');
  };

  const handleBackToCalendar = () => {
    setIsAnimating(true);
    setTimeout(() => {
      setShowTimePicker(false);
      setSelectedTime('');
      setIsAnimating(false);
    }, 150);
  };

  const validateForm = (): boolean => {
    if (!selectedDate) {
      setValidationError(t('validation.dateRequired'));
      return false;
    }
    if (!selectedTime) {
      setValidationError(t('validation.timeRequired'));
      return false;
    }

    // Check minimum prior hours requirement
    if (selectedAvailability && selectedAvailability.minPriorHours > 0) {
      const appointmentDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':').map(Number);
      appointmentDateTime.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      const hoursDifference = (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      if (hoursDifference < selectedAvailability.minPriorHours) {
        const minHours = selectedAvailability.minPriorHours;
        if (minHours >= 24) {
          const days = Math.floor(minHours / 24);
          setValidationError(`You must book at least ${days} day${days !== 1 ? 's' : ''} before the appointment time.`);
        } else {
          setValidationError(`You must book at least ${minHours} hour${minHours !== 1 ? 's' : ''} before the appointment time.`);
        }
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    try {
      // Format date as YYYY-MM-DD in local timezone
      const formattedDate = formatDateToLocalString(selectedDate!);
      
      const appointmentData: Omit<AppointmentRequest, 'id'> = {
        studentId: studentDocId,
        studentName,
        ...(studentClass && { studentClass }),
        ...(studentShift && { studentShift }),
        authUid,
        availabilityId: selectedAvailability!.id,
        appointmentDate: formattedDate,
        appointmentTime: selectedTime,
        duration: selectedAvailability!.slotDuration,
        status: 'pending',
        requestedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'appointmentRequests'), appointmentData);
      
      // Reload booked slots to update calendar
      await loadBookedSlots();
      
      toast.success(t('messages.requestSuccess'), {
        description: t('messages.requestSuccessDescription'),
        duration: 4000,
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error submitting appointment request:', error);
      toast.error(t('messages.requestError'), {
        description: t('messages.requestErrorDescription'),
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDateAvailable = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return false;
    
    // Format date as YYYY-MM-DD in local timezone
    const dateKey = formatDateToLocalString(date);
    
    return availability.some(a => a.date === dateKey && a.isActive);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold tracking-tight truncate">{t('bookAppointment')}</h2>
              <p className="text-purple-100/80 mt-1 text-base font-medium">{t('bookWithAdmin')}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200 ml-3 flex-shrink-0"
            >
              <Icon path={mdiClose} size={24} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Calendar */}
          <div className={`transition-opacity duration-300 ease-in-out ${
            showTimePicker ? 'opacity-0 pointer-events-none hidden' : 'opacity-100'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <Icon path={mdiCalendar} size={20} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="font-medium">{t('selectDate')}</span>
                </h3>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-1">
                  <button
                    onClick={goToPreviousMonth}
                    className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  >
                    <Icon path={mdiChevronLeft} size={18} />
                  </button>
                  <span className="font-semibold text-sm min-w-[120px] text-center text-gray-900 dark:text-white px-2">
                    {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                  <button
                    onClick={goToNextMonth}
                    className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  >
                    <Icon path={mdiChevronRight} size={18} />
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                <div className="grid grid-cols-7 gap-2 mb-3">
                  {/* Day headers */}
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                    <div key={day} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {/* Calendar days */}
                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }
                    
                    const isAvailable = isDateAvailable(date);
                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                    const isToday = new Date().toDateString() === date.toDateString();
                    const hasTimeSelected = isSelected && selectedTime;
                    
                    return (
                      <div key={index} className="relative">
                        <button
                          onClick={() => isAvailable && handleDateClick(date)}
                          disabled={!isAvailable}
                          className={`aspect-square rounded-xl font-semibold transition-all duration-200 text-sm min-h-[44px] w-full ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-lg scale-105'
                              : isAvailable
                              ? 'bg-white dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/50 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:shadow-md hover:scale-105'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          } ${isToday && !isSelected ? 'ring-2 ring-purple-300 dark:ring-purple-600' : ''}`}
                        >
                          {date.getDate()}
                        </button>
                        {hasTimeSelected && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-gray-900 shadow-sm"></div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Time Picker */}
          <div className={`transition-opacity duration-300 ease-in-out ${
            showTimePicker ? 'opacity-100' : 'opacity-0 pointer-events-none hidden'
          }`}>
            {showTimePicker && selectedDate && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToCalendar}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200"
                    >
                      <Icon path={mdiChevronLeft} size={20} />
                    </button>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                          <Icon path={mdiClock} size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <span className="font-medium">{t('selectTime')}</span>
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 font-medium">
                        {selectedDate.toLocaleDateString('en-US', {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6">
                  {/* Show minimum prior hours requirement */}
                  {selectedAvailability && selectedAvailability.minPriorHours > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <div className="flex items-start gap-2">
                        <Icon path={mdiAlertCircle} size={18} className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                          {selectedAvailability.minPriorHours >= 24 
                            ? `Please book at least ${Math.floor(selectedAvailability.minPriorHours / 24)} day${Math.floor(selectedAvailability.minPriorHours / 24) !== 1 ? 's' : ''} in advance`
                            : `Please book at least ${selectedAvailability.minPriorHours} hour${selectedAvailability.minPriorHours !== 1 ? 's' : ''} in advance`
                          }
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {availableTimeSlots.length === 0 ? (
                    <div className="text-center py-12">
                      <Icon path={mdiClock} size={48} className="text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400 font-medium">{t('noAvailableSlots')}</p>
                    </div>
                  ) : (
                    <div>
                      <div className="grid grid-cols-3 gap-3">
                        {availableTimeSlots.map(slot => (
                          <button
                            key={slot.time}
                            onClick={() => handleTimeClick(slot)}
                            disabled={!slot.available}
                            className={`py-4 px-4 rounded-xl font-semibold transition-all duration-200 text-base min-h-[56px] whitespace-normal text-center ${
                              selectedTime === slot.time
                                ? 'bg-blue-600 text-white shadow-lg scale-105'
                                : slot.available
                                ? 'bg-white dark:bg-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/50 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white hover:shadow-md hover:scale-105'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed line-through'
                            }`}
                          >
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>



          {/* Selection Summary */}
          {selectedDate && selectedTime && (
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-2xl p-6 shadow-sm">
              <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-4 flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                Selected Appointment
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-purple-800 dark:text-purple-300">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <Icon path={mdiCalendar} size={16} className="text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="font-medium">{selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-purple-800 dark:text-purple-300">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                    <Icon path={mdiClock} size={16} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="font-medium">{selectedTime}</span>
                </div>
              </div>
            </div>
          )}

          {/* Validation Error */}
          {validationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-700/50 rounded-2xl p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <Icon path={mdiAlertCircle} size={16} className="text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-900 dark:text-red-200 mb-1">Please Fix This Issue</h4>
                  <p className="text-sm text-red-800 dark:text-red-300">{validationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 pt-2">
            {selectedDate && selectedTime && (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-base min-h-[56px] shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('submitting')}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Icon path={mdiCalendar} size={18} />
                    {t('submitRequest')}
                  </div>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 min-h-[56px] text-base shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBookingForm;
