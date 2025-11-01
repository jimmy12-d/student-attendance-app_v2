// app/_components/CustomCombobox.tsx
"use client";

import React, { useState, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import Icon from './Icon';
import { mdiCheck, mdiChevronUp, mdiChevronDown } from '@mdi/js';

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
  editable?: boolean; // If true, allows custom input; defaults to true for backward compatibility
}

const CustomCombobox: React.FC<Props> = ({
  options,
  selectedValue,
  onChange,
  placeholder = "Select or type an option...",
  id,
  fieldData,
  editable = true, // Default to true for backward compatibility
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

  const displayValue = (value: string) => {
    if (!value) return '';
    const selectedOption = options.find(opt => opt.value === value);
    return selectedOption ? selectedOption.label : value;
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
    const newValue = event.target.value;
    setQuery(newValue);
    if (editable) {
      onChange(newValue); // Allow free text input when editable
    }
  };

  const defaultInputClasses = editable 
    ? "w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-left cursor-default focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-gray-600 dark:text-white"
    : "w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 text-left cursor-default focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm dark:bg-slate-800 dark:border-gray-600 dark:text-white bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors";
  
  const buttonLikeClasses = !editable 
    ? "w-full bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-lg pl-3 py-2.5 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 flex items-center justify-between text-white"
    : "";
  
  const finalInputClasses = fieldData?.className
    ? fieldData.className
    : editable ? defaultInputClasses : buttonLikeClasses;

  return (
    <div className="relative w-full">
      <Combobox value={selectedValue} onChange={handleSelection}>
        <div className="relative">
          {editable ? (
            <>
              <Combobox.Input
                id={id}
                className={`${finalInputClasses} ${getSelectedIcon() ? 'pl-6' : ''}`}
                onChange={handleInputChange}
                placeholder={placeholder}
                displayValue={displayValue}
                readOnly={!editable}
              />
              {getSelectedIcon() && (
                <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none">
                  <Icon path={getSelectedIcon()!} w="w-4 h-4" className="text-gray-500" />
                </div>
              )}
              <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                <Icon path={mdiChevronDown} w="w-5 h-5" className="text-gray-400" />
              </Combobox.Button>
            </>
          ) : (
            <Combobox.Button className={`${finalInputClasses} relative pr-10`}>
              <span className="block truncate text-white">
                {selectedValue ? displayValue(selectedValue) : placeholder}
              </span>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <Icon path={mdiChevronDown} w="w-5 h-5" className="text-white" />
              </div>
            </Combobox.Button>
          )}
        </div>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          afterLeave={() => setQuery('')}
        >
          <Combobox.Options className="absolute z-[130] mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm dark:bg-gray-700">
            {filteredOptions.length === 0 && query !== '' && editable ? (
              <Combobox.Option
                key="custom-option"
                className={({ active }) =>
                  `relative cursor-default select-none py-2 pl-4 pr-4 ${
                    active ? 'bg-indigo-600 text-white' : 'text-gray-900 dark:text-gray-100'
                  }`
                }
                value={query}
              >
                {({ selected, active }) => (
                  <>
                    <div className="flex items-center">
                      <span
                        className={`block truncate ${
                          selected ? 'font-medium' : 'font-normal'
                        }`}
                      >
                        Create "{query}"
                      </span>
                    </div>
                    {selectedValue === query ? (
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

export default CustomCombobox;