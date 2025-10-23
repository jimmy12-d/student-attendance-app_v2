"use client";

import { useState } from "react";
import { FormSection, Question } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import { mdiDrag, mdiDelete, mdiContentCopy, mdiPlus, mdiChevronDown, mdiChevronUp, mdiAccount, mdiEye } from "@mdi/js";
import QuestionEditor from "./QuestionEditor";

interface SectionEditorProps {
  section: FormSection;
  sectionIndex: number;
  onUpdate: (section: FormSection) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragging?: boolean;
  availableClassTypes: string[];
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  section,
  sectionIndex,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  availableClassTypes,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [draggedQuestionId, setDraggedQuestionId] = useState<string | null>(null);
  const [showClassTypeFilter, setShowClassTypeFilter] = useState(false);
  const targetClassTypes = section.targetClassTypes || [];

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      text: '',
      type: 'short_answer',
      required: false,
      options: [],
    };
    onUpdate({
      ...section,
      questions: [...section.questions, newQuestion]
    });
  };

  const updateQuestion = (questionIndex: number, updatedQuestion: Question) => {
    const newQuestions = [...section.questions];
    newQuestions[questionIndex] = updatedQuestion;
    onUpdate({
      ...section,
      questions: newQuestions
    });
  };

  const deleteQuestion = (questionIndex: number) => {
    onUpdate({
      ...section,
      questions: section.questions.filter((_, i) => i !== questionIndex)
    });
  };

  const duplicateQuestion = (questionIndex: number) => {
    const questionToDuplicate = section.questions[questionIndex];
    const duplicatedQuestion: Question = {
      ...questionToDuplicate,
      id: `q_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    };
    const newQuestions = [...section.questions];
    newQuestions.splice(questionIndex + 1, 0, duplicatedQuestion);
    onUpdate({
      ...section,
      questions: newQuestions
    });
  };

  const handleQuestionDragStart = (e: React.DragEvent, questionId: string) => {
    setDraggedQuestionId(questionId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", questionId);
    e.stopPropagation();
  };

  const handleQuestionDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    e.stopPropagation();
  };

  const handleQuestionDrop = (e: React.DragEvent, targetQuestionId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedQuestionId || draggedQuestionId === targetQuestionId) {
      setDraggedQuestionId(null);
      return;
    }

    const draggedIndex = section.questions.findIndex(q => q.id === draggedQuestionId);
    const targetIndex = section.questions.findIndex(q => q.id === targetQuestionId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedQuestionId(null);
      return;
    }

    const newQuestions = [...section.questions];
    const [removed] = newQuestions.splice(draggedIndex, 1);
    newQuestions.splice(targetIndex, 0, removed);

    onUpdate({
      ...section,
      questions: newQuestions
    });
    setDraggedQuestionId(null);
  };

  const handleQuestionDragEnd = () => {
    setDraggedQuestionId(null);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={`bg-white dark:bg-slate-800 rounded-2xl shadow-lg border-2 transition-all ${
        isDragging 
          ? 'border-blue-400 dark:border-blue-500 opacity-50 scale-95' 
          : 'border-gray-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
      }`}
    >
      {/* Section Header */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-start gap-4">
          {/* Drag Handle */}
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors mt-1"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Icon path={mdiDrag} size={16} className="text-gray-400" />
          </button>

          {/* Section Info */}
          <div className="flex-1 space-y-3">
            <input
              type="text"
              value={section.title}
              onChange={(e) => onUpdate({ ...section, title: e.target.value })}
              placeholder="Section Title"
              className="w-full text-2xl font-bold bg-transparent border-b-2 border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors text-gray-900 dark:text-white placeholder-gray-400"
            />
            <textarea
              value={section.description || ''}
              onChange={(e) => onUpdate({ ...section, description: e.target.value })}
              placeholder="Section description (optional)"
              rows={2}
              className="w-full text-sm bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 outline-none transition-colors text-gray-600 dark:text-gray-400 placeholder-gray-400 resize-none"
            />
            
            {/* Class Type Filter for Section */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClassTypeFilter(!showClassTypeFilter)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  targetClassTypes.length > 0
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                <Icon path={mdiEye} size={16} />
                <span>
                  {targetClassTypes.length > 0 
                    ? `Visible to ${targetClassTypes.length} class type${targetClassTypes.length > 1 ? 's' : ''}` 
                    : 'Visible to all class types'}
                </span>
              </button>

              {showClassTypeFilter && (
                <div className="mt-3 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl border-2 border-gray-200 dark:border-slate-600 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Target Class Types
                    </span>
                    {targetClassTypes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onUpdate({ ...section, targetClassTypes: [] })}
                        className="text-xs text-red-600 dark:text-red-400 hover:underline"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select which class types can see this entire section. Leave empty for all students.
                  </p>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableClassTypes.map((classType) => (
                      <label
                        key={classType}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600 p-2 rounded-lg transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={targetClassTypes.includes(classType)}
                          onChange={(e) => {
                            const newTargetClassTypes = e.target.checked
                              ? [...targetClassTypes, classType]
                              : targetClassTypes.filter(ct => ct !== classType);
                            onUpdate({ ...section, targetClassTypes: newTargetClassTypes });
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{classType}</span>
                      </label>
                    ))}
                  </div>
                  {targetClassTypes.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-slate-600">
                      {targetClassTypes.map((ct) => (
                        <span
                          key={ct}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full"
                        >
                          {ct}
                          <button
                            type="button"
                            onClick={() => {
                              const newTargetClassTypes = targetClassTypes.filter(c => c !== ct);
                              onUpdate({ ...section, targetClassTypes: newTargetClassTypes });
                            }}
                            className="hover:text-blue-900 dark:hover:text-blue-100 ml-1"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Section Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={isCollapsed ? "Expand section" : "Collapse section"}
            >
              <Icon 
                path={isCollapsed ? mdiChevronDown : mdiChevronUp} 
                size={16} 
                className="text-gray-600 dark:text-gray-400" 
              />
            </button>
            <button
              type="button"
              onClick={onDuplicate}
              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Duplicate section"
            >
              <Icon path={mdiContentCopy} size={16} className="text-blue-600 dark:text-blue-400" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete section"
            >
              <Icon path={mdiDelete} size={16} className="text-red-600 dark:text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Section Content */}
      {!isCollapsed && (
        <div className="p-6 space-y-4">
          {/* Questions */}
          {section.questions.map((question, qIndex) => (
            <QuestionEditor
              key={question.id}
              question={question}
              index={qIndex}
              onUpdate={(updatedQuestion) => updateQuestion(qIndex, updatedQuestion)}
              onDelete={() => deleteQuestion(qIndex)}
              onDuplicate={() => duplicateQuestion(qIndex)}
              onDragStart={(e) => handleQuestionDragStart(e, question.id)}
              onDragOver={handleQuestionDragOver}
              onDrop={(e) => handleQuestionDrop(e, question.id)}
              isBeingDragged={draggedQuestionId === question.id}
              availableClassTypes={availableClassTypes}
            />
          ))}

          {/* Add Question Button */}
          <button
            type="button"
            onClick={addQuestion}
            className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
          >
            <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400">
              <Icon path={mdiPlus} size={16} />
              <span className="font-medium">Add Question</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
