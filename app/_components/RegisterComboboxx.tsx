// app/_components/GradeCombobox.tsx
"use client";

import React, { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import Icon from './Icon';
import { mdiCheck, mdiChevronDown } from '@mdi/js';

export interface ComboboxOption {
  value: string;
  label: string;
  icon?: string;
}

interface Props {
  options: ComboboxOption[];
  selectedValue: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  id?: string;
  fieldData?: { className?: string };
}

const RegisterComboboxx: React.FC<Props> = ({
  options,
  selectedValue,
  onChange,
  placeholder = "Select an option...",
  id,
  fieldData,
}) => {
  const [query, setQuery] = useState('');

  const filteredOptions =
    query === ''
      ? options
      : options.filter((option) =>
          option.label
            .toLowerCase()
            .replace(/\s+/g, '')
            .includes(query.toLowerCase().replace(/\s+/g, ''))
        );

  const displayValue = () => {
    if (!selectedValue) return '';
    const selectedOption = options.find(opt => opt.value === selectedValue);
    return selectedOption ? selectedOption.label : selectedValue;
  };

  const getSelectedIcon = () => {
    if (!selectedValue) return null;
    const selectedOption = options.find(opt => opt.value === selectedValue);
    return selectedOption?.icon || null;
  };

  const handleSelection = (value: string) => {
    onChange(value);
    setQuery('');
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
    // Don't allow free text input - only filter existing options
  };

  const defaultInputClasses = "w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-left cursor-default focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-gray-600 dark:text-white";
  const finalInputClasses = fieldData?.className
    ? fieldData.className
    : defaultInputClasses;

  return (
    <div className="relative w-full">
      <Combobox value={selectedValue} onChange={handleSelection}>
        <div className="relative">
          <Combobox.Input
            id={id}
            className={`${finalInputClasses} ${getSelectedIcon() ? 'pl-8' : ''}`}
            value={selectedValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            displayValue={displayValue}
            readOnly // Prevent direct typing
          />
          {getSelectedIcon() && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
              <Icon path={getSelectedIcon()!} w="w-4 h-4" className="text-gray-500" />
            </div>
          )}
          <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <Icon path={mdiChevronDown} w="w-5 h-5" className="text-gray-400" />
          </Combobox.Button>
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm dark:bg-gray-700">
            {filteredOptions.length === 0 && query !== '' ? (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <Combobox.Option
                  key={option.value}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-4 pr-4 ${
                      active ? 'bg-indigo-600 text-white' : 'text-gray-900 dark:text-gray-100'
                    }`
                  }
                  value={option.value}
                >
                  {({ selected, active }) => (
                    <>
                      <div className="flex items-center">
                        {option.icon && (
                          <Icon path={option.icon} w="w-4 h-4" className={`mr-2 ${active ? 'text-white' : 'text-gray-500'}`} />
                        )}
                        <span
                          className={`block truncate ${
                            selected ? 'font-medium' : 'font-normal'
                          }`}
                        >
                          {option.label}
                        </span>
                      </div>
                      {selectedValue === option.value ? (
                        <span
                          className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                            active ? 'text-white' : 'text-indigo-600'
                          }`}
                        >
                          <Icon path={mdiCheck} w="w-5 h-5" />
                        </span>
                      ) : null}
                    </>
                  )}
                </Combobox.Option>
              ))
            )}
          </Combobox.Options>
        </Transition>
      </Combobox>
    </div>
  );
};

export default RegisterComboboxx;