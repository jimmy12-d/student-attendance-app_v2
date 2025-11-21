// app/dashboard/to-do/components/TaskPreviewModal.tsx
"use client";

import React, { useState } from 'react';
import { ContactTask } from '../../../_interfaces';
import { mdiClose, mdiCalendarRemove, mdiAccountAlert, mdiCheckboxMarked, mdiCheckboxBlankOutline } from '@mdi/js';

interface PreviewTask extends Omit<ContactTask, 'id'> {
  previewId: string;
  isUpdate?: boolean;
  existingTaskId?: string;
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

  const consecutiveCount = tasks.filter(t => t.taskType === 'consecutive').length;
  const warningCount = tasks.filter(t => t.taskType === 'warning').length;

  return (
    <div className="fixed inset-0 z-110 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop with blur */}
      <div 
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
      />

      {/* Modal Panel */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden transform transition-all border border-gray-100 dark:border-gray-800">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between bg-white/50 dark:bg-gray-900/50 backdrop-blur-md z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Review Tasks
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Found <span className="font-medium text-gray-900 dark:text-gray-200">{tasks.length}</span> potential tasks
              </span>
              {(consecutiveCount > 0 || warningCount > 0) && (
                <div className="flex gap-2 text-xs">
                  {consecutiveCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-300 font-medium">
                      {consecutiveCount} Consecutive
                    </span>
                  )}
                  {warningCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300 font-medium">
                      {warningCount} Warning
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d={mdiClose} />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50 dark:bg-gray-900/50">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-4">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiCheckboxMarked} />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">All Caught Up!</h3>
              <p className="text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                No new tasks need to be generated at this time.
              </p>
            </div>
          ) : (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Selection Header */}
              <div className="flex items-center justify-between px-1">
                <button
                  onClick={toggleAll}
                  className="group flex items-center gap-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                    selectedIds.size === tasks.length 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-blue-500'
                  }`}>
                    {selectedIds.size === tasks.length && (
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d={mdiCheckboxMarked} /></svg>
                    )}
                  </div>
                  {selectedIds.size === tasks.length ? 'Deselect All' : 'Select All'}
                </button>
                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {selectedIds.size} Selected
                </span>
              </div>

              {/* Task List */}
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isSelected = selectedIds.has(task.previewId);
                  return (
                    <div
                      key={task.previewId}
                      onClick={() => toggleTask(task.previewId)}
                      className={`group relative flex items-start gap-4 p-4 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-gray-800 border-blue-500 ring-1 ring-blue-500 shadow-sm z-10'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                      }`}
                    >
                      {/* Custom Checkbox */}
                      <div className={`mt-1 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 group-hover:border-blue-400'
                      }`}>
                        {isSelected && (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d={mdiCheckboxMarked} /></svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className={`font-semibold text-base truncate ${
                            isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'
                          }`}>
                            {task.studentName}
                          </h3>
                          {task.isUpdate && (
                            <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                              Update
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                          <span>{task.class}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <span>{task.shift}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                            task.taskType === 'consecutive'
                              ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                          }`}>
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d={task.taskType === 'consecutive' ? mdiCalendarRemove : mdiAccountAlert} />
                            </svg>
                            {task.taskType === 'consecutive' ? 'Consecutive Absence' : 'Warning'}
                          </span>
                          
                          {task.consecutiveDays && (
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-md">
                              {task.consecutiveDays} days
                            </span>
                          )}
                        </div>

                        {task.notes && (
                          <div className="mt-3 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-2.5 rounded-lg border border-gray-100 dark:border-gray-700/50">
                            {task.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between gap-4 z-10">
          <div className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
            {selectedIds.size > 0 ? (
              <span>Ready to create <strong className="text-gray-900 dark:text-white">{selectedIds.size}</strong> tasks</span>
            ) : (
              <span>Select tasks to proceed</span>
            )}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              className="flex-1 sm:flex-none px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition-all transform active:scale-[0.98]"
            >
              Confirm & Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
