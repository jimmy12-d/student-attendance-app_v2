// app/_components/CustomSingleSelectDropdown.tsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';
import { mdiChevronDown } from '@mdi/js';

export interface SelectOption {
  value: string;
  label: string;
}

interface Props {
  options: SelectOption[];
  selectedValue: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  id?: string;
  fieldData?: { className?: string };
}

const CustomSingleSelectDropdown: React.FC<Props> = ({
  options,
  selectedValue,
  onChange,
  placeholder = "Select an option...",
  id,
  fieldData,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const otherInputRef = useRef<HTMLInputElement>(null);
  
  const isOtherSelected = selectedValue && !options.some(opt => opt.value === selectedValue);

  const updateDropdownPosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom,
        left: rect.left,
        width: rect.width
      });
    }
  };

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };
  
  const handleOtherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    const handleScroll = () => {
      if (isOpen) {
        setIsOpen(false); // Close dropdown on scroll to prevent positioning issues
      }
    };

    if (isOpen) {
      updateDropdownPosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleScroll);
      if (isOtherSelected) {
        setTimeout(() => otherInputRef.current?.focus(), 0);
      }
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isOpen, isOtherSelected]);

  const displayLabel = () => {
    if (!selectedValue) return placeholder;
    const selectedOption = options.find(opt => opt.value === selectedValue);
    return selectedOption ? selectedOption.label : selectedValue;
  };
  
  const defaultButtonClasses = "text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-slate-800 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500";
  const finalButtonClasses = fieldData?.className
    ? `${fieldData.className.replace('px-3 py-2', 'px-3 py-2.5')} text-left inline-flex items-center justify-between`
    : defaultButtonClasses;

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={() => {
          console.log('Dropdown clicked, current isOpen:', isOpen); // Debug log
          setIsOpen(!isOpen);
        }}
        className={finalButtonClasses}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{displayLabel()}</span>
        <Icon path={mdiChevronDown} w="h-5 w-5" className={`ml-2 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={dropdownRef}
          className="fixed z-[9999] bg-white rounded-lg shadow-xl dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-96 flex flex-col"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`
          }}
        >
          <ul className="flex-grow overflow-y-auto py-1" role="listbox">
            {options.map(option => (
              <li key={option.value} className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100"
                  onClick={() => handleSelect(option.value)}>
                {option.label}
              </li>
            ))}
            <li className="p-2 border-t border-gray-200 dark:border-gray-600 sticky bottom-0 bg-white dark:bg-gray-700">
              <input
                ref={otherInputRef}
                type="text"
                placeholder="Other reason..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-500 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                value={isOtherSelected ? selectedValue : ""}
                onChange={handleOtherChange}
                onClick={(e) => e.stopPropagation()}
              />
            </li>
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomSingleSelectDropdown;
 