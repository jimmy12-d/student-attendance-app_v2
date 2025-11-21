"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../../../../firebase-config';
import { collection, query, getDocs, addDoc, where, Timestamp, doc, getDoc } from 'firebase/firestore';
import { AdminAvailability, AppointmentRequest, TimeSlot, QuestionAnswer } from '../../../../_interfaces';
import { useTranslations } from 'next-intl';
import Icon from '../../../../_components/Icon';
import { mdiCalendar, mdiClock, mdiClose, mdiChevronLeft, mdiChevronRight, mdiAlertCircle, mdiCheckCircle, mdiArrowRight, mdiArrowLeft } from '@mdi/js';
import { toast } from 'sonner';
import { formatDateToLocalString } from '../../../../_utils/dateUtils';
import { countWords, meetsWordCountRequirement } from '../../../../_utils/wordCountUtils';

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
  
  // Step state: 1 = date/time, 2 = questions, 3 = confirmation
  const [currentStep, setCurrentStep] = useState(1);
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [selectedAvailability, setSelectedAvailability] = useState<AdminAvailability | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<{ [date: string]: string[] }>({});
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [validationError, setValidationError] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [actualStudentClass, setActualStudentClass] = useState<string | undefined>(studentClass);
  
  // Question-related states
  const [questionAnswers, setQuestionAnswers] = useState<{ [questionId: string]: string }>({});
  const [answerValidation, setAnswerValidation] = useState<{ [questionId: string]: any }>({});

  useEffect(() => {
    loadBookedSlots();
    fetchActualStudentClass();
  }, []);

  const fetchActualStudentClass = async () => {
    try {
      if (!studentDocId) return;
      
      const studentDoc = await getDoc(doc(db, 'students', studentDocId));
      
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        // Get actual class (like "12A") not just classType (like "Grade 12")
        const actualClass = data.class || data.className || studentClass;
        setActualStudentClass(actualClass);
      }
    } catch (error) {
      console.error('Error fetching student class:', error);
      // Fall back to studentClass prop if error
      setActualStudentClass(studentClass);
    }
  };

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
    
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentMonth]);

  // Get available time slots for selected date
  const availableTimeSlots = useMemo(() => {
    if (!selectedDate || !selectedAvailability) return [];
    
    const dateKey = formatDateToLocalString(selectedDate);
    const bookedTimes = bookedSlots[dateKey] || [];
    const now = new Date();
    
    const slots: TimeSlot[] = [];
    const [startHour, startMinute] = selectedAvailability.startTime.split(':').map(Number);
    const [endHour, endMinute] = selectedAvailability.endTime.split(':').map(Number);
    
    let downtimeStartMinutes: number | null = null;
    let downtimeEndMinutes: number | null = null;
    
    if (selectedAvailability.downtimeStart && selectedAvailability.downtimeEnd) {
      const [dtStartHour, dtStartMinute] = selectedAvailability.downtimeStart.split(':').map(Number);
      const [dtEndHour, dtEndMinute] = selectedAvailability.downtimeEnd.split(':').map(Number);
      downtimeStartMinutes = dtStartHour * 60 + dtStartMinute;
      downtimeEndMinutes = dtEndHour * 60 + dtEndMinute;
    }
    
    let currentTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const minute = currentTime % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      let isInDowntime = false;
      if (downtimeStartMinutes !== null && downtimeEndMinutes !== null) {
        isInDowntime = currentTime >= downtimeStartMinutes && currentTime < downtimeEndMinutes;
      }
      
      if (!isInDowntime) {
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
      }
      
      currentTime += selectedAvailability.slotDuration;
    }
    
    return slots;
  }, [selectedDate, selectedAvailability, bookedSlots]);

  const handleDateClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date < today) return;

    const dateKey = formatDateToLocalString(date);
    const availabilityForDate = availability.find(a => a.date === dateKey && a.isActive);

    if (!availabilityForDate) return;

    setSelectedDate(date);
    setSelectedAvailability(availabilityForDate);
    setSelectedTime('');
    setValidationError('');
    setShowTimePicker(true);
  };

  const handleTimeClick = (timeSlot: TimeSlot) => {
    if (!timeSlot.available) return;
    setSelectedTime(timeSlot.time);
    setValidationError('');
  };
  
  const handleNextToQuestions = () => {
    if (!selectedDate || !selectedTime) {
      setValidationError(t('form.dateAndTimeValidation'));
      return;
    }
    
    setValidationError('');
    
    if (selectedAvailability?.questions && selectedAvailability.questions.length > 0) {
      const validation: { [key: string]: any } = {};
      selectedAvailability.questions.forEach(q => {
        validation[q.id] = {
          count: 0,
          required: q.minWordCount,
          meets: q.minWordCount === 0
        };
      });
      setAnswerValidation(validation);
      setCurrentStep(2);
    } else {
      setCurrentStep(3);
    }
  };
  
  const handleNextToConfirmation = () => {
    if (!validateAnswers()) return;
    setCurrentStep(3);
  };
  
  const handleBackToDateTime = () => {
    setCurrentStep(1);
    setValidationError('');
  };
  
  const handleBackToQuestions = () => {
    setCurrentStep(2);
    setValidationError('');
  };

  const handleBackToCalendar = () => {
    setShowTimePicker(false);
    setSelectedTime('');
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setQuestionAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    const question = selectedAvailability?.questions?.find(q => q.id === questionId);
    if (question) {
      const validation = meetsWordCountRequirement(answer, question.minWordCount);
      
      setAnswerValidation(prev => ({
        ...prev,
        [questionId]: validation
      }));
    }
  };

  const validateAnswers = (): boolean => {
    if (!selectedAvailability?.questions || selectedAvailability.questions.length === 0) {
      return true;
    }
    
    for (const question of selectedAvailability.questions) {
      const answer = questionAnswers[question.id] || '';
      const validation = answerValidation[question.id];
      
      if (question.required && !answer.trim()) {
        setValidationError(t('form.answerValidation', { question: question.question }));
        return false;
      }
      
      if (answer.trim() && !validation?.meets) {
        setValidationError(t('form.wordCountValidation', { count: question.minWordCount }));
        return false;
      }
    }
    
    setValidationError('');
    return true;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const formattedDate = formatDateToLocalString(selectedDate!);
      
      const answers: QuestionAnswer[] = (selectedAvailability?.questions || []).map(question => {
        const answer = questionAnswers[question.id] || '';
        const counts = countWords(answer);
        const validation = meetsWordCountRequirement(answer, question.minWordCount);
        
        return {
          questionId: question.id,
          question: question.question,
          answer,
          wordCount: counts.total,
          meetsRequirement: validation.meets
        };
      });
      
      const appointmentData: Omit<AppointmentRequest, 'id'> = {
        studentId: studentDocId,
        studentName,
        ...(actualStudentClass && { studentClass: actualStudentClass }),
        ...(studentShift && { studentShift }),
        authUid,
        availabilityId: selectedAvailability!.id,
        appointmentDate: formattedDate,
        appointmentTime: selectedTime,
        duration: selectedAvailability!.slotDuration,
        answers: answers.length > 0 ? answers : undefined,
        status: 'pending',
        requestedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'appointmentRequests'), appointmentData);
      
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
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 max-w-4xl mx-auto">
      {/* Step indicator */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('form.bookAppointment')}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all"
          >
            <Icon path={mdiClose} size={20} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 1 ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>1</div>
            <span className="text-sm font-medium hidden sm:inline">{t('steps.dateAndTime')}</span>
          </div>
          <div className={`h-0.5 flex-1 ${currentStep >= 2 ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 2 ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>2</div>
            <span className="text-sm font-medium hidden sm:inline">{t('steps.questions')}</span>
          </div>
          <div className={`h-0.5 flex-1 ${currentStep >= 3 ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${currentStep >= 3 ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>3</div>
            <span className="text-sm font-medium hidden sm:inline">{t('steps.confirm')}</span>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {/* STEP 1: Date & Time Selection */}
        {currentStep === 1 && (
          <div className="space-y-6">
            {!showTimePicker ? (
              // Calendar View
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                    <Icon path={mdiCalendar} size={24} className="text-purple-600 dark:text-purple-400" />
                    <span>{t('form.selectDateTitle')}</span>
                  </h3>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-1">
                    <button onClick={goToPreviousMonth} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg">
                      <Icon path={mdiChevronLeft} size={18} />
                    </button>
                    <span className="font-semibold text-sm min-w-[120px] text-center px-2">
                      {currentMonth.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </span>
                    <button onClick={goToNextMonth} className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg">
                      <Icon path={mdiChevronRight} size={18} />
                    </button>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <div key={`day-${index}`} className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {calendarDays.map((date, index) => {
                      if (!date) return <div key={`empty-${index}`} className="aspect-square" />;
                      
                      const isAvailable = isDateAvailable(date);
                      const isSelected = selectedDate?.toDateString() === date.toDateString();
                      const isToday = new Date().toDateString() === date.toDateString();
                      
                      return (
                        <button
                          key={index}
                          onClick={() => isAvailable && handleDateClick(date)}
                          disabled={!isAvailable}
                          className={`aspect-square rounded-xl font-semibold transition-all text-sm min-h-[44px] ${
                            isSelected
                              ? 'bg-purple-600 text-white shadow-lg'
                              : isAvailable
                              ? 'bg-white dark:bg-gray-700 hover:bg-purple-50 dark:hover:bg-purple-900/50 border border-gray-200 dark:border-gray-600 hover:shadow-md'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                          } ${isToday && !isSelected ? 'ring-2 ring-purple-300' : ''}`}
                        >
                          {date.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              // Time Selection View
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <button onClick={handleBackToCalendar} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
                    <Icon path={mdiChevronLeft} size={20} />
                  </button>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3">
                      <Icon path={mdiClock} size={24} className="text-blue-600 dark:text-blue-400" />
                      <span>{t('form.selectTimeTitle')}</span>
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {selectedDate?.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6">
                  {selectedAvailability && selectedAvailability.minPriorHours > 0 && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        {selectedAvailability.minPriorHours >= 24 
                          ? t('form.bookInAdvance', { days: Math.floor(selectedAvailability.minPriorHours / 24) })
                          : t('form.bookInAdvanceHours', { hours: selectedAvailability.minPriorHours })
                        }
                      </p>
                    </div>
                  )}
                  
                  {availableTimeSlots.length === 0 ? (
                    <div className="text-center py-12">
                      <Icon path={mdiClock} size={48} className="text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">{t('form.noAvailableTimeSlots')}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {availableTimeSlots.map(slot => (
                        <button
                          key={slot.time}
                          onClick={() => handleTimeClick(slot)}
                          disabled={!slot.available}
                          className={`py-4 rounded-xl font-semibold transition-all text-base ${
                            selectedTime === slot.time
                              ? 'bg-blue-600 text-white shadow-lg'
                              : slot.available
                              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-blue-50 hover:text-gray-900 border border-gray-200 dark:border-gray-600 hover:shadow-md'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed line-through'
                          }`}
                        >
                          {slot.time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {validationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{validationError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                {t('form.cancel')}
              </button>
              <button
                onClick={handleNextToQuestions}
                disabled={!selectedDate || !selectedTime}
                className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {t('form.next')} <Icon path={mdiArrowRight} size={20} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Questions */}
        {currentStep === 2 && selectedAvailability?.questions && selectedAvailability.questions.length > 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                <Icon path={mdiAlertCircle} size={24} className="text-green-600 dark:text-green-400" />
                <span>{t('form.answerQuestionsTitle')}</span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('form.answerQuestionsDescription')}
              </p>
            </div>

            <div className="space-y-4">
              {selectedAvailability.questions.map((question, index) => (
                <div key={question.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                  <label className="text-sm font-semibold text-gray-900 dark:text-white mb-3 block">
                    {index + 1}. {question.question}
                  </label>
                  
                  <textarea
                    value={questionAnswers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    placeholder={t('form.answerPlaceholder')}
                    className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[120px]"
                  />
                  
                  {question.minWordCount > 0 && (
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className={answerValidation[question.id]?.meets ? 'text-green-600 dark:text-green-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}>
                        {t('form.wordsRequired')}: {answerValidation[question.id]?.count || 0}/{question.minWordCount}
                      </span>
                      {answerValidation[question.id]?.meets && (
                        <span className="text-green-600 dark:text-green-400 font-semibold">{t('form.valid')}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {validationError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl p-4">
                <p className="text-sm text-red-800 dark:text-red-200">{validationError}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBackToDateTime}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Icon path={mdiArrowLeft} size={20} /> {t('form.back')}
              </button>
              <button
                onClick={handleNextToConfirmation}
                className="flex-1 bg-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-purple-700 flex items-center justify-center gap-2"
              >
                {t('form.next')} <Icon path={mdiArrowRight} size={20} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Confirmation */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
                <Icon path={mdiCheckCircle} size={24} className="text-purple-600 dark:text-purple-400" />
                <span>{t('form.confirmTitle')}</span>
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {t('form.confirmDescription')}
              </p>
            </div>

            {/* Appointment Summary */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200/50 dark:border-purple-700/50 rounded-2xl p-6">
              <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-4">{t('form.appointmentDetails')}</h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-purple-800 dark:text-purple-300">
                  <Icon path={mdiCalendar} size={20} />
                  <span className="font-medium">
                    {selectedDate?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-purple-800 dark:text-purple-300">
                  <Icon path={mdiClock} size={20} />
                  <span className="font-medium">
                    {selectedTime}
                    {selectedAvailability && (
                      <>
                        {' - '}
                        {(() => {
                          const [hours, minutes] = selectedTime.split(':').map(Number);
                          const endMinutes = minutes + selectedAvailability.slotDuration;
                          const endHours = hours + Math.floor(endMinutes / 60);
                          const finalMinutes = endMinutes % 60;
                          return `${endHours.toString().padStart(2, '0')}:${finalMinutes.toString().padStart(2, '0')}`;
                        })()}
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Questions Summary */}
            {selectedAvailability?.questions && selectedAvailability.questions.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">{t('form.yourAnswers')}</h4>
                <div className="space-y-3">
                  {selectedAvailability.questions.map((question, index) => (
                    <div key={question.id} className="text-sm">
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {index + 1}. {question.question}
                      </p>
                      <p className="text-gray-600 dark:text-gray-400 pl-4">
                        {questionAnswers[question.id] || t('form.noAnswerProvided')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={selectedAvailability?.questions && selectedAvailability.questions.length > 0 ? handleBackToQuestions : handleBackToDateTime}
                disabled={isSubmitting}
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <Icon path={mdiArrowLeft} size={20} /> {t('form.back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {t('form.submitting')}
                  </>
                ) : (
                  <>
                    <Icon path={mdiCheckCircle} size={20} />
                    {t('form.confirmAndSubmit')}
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppointmentBookingForm;
