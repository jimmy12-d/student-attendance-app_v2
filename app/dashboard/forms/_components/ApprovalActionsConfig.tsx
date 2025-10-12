"use client";

import React, { useState } from 'react';
import Icon from '@/app/_components/Icon';
import {
  mdiCog,
  mdiPlus,
  mdiDatabase,
  mdiCodeTags,
  mdiDelete,
  mdiCheckCircle,
  mdiLightbulb
} from '@mdi/js';

interface ApprovalAction {
  type: 'updateField';
  collection: string;
  field: string;
  value: boolean | string | number;
}

interface ApprovalActionsConfigProps {
  actions: ApprovalAction[];
  onActionsChange: (actions: ApprovalAction[]) => void;
}

const ApprovalActionsConfig: React.FC<ApprovalActionsConfigProps> = ({ actions, onActionsChange }) => {
  const [newAction, setNewAction] = useState<Partial<ApprovalAction>>({
    type: 'updateField',
    collection: '',
    field: '',
    value: true,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  const addAction = () => {
    if (newAction.collection && newAction.field) {
      onActionsChange([...actions, newAction as ApprovalAction]);
      setNewAction({ type: 'updateField', collection: '', field: '', value: true });
      setIsExpanded(false);
    }
  };

  const removeAction = (index: number) => {
    const updatedActions = actions.filter((_, i) => i !== index);
    onActionsChange(updatedActions);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-700 border border-blue-200/50 dark:border-slate-600/50 shadow-lg backdrop-blur-sm mb-4 mr-4">
      {/* Header */}
      <div className="px-6 py-4 border-b border-blue-200/30 dark:border-slate-600/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-400/10">
              <Icon path={mdiCog} size={20} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Approval Actions</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Configure automated actions on approval</p>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-200 group"
          >
            <Icon
              path={mdiPlus}
              size={16}
              className={`text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-45' : 'group-hover:scale-110'}`}
            />
          </button>
        </div>
      </div>

      {/* Current Actions */}
      <div className="px-6 py-4">
        {actions.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 mb-4">
              <Icon path={mdiLightbulb} size={24} className="text-gray-400 dark:text-gray-500" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">No actions configured yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Add your first action below</p>
          </div>
        ) : (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center">
              <Icon path={mdiCheckCircle} size={16} className="mr-2 text-green-500" />
              Active Actions ({actions.length})
            </h4>
            {actions.map((action, index) => (
              <div
                key={index}
                className="group relative p-4 rounded-xl bg-white/60 dark:bg-slate-700/60 border border-gray-200/50 dark:border-slate-600/50 hover:border-blue-300 dark:hover:border-blue-500/50 transition-all duration-200 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Icon path={mdiDatabase} size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          Update <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-xs font-mono">{action.field}</code>
                        </span>
                        <span className="text-gray-400 dark:text-gray-500">→</span>
                        <code className="px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-xs font-mono text-green-700 dark:text-green-400">
                          {JSON.stringify(action.value)}
                        </code>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        in collection: <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-600 text-xs">{action.collection}</code>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAction(index)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-800/50 text-red-600 dark:text-red-400 transition-all duration-200"
                  >
                    <Icon path={mdiDelete} size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add New Action Form */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="px-6 pb-6 border-t border-blue-200/30 dark:border-slate-600/30">
          <div className="pt-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-4 flex items-center">
              <Icon path={mdiPlus} size={16} className="mr-2 text-blue-500" />
              Add New Action
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Collection
                </label>
                <div className="relative">
                  <Icon path={mdiDatabase} size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g., students"
                    value={newAction.collection || ''}
                    onChange={(e) => setNewAction({ ...newAction, collection: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Field
                </label>
                <div className="relative">
                  <Icon path={mdiCodeTags} size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="e.g., isBPClass"
                    value={newAction.field || ''}
                    onChange={(e) => setNewAction({ ...newAction, field: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Value
                </label>
                <input
                  type="text"
                  placeholder="e.g., true"
                  value={newAction.value?.toString() || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    let parsedValue: boolean | string | number = val;
                    if (val === 'true') parsedValue = true;
                    else if (val === 'false') parsedValue = false;
                    else if (!isNaN(Number(val))) parsedValue = Number(val);
                    setNewAction({ ...newAction, value: parsedValue });
                  }}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>
            <button
              onClick={addAction}
              disabled={!newAction.collection || !newAction.field}
              className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-medium rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              <span className="flex items-center justify-center">
                <Icon path={mdiPlus} size={16} className="mr-2" />
                Add Action
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalActionsConfig;