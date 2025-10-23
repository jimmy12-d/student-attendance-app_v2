"use client";

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { doc, getDoc, setDoc, Timestamp, updateDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase-config";
import { Form, Question, FormType, FormSection } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import { mdiPlus, mdiContentSave, mdiArrowLeft, mdiFormSelect, mdiViewSequentialOutline, mdiCheckCircle, mdiEye, mdiShieldCheck, mdiAccountGroup, mdiCounter, mdiCalendarClock } from "@mdi/js";
import { toast } from "sonner";
import SectionEditor from "../_components/SectionEditor";
import FormTypeSelector from "../_components/FormTypeSelector";
import { useAppSelector } from "@/app/_stores/hooks";

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
  const [isVisible, setIsVisible] = useState(true);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [maxResponses, setMaxResponses] = useState<number | undefined>(undefined);
  const [targetClassTypes, setTargetClassTypes] = useState<string[]>([]);
  const [availableClassTypes, setAvailableClassTypes] = useState<string[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [loading, setLoading] = useState(!isNewForm);
  const [saving, setSaving] = useState(false);
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    loadClassTypes();
    if (!isNewForm) {
      loadForm();
    } else {
      // New form starts with one empty section
      setSections([{
        id: `s_${Date.now()}`,
        title: 'Untitled Section',
        description: '',
        questions: []
      }]);
    }
  }, [formId]);

  // console.log("Current Questions:", questions.map(q => q.id)); // Removed for production

  const loadClassTypes = async () => {
    try {
      const classTypesRef = collection(db, "classTypes");
      const classTypesSnapshot = await getDocs(classTypesRef);
      const types = classTypesSnapshot.docs.map(doc => doc.id);
      
      // Sort grades from Grade 7 to Grade 12
      const sortedTypes = types.sort((a, b) => {
        // Extract grade number from strings like "Grade 7", "Grade 11A", etc.
        const getGradeNumber = (gradeStr: string) => {
          const match = gradeStr.match(/Grade (\d+)/);
          return match ? parseInt(match[1]) : 0;
        };
        
        const aNum = getGradeNumber(a);
        const bNum = getGradeNumber(b);
        
        // First sort by grade number
        if (aNum !== bNum) {
          return aNum - bNum;
        }
        
        // If same grade number, sort alphabetically (e.g., Grade 11A before Grade 11E)
        return a.localeCompare(b);
      });
      
      setAvailableClassTypes(sortedTypes);
    } catch (error) {
      console.error("Error loading class types:", error);
      // Fallback to hardcoded values, already sorted from Grade 7 to Grade 12
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
        setIsVisible(formData.isVisible !== undefined ? formData.isVisible : true); // Default to true for old forms
        setRequiresApproval(formData.requiresApproval || false);
        setMaxResponses(formData.maxResponses);
        setTargetClassTypes(formData.targetClassTypes || []);
        
        // Always use sections - convert old forms automatically
        if (formData.sections && formData.sections.length > 0) {
          setSections(formData.sections);
        } else if (formData.questions && formData.questions.length > 0) {
          // Convert old question-based forms to section format
          const defaultSection: FormSection = {
            id: `s_${Date.now()}`,
            title: 'Main Section',
            description: '',
            questions: formData.questions
          };
          setSections([defaultSection]);
        } else {
          // New form starts with one empty section
          setSections([{
            id: `s_${Date.now()}`,
            title: 'Untitled Section',
            description: '',
            questions: []
          }]);
        }
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

  // Section Management
  const addSection = () => {
    const newSection: FormSection = {
      id: `s_${Date.now()}`,
      title: 'Untitled Section',
      description: '',
      questions: []
    };
    setSections([...sections, newSection]);
  };

  const updateSection = (index: number, updatedSection: FormSection) => {
    const newSections = [...sections];
    newSections[index] = updatedSection;
    setSections(newSections);
  };

  const deleteSection = (index: number) => {
    setSections(sections.filter((_, i) => i !== index));
  };

  const duplicateSection = (index: number) => {
    const sectionToDuplicate = sections[index];
    const duplicatedSection: FormSection = {
      ...sectionToDuplicate,
      id: `s_${Date.now()}`,
      title: `${sectionToDuplicate.title} (Copy)`,
      questions: sectionToDuplicate.questions.map(q => ({
        ...q,
        id: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`
      }))
    };
    setSections([...sections.slice(0, index + 1), duplicatedSection, ...sections.slice(index + 1)]);
  };

  // Section Drag & Drop Handlers
  const handleSectionDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSectionId(sectionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", sectionId);
  };

  const handleSectionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleSectionDrop = (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault();
    if (!draggedSectionId || draggedSectionId === targetSectionId) {
      setDraggedSectionId(null);
      return;
    }

    const draggedIndex = sections.findIndex(s => s.id === draggedSectionId);
    const targetIndex = sections.findIndex(s => s.id === targetSectionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSectionId(null);
      return;
    }

    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);

    setSections(newSections);
    setDraggedSectionId(null);
  };

  const handleSectionDragEnd = () => {
    setDraggedSectionId(null);
    if (scrollIntervalRef.current !== null) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const validateForm = (): boolean => {
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

    // Validate sections
    if (sections.length === 0) {
      toast.error("Please add at least one section with questions");
      return false;
    }

    // Validate each section
    for (const section of sections) {
      if (!section.title.trim()) {
        toast.error("All sections must have a title");
        return false;
      }
      if (section.questions.length === 0) {
        toast.error(`Section "${section.title}" must have at least one question`);
        return false;
      }

      // Validate questions in this section
      for (const q of section.questions) {
        if (!validateQuestion(q)) {
          return false;
        }
      }
    }

    return true;
  };

  const validateQuestion = (q: Question): boolean => {
    if (!q.text.trim()) {
      toast.error("All questions must have text");
      return false;
    }

    const needsOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(q.type);
    if (needsOptions) {
      // Checkboxes can have 1 option, others need at least 2
      const minOptions = q.type === 'checkboxes' ? 1 : 2;
      if (!q.options || q.options.length < minOptions) {
        toast.error(`Question "${q.text}" needs at least ${minOptions} option(s)`);
        return false;
      }

      if (q.options) {
        const emptyOptions = q.options.filter(opt => !opt.text.trim());
        if (emptyOptions.length > 0) {
          toast.error(`Question "${q.text}" has ${emptyOptions.length} empty option(s)`);
          return false;
        }
      }
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
        isActive,
        isVisible,
        requiresApproval
      };

      // Always save as sections
      formData.sections = sections;
      formData.questions = []; // Clear old questions for backward compatibility
      
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 pb-4 nokora-font">
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
            <FormTypeSelector
              selectedType={formType}
              onTypeChange={setFormType}
            />
          </div>

          {/* Target Class Types */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <Icon path={mdiAccountGroup} size={16} className="inline mr-2 text-blue-600 dark:text-blue-400" />
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
                <Icon path={mdiCalendarClock} size={16} className="inline mr-2 text-blue-600 dark:text-blue-400" />
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
                <Icon path={mdiCounter} size={16} className="inline mr-2 text-blue-600 dark:text-blue-400" />
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
          
          {/* Active Status, Visibility, and Requires Approval */}
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Icon path={mdiCheckCircle} size={20} className="text-blue-600 dark:text-blue-400" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                  Active (accepts responses)
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Students can submit responses when active
                </span>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3">
              <input
                type="checkbox"
                checked={isVisible}
                onChange={(e) => setIsVisible(e.target.checked)}
                className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
              />
              <Icon path={mdiEye} size={20} className="text-green-600 dark:text-green-400" />
              <div className="flex-1">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 block">
                  Visible (show to students)
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Form appears in student list (if not active, shows "Not Open Yet")
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
              <Icon path={mdiShieldCheck} size={20} className="text-purple-600 dark:text-purple-400" />
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

        {/* Form Content Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Icon path={mdiViewSequentialOutline} size={20} className="text-blue-600 dark:text-blue-400" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {sections.length > 1 ? `Sections (${sections.length})` : 'Form Questions'}
                </h2>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {sections.length > 1 
                    ? 'Organize your form into logical sections' 
                    : 'Build your form by adding questions below'
                  }
                </p>
              </div>
            </div>
            {/* Only show Add Section button if there's more than one section */}
            {sections.length > 1 && (
              <button
                onClick={addSection}
                className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <Icon path={mdiPlus} size={16} />
                <span className="font-semibold">Add Section</span>
              </button>
            )}
          </div>

          {/* Sections */}
          {sections.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 border-dashed border-gray-300 dark:border-slate-600 p-12 text-center">
              <Icon path={mdiViewSequentialOutline} size={3} className="text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                No sections yet. Click "Add Section" to create your first section.
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Sections help organize your form into logical groups, just like Google Forms!
              </p>
            </div>
          ) : (
            <div
              ref={containerRef}
              onDragOver={handleSectionDragOver}
              onDragEnd={handleSectionDragEnd}
              className="space-y-6"
              style={{ overflowY: 'auto', maxHeight: '70vh' }}
            >
              {sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  sectionIndex={index}
                  onUpdate={(updated) => updateSection(index, updated)}
                  onDelete={() => deleteSection(index)}
                  onDuplicate={() => duplicateSection(index)}
                  onDragStart={(e) => handleSectionDragStart(e, section.id)}
                  onDragOver={handleSectionDragOver}
                  onDrop={(e) => handleSectionDrop(e, section.id)}
                  onDragEnd={handleSectionDragEnd}
                  isDragging={draggedSectionId === section.id}
                  availableClassTypes={availableClassTypes}
                />
              ))}
              
              {/* Add Section button at the bottom if there's more than one section */}
              {sections.length > 1 && (
                <button
                  type="button"
                  onClick={addSection}
                  className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-green-400 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group"
                >
                  <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400">
                    <Icon path={mdiPlus} size={16} />
                    <span className="font-medium">Add Section</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FormBuilderPage;
