"use client";

import React from 'react';
import { mdiClock } from '@mdi/js';
import Icon from '../../../_components/Icon';
import CustomDropdown from '../../students/components/CustomDropdown';

interface ShiftSelectorProps {
  selectedShift: string;
  setSelectedShift: (shift: string) => void;
  availableShifts: { value: string; label: string; }[];
  autoSelectShift: () => void;
}

const ShiftSelector: React.FC<ShiftSelectorProps> = ({
  selectedShift,
  setSelectedShift,
  availableShifts,
  autoSelectShift
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 py-4 px-6 hover:shadow-md dark:hover:shadow-lg transition-shadow">
        
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center space-x-2">
            <Icon path={mdiClock} className="w-4 h-4 text-blue-500" />
            <span>Select Shift/Session</span>
          </h3>
          <button
            onClick={autoSelectShift}
            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            title="Auto-select shift based on current time"
          >
            Auto
          </button>
        </div>
        
        <CustomDropdown
          id="shift-selection-header"
          label=""
          value={selectedShift}
          onChange={setSelectedShift}
          options={availableShifts}
          placeholder="Choose shift/session..."
          searchable={false}
          className="w-full"
        />
        

        {!selectedShift && (
          <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/30 rounded text-center">
            <p className="text-xs text-orange-700 dark:text-orange-300">
              ⚠️ Please select a shift before starting camera
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShiftSelector;
