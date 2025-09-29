"use client";
import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAppSelector } from '../../../_stores/hooks';
import { db } from '../../../../firebase-config';
import { collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import Button from '../../../_components/Button';
import FormField from '@/app/_components/FormField';
import Icon from '@/app/_components/Icon';
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from 'yup';
import { toast } from 'sonner';
import CustomCombobox from '@/app/_components/CustomCombobox';
import { mdiAccountGroup, mdiClockOutline, mdiEmoticonSickOutline, mdiSend, mdiTextBoxOutline, mdiHelpCircleOutline, mdiCheckCircle, mdiClock, mdiAlertCircle } from '@mdi/js';
import { split } from 'split-khmer';


interface StudentData {
  shift?: string;
  class?: string;
}

type Props = {
  onSuccess?: () => void;
  studentData?: StudentData | null;
  allClassConfigs?: any;
};

export const LeaveEarlyRequestForm = ({ onSuccess, studentData, allClassConfigs }: Props) => {
  const t = useTranslations('student.attendance');
  const tCommon = useTranslations('common');
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentAuthUid = useAppSelector((state) => state.main.userUid);
  const userName = useAppSelector((state) => state.main.userName);

  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [pendingRequestData, setPendingRequestData] = useState<any>(null);
  const [isCheckingPending, setIsCheckingPending] = useState(true);

  // Check for existing pending leave early requests with real-time updates
  useEffect(() => {
    if (!studentAuthUid) {
      setIsCheckingPending(false);
      setHasPendingRequest(false);
      setPendingRequestData(null);
      return;
    }

    setIsCheckingPending(true);

    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, 'leaveEarlyRequests'),
      where('authUid', '==', studentAuthUid),
      where('date', '==', today),
      where('status', 'in', ['pending', 'requested']),
      orderBy('requestedAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        if (!querySnapshot.empty) {
          const requestDoc = querySnapshot.docs[0];
          setHasPendingRequest(true);
          setPendingRequestData({
            id: requestDoc.id,
            ...requestDoc.data()
          });
        } else {
          setHasPendingRequest(false);
          setPendingRequestData(null);
        }
      } catch (error) {
        console.error('Error processing pending requests snapshot:', error);
        setHasPendingRequest(false);
        setPendingRequestData(null);
      } finally {
        setIsCheckingPending(false);
      }
    }, (error) => {
      console.error('Error listening to pending requests:', error);
      setIsCheckingPending(false);
      setHasPendingRequest(false);
      setPendingRequestData(null);
    });

    // Cleanup function to unsubscribe from the snapshot listener
    return () => {
      unsubscribe();
    };
  }, [studentAuthUid]);

  const reasonOptions = [
    { value: 'Sickness', label: t('reasons.sickness'), icon: mdiEmoticonSickOutline },
    { value: 'Family Event', label: t('reasons.familyEvent'), icon: mdiAccountGroup },
    { value: 'Personal Matter', label: t('reasons.personalMatter'), icon: mdiClockOutline },
  ];

  // Function to get shift end time from class configuration
  const getShiftEndTime = (shift: string, studentClass: string): string => {
    if (!allClassConfigs || !studentClass || !shift) return '';
    
    const classId = studentClass.replace(/^Class\s+/i, '');
    const classConfig = allClassConfigs[classId];
    
    if (!classConfig?.shifts?.[shift]) return '';
    
    return classConfig.shifts[shift].endTime || '';
  };

  // Function to subtract minutes from time string
  const subtractMinutesFromTime = (timeString: string, minutesToSubtract: number): string => {
    if (!timeString) return '';
    
    try {
      const [hours, minutes] = timeString.split(':').map(Number);
      const totalMinutes = hours * 60 + minutes;
      const newTotalMinutes = totalMinutes - minutesToSubtract;
      
      if (newTotalMinutes < 0) return '00:00';
      
      const newHours = Math.floor(newTotalMinutes / 60);
      const newMinutes = newTotalMinutes % 60;
      
      return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating time:', error);
      return '';
    }
  };

  // Get preset leave times based on shift end time
  const getPresetLeaveTimes = () => {
    if (!studentData?.shift || !studentData?.class) return [];
    
    const endTime = getShiftEndTime(studentData.shift, studentData.class);
    if (!endTime) return [];
    
    return [
      {
        label: t('leaveEarly90Min', { time: subtractMinutesFromTime(endTime, 90) }),
        value: subtractMinutesFromTime(endTime, 90),
        minutes: 90
      },
      {
        label: t('leaveEarly1Hour', { time: subtractMinutesFromTime(endTime, 60) }),
        value: subtractMinutesFromTime(endTime, 60),
        minutes: 60
      },
      {
        label: t('leaveEarly30Min', { time: subtractMinutesFromTime(endTime, 30) }),
        value: subtractMinutesFromTime(endTime, 30),
        minutes: 30
      }
    ].filter(option => option.value !== ''); // Filter out invalid times
  };

  const validationSchema = Yup.object().shape({
    leaveTime: Yup.string().required(t('validation.leaveTimeRequired')),
    reason: Yup.string().required(t('validation.reasonRequired')),
    details: Yup.string()
      .required(t('validation.detailsRequired'))
      .test(
        'min-words',
        t('validation.detailsMinWords'),
        (value) => {
          const text = value || '';
          const hasKhmer = /[\u1780-\u17FF]/.test(text);
          if (hasKhmer) {
            return split(text).length >= 5;
          } else {
            return text.split(/\s+/).filter(Boolean).length >= 5;
          }
        }
      ),
  });

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    if (onSuccess) {
      onSuccess();
    }

    if (!studentDocId || !studentAuthUid) {
      toast.error(t('errorNotAuthenticated'));
      setSubmitting(false);
      return;
    }

    const { leaveTime, reason, details } = values;
    
    // Always use today's date for leave requests
    const today = new Date().toISOString().split('T')[0];

    const newLeaveEarlyRequest = {
      authUid: studentAuthUid,
      class: studentData?.class || '',
      date: today,
      leaveTime: leaveTime,
      reason: details,
      requestedAt: serverTimestamp(),
      shift: studentData?.shift || '',
      status: 'pending',
      studentId: studentDocId,
      studentName: userName
    };

    const submissionPromise = addDoc(collection(db, 'leaveEarlyRequests'), newLeaveEarlyRequest);

    toast.promise(submissionPromise, {
      loading: t('submittingLeaveRequest'),
      success: () => {
        resetForm({
          values: {
            leaveTime: '',
            reason: 'Personal Matter',
            details: '',
          }
        });
        setSubmitting(false);
        return t('leaveRequestSuccess');
      },
      error: (err) => {
        setSubmitting(false);
        console.error('Error submitting leave early request:', err);
        return t('leaveRequestError');
      },
    });
  };

  return (
    <div className="rounded-lg mb-4">
      {isCheckingPending ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Checking existing requests...</span>
        </div>
      ) : hasPendingRequest ? (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Icon path={mdiClock} className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
                {t('leaveEarlyPending')}
              </h3>
              <p className="text-amber-700 dark:text-amber-300 mb-4">
                {t('pendingMessage')}
              </p>
              
              {pendingRequestData && (
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Leave Time:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">{pendingRequestData.leaveTime}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600 dark:text-gray-400">Reason:</span>
                      <span className="ml-2 text-gray-900 dark:text-gray-100">{pendingRequestData.reason}</span>
                    </div>
                    <div className="md:col-span-2">
                      <span className="font-medium text-gray-600 dark:text-gray-400">Details:</span>
                      <p className="mt-1 text-gray-900 dark:text-gray-100">{pendingRequestData.details}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <Icon path={mdiAlertCircle} className="w-4 h-4" />
                <span>You can submit a new request once this one is reviewed.</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Formik
          initialValues={{
            leaveTime: '',
            reason: '',
            details: '',
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          validateOnBlur={true}
          validateOnChange={true}
        >
          {({ values, isSubmitting, setFieldValue }) => (

            <Form className="space-y-2">
            <FormField labelFor="leaveTime">
              {(fieldData) => (
                <div>
                  <label htmlFor="leaveTime" className="block mb-2 font-semibold text-gray-900 dark:text-white cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Icon path={mdiClockOutline} className="w-5 h-5 text-blue-500" />
                      <span>{t('leaveTime')}</span>
                    </div>
                  </label>
                  <Field id="leaveTime" name="leaveTime" type="time" {...fieldData} />
                  <ErrorMessage name="leaveTime" component="div" className="text-red-500 text-sm mt-1" />
                  {/* Preset time buttons */}
                  {getPresetLeaveTimes().length > 0 && (
                    <div className="mt-4">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium uppercase tracking-wide">
                        {t('quickSelect')}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {getPresetLeaveTimes().map((preset, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setFieldValue('leaveTime', preset.value)}
                            className="group relative p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-800/30 dark:hover:to-indigo-800/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          >
                            <div className="text-center">
                              <div className="text-lg font-bold text-blue-700 dark:text-blue-300 group-hover:text-blue-800 dark:group-hover:text-blue-200">
                                {preset.value}
                              </div>
                              <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                {index === 0 ? '1:30 early' : index === 1 ? '1 hour early' : '30 min early'}
                              </div>
                            </div>
                            <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-blue-200 dark:ring-blue-800 group-hover:ring-blue-300 dark:group-hover:ring-blue-700"></div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </FormField>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              <FormField labelFor="reason">
                {(fieldData) => (
                  <div>
                    <label htmlFor="reason" className="block mb-2 font-semibold text-gray-900 dark:text-white cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Icon path={mdiHelpCircleOutline} className="w-5 h-5 text-orange-500" />
                        <span>{t('reasonLabel')}</span>
                      </div>
                    </label>
                    <CustomCombobox
                      options={reasonOptions}
                      selectedValue={values.reason}
                      onChange={(value) => setFieldValue('reason', value)}
                      fieldData={fieldData}
                      id="reason"
                    />
                    <ErrorMessage name="reason" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                )}
              </FormField>

              <FormField labelFor="details" hasTextareaHeight>
                {(fieldData) => (
                  <div>
                    <label htmlFor="details" className="block mb-2 font-semibold text-gray-900 dark:text-white cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Icon path={mdiTextBoxOutline} className="w-5 h-5 text-green-500" />
                        <span>{t('detailsLabel')}</span>
                      </div>
                    </label>
                    <Field id="details" name="details" as="textarea" rows={1} {...fieldData} placeholder={t('leaveDetailsPlaceholder')} />
                    <ErrorMessage name="details" component="div" className="text-red-500 text-sm mt-1" />
                  </div>
                )}
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                color="company-purple"
                label={isSubmitting ? t('submitting') : tCommon('submit')}
                icon={mdiSend}
                disabled={isSubmitting}
              />
            </div>
          </Form>
        )}
      </Formik>
      )}
    </div>
  );
};