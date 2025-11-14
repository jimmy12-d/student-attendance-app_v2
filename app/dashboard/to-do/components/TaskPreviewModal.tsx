// app/dashboard/to-do/components/TaskPreviewModal.tsx
"use client";

import React, { useState } from 'react';
import { ContactTask } from '../../../_interfaces';
import { mdiClose, mdiCalendarRemove, mdiAccountAlert, mdiCheckboxMarked, mdiCheckboxBlankOutline } from '@mdi/js';

interface PreviewTask extends Omit<ContactTask, 'id'> {
  previewId: string;
}

interface TaskPreviewModalProps {
  tasks: PreviewTask[];
  onConfirm: (selectedTaskIds: string[]) => void;
  onCancel: () => void;
}

export const TaskPreviewModal: React.FC<TaskPreviewModalProps> = ({
  tasks,
  onConfirm,
  onCancel
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(tasks.map(t => t.previewId))
  );

  const toggleTask = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === tasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(tasks.map(t => t.previewId)));
    }
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selectedIds));
  };

  const getTypeColor = (type: ContactTask['taskType']) => {
    return type === 'consecutive'
      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700'
      : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700';
  };

  const consecutiveCount = tasks.filter(t => t.taskType === 'consecutive').length;
  const warningCount = tasks.filter(t => t.taskType === 'warning').length;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-110 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Preview New Tasks
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {consecutiveCount} consecutive • {warningCount} warning students
            </p>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d={mdiClose} />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 dark:text-gray-500 mb-2">
                <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiCheckboxMarked} />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                No new tasks to generate. All students are accounted for!
              </p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <button
                  onClick={toggleAll}
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d={selectedIds.size === tasks.length ? mdiCheckboxMarked : mdiCheckboxBlankOutline} />
                  </svg>
                  {selectedIds.size === tasks.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedIds.size} of {tasks.length} selected
                </span>
              </div>

              {/* Task List */}
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div
                    key={task.previewId}
                    onClick={() => toggleTask(task.previewId)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedIds.has(task.previewId)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <div className="pt-0.5">
                        <svg 
                          className={`w-6 h-6 ${
                            selectedIds.has(task.previewId) 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-gray-300 dark:text-gray-600'
                          }`} 
                          fill="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path d={selectedIds.has(task.previewId) ? mdiCheckboxMarked : mdiCheckboxBlankOutline} />
                        </svg>
                      </div>

                      {/* Task Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                            {task.studentName}
                          </h3>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {task.class} • {task.shift}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${getTypeColor(task.taskType)}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d={task.taskType === 'consecutive' ? mdiCalendarRemove : mdiAccountAlert} />
                            </svg>
                            {task.taskType === 'consecutive' ? 'Consecutive Absence' : 'Warning Student'}
                          </span>
                          {task.consecutiveDays && (
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {task.consecutiveDays} days
                            </span>
                          )}
                        </div>

                        {task.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {selectedIds.size > 0 && (
              <span>{selectedIds.size} task{selectedIds.size !== 1 ? 's' : ''} will be created</span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Create {selectedIds.size > 0 ? `${selectedIds.size} ` : ''}Task{selectedIds.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
