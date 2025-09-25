"use client";
import React from 'react';
import { useTranslations } from 'next-intl';
import { useAppSelector } from '../../../_stores/hooks';
import { db } from '../../../../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Button from '../../../_components/Button';
import FormField from '@/app/_components/FormField';
import { Field, Form, Formik, ErrorMessage } from "formik";
import * as Yup from 'yup';
import { toast } from 'sonner';
import CustomCombobox from '@/app/_components/CustomCombobox';
import { mdiHospital, mdiAccountGroup, mdiSchool, mdiClockOutline } from '@mdi/js';
import { mdiEmoticonSickOutline } from '@mdi/js';

type Props = {
  onSuccess?: () => void;
};

export const LeaveEarlyRequestForm = ({ onSuccess }: Props) => {
  const t = useTranslations('student.attendance');
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentAuthUid = useAppSelector((state) => state.main.userUid);
  const userName = useAppSelector((state) => state.main.userName);

  const reasonOptions = [
    { value: 'Sickness', label: t('reasons.sickness'), icon: mdiEmoticonSickOutline },
    { value: 'Family Event', label: t('reasons.familyEvent'), icon: mdiAccountGroup },
    { value: 'Medical Appointment', label: t('reasons.medicalAppointment'), icon: mdiHospital },
    { value: 'Personal Matter', label: t('reasons.personalMatter'), icon: mdiClockOutline },
  ];

  const validationSchema = Yup.object().shape({
    leaveDate: Yup.date().required(t('validation.leaveDateRequired')),
    leaveTime: Yup.string().required(t('validation.leaveTimeRequired')),
    reason: Yup.string().required(t('validation.reasonRequired')),
    details: Yup.string()
      .required(t('validation.detailsRequired'))
      .test(
        'min-words',
        t('validation.detailsMinWords'),
        (value) => (value || '').split(/\s+/).filter(Boolean).length >= 5
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

    const { leaveDate, leaveTime, reason, details } = values;

    const newLeaveEarlyRequest = {
      studentId: studentDocId,
      authUid: studentAuthUid,
      studentName: userName,
      reason: reason,
      details: details,
      leaveDate: leaveDate,
      leaveTime: leaveTime,
      status: 'pending',
      requestedAt: serverTimestamp(),
      type: 'leave_early'
    };

    const submissionPromise = addDoc(collection(db, 'leaveEarlyRequests'), newLeaveEarlyRequest);

    toast.promise(submissionPromise, {
      loading: t('submittingLeaveRequest'),
      success: () => {
        resetForm({
          values: {
            leaveDate: '',
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
      <Formik
        initialValues={{
          leaveDate: '',
          leaveTime: '',
          reason: 'Personal Matter',
          details: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, setFieldValue }) => (

          <Form className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <FormField label={t('leaveDate')} labelFor="leaveDate">
                {(fieldData) => (
                  <Field id="leaveDate" name="leaveDate" type="date" {...fieldData} />
                )}
              </FormField>
              <FormField label={t('leaveTime')} labelFor="leaveTime">
                {(fieldData) => (
                  <Field id="leaveTime" name="leaveTime" type="time" {...fieldData} />
                )}
              </FormField>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label={t('reasonLabel')} labelFor="reason">
                {(fieldData) => (
                  <CustomCombobox
                    options={reasonOptions}
                    selectedValue={values.reason}
                    onChange={(value) => setFieldValue('reason', value)}
                    fieldData={fieldData}
                    id="reason"
                  />
                )}
              </FormField>

              <FormField label={t('detailsLabel')} labelFor="details" hasTextareaHeight>
                {(fieldData) => (
                  <>
                    <Field id="details" name="details" as="textarea" {...fieldData} placeholder={t('leaveDetailsPlaceholder')} />
                    <ErrorMessage name="details" component="div" className="text-red-500 text-sm mt-1" />
                  </>
                )}
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                color="company-purple"
                label={isSubmitting ? t('submitting') : t('submitLeaveRequest')}
                disabled={isSubmitting}
              />
            </div>
          </Form>
        )}
      </Formik>

    </div>
  );
};