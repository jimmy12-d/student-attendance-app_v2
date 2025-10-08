import { Question, QuestionOption } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import { mdiPlus, mdiDelete, mdiDragVertical, mdiAlertCircle, mdiContentCopy, mdiAccount } from "@mdi/js";
import QuestionTypeSelector from "./QuestionTypeSelector";
import { useState } from "react";

interface QuestionEditorProps {
  question: Question;
  index: number;
  onUpdate: (question: Question) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  validationErrors?: string[];
  availableClassTypes?: string[];
  onDragStart: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  isBeingDragged: boolean;
}

const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  index,
  onUpdate,
  onDelete,
  onDuplicate,
  validationErrors = [],
  availableClassTypes = [],
  onDragStart,
  onDrop: handleDropProp,
  onDragOver,
  isBeingDragged
}) => {
  const [showClassTypeFilter, setShowClassTypeFilter] = useState(false);
  const needsOptions = ['multiple_choice', 'checkboxes', 'dropdown'].includes(question.type);
  const isLinearScale = question.type === 'linear_scale';
  const hasErrors = validationErrors.length > 0;
  const targetClassTypes = question.targetClassTypes || [];
  const [isDropped, setIsDropped] = useState(false);
  
  // For checkboxes, allow 1+ options. For others, require 2+ options
  const minOptionsRequired = question.type === 'checkboxes' ? 1 : 2;

  const addOption = () => {
    const newOption: QuestionOption = {
      id: `opt_${Date.now()}`,
      text: '',
    };
    onUpdate({
      ...question,
      options: [...(question.options || []), newOption],
    });
  };

  const updateOption = (optionId: string, text: string) => {
    onUpdate({
      ...question,
      options: question.options?.map(opt => 
        opt.id === optionId ? { ...opt, text } : opt
      ),
    });
  };

  const deleteOption = (optionId: string) => {
    onUpdate({
      ...question,
      options: question.options?.filter(opt => opt.id !== optionId),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    handleDropProp(e);
    setIsDropped(true);
    setTimeout(() => setIsDropped(false), 500); // Animation duration
  };

  return (
    <div 
      className={`nokora-font bg-white dark:bg-slate-800/30 rounded-xl border border-gray-100 dark:border-slate-700/50 p-5 space-y-4 hover:bg-gray-50/30 dark:hover:bg-slate-800/50 focus-within:border-blue-300 dark:focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all duration-200 ${
        hasErrors 
          ? 'border-red-200 dark:border-red-500/50 bg-red-50/20 dark:bg-red-900/10' 
          : ''
      } ${isBeingDragged ? 'opacity-50 border-blue-400 dark:border-blue-600 shadow-lg' : ''}
        ${isDropped ? 'animate-bounce-once' : ''}
      `}
      draggable
      onDragStart={onDragStart}
      onDrop={handleDrop}
      onDragOver={onDragOver}
    >
      {/* Error Banner */}
      {hasErrors && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 p-3 rounded-lg animate-in slide-in-from-top-1 duration-200">
          <div className="flex items-start space-x-2">
            <Icon path={mdiAlertCircle} size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg font-semibold text-gray-600 dark:text-gray-300">
            {index + 1}
          </span>
          <Icon 
            path={mdiDragVertical} 
            size={16} 
            className="text-gray-400 cursor-move opacity-60 hover:opacity-100"
          />
        </div>
        <div className="flex items-center gap-1">
          <QuestionTypeSelector
            selectedType={question.type}
            onTypeChange={(type) => onUpdate({ ...question, type })}
          />
          <label className="flex items-center space-x-2 cursor-pointer group px-2">
            <input
              type="checkbox"
              checked={question.required}
              onChange={(e) => onUpdate({ ...question, required: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-2 border-gray-300 dark:border-slate-600 rounded focus:ring-0 focus:ring-offset-0 focus:border-blue-400 dark:focus:border-blue-500 transition-colors"
            />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200 transition-colors">Required</span>
          </label>
          <button
            onClick={onDuplicate}
            className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all duration-200"
            title="Duplicate question"
          >
            <Icon path={mdiContentCopy} size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-all duration-200"
            title="Delete question"
          >
            <Icon path={mdiDelete} size={16} />
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div className="space-y-1">
        <input
          type="text"
          value={question.text}
          onChange={(e) => onUpdate({ ...question, text: e.target.value })}
          placeholder="Enter your question..."
          className={`w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-slate-600 rounded-none px-0 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200 text-lg font-medium leading-relaxed ${
            !question.text.trim() && hasErrors
              ? 'border-red-300 dark:border-red-500'
              : ''
          }`}
        />
      </div>

      {/* Options for Multiple Choice/Checkboxes/Dropdown */}
      {needsOptions && (
        <div className="space-y-3 ml-8">
          {question.options?.map((option, idx) => (
            <div key={option.id} className="flex items-center gap-3 group">
              <span className="text-sm text-gray-400 dark:text-gray-500 w-6 font-mono">
                {idx + 1}.
              </span>
              <input
                type="text"
                value={option.text}
                onChange={(e) => updateOption(option.id, e.target.value)}
                placeholder={`Option ${idx + 1}`}
                className="flex-1 bg-transparent border-0 border-b border-gray-200 dark:border-slate-600 rounded-none px-0 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200"
              />
              <button
                onClick={() => deleteOption(option.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 opacity-0 group-hover:opacity-100"
              >
                <Icon path={mdiDelete} size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={addOption}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200"
          >
            <Icon path={mdiPlus} size={16} />
            Add option
          </button>
        </div>
      )}

      {/* Linear Scale Configuration */}
      {isLinearScale && (
        <div className="space-y-4 ml-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                Min value
              </label>
              <input
                type="number"
                value={question.minScale || 0}
                onChange={(e) => onUpdate({ ...question, minScale: parseInt(e.target.value) })}
                className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-slate-600 rounded-none px-0 py-2 text-sm focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                Max value
              </label>
              <input
                type="number"
                value={question.maxScale || 10}
                onChange={(e) => onUpdate({ ...question, maxScale: parseInt(e.target.value) })}
                className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-slate-600 rounded-none px-0 py-2 text-sm focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                Min label
              </label>
              <input
                type="text"
                value={question.minLabel || ''}
                onChange={(e) => onUpdate({ ...question, minLabel: e.target.value })}
                placeholder="Optional"
                className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-slate-600 rounded-none px-0 py-2 text-sm focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                Max label
              </label>
              <input
                type="text"
                value={question.maxLabel || ''}
                onChange={(e) => onUpdate({ ...question, maxLabel: e.target.value })}
                placeholder="Optional"
                className="w-full bg-transparent border-0 border-b-2 border-gray-200 dark:border-slate-600 rounded-none px-0 py-2 text-sm focus:outline-none focus:ring-0 focus:border-blue-400 dark:focus:border-blue-500 transition-all duration-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* Class Type Filter */}
      {availableClassTypes.length > 0 && (
        <div className="space-y-3 border-t border-gray-200 dark:border-slate-700 pt-4">
          <button
            type="button"
            onClick={() => setShowClassTypeFilter(!showClassTypeFilter)}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <Icon path={mdiAccount} size={16} />
            <span>Target Class Types {targetClassTypes.length > 0 && `(${targetClassTypes.length})`}</span>
            <span className="text-xs text-gray-400">{showClassTypeFilter ? '▼' : '▶'}</span>
          </button>
          
          {showClassTypeFilter && (
            <div className="bg-gray-50 dark:bg-slate-700/30 rounded-lg p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Select class types that should see this question. Leave empty for all students.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {availableClassTypes.map((classType) => (
                  <label
                    key={classType}
                    className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-600/50 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={targetClassTypes.includes(classType)}
                      onChange={(e) => {
                        const newTargetClassTypes = e.target.checked
                          ? [...targetClassTypes, classType]
                          : targetClassTypes.filter(ct => ct !== classType);
                        onUpdate({
                          ...question,
                          targetClassTypes: newTargetClassTypes.length > 0 ? newTargetClassTypes : undefined
                        });
                      }}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{classType}</span>
                  </label>
                ))}
              </div>
              {targetClassTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-2">
                  {targetClassTypes.map((ct) => (
                    <span
                      key={ct}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full"
                    >
                      {ct}
                      <button
                        onClick={() => {
                          const newTargetClassTypes = targetClassTypes.filter(c => c !== ct);
                          onUpdate({
                            ...question,
                            targetClassTypes: newTargetClassTypes.length > 0 ? newTargetClassTypes : undefined
                          });
                        }}
                        className="hover:text-blue-900 dark:hover:text-blue-100"
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
      )}
    </div>
  );
};

export default QuestionEditor;

/* Add custom bounce animation for drag-and-drop feedback */
const style = document.createElement('style');
style.innerHTML = `
@keyframes bounce-once {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}
.animate-bounce-once {
  animation: bounce-once 0.3s ease-in-out;
}
`;
document.head.appendChild(style);
