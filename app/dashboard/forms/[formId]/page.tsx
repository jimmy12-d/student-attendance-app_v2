"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, setDoc, Timestamp, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase-config";
import { Form, Question, FormType } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import { mdiPlus, mdiContentSave, mdiArrowLeft, mdiFormSelect, mdiCheckCircle, mdiAccountMultiple } from "@mdi/js";
import { toast } from "sonner";
import QuestionEditor from "../_components/QuestionEditor";
import { useAppSelector } from "@/app/_stores/hooks";
import { FORM_TYPES, getFormTypeConfig } from "@/app/_constants/formTypes";

const FormBuilderPage = () => {
  const router = useRouter();
  const params = useParams();
  const formId = params?.formId as string;
  const isNewForm = formId === 'new';
  
  const userUid = useAppSelector((state) => state.main.userUid);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [formType, setFormType] = useState<FormType>('general');
  const [deadline, setDeadline] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [maxResponses, setMaxResponses] = useState<number | undefined>(undefined);
  const [targetClassTypes, setTargetClassTypes] = useState<string[]>([]);
  const [availableClassTypes, setAvailableClassTypes] = useState<string[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(!isNewForm);
  const [saving, setSaving] = useState(false);
  const [questionErrors, setQuestionErrors] = useState<Record<number, string[]>>({});
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null); // Ref for the scrollable container
  const scrollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadClassTypes();
    if (!isNewForm) {
      loadForm();
    }
  }, [formId]);

  // console.log("Current Questions:", questions.map(q => q.id)); // Removed for production

  const loadClassTypes = async () => {
    try {
      const classTypesRef = collection(db, "classTypes");
      const classTypesSnapshot = await getDocs(classTypesRef);
      const types = classTypesSnapshot.docs.map(doc => doc.id);
      setAvailableClassTypes(types.sort());
    } catch (error) {
      console.error("Error loading class types:", error);
      // Fallback to hardcoded values
      setAvailableClassTypes(['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11A', 'Grade 11E', 'Grade 12', 'Grade 12 Social']);
    }
  };

  useEffect(() => {
    if (!isNewForm) {
      loadForm();
    }
  }, [formId]);

  const loadForm = async () => {
    try {
      const formDoc = await getDoc(doc(db, "forms", formId));
      if (formDoc.exists()) {
        const formData = formDoc.data() as Form;
        setTitle(formData.title);
        setDescription(formData.description);
        setFormType(formData.formType || 'general');
        
        // Convert Timestamp to datetime-local format
        const deadlineDate = formData.deadline instanceof Timestamp 
          ? formData.deadline.toDate() 
          : new Date(formData.deadline);
        setDeadline(formatDateTimeLocal(deadlineDate));
        
        setIsActive(formData.isActive);
        setRequiresApproval(formData.requiresApproval || false);
        setMaxResponses(formData.maxResponses);
        setTargetClassTypes(formData.targetClassTypes || []);
        setQuestions(formData.questions);
      } else {
        toast.error("Form not found");
        router.push("/dashboard/forms");
      }
    } catch (error) {
      console.error("Error loading form:", error);
      toast.error("Failed to load form");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTimeLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}`,
      text: '',
      type: 'short_answer',
      required: false,
      options: [],
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...questions];
    newQuestions[index] = updatedQuestion;
    setQuestions(newQuestions);
    
    // Clear errors for this question when user makes changes
    if (questionErrors[index]) {
      const newErrors = { ...questionErrors };
      delete newErrors[index];
      setQuestionErrors(newErrors);
    }
  };

  const deleteQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const duplicateQuestion = (index: number) => {
    const questionToDuplicate = questions[index];
    const duplicatedQuestion: Question = {
      ...questionToDuplicate,
      id: `q_${Date.now()}` + Math.random().toString(36).substring(7), // Ensure unique ID
    };
    setQuestions([...questions.slice(0, index + 1), duplicatedQuestion, ...questions.slice(index + 1)]);
  };

  const handleDragStart = (e: React.DragEvent, questionId: string) => {
    setDraggedQuestionId(questionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", questionId); // Set data for drag operation
    // console.log("Drag Start:", questionId); // Removed for production
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allows us to drop
    e.dataTransfer.dropEffect = "move";
    // console.log("Drag Over"); // Too noisy - Removed for production

    // Auto-scrolling logic
    const container = containerRef.current;
    if (container) {
      const boundingBox = container.getBoundingClientRect();
      const mouseY = e.clientY;
      const scrollThreshold = 50; // pixels from edge to start scrolling
      const scrollSpeed = 10; // pixels per frame

      if (mouseY < boundingBox.top + scrollThreshold) {
        // Scroll up
        if (scrollIntervalRef.current === null) {
          scrollIntervalRef.current = window.setInterval(() => {
            if (container.scrollTop > 0) {
              container.scrollTop -= scrollSpeed;
            }
          }, 30);
        }
      } else if (mouseY > boundingBox.bottom - scrollThreshold) {
        // Scroll down
        if (scrollIntervalRef.current === null) {
          scrollIntervalRef.current = window.setInterval(() => {
            if (container.scrollTop + container.clientHeight < container.scrollHeight) {
              container.scrollTop += scrollSpeed;
            }
          }, 30);
        }
      } else {
        // Stop scrolling if not near edge
        if (scrollIntervalRef.current !== null) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
      }
    }
  };

  const handleDrop = (e: React.DragEvent, targetQuestionId: string) => {
    e.preventDefault();
    // console.log("Drop on:", targetQuestionId); // Removed for production
    if (!draggedQuestionId || draggedQuestionId === targetQuestionId) {
      // console.log("No dragged ID or dropping on self."); // Removed for production
      setDraggedQuestionId(null);
      return;
    }

    const draggedIndex = questions.findIndex(q => q.id === draggedQuestionId);
    const targetIndex = questions.findIndex(q => q.id === targetQuestionId);

    // console.log(`Dragged: ${draggedQuestionId} (index ${draggedIndex}), Target: ${targetQuestionId} (index ${targetIndex})`); // Removed for production

    if (draggedIndex === -1 || targetIndex === -1) {
      // console.error("Dragged or target question not found.", { draggedQuestionId, targetQuestionId, questions }); // Removed for production
      setDraggedQuestionId(null);
      return;
    }

    const newQuestions = [...questions];
    const [removed] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(targetIndex, 0, removed);

    setQuestions(newQuestions);
    setDraggedQuestionId(null);
    // console.log("Questions after drop:", newQuestions.map(q => q.id)); // Removed for production
  };

  const handleDragEnd = () => {
    // console.log("Drag End"); // Removed for production
    setDraggedQuestionId(null);
    // Clear any active scrolling interval
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const setAllRequired = (required: boolean) => {
    const updatedQuestions = questions.map(q => ({ ...q, required }));
    setQuestions(updatedQuestions);
    toast.success(required ? "All questions marked as required" : "All questions marked as optional");
  };

  const validateForm = (): boolean => {
    const errors: Record<number, string[]> = {};

    if (!title.trim()) {
      toast.error("Please enter a form title");
      return false;
    }

    if (!deadline) {
      toast.error("Please set a deadline");
      return false;
    }

    // Validate maxResponses if provided
    if (maxResponses !== undefined) {
      if (isNaN(maxResponses) || maxResponses < 1) {
        toast.error("Response limit must be a valid number greater than 0");
        return false;
      }
    }

    if (questions.length === 0) {
      toast.error("Please add at least one question");
      return false;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const questionErrors: string[] = [];

      if (!q.text.trim()) {
        questionErrors.push("Question text is required");
      }

      const needsOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type);
      if (needsOptions) {
        // Checkboxes can have 1 option, others need at least 2
        const minOptions = q.type === 'checkboxes' ? 1 : 2;
        if (!q.options || q.options.length < minOptions) {
          questionErrors.push(
            q.type === 'checkboxes'
              ? `At least ${minOptions} option required`
              : `At least ${minOptions} options required`
          );
        }

        if (q.options) {
          const emptyOptions = q.options.filter(opt => !opt.text.trim());
          if (emptyOptions.length > 0) {
            questionErrors.push(`${emptyOptions.length} option(s) are empty`);
          }
        }
      }

      if (questionErrors.length > 0) {
        errors[i] = questionErrors;
      }
    }

    setQuestionErrors(errors);

    if (Object.keys(errors).length > 0) {
      toast.error(`Please fix ${Object.keys(errors).length} question(s) with errors`);
      return false;
    }

    return true;
  };

  const saveForm = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const deadlineDate = new Date(deadline);
      
      // Build formData object, excluding undefined fields
      const formData: any = {
        title,
        description,
        formType,
        deadline: Timestamp.fromDate(deadlineDate),
        createdAt: isNewForm ? Timestamp.now() : Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userUid || 'unknown',
        questions,
        isActive,
        requiresApproval
      };
      
      // Only include maxResponses if it's a valid number
      if (maxResponses && !isNaN(maxResponses) && maxResponses > 0) {
        formData.maxResponses = maxResponses;
      }
      
      // Only include targetClassTypes if there are selected class types
      if (targetClassTypes && targetClassTypes.length > 0) {
        formData.targetClassTypes = targetClassTypes;
      }

      if (isNewForm) {
        const newFormRef = doc(collection(db, "forms"));
        await setDoc(newFormRef, formData);
        toast.success("Form created successfully!");
        router.push("/dashboard/forms");
      } else {
        await updateDoc(doc(db, "forms", formId), formData as any);
        toast.success("Form updated successfully!");
        router.push("/dashboard/forms");
      }
    } catch (error: any) {
      console.error("Error saving form:", error);
      
      // Provide more specific error messages
      if (error?.message?.includes('invalid data') || error?.message?.includes('Unsupported field value')) {
        toast.error("Invalid form data. Please check all fields, especially the Response Limit.");
      } else if (error?.message?.includes('permission')) {
        toast.error("You don't have permission to save this form.");
      } else {
        toast.error("Failed to save form. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen nokora-font">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 pb-20 nokora-font">
      {/* Fixed Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-lg border-b border-gray-200 dark:border-slate-700">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push("/dashboard/forms")}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <Icon path={mdiArrowLeft} size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center space-x-3">
                <Icon path={mdiFormSelect} size={16} className="text-blue-600 dark:text-blue-400" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isNewForm ? 'Create New Form' : 'Edit Form'}
                </h1>
              </div>
            </div>
            <button
              onClick={saveForm}
              disabled={saving}
              className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icon path={mdiContentSave} size={16} />
              <span className="font-semibold">{saving ? 'Saving...' : 'Save Form'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Form Settings Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border-2 border-gray-200 dark:border-slate-700 p-6 space-y-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Form Settings
          </h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Form Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Student Feedback Survey"
              className="w-full bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide additional context or instructions..."
              rows={3}
              className="w-full bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
            />
          </div>

          {/* Form Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Form Type *
            </label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as FormType)}
              className="w-full bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              {FORM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* Target Class Types */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Target Class Types (optional)
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Select specific class types that can access this form. Leave empty for all students.
            </p>
            <div className="bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl p-4 max-h-48 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableClassTypes.map((classType) => (
                  <label
                    key={classType}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={targetClassTypes.includes(classType)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setTargetClassTypes([...targetClassTypes, classType]);
                        } else {
                          setTargetClassTypes(targetClassTypes.filter(ct => ct !== classType));
                        }
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{classType}</span>
                  </label>
                ))}
              </div>
            </div>
            {targetClassTypes.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {targetClassTypes.map((ct) => (
                  <span
                    key={ct}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full"
                  >
                    {ct}
                    <button
                      onClick={() => setTargetClassTypes(targetClassTypes.filter(c => c !== ct))}
                      className="hover:text-blue-900 dark:hover:text-blue-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Deadline and Max Responses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Deadline *
              </label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Max Responses (optional)
              </label>
              <input
                type="number"
                min="1"
                value={maxResponses || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setMaxResponses(undefined);
                  } else {
                    const parsed = parseInt(value);
                    // Only set if it's a valid number
                    setMaxResponses(!isNaN(parsed) && parsed > 0 ? parsed : undefined);
                  }
                }}
                placeholder="Unlimited"
                className="w-full bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Leave empty for unlimited responses
              </p>
            </div>
          </div>
          
          {/* Active Status and Requires Approval */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                  Active (visible to students)
                </span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3">
              <input
                type="checkbox"
                checked={requiresApproval}
                onChange={(e) => setRequiresApproval(e.target.checked)}
                className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                  Requires Approval
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Admin must approve/reject each response individually
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Questions Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Questions ({questions.length})
            </h2>
            <div className="flex items-center gap-3">
              {questions.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setAllRequired(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Set All Required
                  </button>
                  <button
                    onClick={() => setAllRequired(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    Clear All Required
                  </button>
                </div>
              )}
              <button
              onClick={addQuestion}
              className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            >
              <Icon path={mdiPlus} size={16} />
              <span className="font-semibold">Add Question</span>
            </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-dashed border-gray-300 dark:border-slate-600 p-12 text-center">
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No questions yet. Click "Add Question" to get started.
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              className="space-y-4"
              style={{ overflowY: 'auto', maxHeight: '70vh' }} // Make it scrollable
            >
              {questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={(updated) => updateQuestion(index, updated)}
                  onDelete={() => deleteQuestion(index)}
                  onDuplicate={() => duplicateQuestion(index)}
                  validationErrors={questionErrors[index]}
                  availableClassTypes={availableClassTypes}
                  onDragStart={(e) => handleDragStart(e, question.id)}
                  onDrop={(e) => handleDrop(e, question.id)}
                  onDragOver={handleDragOver}
                  isBeingDragged={draggedQuestionId === question.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilderPage;
