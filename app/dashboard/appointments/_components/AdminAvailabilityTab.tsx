"use client";

import React, { useState, Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import { mdiPlus, mdiPencil, mdiDelete, mdiCalendar, mdiClockOutline, mdiAlertCircle } from '@mdi/js';
import Icon from '../../../_components/Icon';
import DatePicker from '../../../_components/DatePicker';
import { AdminAvailability, AppointmentQuestion } from '../../../_interfaces';
import { formatDateForDisplay } from '../../../_utils/dateUtils';

interface AdminAvailabilityTabProps {
  availabilities: AdminAvailability[];
  formData: {
    date: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
    minPriorHours: number;
    downtimeStart: string;
    downtimeEnd: string;
    questions: AppointmentQuestion[];
  };
  newQuestion: {
    question: string;
    minWordCount: number;
  };
  showAvailabilityForm: boolean;
  editingAvailability: AdminAvailability | null;
  onFormDataChange: (data: any) => void;
  onNewQuestionChange: (question: any) => void;
  onShowFormChange: (show: boolean) => void;
  onAddQuestion: () => void;
  onRemoveQuestion: (id: string) => void;
  onSaveAvailability: () => void;
  onCancelForm: () => void;
  onEditAvailability: (availability: AdminAvailability) => void;
  onDeleteAvailability: (id: string) => void;
  onToggleAvailability: (availability: AdminAvailability) => void;
}

const AdminAvailabilityTab: React.FC<AdminAvailabilityTabProps> = ({
  availabilities,
  formData,
  newQuestion,
  showAvailabilityForm,
  editingAvailability,
  onFormDataChange,
  onNewQuestionChange,
  onShowFormChange,
  onAddQuestion,
  onRemoveQuestion,
  onSaveAvailability,
  onCancelForm,
  onEditAvailability,
  onDeleteAvailability,
  onToggleAvailability,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Admin Availability Schedules</h2>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your available time slots for appointments</p>
        </div>
        <button
          onClick={() => onShowFormChange(true)}
          className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 transform hover:scale-105 transition-all duration-300"
        >
          <Icon path={mdiPlus} size={16} />
          Add Availability
        </button>
      </div>

      {/* Availability Form Modal */}
      {showAvailabilityForm && (
        <div className="fixed inset-0 bg-[rgba(0,0,0,0.6)] backdrop-blur-sm flex items-center justify-center z-110 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingAvailability ? 'Edit Availability' : 'Add Availability'}
              </h3>
              
              {/* Main content grid - left column for basic settings, right for questions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Basic Settings */}
                <div className="lg:col-span-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Date</label>
                    <DatePicker
                      selectedDate={formData.date}
                      onDateChange={(date) => onFormDataChange({ ...formData, date })}
                      placeholder="Select appointment date"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Start Time</label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => onFormDataChange({ ...formData, startTime: e.target.value })}
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">End Time</label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => onFormDataChange({ ...formData, endTime: e.target.value })}
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Slot Duration (minutes)</label>
                      <select
                        value={formData.slotDuration}
                        onChange={(e) => onFormDataChange({ ...formData, slotDuration: parseInt(e.target.value) })}
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value={15}>15 minutes</option>
                        <option value={30}>30 minutes</option>
                        <option value={45}>45 minutes</option>
                        <option value={60}>60 minutes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                        Min. Prior Hours
                      </label>
                      <select
                        value={formData.minPriorHours}
                        onChange={(e) => onFormDataChange({ ...formData, minPriorHours: parseInt(e.target.value) })}
                        className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value={0}>No restriction</option>
                        <option value={1}>1 hour</option>
                        <option value={2}>2 hours</option>
                        <option value={3}>3 hours</option>
                        <option value={6}>6 hours</option>
                        <option value={12}>12 hours</option>
                        <option value={24}>1 day</option>
                        <option value={48}>2 days</option>
                        <option value={72}>3 days</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Downtime/Break (Optional)</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Set break times when unavailable</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Break Start</label>
                        <input
                          type="time"
                          value={formData.downtimeStart}
                          onChange={(e) => onFormDataChange({ ...formData, downtimeStart: e.target.value })}
                          className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Break End</label>
                        <input
                          type="time"
                          value={formData.downtimeEnd}
                          onChange={(e) => onFormDataChange({ ...formData, downtimeEnd: e.target.value })}
                          className="w-full border dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Questions Section */}
                <div className="lg:col-span-1">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-xl p-5 h-full flex flex-col shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Questions (Optional)</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Add questions students must answer when booking</p>
                      </div>
                      {formData.questions.length > 0 && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full font-medium">
                          {formData.questions.length} added
                        </span>
                      )}
                    </div>

                    {/* Existing Questions List */}
                    {formData.questions.length > 0 && (
                      <div className="mb-4 space-y-3 bg-white/70 dark:bg-gray-700/70 p-3 rounded-lg max-h-48 overflow-y-auto flex-1 border border-blue-100 dark:border-blue-800">
                        {formData.questions.map((question, index) => (
                          <div key={question.id} className="group flex items-start justify-between gap-3 p-3 bg-white dark:bg-gray-600 rounded-lg border border-gray-100 dark:border-gray-500 hover:shadow-md transition-all duration-200">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2">
                                <span className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold mt-0.5">
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white leading-relaxed break-words">
                                    {question.question}
                                  </p>
                                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 flex items-center gap-1">
                                    <Icon path={mdiClockOutline} size={12} />
                                    Min: {question.minWordCount} word{question.minWordCount !== 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => onRemoveQuestion(question.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded-md transition-all duration-200 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex-shrink-0"
                              title="Remove question"
                            >
                              <Icon path={mdiDelete} size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Question Form */}
                    <div className="space-y-3 border-t border-blue-200 dark:border-blue-700 pt-4 mt-auto">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Question Text
                          </label>
                          <textarea
                            value={newQuestion.question}
                            onChange={(e) => onNewQuestionChange({ ...newQuestion, question: e.target.value })}
                            placeholder="e.g., What is your main concern or goal for this appointment?"
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            rows={3}
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Minimum Word Count
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="1000"
                            value={newQuestion.minWordCount}
                            onChange={(e) => onNewQuestionChange({ ...newQuestion, minWordCount: Math.max(0, parseInt(e.target.value) || 0) })}
                            onWheel={(e) => { e.preventDefault(); (e.target as HTMLInputElement).blur(); }}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                            placeholder="0 (optional)"
                          />
                        </div>
                      </div>

                      <button
                        onClick={onAddQuestion}
                        disabled={!newQuestion.question.trim()}
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2"
                      >
                        <Icon path={mdiPlus} size={16} />
                        Add Question
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onSaveAvailability}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-medium"
                >
                  {editingAvailability ? 'Update' : 'Create'}
                </button>
                <button
                  onClick={onCancelForm}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability List */}
      <div className="grid gap-4">
        {availabilities.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg">
            <Icon path={mdiCalendar} size={16} className="mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No availability schedules yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">Click "Add Availability" to create one</p>
          </div>
        ) : (
          availabilities.map(availability => (
            <div
              key={availability.id}
              className={`border dark:border-gray-700 rounded-lg p-4 ${
                availability.isActive ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-900 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-gray-900 dark:text-white">Admin Meeting Time</h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p className="flex items-center gap-2">
                      <Icon path={mdiCalendar} size={16} />
                      {formatDateForDisplay(availability.date)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Icon path={mdiClockOutline} size={16} />
                      {availability.startTime} - {availability.endTime}
                    </p>
                    <p>Slot Duration: {availability.slotDuration} minutes</p>
                    <p className="flex items-center gap-2">
                      <Icon path={mdiAlertCircle} size={16} />
                      Min. Prior Hours: {availability.minPriorHours || 0} hour{(availability.minPriorHours || 0) !== 1 ? 's' : ''}
                    </p>
                    {availability.downtimeStart && availability.downtimeEnd && (
                      <p className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-medium">
                        <Icon path={mdiClockOutline} size={16} />
                        Break: {availability.downtimeStart} - {availability.downtimeEnd}
                      </p>
                    )}
                    {availability.questions && availability.questions.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-2">
                          📋 {availability.questions.length} Question{availability.questions.length !== 1 ? 's' : ''}
                        </p>
                        <ul className="space-y-1">
                          {availability.questions.map((q, idx) => (
                            <li key={q.id} className="text-xs text-gray-600 dark:text-gray-400">
                              {idx + 1}. {q.question.substring(0, 50)}{q.question.length > 50 ? '...' : ''}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 items-center">
                  <label className="relative inline-flex items-center cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={availability.isActive}
                      onChange={() => onToggleAvailability(availability)}
                      className="sr-only peer"
                    />
                    <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 transition-colors duration-200`}></div>
                    <span className={`ml-3 text-sm font-medium ${availability.isActive ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                      {availability.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </label>
                  <button
                    onClick={() => onEditAvailability(availability)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Edit"
                  >
                    <Icon path={mdiPencil} size={16} className="text-blue-600" />
                  </button>
                  <button
                    onClick={() => onDeleteAvailability(availability.id)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title="Delete"
                  >
                    <Icon path={mdiDelete} size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminAvailabilityTab;
