// app/dashboard/to-do/components/ContactTasksTable.tsx
"use client";

import React, { useState, useMemo } from "react";
import { ContactTask } from "../../../_interfaces";
import { mdiPencil, mdiCheck, mdiDelete, mdiAccountAlert, mdiCalendarRemove, mdiFilter, mdiSort } from "@mdi/js";
import { Timestamp } from "firebase/firestore";

interface Props {
  tasks: ContactTask[];
  onUpdateTask: (taskId: string, updates: Partial<ContactTask>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  onViewStudent?: (studentId: string) => void;
}

type StatusFilter = 'all' | 'contacted' | 'waiting' | 'done';
type TypeFilter = 'all' | 'consecutive' | 'warning';
type AssigneeFilter = 'all' | 'Jimmy' | 'Jon' | 'Jasper' | 'Jason' | '';

const ContactTasksTable: React.FC<Props> = ({ tasks, onUpdateTask, onDeleteTask, onViewStudent }) => {
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ContactTask>>({});
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'studentName'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

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
      case 'contacted':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-300 dark:border-blue-700';
      case 'waiting':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-300 dark:border-amber-700';
      case 'done':
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
        ...(editForm.status === 'done' && { completedAt: new Date() }),
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
        ...(newStatus === 'done' && { completedAt: new Date() }),
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    let filtered = tasks.filter(task => {
      if (statusFilter !== 'all' && task.status !== statusFilter) return false;
      if (typeFilter !== 'all' && task.taskType !== typeFilter) return false;
      if (assigneeFilter !== 'all' && task.assignedTo !== assigneeFilter) return false;
      return true;
    });

    filtered.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'studentName':
          compareValue = a.studentName.localeCompare(b.studentName);
          break;
        case 'createdAt':
          const aCreated = a.createdAt instanceof Timestamp ? a.createdAt.toDate() : a.createdAt;
          const bCreated = b.createdAt instanceof Timestamp ? b.createdAt.toDate() : b.createdAt;
          compareValue = aCreated.getTime() - bCreated.getTime();
          break;
        case 'updatedAt':
          const aUpdated = a.updatedAt instanceof Timestamp ? a.updatedAt.toDate() : a.updatedAt;
          const bUpdated = b.updatedAt instanceof Timestamp ? b.updatedAt.toDate() : b.updatedAt;
          compareValue = aUpdated.getTime() - bUpdated.getTime();
          break;
      }

      return sortOrder === 'asc' ? compareValue : -compareValue;
    });

    return filtered;
  }, [tasks, statusFilter, typeFilter, assigneeFilter, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d={mdiFilter} />
          </svg>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">All Status</option>
          <option value="contacted">Contacted</option>
          <option value="waiting">Waiting</option>
          <option value="done">Done</option>
        </select>

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
          <span>{filteredAndSortedTasks.length} tasks</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50"
                  onClick={() => handleSort('studentName')}
                >
                  <div className="flex items-center gap-1">
                    Student Info
                    <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                      <path d={mdiSort} />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th 
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/50"
                  onClick={() => handleSort('createdAt')}
                >
                  <div className="flex items-center gap-1">
                    Created
                    <svg className="w-4 h-4 opacity-50" fill="currentColor" viewBox="0 0 24 24">
                      <path d={mdiSort} />
                    </svg>
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No tasks found. Tasks will appear here when students have consecutive absences or warning flags.
                  </td>
                </tr>
              ) : (
                filteredAndSortedTasks.map((task) => (
                  <tr 
                    key={task.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
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
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getTypeColor(task.taskType)}`}>
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d={task.taskType === 'consecutive' ? mdiCalendarRemove : mdiAccountAlert} />
                            </svg>
                            {task.taskType === 'consecutive' ? 'Consecutive' : 'Warning'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <textarea
                            value={editForm.reason || ''}
                            onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                            rows={2}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editForm.assignedTo || ''}
                            onChange={(e) => setEditForm({ ...editForm, assignedTo: e.target.value as ContactTask['assignedTo'] })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Unassigned</option>
                            {staffMembers.filter(m => m !== '').map((member) => (
                              <option key={member} value={member}>{member}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={editForm.status || task.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ContactTask['status'] })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="contacted">Contacted</option>
                            <option value="waiting">Waiting</option>
                            <option value="done">Done</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(task.createdAt)}
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
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700 dark:text-gray-300 max-w-xs">
                            {task.reason}
                          </div>
                          {task.notes && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 italic">
                              Note: {task.notes}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-700 dark:text-gray-300">
                            {task.assignedTo || (
                              <span className="text-gray-400 dark:text-gray-500 italic">Unassigned</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            value={task.status}
                            onChange={(e) => handleQuickStatusChange(task.id, e.target.value as ContactTask['status'])}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer ${getStatusColor(task.status)}`}
                          >
                            <option value="contacted">Contacted</option>
                            <option value="waiting">Waiting</option>
                            <option value="done">Done</option>
                          </select>
                          {task.completedAt && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {formatDate(task.completedAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <div>{formatDate(task.createdAt)}</div>
                            <div className="text-gray-400 dark:text-gray-500">{formatTime(task.createdAt)}</div>
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Contacted</div>
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
            {tasks.filter(t => t.status === 'contacted').length}
          </div>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="text-sm text-amber-600 dark:text-amber-400 font-medium">Waiting</div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">
            {tasks.filter(t => t.status === 'waiting').length}
          </div>
        </div>
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-sm text-green-600 dark:text-green-400 font-medium">Done</div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-300">
            {tasks.filter(t => t.status === 'done').length}
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
