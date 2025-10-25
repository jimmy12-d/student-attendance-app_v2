"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { 
  doc, 
  getDoc, 
  addDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  Timestamp,
  updateDoc,
  arrayUnion
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase-config";
import { Form, Question, FormAnswer, FormResponse, FormSection } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import { 
  mdiArrowLeft, 
  mdiSend, 
  mdiCheckCircle, 
  mdiFormSelect,
  mdiAlertCircle,
  mdiClockOutline,
  mdiFileUpload,
  mdiFileDocument,
  mdiClose,
  mdiLoading,
  mdiTrophy,
  mdiGauge
} from "@mdi/js";
import { toast } from "sonner";
import { useAppSelector } from "@/app/_stores/hooks";
import { Nokora } from 'next/font/google';
import ScoreInputQuestion from "../_components/ScoreInputQuestion";
import { useTranslations } from 'next-intl';

const nokora = Nokora({ weight: '400', subsets: ['khmer'] });

const StudentFormFillerPage = () => {
  const router = useRouter();
  const params = useParams();
  const formId = params?.formId as string;
  const t = useTranslations('student.forms');

  const { studentUid, studentName, studentDocId } = useAppSelector((state) => ({
    studentUid: state.main.userUid,
    studentName: state.main.userName,
    studentDocId: state.main.studentDocId,
  }));

  const [form, setForm] = useState<Form | null>(null);
  const [answers, setAnswers] = useState<{ [questionId: string]: string | string[] }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuestion, setShowQuestion] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ [questionId: string]: string }>({});
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [uploadedFiles, setUploadedFiles] = useState<{ [questionId: string]: File[] }>({});
  const [uploadingFiles, setUploadingFiles] = useState<{ [questionId: string]: boolean }>({});
  const [fileUrls, setFileUrls] = useState<{ [questionId: string]: string[] }>({});
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!studentUid) {
      router.push("/login");
      return;
    }
    loadForm();
    checkSubmissionStatus();
    loadStudentData();
  }, [formId, studentUid]);

  const loadForm = async () => {
    try {
      const formDoc = await getDoc(doc(db, "forms", formId));
      if (!formDoc.exists()) {
        toast.error("Form not found");
        router.push("/student/attendance");
        return;
      }

      const formData = formDoc.data() as Form;
      
      // Check if form is active (when active, it bypasses deadline)
      if (!formData.isActive) {
        toast.error("This form is not currently active");
        router.push("/student/attendance");
        return;
      }

      // Load student data if not already loaded
      let currentStudentData = studentData;
      if (!studentData && studentDocId) {
        const studentDoc = await getDoc(doc(db, "students", studentDocId));
        if (studentDoc.exists()) {
          currentStudentData = studentDoc.data();
          setStudentData(currentStudentData);
        }
      }

      // Check if student can access this form based on class type
      const studentClassType = currentStudentData?.classType;
      if (formData.targetClassTypes && formData.targetClassTypes.length > 0) {
        if (!studentClassType || !formData.targetClassTypes.includes(studentClassType)) {
          toast.error("You don't have permission to access this form");
          router.push("/student/attendance");
          return;
        }
      }

      setForm({ ...formData, id: formDoc.id });
    } catch (error) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  // Get all questions (flattened from sections or direct questions)
  const getAllQuestions = (): Question[] => {
    if (!form) return [];
    
    // If form uses sections, flatten all questions from all sections
    if (form.sections && form.sections.length > 0) {
      return form.sections.flatMap(section => section.questions);
    }
    
    // Otherwise, use direct questions array (backward compatibility)
    return form.questions || [];
  };

  // Filter questions based on student's class type (for backward compatibility with old question-based forms)
  const getVisibleQuestions = (): Question[] => {
    // If form uses sections, only return questions from visible sections
    if (form?.sections && form.sections.length > 0) {
      const visibleSections = getVisibleSections();
      return visibleSections.flatMap(section => section.questions);
    }
    
    // Otherwise, use direct questions array (backward compatibility)
    return form?.questions || [];
  };

  // Get visible sections filtered by student's class type
  const getVisibleSections = (): FormSection[] => {
    if (!form || !form.sections) return [];
    
    const studentClassType = studentData?.classType;
    
    // Filter sections based on targetClassTypes at section level
    return form.sections.filter(section => {
      // If section has no targetClassTypes, it's visible to all
      if (!section.targetClassTypes || section.targetClassTypes.length === 0) {
        return true;
      }
      // If student has a classType, check if it's in the section's targetClassTypes
      if (studentClassType && section.targetClassTypes.includes(studentClassType)) {
        return true;
      }
      // Otherwise, hide this section
      return false;
    });
  };

  const checkSubmissionStatus = async () => {
    try {
      const responseQuery = query(
        collection(db, "form_responses"),
        where("formId", "==", formId),
        where("studentUid", "==", studentUid)
      );
      const responseSnap = await getDocs(responseQuery);
      setHasSubmitted(!responseSnap.empty);
    } catch (error) {
      console.error("Error checking submission status:", error);
    }
  };

  const loadStudentData = async () => {
    if (!studentDocId) return;
    try {
      const studentDoc = await getDoc(doc(db, "students", studentDocId));
      if (studentDoc.exists()) {
        setStudentData(studentDoc.data());
      }
    } catch (error) {
      console.error("Error loading student data:", error);
    }
  };

  // Helper function to calculate grade based on percentage (same as ScoreInputQuestion)
  const getGrade = (percentage: number): { grade: string; color: string; bgColor: string; borderColor: string } => {
    if (percentage >= 0.9) return { 
      grade: 'A', 
      color: 'text-green-700 dark:text-green-300', 
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      borderColor: 'border-green-500 dark:border-green-400'
    };
    if (percentage >= 0.8) return { 
      grade: 'B', 
      color: 'text-blue-700 dark:text-blue-300', 
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      borderColor: 'border-blue-500 dark:border-blue-400'
    };
    if (percentage >= 0.7) return { 
      grade: 'C', 
      color: 'text-yellow-700 dark:text-yellow-300', 
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      borderColor: 'border-yellow-500 dark:border-yellow-400'
    };
    if (percentage >= 0.6) return { 
      grade: 'D', 
      color: 'text-orange-700 dark:text-orange-300', 
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      borderColor: 'border-orange-500 dark:border-orange-400'
    };
    if (percentage >= 0.5) return { 
      grade: 'E', 
      color: 'text-gray-700 dark:text-gray-300', 
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      borderColor: 'border-gray-500 dark:border-gray-400'
    };
    return { 
      grade: 'F', 
      color: 'text-red-700 dark:text-red-300', 
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      borderColor: 'border-red-500 dark:border-red-400'
    };
  };

  const handleAnswerChange = (questionId: string, value: string | string[]) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Real-time validation
    const allQuestions = getAllQuestions();
    const question = allQuestions.find(q => q.id === questionId);
    if (question) {
      let error = '';
      
      if (question.required) {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          error = 'This field is required';
        } else if (typeof value === 'string' && !value.trim()) {
          error = 'This field cannot be empty';
        }
      }
      
      setValidationErrors(prev => ({ ...prev, [questionId]: error }));
      
      // Track completed questions
      const newCompleted = new Set(completedQuestions);
      if (error) {
        newCompleted.delete(questionId);
      } else if (value && (!Array.isArray(value) || value.length > 0)) {
        newCompleted.add(questionId);
      }
      setCompletedQuestions(newCompleted);
    }
  };

  const handleCheckboxChange = (questionId: string, optionValue: string) => {
    setAnswers(prev => {
      const currentAnswers = (prev[questionId] as string[]) || [];
      const isCurrentlyChecked = currentAnswers.includes(optionValue);
      const newAnswers = isCurrentlyChecked
        ? currentAnswers.filter(v => v !== optionValue)
        : [...currentAnswers, optionValue];

      // Real-time validation
      const allQuestions = getAllQuestions();
      const question = allQuestions.find(q => q.id === questionId);
      if (question) {
        let error = '';

        if (question.required) {
          if (!newAnswers || newAnswers.length === 0) {
            error = 'This field is required';
          }
        }

        setValidationErrors(prev => ({ ...prev, [questionId]: error }));

        // Track completed questions
        const newCompleted = new Set(completedQuestions);
        if (error) {
          newCompleted.delete(questionId);
        } else if (newAnswers && newAnswers.length > 0) {
          newCompleted.add(questionId);
        }
        setCompletedQuestions(newCompleted);
      }

      return { ...prev, [questionId]: newAnswers };
    });
  };

  const handleFileChange = async (questionId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const allQuestions = getAllQuestions();
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) return;

    const maxFiles = question.maxFiles || 1;
    const maxFileSize = (question.maxFileSize || 5) * 1024 * 1024; // Convert MB to bytes
    const acceptedTypes = question.acceptedFileTypes || [];

    // Validate file count
    const currentFiles = uploadedFiles[questionId] || [];
    const totalFiles = currentFiles.length + files.length;
    if (totalFiles > maxFiles) {
      setValidationErrors(prev => ({ 
        ...prev, 
        [questionId]: `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed` 
      }));
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Check file size
      if (file.size > maxFileSize) {
        toast.error(`File "${file.name}" exceeds maximum size of ${question.maxFileSize || 5}MB`);
        continue;
      }

      // Check file type if specified
      if (acceptedTypes.length > 0) {
        const fileType = file.type;
        const isValidType = acceptedTypes.some(acceptedType => {
          if (acceptedType.endsWith('/*')) {
            const category = acceptedType.split('/')[0];
            return fileType.startsWith(category + '/');
          }
          return fileType === acceptedType;
        });

        if (!isValidType) {
          toast.error(`File "${file.name}" type not accepted`);
          continue;
        }
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setUploadedFiles(prev => ({
        ...prev,
        [questionId]: [...(prev[questionId] || []), ...validFiles]
      }));

      // Clear validation error
      setValidationErrors(prev => ({ ...prev, [questionId]: '' }));

      // Mark as completed if not required or has files
      const newCompleted = new Set(completedQuestions);
      newCompleted.add(questionId);
      setCompletedQuestions(newCompleted);

      toast.success(`${validFiles.length} file${validFiles.length > 1 ? 's' : ''} added`);
    }
  };

  const handleRemoveFile = (questionId: string, fileIndex: number) => {
    setUploadedFiles(prev => {
      const currentFiles = prev[questionId] || [];
      const newFiles = currentFiles.filter((_, index) => index !== fileIndex);
      
      // Update validation
      const allQuestions = getAllQuestions();
      const question = allQuestions.find(q => q.id === questionId);
      if (question?.required && newFiles.length === 0) {
        setValidationErrors(prevErrors => ({ 
          ...prevErrors, 
          [questionId]: 'This field is required' 
        }));
        setCompletedQuestions(prevCompleted => {
          const newCompleted = new Set(prevCompleted);
          newCompleted.delete(questionId);
          return newCompleted;
        });
      }

      return { ...prev, [questionId]: newFiles };
    });
  };

  const uploadFilesToStorage = async (questionId: string, files: File[]): Promise<string[]> => {
    const uploadPromises = files.map(async (file) => {
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `form_responses/${formId}/${questionId}/${timestamp}_${sanitizedFileName}`;
      const storageRef = ref(storage, storagePath);
      
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    });

    return Promise.all(uploadPromises);
  };

  const validateAnswers = (): boolean => {
    if (!form) return false;

    let hasErrors = false;
    const newErrors: { [questionId: string]: string } = {};
    const visibleQuestions = getVisibleQuestions();

    for (const question of visibleQuestions) {
      if (question.required) {
        if (question.type === 'file_upload') {
          // Validate file upload questions
          const files = uploadedFiles[question.id];
          if (!files || files.length === 0) {
            newErrors[question.id] = 'This field is required';
            hasErrors = true;
          }
        } else if (question.type === 'score_input') {
          // Validate score input questions - must be greater than 0
          const answer = answers[question.id];
          const score = Number(answer);
          if (!answer || score <= 0) {
            newErrors[question.id] = t('scoreSummary.scoreMustBeGreaterThanZero');
            hasErrors = true;
          }
        } else {
          // Validate other question types
          const answer = answers[question.id];
          if (!answer || (Array.isArray(answer) && answer.length === 0)) {
            newErrors[question.id] = 'This field is required';
            hasErrors = true;
          } else if (typeof answer === 'string' && !answer.trim()) {
            newErrors[question.id] = 'This field cannot be empty';
            hasErrors = true;
          }
        }
      }
    }

    setValidationErrors(newErrors);
    return !hasErrors;
  };

  // Check if form has score input questions
  const hasScoreInputs = () => {
    const visibleQuestions = getVisibleQuestions();
    return visibleQuestions.some(q => q.type === 'score_input');
  };

  // Handle pre-submit confirmation
  const handleSubmitClick = () => {
    if (!validateAnswers()) return;
    
    // Show confirmation modal if there are score inputs
    if (hasScoreInputs()) {
      setShowConfirmation(true);
    } else {
      submitForm();
    }
  };

  const submitForm = async () => {
    if (!validateAnswers()) return;

    setSubmitting(true);
    try {
      // Check maxResponses limit (client-side check, may fail due to permissions)
      if (form?.maxResponses && form.maxResponses > 0) {
        try {
          const allResponsesQuery = query(
            collection(db, "form_responses"),
            where("formId", "==", formId)
          );
          const allResponsesSnap = await getDocs(allResponsesQuery);
          
          if (allResponsesSnap.size >= form.maxResponses) {
            toast.error("This form has reached its maximum number of responses");
            setSubmitting(false);
            return;
          }
        } catch (error) {
          // If we can't check due to permissions, proceed with submission
          // The server-side validation should handle this
          console.warn("Could not verify response count due to permissions, proceeding with submission");
        }
      }

      // Upload files for file_upload questions
      const uploadedFileData: { [questionId: string]: { urls: string[], names: string[] } } = {};
      const visibleQuestions = getVisibleQuestions();
      
      for (const question of visibleQuestions) {
        if (question.type === 'file_upload' && uploadedFiles[question.id]?.length > 0) {
          try {
            setUploadingFiles(prev => ({ ...prev, [question.id]: true }));
            const urls = await uploadFilesToStorage(question.id, uploadedFiles[question.id]);
            const names = uploadedFiles[question.id].map(f => f.name);
            uploadedFileData[question.id] = { urls, names };
          } catch (uploadError) {
            console.error(`Error uploading files for question ${question.id}:`, uploadError);
            toast.error(`Failed to upload files for: ${question.text}`);
            setSubmitting(false);
            return;
          } finally {
            setUploadingFiles(prev => ({ ...prev, [question.id]: false }));
          }
        }
      }

      const formAnswers: FormAnswer[] = visibleQuestions.map(q => {
        const baseAnswer: FormAnswer = {
          questionId: q.id,
          answer: answers[q.id] || (q.type === 'checkboxes' ? [] : '')
        };

        // Add file data for file_upload questions
        if (q.type === 'file_upload' && uploadedFileData[q.id]) {
          baseAnswer.fileUrls = uploadedFileData[q.id].urls;
          baseAnswer.fileNames = uploadedFileData[q.id].names;
          baseAnswer.answer = uploadedFileData[q.id].names.join(', '); // Store file names as answer text
        }

        return baseAnswer;
      });

      const responseData: Omit<FormResponse, 'id'> = {
        formId,
        studentId: studentData?.studentId || studentDocId || 'unknown',
        studentName: studentName || 'Unknown',
        studentUid: studentUid || 'unknown',
        authUid: studentUid || 'unknown', // Firebase Auth UID for security rules
        answers: formAnswers,
        submittedAt: Timestamp.now(),
        class: studentData?.class,
        shift: studentData?.shift,
        classType: studentData?.classType,
        approvalStatus: form?.requiresApproval ? 'pending' : 'approved'
      };

      await addDoc(collection(db, "form_responses"), responseData);
      
      // Update form's submittedBy array to track who submitted
      try {
        await updateDoc(doc(db, "forms", formId), {
          submittedBy: arrayUnion(studentUid)
        });
      } catch (updateError) {
        // Log but don't fail submission if tracking update fails
        console.warn("Could not update form submission tracking:", updateError);
      }
      
      toast.success("Form submitted successfully!");
      router.push("/student/attendance");
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: Question) => {
    const answer = answers[question.id];
    const hasError = validationErrors[question.id];

    // Determine input type based on question content
    const getInputType = (questionText: string): string => {
      const text = questionText.toLowerCase();
      if (text.includes('email') || text.includes('e-mail')) return 'email';
      if (text.includes('phone') || text.includes('mobile') || text.includes('number')) return 'tel';
      if (text.includes('date')) return 'date';
      if (text.includes('url') || text.includes('website')) return 'url';
      return 'text';
    };

    const inputType = getInputType(question.text);
    const inputMode = inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : inputType === 'url' ? 'url' : 'text';

    switch (question.type) {
      case 'short_answer':
        return (
          <div className="relative group">
            <input
              type={inputType}
              inputMode={inputMode}
              autoComplete={inputType === 'email' ? 'email' : inputType === 'tel' ? 'tel' : 'off'}
              autoCapitalize={inputType === 'email' ? 'none' : 'sentences'}
              autoCorrect={inputType === 'email' ? 'off' : 'on'}
              spellCheck={inputType === 'email' ? false : true}
              value={(answer as string) || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Your answer"
              className={`w-full bg-gray-50 dark:bg-slate-700/50 border-2 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all text-base touch-manipulation peer ${
                hasError 
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                  : 'border-gray-200 dark:border-slate-600 focus:ring-blue-500'
              }`}
            />
            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${
              hasError 
                ? 'bg-gradient-to-r from-red-500/20 to-red-500/20 opacity-0 peer-focus:opacity-100' 
                : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 peer-focus:opacity-100'
            }`}></div>
          </div>
        );

      case 'paragraph':
        return (
          <div className="relative group">
            <textarea
              value={(answer as string) || ''}
              onChange={(e) => handleAnswerChange(question.id, e.target.value)}
              placeholder="Your answer"
              rows={5}
              inputMode="text"
              autoComplete="off"
              autoCapitalize="sentences"
              autoCorrect="on"
              spellCheck={true}
              className={`w-full bg-gray-50 dark:bg-slate-700/50 border-2 rounded-2xl px-5 py-4 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all resize-none text-base touch-manipulation peer ${
                hasError 
                  ? 'border-red-300 dark:border-red-600 focus:ring-red-500' 
                  : 'border-gray-200 dark:border-slate-600 focus:ring-blue-500'
              }`}
            />
            <div className={`absolute inset-0 rounded-2xl transition-opacity duration-300 pointer-events-none ${
              hasError 
                ? 'bg-gradient-to-r from-red-500/20 to-red-500/20 opacity-0 peer-focus:opacity-100' 
                : 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 opacity-0 peer-focus:opacity-100'
            }`}></div>
          </div>
        );

      case 'multiple_choice':
        return (
          <div className="space-y-3">
            {question.options?.map((option, optionIndex) => (
              <label
                key={option.id}
                className={`flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-700/50 border-2 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-all active:scale-95 touch-manipulation group animate-in slide-in-from-left-2 fade-in ${
                  hasError 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-200 dark:border-slate-600'
                }`}
                style={{ 
                  animationDelay: `${optionIndex * 50}ms`,
                  animationFillMode: 'both'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleCheckboxChange(question.id, option.text);
                }}
              >
                <div className="relative">
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                    (answer as string[])?.includes(option.text)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white dark:bg-gray-800'
                  }`}>
                    {(answer as string[])?.includes(option.text) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                  />
                </div>
                <span className="text-gray-900 dark:text-white text-base flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{option.text}</span>
                <div className="w-2 h-2 rounded-full bg-blue-500 scale-0 group-hover:scale-100 transition-transform duration-200"></div>
              </label>
            ))}
          </div>
        );

      case 'checkboxes':
        return (
          <div className="space-y-3">
            {question.options?.map((option, optionIndex) => (
              <label
                key={option.id}
                className={`flex items-center space-x-4 p-4 bg-gray-50 dark:bg-slate-700/50 border-2 rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-all active:scale-95 touch-manipulation group animate-in slide-in-from-left-2 fade-in ${
                  hasError 
                    ? 'border-red-300 dark:border-red-600' 
                    : 'border-gray-200 dark:border-slate-600'
                }`}
                style={{ 
                  animationDelay: `${optionIndex * 50}ms`,
                  animationFillMode: 'both'
                }}
                onClick={(e) => {
                  e.preventDefault();
                  handleCheckboxChange(question.id, option.text);
                }}
              >
                <div className="relative">
                  <div className={`w-5 h-5 border-2 rounded flex items-center justify-center transition-all ${
                    (answer as string[])?.includes(option.text)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300 bg-white dark:bg-gray-800'
                  }`}>
                    {(answer as string[])?.includes(option.text) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
                  />
                </div>
                <span className="text-gray-900 dark:text-white text-base flex-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{option.text}</span>
                <div className="w-2 h-2 rounded-full bg-blue-500 scale-0 group-hover:scale-100 transition-transform duration-200"></div>
              </label>
            ))}
          </div>
        );

      case 'dropdown':
        return (
          <select
            value={(answer as string) || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-2xl px-5 py-4 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base touch-manipulation"
          >
            <option value="">Choose...</option>
            {question.options?.map((option) => (
              <option key={option.id} value={option.text}>
                {option.text}
              </option>
            ))}
          </select>
        );

      case 'linear_scale':
        const min = question.minScale || 0;
        const max = question.maxScale || 10;
        return (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium text-center min-w-0 flex-shrink-0 max-w-[60px] sm:max-w-[80px] break-words order-1">
                {question.minLabel || min}
              </span>
              {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((value) => (
                <label
                  key={value}
                  className={`aspect-square flex items-center justify-center p-2 sm:p-3 border-2 rounded-2xl cursor-pointer transition-all touch-manipulation active:scale-95 flex-shrink-0 order-2 ${
                    answer === value.toString()
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105'
                      : 'bg-gray-50 dark:bg-slate-700/50 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700 hover:scale-105'
                  }`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={value.toString()}
                    checked={answer === value.toString()}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    className="sr-only"
                  />
                  <span className="font-bold text-sm sm:text-lg">{value}</span>
                </label>
              ))}
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium text-center min-w-0 flex-shrink-0 max-w-[60px] sm:max-w-[80px] break-words order-3">
                {question.maxLabel || max}
              </span>
            </div>
          </div>
        );

      case 'file_upload':
        const files = uploadedFiles[question.id] || [];
        const maxFiles = question.maxFiles || 1;
        const maxFileSize = question.maxFileSize || 5;
        const acceptedTypes = question.acceptedFileTypes || [];
        const isUploading = uploadingFiles[question.id];
        const acceptString = acceptedTypes.length > 0 ? acceptedTypes.join(',') : '*';

        return (
          <div className="space-y-4">
            {/* File Upload Area */}
            <div className="relative">
              <input
                type="file"
                id={`file-${question.id}`}
                multiple={maxFiles > 1}
                accept={acceptString}
                onChange={(e) => handleFileChange(question.id, e.target.files)}
                disabled={files.length >= maxFiles || isUploading}
                className="sr-only"
              />
              <label
                htmlFor={`file-${question.id}`}
                className={`flex flex-col items-center justify-center w-full p-8 border-3 border-dashed rounded-2xl cursor-pointer transition-all touch-manipulation ${
                  files.length >= maxFiles || isUploading
                    ? 'bg-gray-100 dark:bg-slate-800 border-gray-300 dark:border-slate-600 cursor-not-allowed opacity-50'
                    : hasError
                      ? 'bg-red-50 dark:bg-red-900/10 border-red-300 dark:border-red-600 hover:bg-red-100 dark:hover:bg-red-900/20'
                      : 'bg-blue-50 dark:bg-blue-900/10 border-blue-300 dark:border-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <Icon 
                  path={isUploading ? mdiLoading : mdiFileUpload} 
                  size={24} 
                  className={`mb-3 ${
                    isUploading 
                      ? 'text-gray-500 dark:text-gray-400 animate-spin' 
                      : hasError
                        ? 'text-red-500 dark:text-red-400'
                        : 'text-blue-500 dark:text-blue-400'
                  }`} 
                />
                <p className={`text-base font-semibold mb-1 ${
                  hasError 
                    ? 'text-red-700 dark:text-red-300' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {isUploading 
                    ? 'Uploading...' 
                    : files.length >= maxFiles 
                      ? `Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} reached` 
                      : 'Click to upload or drag and drop'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {acceptedTypes.length > 0 
                    ? `Accepted: ${acceptedTypes.map(t => t.split('/')[1] || t).join(', ')}` 
                    : 'All file types accepted'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Max size: {maxFileSize}MB | Max files: {maxFiles}
                </p>
              </label>
            </div>

            {/* Uploaded Files List */}
            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Uploaded Files ({files.length}/{maxFiles})
                </p>
                <div className="space-y-2">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-slate-700 group"
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <Icon 
                          path={mdiFileDocument} 
                          size={20} 
                          className="text-blue-500 dark:text-blue-400 flex-shrink-0" 
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(question.id, index)}
                        disabled={isUploading}
                        className="ml-2 p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                      >
                        <Icon path={mdiClose} size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'score_input':
        return (
          <ScoreInputQuestion
            maxScore={question.maxScore || 100}
            value={(answer as string) || '0'}
            onChange={(value) => handleAnswerChange(question.id, value)}
            required={question.required}
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <div className="relative animate-spin rounded-full h-16 w-16 border-4 border-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-border">
            <div className="absolute inset-1 bg-white dark:bg-slate-900 rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (hasSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-slate-700/50 p-8 text-center">
          <div className="relative mx-auto mb-6 w-24 h-24">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500 via-amber-500 to-orange-500 rounded-full blur-2xl opacity-30 animate-pulse"></div>
            <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-full flex items-center justify-center shadow-lg">
              <Icon path={mdiClockOutline} size={16} className="text-white" />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-white dark:via-gray-100 dark:to-white bg-clip-text text-transparent mb-3">
            Awaiting Approval
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
            Your registration has been submitted and is pending approval.
          </p>
          
          <button
            onClick={() => router.push("/student/attendance")}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 transition-all duration-200"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <span className="relative flex items-center justify-center space-x-2">
              <Icon path={mdiArrowLeft} size={16} />
              <span>Back to Attendance</span>
            </span>
          </button>
        </div>
      </div>
    );
  }

  if (!form) return null;

  const deadlineDate = form.deadline instanceof Timestamp 
    ? form.deadline.toDate() 
    : new Date(form.deadline);

  return (
    <>
      <div className={`min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 pb-12 ${nokora.className}`}>
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-lg border-b border-gray-200/50 dark:border-slate-700/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push("/student/attendance")}
              className="group p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-800 dark:hover:to-slate-700 rounded-2xl transition-all duration-200 active:scale-95 touch-manipulation"
            >
              <Icon path={mdiArrowLeft} size={24} className="text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
            </button>
            <div className="flex items-center space-x-2 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 px-4 py-2 rounded-2xl border border-orange-200/50 dark:border-orange-800/50">
              <Icon path={mdiAlertCircle} size={16} className="text-orange-600 dark:text-orange-400" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">Due: {deadlineDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Progress
              </span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                {Object.keys(answers).length} / {getVisibleQuestions().length}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${form ? (Object.keys(answers).length / getVisibleQuestions().length) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Form Header */}
        <div className="relative overflow-hidden bg-blue-600 rounded-3xl shadow-lg p-6 sm:p-8 text-white">
          <div className="relative flex items-start space-x-4 mb-4">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border border-white/30">
              <Icon path={mdiFormSelect} size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">{form.title}</h1>
            </div>
          </div>
          
          {form.description && (
            <p className="text-blue-100 text-base sm:text-lg leading-relaxed">{form.description}</p>
          )}
          
          <div className="mt-4 inline-flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-2xl border border-white/30">
            <span className="text-red-300 font-bold text-lg">*</span>
            <span className="text-white/90 text-sm font-medium">Required field</span>
          </div>
        </div>

        {/* Questions / Sections */}
        {form?.sections && form.sections.length > 0 ? (
          /* Render Sections */
          getVisibleSections().map((section, sectionIndex) => (
            <div key={section.id} className="space-y-6">
              {/* Section Header */}
              {(section.title || section.description) && (
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border-l-4 border-indigo-500 dark:border-indigo-400">
                  {section.title && (
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {section.title}
                    </h2>
                  )}
                  {section.description && (
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {section.description}
                    </p>
                  )}
                </div>
              )}

              {/* Section Questions */}
              {section.questions.map((question, qIndex) => {
                const hasError = validationErrors[question.id];
                const isCompleted = completedQuestions.has(question.id);
                const hasAnswer = answers[question.id] && (!Array.isArray(answers[question.id]) || (answers[question.id] as string[]).length > 0);
                
                return (
                  <div 
                    key={question.id}
                    className={`relative bg-white dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-xl border-2 p-6 sm:p-8 transition-all duration-300 ${
                      hasError 
                        ? 'border-red-300 dark:border-red-600 shadow-red-100 dark:shadow-red-900/20' 
                        : isCompleted 
                        ? 'border-green-300 dark:border-green-600 shadow-green-100 dark:shadow-green-900/20'
                        : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-2xl'
                    }`}
                  >
                    {/* Question Content */}
                    <div className="space-y-4">
                      {/* Question Content Row - Full Width */}
                      <div className="w-full">
                        <div className="flex items-start gap-2 mb-3">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white leading-relaxed break-words whitespace-pre-wrap flex-1">
                            {question.text}
                          </h3>
                          {question.required && (
                            <span className="text-red-500 dark:text-red-400 text-xl font-bold flex-shrink-0">*</span>
                          )}
                        </div>
                        
                        {/* Display question image if available */}
                        {question.imageUrl && (
                          <div className="mt-4 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-slate-600 shadow-md">
                            <img
                              src={question.imageUrl}
                              alt={question.imageFileName || "Question image"}
                              className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-slate-700/30"
                            />
                          </div>
                        )}
                        
                        {hasError && (
                          <p className="text-sm text-red-600 dark:text-red-400 font-medium mt-2 flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <Icon path={mdiAlertCircle} size={0.7} />
                            {hasError}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Question Input */}
                    <div className="">
                      {renderQuestion(question)}
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        ) : (
          /* Render Direct Questions (Backward Compatibility) */
          getVisibleQuestions().map((question, index) => {
          const hasError = validationErrors[question.id];
          const isCompleted = completedQuestions.has(question.id);
          const hasAnswer = answers[question.id] && (!Array.isArray(answers[question.id]) || (answers[question.id] as string[]).length > 0);
          
          return (
            <div
              key={question.id}
              className={`group bg-white/90 dark:bg-slate-800/90 backdrop-blur-xl rounded-3xl shadow-lg hover:shadow-xl border p-6 sm:p-8 space-y-5 transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] animate-in slide-in-from-bottom-4 fade-in ${
                hasError 
                  ? 'border-red-300 dark:border-red-600 shadow-red-100 dark:shadow-red-900/20' 
                  : isCompleted 
                    ? 'border-green-300 dark:border-green-600 shadow-green-100 dark:shadow-green-900/20' 
                    : 'border-gray-200/50 dark:border-slate-700/50'
              }`}
              style={{ 
                animationDelay: `${index * 100}ms`,
                animationFillMode: 'both'
              }}
            >
              <div className="space-y-4">
                {/* Question Content Row - Full Width */}
                <div className="w-full">
                  <h3 className="text-lg sm:text-xl font-medium text-gray-900 dark:text-white leading-relaxed break-words whitespace-pre-wrap mb-3">
                    {question.text}
                    {question.required && <span className="text-red-500 ml-2 text-lg">*</span>}
                  </h3>
                  
                  {/* Display question image if available */}
                  {question.imageUrl && (
                    <div className="mt-4 rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-slate-600 shadow-md">
                      <img
                        src={question.imageUrl}
                        alt={question.imageFileName || "Question image"}
                        className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-slate-700/30"
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {renderQuestion(question)}
                
                {/* Validation Error Message */}
                {hasError && (
                  <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 animate-in slide-in-from-top-2 fade-in">
                    <Icon path={mdiAlertCircle} size={16} />
                    <span className="text-sm font-medium">{hasError}</span>
                  </div>
                )}
                
                {/* Success Message */}
                {isCompleted && !hasError && (
                  <div className="flex items-center space-x-2 text-green-600 dark:text-green-400 animate-in slide-in-from-top-2 fade-in">
                    <Icon path={mdiCheckCircle} size={16} />
                    <span className="text-sm font-medium">Completed</span>
                  </div>
                )}
              </div>
            </div>
          );
        })
        )}

        {/* Submit Button */}
        <div className="sticky bottom-6 sm:bottom-8">
          <div className="relative">
            {/* Glow Effect */}
            <div className={`absolute inset-0 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity ${
              Object.keys(validationErrors).some(key => validationErrors[key]) 
                ? 'bg-gradient-to-r from-red-600 via-red-600 to-red-600' 
                : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600'
            }`}></div>
            
            <button
              onClick={handleSubmitClick}
              disabled={submitting || Object.keys(validationErrors).some(key => validationErrors[key])}
              className={`group relative w-full flex items-center justify-center space-x-3 text-white px-8 py-5 sm:py-6 rounded-3xl shadow-2xl hover:shadow-3xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden touch-manipulation backdrop-blur-sm border border-white/20 ${
                Object.keys(validationErrors).some(key => validationErrors[key]) 
                  ? 'bg-red-500/80 hover:bg-red-400/90' 
                  : 'bg-gradient-to-r from-blue-500/80 via-indigo-500/80 to-purple-500/80 hover:from-blue-400/90 hover:via-indigo-400/90 hover:to-purple-400/90'
              }`}
            >
              {/* Hover Overlay */}
              <div className={`absolute inset-0 rounded-3xl transition-opacity duration-300 ${
                Object.keys(validationErrors).some(key => validationErrors[key]) 
                  ? 'bg-red-300/20 opacity-0 group-hover:opacity-100' 
                  : 'bg-white/20 opacity-0 group-hover:opacity-100'
              }`}></div>
              
              {Object.keys(validationErrors).some(key => validationErrors[key]) ? (
                <>
                  <Icon path={mdiAlertCircle} size={20} className="relative" />
                  <span className="relative text-lg sm:text-xl font-bold">
                    {submitting ? 'Submitting...' : 'Please Complete All Required Fields'}
                  </span>
                </>
              ) : (
                <>
                  <Icon path={mdiSend} size={20} className="relative" />
                  <span className="relative text-lg sm:text-xl font-bold">
                    {submitting ? 'Submitting...' : 'Submit Form'}
                  </span>
                </>
              )}
              
              {submitting && (
                <div className="relative animate-spin rounded-full h-6 w-6 border-3 border-white border-t-transparent"></div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Score Summary Confirmation Modal */}
    {showConfirmation && hasScoreInputs() && (
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowConfirmation(false)}
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
      >
          <div 
            className="relative w-full max-w-2xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col border border-white/20 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon path={mdiTrophy} size={24} className="text-white drop-shadow-lg" />
                  <h2 className="text-xl font-bold text-white">{t('scoreSummary.title')}</h2>
                </div>
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <Icon path={mdiClose} size={20} className="text-white" />
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto py-4 px-6 space-y-6">
              {/* Render scores by section or all questions */}
              {form?.sections && form.sections.length > 0 ? (
                // Form has sections
                form.sections
                  .filter(section => {
                    // Filter by classType if needed
                    if (!section.targetClassTypes || section.targetClassTypes.length === 0) return true;
                    return studentData?.classType && section.targetClassTypes.includes(studentData.classType);
                  })
                  .map((section) => {
                    const scoreQuestions = section.questions.filter(q => q.type === 'score_input');
                    if (scoreQuestions.length === 0) return null;

                    // Calculate section totals
                    let sectionTotalScore = 0;
                    let sectionMaxScore = 0;
                    
                    scoreQuestions.forEach(question => {
                      const score = Number(answers[question.id]) || 0;
                      const maxScore = question.maxScore || 100;
                      sectionTotalScore += score;
                      sectionMaxScore += maxScore;
                    });

                    const sectionPercentage = sectionMaxScore > 0 ? sectionTotalScore / sectionMaxScore : 0;
                    const sectionGrade = getGrade(sectionPercentage);

                    return (
                      <div key={section.id} className="space-y-4">
                        {/* Section Title */}
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                          {section.title}
                        </h3>
                        
                        {/* Individual Scores in Section */}
                        <div className="space-y-2">
                          {scoreQuestions.map((question) => {
                            const score = Number(answers[question.id]) || 0;
                            const maxScore = question.maxScore || 100;
                            const percentage = maxScore > 0 ? score / maxScore : 0;
                            const grade = getGrade(percentage);

                            return (
                              <div key={question.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                <div className="flex-1 min-w-0 mr-4">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {question.text}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {score.toFixed(1)} / {maxScore} {t('scoreSummary.points')}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                    {Math.round(percentage * 100)}%
                                  </span>
                                  <span className={`px-3 py-1 rounded-lg font-bold ${grade.bgColor} ${grade.color}`}>
                                    {grade.grade}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
              ) : (
                // Form has no sections - show all score inputs
                <div className="space-y-2">
                  {getVisibleQuestions()
                    .filter(q => q.type === 'score_input')
                    .map((question, index) => {
                      const score = Number(answers[question.id]) || 0;
                      const maxScore = question.maxScore || 100;
                      const percentage = maxScore > 0 ? score / maxScore : 0;
                      const grade = getGrade(percentage);

                      return (
                        <div key={question.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <div className="flex-1 min-w-0 mr-4">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {question.text}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {score.toFixed(1)} / {maxScore} {t('scoreSummary.points')}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                              {Math.round(percentage * 100)}%
                            </span>
                            <span className={`px-3 py-1 rounded-lg font-bold ${grade.bgColor} ${grade.color}`}>
                              {grade.grade}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Overall Total */}
              {(() => {
                const allScoreQuestions = getVisibleQuestions().filter(q => q.type === 'score_input');
                let totalScore = 0;
                let totalMaxScore = 0;
                
                allScoreQuestions.forEach(question => {
                  const score = Number(answers[question.id]) || 0;
                  const maxScore = question.maxScore || 100;
                  totalScore += score;
                  totalMaxScore += maxScore;
                });

                const totalPercentage = totalMaxScore > 0 ? totalScore / totalMaxScore : 0;
                const totalGrade = getGrade(totalPercentage);

                return (
                  <div className={`${totalGrade.bgColor} ${totalGrade.borderColor} border-3 rounded-2xl p-6 space-y-3`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-16 h-16 ${totalGrade.bgColor} rounded-full border-2 ${totalGrade.borderColor} shadow-lg`}>
                          <div className="text-center">
                            <div className={`text-lg font-black ${totalGrade.color}`}>
                              {Math.round(totalPercentage * 100)}%
                            </div>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                            {t('scoreSummary.overallGrade')}
                          </p>
                          <p className={`text-5xl font-black ${totalGrade.color} drop-shadow-sm`}>
                            {totalGrade.grade}
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {totalScore.toFixed(1)}
                        </p>
                        <div className="w-full h-px bg-gray-600 dark:bg-gray-400 my-1"></div>
                        <p className="text-lg font-normal text-gray-600 dark:text-gray-400">
                          {totalMaxScore}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Footer with Actions */}
            <div className="px-6 py-4 border-t border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 backdrop-blur-xl">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmation(false)}
                  className="flex-1 px-6 py-3 bg-white/20 dark:bg-white/10 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 dark:hover:bg-white/20 transition-all font-semibold border border-white/30 dark:border-white/20 shadow-lg"
                >
                  {t('scoreSummary.reviewAnswers')}
                </button>
                <button
                  onClick={() => {
                    setShowConfirmation(false);
                    submitForm();
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500/80 via-indigo-500/80 to-purple-500/80 backdrop-blur-sm text-white rounded-xl hover:from-blue-400/90 hover:via-indigo-400/90 hover:to-purple-400/90 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/20"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-3 border-white border-t-transparent"></div>
                      <span>{t('scoreSummary.submitting')}</span>
                    </>
                  ) : (
                    <>
                      <Icon path={mdiSend} size={18} />
                      <span>{t('scoreSummary.confirmSubmit')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentFormFillerPage;
