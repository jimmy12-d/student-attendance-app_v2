"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/firebase-config';
import { doc, getDoc } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import Icon from '@/app/_components/Icon';
import { mdiArrowLeft, mdiCheckCircle, mdiCloseCircle, mdiClockOutline, mdiDownload, mdiFileDocument } from '@mdi/js';
import { useTranslations } from 'next-intl';

interface FormAnswer {
  questionId: string;
  answer: string | string[];
  fileUrls?: string[];
  fileNames?: string[];
}

interface FormResponse {
  id: string;
  formId: string;
  studentId: string;
  studentName: string;
  studentUid: string;
  authUid: string;
  answers: FormAnswer[];
  submittedAt: Timestamp;
  class?: string;
  shift?: string;
  classType?: string;
  approvalStatus?: string;
  registrationStatus?: string;
}

interface Question {
  id: string;
  text: string;
  type: string;
  required: boolean;
  options?: string[];
}

interface Form {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  sections?: Array<{
    id: string;
    title: string;
    questions: Question[];
  }>;
}

const ViewResponsePage = () => {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('student.forms');
  
  const formId = params.formId as string;
  const responseId = params.responseId as string;
  
  const [form, setForm] = useState<Form | null>(null);
  const [response, setResponse] = useState<FormResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch form
        const formDoc = await getDoc(doc(db, 'forms', formId));
        if (formDoc.exists()) {
          setForm({ id: formDoc.id, ...formDoc.data() } as Form);
        }

        // Fetch response
        const responseDoc = await getDoc(doc(db, 'form_responses', responseId));
        if (responseDoc.exists()) {
          setResponse({ id: responseDoc.id, ...responseDoc.data() } as FormResponse);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [formId, responseId]);

  const getQuestionText = (questionId: string): string => {
    if (!form) return '';
    
    // Check in sections
    if (form.sections) {
      for (const section of form.sections) {
        const question = section.questions?.find(q => q.id === questionId);
        if (question) return question.text;
      }
    }
    
    // Check in top-level questions
    const question = form.questions?.find(q => q.id === questionId);
    return question?.text || 'Question not found';
  };

  const getQuestionType = (questionId: string): string => {
    if (!form) return 'text';
    
    // Check in sections
    if (form.sections) {
      for (const section of form.sections) {
        const question = section.questions?.find(q => q.id === questionId);
        if (question) return question.type;
      }
    }
    
    // Check in top-level questions
    const question = form.questions?.find(q => q.id === questionId);
    return question?.type || 'text';
  };

  const formatAnswer = (answer: FormAnswer) => {
    const questionType = getQuestionType(answer.questionId);
    
    // Handle file uploads
    if (questionType === 'file_upload' && answer.fileUrls && answer.fileUrls.length > 0) {
      return (
        <div className="space-y-2">
          {answer.fileUrls.map((url, index) => (
            <a
              key={index}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors text-blue-700 dark:text-blue-300 text-sm"
            >
              <Icon path={mdiFileDocument} size={16} />
              <span className="flex-1">{answer.fileNames?.[index] || `File ${index + 1}`}</span>
              <Icon path={mdiDownload} size={16} />
            </a>
          ))}
        </div>
      );
    }
    
    // Handle arrays (checkboxes, etc.)
    if (Array.isArray(answer.answer)) {
      return (
        <ul className="list-disc list-inside space-y-1">
          {answer.answer.map((item, index) => (
            <li key={index} className="text-gray-900 dark:text-white">{item}</li>
          ))}
        </ul>
      );
    }
    
    // Handle regular text answers
    return <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{answer.answer || 'No answer provided'}</p>;
  };

  const getStatusBadge = () => {
    const status = response?.registrationStatus || response?.approvalStatus;
    
    if (status === 'approved') {
      return (
        <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-medium flex items-center gap-2">
          <Icon path={mdiCheckCircle} size={16} />
          Approved
        </span>
      );
    }
    
    if (status === 'pending') {
      return (
        <span className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-700 dark:text-amber-300 rounded-lg text-sm font-medium flex items-center gap-2">
          <Icon path={mdiClockOutline} size={16} />
          Pending
        </span>
      );
    }
    
    if (status === 'rejected') {
      return (
        <span className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium flex items-center gap-2">
          <Icon path={mdiCloseCircle} size={16} />
          Rejected
        </span>
      );
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  if (!form || !response) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Response not found</h2>
          <button
            onClick={() => router.back()}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 pb-20">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Icon path={mdiArrowLeft} size={24} className="text-gray-900 dark:text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{form.title}</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Submitted on {response.submittedAt.toDate().toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              })}
            </p>
          </div>
          {getStatusBadge()}
        </div>

        {/* Response Content */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-6 space-y-6">
            {form.description && (
              <div className="pb-6 border-b border-gray-200 dark:border-gray-800">
                <p className="text-gray-600 dark:text-gray-400">{form.description}</p>
              </div>
            )}

            {response.answers.map((answer, index) => (
              <div key={answer.questionId} className="pb-6 border-b border-gray-200 dark:border-gray-800 last:border-b-0 last:pb-0">
                <div className="mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-500">Question {index + 1}</span>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                    {getQuestionText(answer.questionId)}
                  </h3>
                </div>
                <div className="mt-2">
                  {formatAnswer(answer)}
                </div>
              </div>
            ))}

            {response.answers.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No answers found
              </div>
            )}
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Submission Details</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Student Name:</span>
              <p className="text-gray-900 dark:text-white font-medium">{response.studentName}</p>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400">Student ID:</span>
              <p className="text-gray-900 dark:text-white font-medium">{response.studentId}</p>
            </div>
            {response.class && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Class:</span>
                <p className="text-gray-900 dark:text-white font-medium">{response.class}</p>
              </div>
            )}
            {response.shift && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Shift:</span>
                <p className="text-gray-900 dark:text-white font-medium">{response.shift}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewResponsePage;
