// app/dashboard/to-do/components/ContactTasksTable.tsx
"use client";

import React, { useState, useMemo } from "react";
import { ContactTask } from "../../../_interfaces";
import { 
  mdiPencil, mdiCheck, mdiDelete, mdiAccountAlert, mdiCalendarRemove, mdiFilter, mdiSort
} from "@mdi/js";
import { Timestamp } from "firebase/firestore";
import CustomCombobox, { ComboboxOption } from "../../../_components/CustomCombobox";

interface Props {
  tasks: ContactTask[];
  onUpdateTask: (taskId: string, updates: Partial<ContactTask>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onViewStudent?: (studentId: string) => void;
}

type StatusFilter = 'all' | 'unresolved' | 'contacted' | 'resolved';
type TypeFilter = 'all' | 'consecutive' | 'warning';
type AssigneeFilter = 'all' | 'Jimmy' | 'Jon' | 'Jasper' | 'Jason' | '';

const ContactTasksTable: React.FC<Props> = ({ tasks, onUpdateTask, onDeleteTask, onViewStudent }) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContactTask>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [batchStatus, setBatchStatus] = useState<ContactTask['status'] | ''>('');
  const [batchAssignee, setBatchAssignee] = useState<ContactTask['assignedTo'] | ''>('');
  const [isBatchEditing, setIsBatchEditing] = useState(false);
  // Sorting state removed as we enforce specific sorting logic
  // const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'studentName'>('updatedAt');
  // const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const staffMembers: Array<'Jimmy' | 'Jon' | 'Jasper' | 'Jason' | ''> = ['Jimmy', 'Jon', 'Jasper', 'Jason', ''];

  const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'N/A';
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return dateObj.toLocaleDateString('en-US', options);
  };

  const formatTime = (date: Date | Timestamp | undefined) => {
    if (!date) return '';
    const dateObj = date instanceof Timestamp ? date.toDate() : date;
    return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const getStatusColor = (status: ContactTask['status']) => {
    switch (status) {
      case 'unresolved':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-300 dark:border-red-700';
      case 'contacted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-300 dark:border-green-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
  };

  const getTypeColor = (type: ContactTask['taskType']) => {
    switch (type) {
      case 'consecutive':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'warning':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
    }
  };

  const isHighAlarm = (task: ContactTask): boolean => {
    return task.taskType === 'consecutive' && (task.consecutiveDays || 0) >= 4;
  };

  const getAdminColor = (admin: ContactTask['assignedTo']) => {
    switch (admin) {
      case 'Jimmy':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'Jon':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-300 dark:border-purple-700';
      case 'Jasper':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700';
      case 'Jason':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300 border-gray-300 dark:border-gray-700';
    }
  };

  const handleEdit = (task: ContactTask) => {
    setEditingTaskId(task.id);
    setEditForm({
      reason: task.reason,
      assignedTo: task.assignedTo,
      status: task.status,
      notes: task.notes || '',
    });
  };

  const handleSave = async (taskId: string) => {
    try {
      await onUpdateTask(taskId, {
        ...editForm,
        updatedAt: new Date(),
        ...(editForm.status === 'resolved' && { completedAt: new Date() }),
      });
      setEditingTaskId(null);
      setEditForm({});
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: ContactTask['status']) => {
    try {
      await onUpdateTask(taskId, {
        status: newStatus,
        updatedAt: new Date(),
        ...(newStatus === 'resolved' && { completedAt: new Date() }),
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handleToggleTaskSelection = (taskId: string) => {
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedTaskIds.size === totalTasks) {
      setSelectedTaskIds(new Set());
    } else {
      const allTaskIds = new Set<string>();
      Object.values(groupedTasks).forEach(group => {
        group.consecutive.forEach(task => allTaskIds.add(task.id));
        group.warning.forEach(task => allTaskIds.add(task.id));
      });
      setSelectedTaskIds(allTaskIds);
    }
  };

  const handleBatchUpdate = async () => {
    try {
      const updates: Partial<ContactTask> = { updatedAt: new Date() };
      if (batchStatus) {
        updates.status = batchStatus;
        if (batchStatus === 'resolved') {
          updates.completedAt = new Date();
        }
      }
      if (batchAssignee !== '') {
        updates.assignedTo = batchAssignee;
      }

      if (Object.keys(updates).length === 1) return; // Only updatedAt, nothing to update

      await Promise.all(
        Array.from(selectedTaskIds).map(taskId =>
          onUpdateTask(taskId, updates)
        )
      );

      setSelectedTaskIds(new Set());
      setBatchStatus('');
      setBatchAssignee('');
      setIsBatchEditing(false);
    } catch (error) {
      console.error("Error in batch update:", error);
    }
  };

  const handleBatchDelete = async () => {
    if (!confirm(`Delete ${selectedTaskIds.size} selected task(s)? This action cannot be undone.`)) return;

    try {
      await Promise.all(
        Array.from(selectedTaskIds).map(taskId =>
          onDeleteTask(taskId)
        )
      );

      setSelectedTaskIds(new Set());
      setIsBatchEditing(false);
    } catch (error) {
      console.error("Error in batch delete:", error);
    }
  };

  const groupedTasks = useMemo(() => {
    // 1. Filter
    const filtered = tasks.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (typeFilter !== 'all' && task.taskType !== typeFilter) return false;
      if (assigneeFilter !== 'all' && task.assignedTo !== assigneeFilter) return false;
      return true;
    });

    // 2. Group
    const groups: Record<string, { consecutive: ContactTask[], warning: ContactTask[] }> = {
      'Morning': { consecutive: [], warning: [] },
      'Afternoon': { consecutive: [], warning: [] },
      'Evening': { consecutive: [], warning: [] },
      'Other': { consecutive: [], warning: [] }
    };

    filtered.forEach(task => {
      // Normalize shift
      let shift = 'Other';
      if (task.shift && ['Morning', 'Afternoon', 'Evening'].includes(task.shift)) {
        shift = task.shift;
      }
      
      // Add to appropriate group
      if (task.taskType === 'consecutive') {
        groups[shift].consecutive.push(task);
      } else {
        groups[shift].warning.push(task);
      }
    });

    // 3. Sort
    Object.values(groups).forEach(group => {
      // Sort consecutive by consecutiveDays (descending)
      group.consecutive.sort((a, b) => (b.consecutiveDays || 0) - (a.consecutiveDays || 0));
      
      // Sort warning by updatedAt (descending)
      group.warning.sort((a, b) => {
        const aTime = a.updatedAt instanceof Timestamp ? a.updatedAt.toMillis() : (a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0);
        const bTime = b.updatedAt instanceof Timestamp ? b.updatedAt.toMillis() : (b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0);
        return bTime - aTime;
      });
    });

    return groups;
  }, [tasks, statusFilter, typeFilter, assigneeFilter]);

  const totalTasks = useMemo(() => {
    return Object.values(groupedTasks).reduce((acc, group) => {
      return acc + group.consecutive.length + group.warning.length;
    }, 0);
  }, [groupedTasks]);

  const getShiftHeaderConfig = (shift: string) => {
    switch (shift) {
      case 'Morning':
        return {
          className: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white',
          iconPath: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
        };
      case 'Afternoon':
        return {
          className: 'bg-gradient-to-r from-orange-500 to-amber-400 text-white',
          iconPath: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z'
        };
      case 'Evening':
        return {
          className: 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white',
          iconPath: 'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z'
        };
      default:
        return {
          className: 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
          iconPath: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
        };
    }
  };

  const renderTaskRow = (task: ContactTask) => (
    <tr 
      key={task.id}
      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
    >
      <td className="px-4 py-3 text-center">
        <input
          type="checkbox"
          checked={selectedTaskIds.has(task.id)}
          onChange={() => handleToggleTaskSelection(task.id)}
          className="cursor-pointer"
        />
      </td>
      {editingTaskId === task.id ? (
        // Edit Mode Row
        <>
          <td className="px-4 py-3">
            <div className="flex flex-col">
              <button
                onClick={() => onViewStudent?.(task.studentId)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline text-left"
              >
                {task.studentName}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {task.class} • {task.shift}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">
            {isHighAlarm(task) ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md animate-pulse">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 13h-2v-4h2m0 8h-2v-2h2m-1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
                </svg>
                <span>HIGH ALARM ({task.consecutiveDays}d)</span>
              </div>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(task.taskType)}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d={task.taskType === 'consecutive' ? mdiCalendarRemove : mdiAccountAlert} />
                </svg>
                {task.taskType === 'consecutive' ? 'Consecutive' : 'Warning'}
              </span>
            )}
          </td>
          <td className="px-4 py-3">
            <CustomCombobox
              options={[
                { value: 'unresolved', label: 'Unresolved' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'resolved', label: 'Resolved' }
              ]}
              selectedValue={editForm.status || task.status}
              onChange={(value) => setEditForm({ ...editForm, status: value as ContactTask['status'] })}
              placeholder="Select status"
              editable={false}
              fieldData={{ className: "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" }}
            />
          </td>
          <td className="px-4 py-3">
            <CustomCombobox
              options={[
                { value: '', label: 'Unassigned' },
                ...staffMembers.filter(m => m !== '').map(member => ({ value: member, label: member }))
              ]}
              selectedValue={editForm.assignedTo || ''}
              onChange={(value) => setEditForm({ ...editForm, assignedTo: value as ContactTask['assignedTo'] })}
              placeholder="Select assignee"
              editable={false}
              fieldData={{ className: "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500" }}
            />
          </td>
          <td className="px-4 py-3">
            <textarea
              value={editForm.reason || ''}
              onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
              placeholder="Enter reason for contact..."
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </td>
          <td className="px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(task.updatedAt)}
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleSave(task.id)}
                className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                title="Save"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiCheck} />
                </svg>
              </button>
              <button
                onClick={() => {
                  setEditingTaskId(null);
                  setEditForm({});
                }}
                className="p-1.5 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors text-xl leading-none"
                title="Cancel"
              >
                ×
              </button>
            </div>
          </td>
        </>
      ) : (
        // View Mode Row
        <>
          <td className="px-4 py-3">
            <div className="flex flex-col">
              <button
                onClick={() => onViewStudent?.(task.studentId)}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline text-left"
              >
                {task.studentName}
              </button>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {task.class} • {task.shift}
              </span>
            </div>
          </td>
          <td className="px-4 py-3">
            {isHighAlarm(task) ? (
              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md animate-pulse">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 13h-2v-4h2m0 8h-2v-2h2m-1-9a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z" />
                </svg>
                <span>HIGH ALARM ({task.consecutiveDays}d)</span>
              </div>
            ) : (
              <>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(task.taskType)}`}>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d={task.taskType === 'consecutive' ? mdiCalendarRemove : mdiAccountAlert} />
                  </svg>
                  {task.taskType === 'consecutive' ? 'Consecutive' : 'Warning'}
                </span>
                {task.consecutiveDays && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {task.consecutiveDays} days
                  </div>
                )}
              </>
            )}
          </td>
          <td className="px-4 py-3">
            <CustomCombobox
              options={[
                { value: 'unresolved', label: 'Unresolved' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'resolved', label: 'Resolved' }
              ]}
              selectedValue={task.status}
              onChange={(value) => handleQuickStatusChange(task.id, value as ContactTask['status'])}
              placeholder="Select status"
              editable={false}
              fieldData={{ className: `px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer ${getStatusColor(task.status)}` }}
            />
            {task.completedAt && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {formatDate(task.completedAt)}
              </div>
            )}
          </td>
          <td className="px-4 py-3">
            {task.assignedTo ? (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getAdminColor(task.assignedTo)}`}>
                {task.assignedTo}
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400 border-gray-300 dark:border-gray-700">
                Unassigned
              </span>
            )}
          </td>
          <td className="px-4 py-3">
            <div className="text-sm text-gray-700 dark:text-gray-300 max-w-xs">
              {task.reason || <span className="text-gray-400 dark:text-gray-500 italic">No reason entered</span>}
            </div>
            {task.notes && !task.notes.toLowerCase().includes('consecutive') && !task.notes.toLowerCase().includes('absent') && (
              <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                Note: {task.notes}
              </div>
            )}
          </td>
          <td className="px-4 py-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              <div>{formatDate(task.updatedAt)}</div>
              <div className="text-gray-400 dark:text-gray-500">{formatTime(task.updatedAt)}</div>
            </div>
          </td>
          <td className="px-4 py-3">
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => handleEdit(task)}
                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded transition-colors"
                title="Edit"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiPencil} />
                </svg>
              </button>
              <button
                onClick={() => {
                  if (confirm(`Delete task for ${task.studentName}?`)) {
                    onDeleteTask(task.id);
                  }
                }}
                className="p-1.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                title="Delete"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d={mdiDelete} />
                </svg>
              </button>
            </div>
          </td>
        </>
      )}
    </tr>
  );

  return (
    <div className="space-y-4">
      {/* Batch Edit Controls */}
      {selectedTaskIds.size > 0 && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
                {selectedTaskIds.size} task(s) selected
              </span>
              <button
                onClick={() => setSelectedTaskIds(new Set())}
                className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800 rounded"
              >
                Clear Selection
              </button>
            </div>

            {isBatchEditing && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Update Status</label>
                  <CustomCombobox
                    options={[
                      { value: '', label: 'No change' },
                      { value: 'unresolved', label: 'Unresolved' },
                      { value: 'contacted', label: 'Contacted' },
                      { value: 'resolved', label: 'Resolved' }
                    ]}
                    selectedValue={batchStatus}
                    onChange={(value) => setBatchStatus(value as ContactTask['status'] | '')}
                    placeholder="No change"
                    editable={false}
                    fieldData={{ className: "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Assign To</label>
                  <CustomCombobox
                    options={[
                      { value: '', label: 'No change' },
                      { value: '', label: 'Unassigned' },
                      ...staffMembers.filter(m => m !== '').map(member => ({ value: member, label: member }))
                    ]}
                    selectedValue={batchAssignee === undefined ? '' : batchAssignee}
                    onChange={(value) => setBatchAssignee(value as ContactTask['assignedTo'] | '')}
                    placeholder="No change"
                    editable={false}
                    fieldData={{ className: "w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700" }}
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    onClick={handleBatchUpdate}
                    className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm rounded font-medium transition-colors"
                  >
                    Apply Changes
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsBatchEditing(!isBatchEditing)}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded font-medium transition-colors"
              >
                {isBatchEditing ? 'Cancel Edit' : 'Batch Edit'}
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded font-medium transition-colors"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d={mdiFilter} />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
        </div>

        <CustomCombobox
          options={[
            { value: 'all', label: 'All Status' },
            { value: 'unresolved', label: 'Unresolved' },
            { value: 'contacted', label: 'Contacted' },
            { value: 'resolved', label: 'Resolved' }
          ]}
          selectedValue={statusFilter}
          onChange={(value) => setStatusFilter(value as StatusFilter)}
          placeholder="Select status"
          editable={false}
          fieldData={{ className: "px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" }}
        />

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Types</option>
          <option value="consecutive">Consecutive Absences</option>
          <option value="warning">Warning Students</option>
        </select>

        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value as AssigneeFilter)}
          className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Assignees</option>
          <option value="">Unassigned</option>
          <option value="Jimmy">Jimmy</option>
          <option value="Jon">Jon</option>
          <option value="Jasper">Jasper</option>
          <option value="Jason">Jason</option>
        </select>

        <div className="ml-auto flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <span>{totalTasks} tasks</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Admin
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {totalTasks === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No tasks found. Tasks will appear here when students have consecutive absences or warning flags.
                  </td>
                </tr>
              ) : (
                ['Morning', 'Afternoon', 'Evening', 'Other'].map(shift => {
                  const group = groupedTasks[shift];
                  if (!group || (group.consecutive.length === 0 && group.warning.length === 0)) return null;
                  
                  const headerConfig = getShiftHeaderConfig(shift);

                  return (
                    <React.Fragment key={shift}>
                      {/* Shift Header */}
                      <tr className="bg-white dark:bg-gray-800 border-y border-gray-100 dark:border-gray-700">
                        <td colSpan={8} className="px-4 py-6 text-center">
                          <div className={`inline-flex items-center px-4 py-2 rounded-full shadow-lg ${headerConfig.className}`}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={headerConfig.iconPath} />
                            </svg>
                            <span className="font-semibold">{shift} Shift</span>
                            <span className="ml-2 bg-white/20 px-2 py-0.5 rounded-full text-xs">
                              {group.consecutive.length + group.warning.length}
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Consecutive Tasks */}
                      {group.consecutive.length > 0 && (
                        <>
                          <tr className="bg-red-50/50 dark:bg-red-900/10">
                            <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider pl-8">
                              Consecutive Absences
                            </td>
                          </tr>
                          {group.consecutive.map(task => renderTaskRow(task))}
                        </>
                      )}

                      {/* Warning Tasks */}
                      {group.warning.length > 0 && (
                        <>
                          <tr className="bg-orange-50/50 dark:bg-orange-900/10">
                            <td colSpan={8} className="px-4 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider pl-8">
                              Warning Students
                            </td>
                          </tr>
                          {group.warning.map(task => renderTaskRow(task))}
                        </>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Unresolved</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {tasks.filter(t => t.status === 'unresolved').length}
          </div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Contacted</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {tasks.filter(t => t.status === 'contacted').length}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">Resolved</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {tasks.filter(t => t.status === 'resolved').length}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total Tasks</div>
          <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
            {tasks.length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactTasksTable;
