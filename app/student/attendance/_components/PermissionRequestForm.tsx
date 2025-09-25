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
import DurationSelector from './DurationSelector';
import CustomCombobox from '@/app/_components/CustomCombobox';
import { mdiHospital, mdiAccountGroup, mdiSchool } from '@mdi/js';
import { mdiEmoticonSickOutline } from '@mdi/js';

type Props = {
  onSuccess?: () => void;
};

export const PermissionRequestForm = ({ onSuccess }: Props) => {
  const t = useTranslations('student.attendance');
  const studentDocId = useAppSelector((state) => state.main.studentDocId);
  const studentAuthUid = useAppSelector((state) => state.main.userUid);
  const userName = useAppSelector((state) => state.main.userName);

  const reasonOptions = [
    { value: 'Sickness', label: t('reasons.sickness'), icon: mdiEmoticonSickOutline },
    { value: 'Family Event', label: t('reasons.familyEvent'), icon: mdiAccountGroup },
    { value: 'School', label: t('reasons.school'), icon: mdiSchool },
  ];

  const validationSchema = Yup.object().shape({
    permissionStartDate: Yup.date().required(t('validation.startDateRequired')),
    duration: Yup.number().min(1, t('validation.durationMin')).required(t('validation.durationRequired')),
    reason: Yup.string().required(t('validation.reasonRequired')),
    details: Yup.string()
      .required(t('validation.detailsRequired'))
      .test(
        'min-words',
        t('validation.detailsMinWords'),
        (value) => (value || '').split(/\s+/).filter(Boolean).length >= 10
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

    const { permissionStartDate, duration, reason, details } = values;

    const startDate = new Date(permissionStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);

    const newPermissionRequest = {
      studentId: studentDocId,
      authUid: studentAuthUid,
      studentName: userName,
      reason: reason,
      details: details,
      permissionStartDate: startDate.toISOString().split('T')[0],
      permissionEndDate: endDate.toISOString().split('T')[0],
      duration: duration,
      status: 'pending',
      requestedAt: serverTimestamp(),
    };

    const submissionPromise = addDoc(collection(db, 'permissions'), newPermissionRequest);

    toast.promise(submissionPromise, {
      loading: t('submittingRequest'),
      success: () => {
        resetForm({
          values: {
            permissionStartDate: '',
            duration: 4000,
            reason: '',
            details: '',
          }
        });
        setSubmitting(false);
        return t('requestSuccess');
      },
      error: (err) => {
        setSubmitting(false);
        console.error('Error submitting permission request:', err);
        return t('requestError');
      },
    });
  };

  return (
    <div className="rounded-lg mb-4">
      <Formik
        initialValues={{
          permissionStartDate: '',
          duration: 1,
          reason: 'School',
          details: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, isSubmitting, setFieldValue }) => (
          
          <Form className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              <FormField label={t('startDate')} labelFor="permissionStartDate">
                {(fieldData) => (
                  <Field id="permissionStartDate" name="permissionStartDate" type="date" {...fieldData} />
                )}
              </FormField>
              <FormField label={t('durationDays')} labelFor="duration">
                {() => (
                  <DurationSelector
                    value={values.duration}
                    onChange={(value) => setFieldValue('duration', value)}
                  />
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
                    <Field id="details" name="details" as="textarea" {...fieldData} placeholder={t('detailsPlaceholder')} />
                    <ErrorMessage name="details" component="div" className="text-red-500 text-sm mt-1" />
                  </>
                )}
              </FormField>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                color="company-purple"
                label={isSubmitting ? t('submitting') : t('submitRequest')}
                disabled={isSubmitting}
              />
            </div>
          </Form>
        )}
      </Formik>

    </div>
  );
}; 