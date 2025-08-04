'use client';

import React from 'react';
import { db } from '../../../../firebase-config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import Button from '../../../_components/Button';
import FormField from '../../../_components/FormField';
import { Field, Form, Formik } from "formik";
import * as Yup from 'yup';
import CustomSingleSelectDropdown from '../../../_components/CustomSingleSelectDropdown';
import { toast } from 'sonner';
import DurationSelector from '../../../student/_components/DurationSelector';
import { Student } from '../../../_interfaces';

interface AdminPermissionFormProps {
  student: Student;
  onSuccess?: () => void;
}

export function AdminPermissionForm({ student, onSuccess }: AdminPermissionFormProps) {
  const reasonOptions = [
    { value: 'Sickness', label: 'Sickness' },
    { value: 'Family Event', label: 'Family Event' },
    { value: 'Appointment', label: 'Appointment' },
  ];

  const validationSchema = Yup.object().shape({
    permissionStartDate: Yup.date().required('Start date is required'),
    duration: Yup.number()
      .required('Duration is required')
      .min(1, 'Duration must be at least 1 day'),
    reason: Yup.string().required('Reason is required'),
    details: Yup.string().required('Details are required'),
  });

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    const { permissionStartDate, duration, reason, details } = values;

    const startDate = new Date(permissionStartDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + duration - 1);

    const newPermissionRequest = {
      studentId: student.id,
      studentName: student.fullName,
      reason: reason,
      details: details,
      permissionStartDate: startDate.toISOString().split('T')[0],
      permissionEndDate: endDate.toISOString().split('T')[0],
      duration: duration,
      status: 'approved', // Always approved for admin-created permissions
      requestDate: serverTimestamp(),
      approvedBy: 'admin', // Mark as admin-approved
    };

    const submissionPromise = addDoc(collection(db, 'permissions'), newPermissionRequest);

    toast.promise(submissionPromise, {
      loading: 'Creating permission...',
      success: () => {
        resetForm({
          values: {
            permissionStartDate: '',
            duration: 1,
            reason: '',
            details: '',
          }
        });
        setSubmitting(false);
        if (onSuccess) {
          onSuccess();
        }
        return 'Permission created successfully!';
      },
      error: (err) => {
        setSubmitting(false);
        console.error('Error creating permission:', err);
        return 'An error occurred. Please try again.';
      },
    });
  };

  return (
    <div className="bg-white dark:bg-slate-700 rounded-lg">
      <Formik
        initialValues={{
          permissionStartDate: '',
          duration: 1,
          reason: '',
          details: '',
        }}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldValue, isSubmitting }) => (
          <Form className="space-y-4">
            <FormField label="Start Date" labelFor="permissionStartDate">
              {(fieldData) => (
                <Field
                  id="permissionStartDate"
                  name="permissionStartDate"
                  type="date"
                  {...fieldData}
                />
              )}
            </FormField>

            <FormField label="Duration (days)" labelFor="duration">
              {() => (
                <DurationSelector
                  value={values.duration}
                  onChange={(duration: number) => setFieldValue('duration', duration)}
                />
              )}
            </FormField>

            <FormField label="Reason" labelFor="reason">
              {() => (
                <CustomSingleSelectDropdown
                  options={reasonOptions}
                  selectedValue={values.reason}
                  onChange={(value: string) => setFieldValue('reason', value)}
                  placeholder="Select a reason"
                />
              )}
            </FormField>

            <FormField label="Details" labelFor="details">
              {(fieldData) => (
                <Field
                  id="details"
                  name="details"
                  as="textarea"
                  rows={3}
                  {...fieldData}
                  placeholder="Enter additional details..."
                />
              )}
            </FormField>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                color="success"
                className="flex-1"
              >
                {isSubmitting ? 'Creating...' : 'Create Permission'}
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
}
