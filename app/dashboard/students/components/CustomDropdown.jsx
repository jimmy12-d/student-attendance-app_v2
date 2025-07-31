import React, { useState, useRef, useEffect } from 'react';

const CustomDropdown = ({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Select option", 
  disabled = false, 
  required = false,
  searchable = false,
  id,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const filteredOptions = searchable && searchTerm.trim() 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <div className="mt-1 relative" ref={dropdownRef}>
        <button
          type="button"
          id={id}
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="text-black relative w-full bg-white border border-gray-300 hover:border-gray-400 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-3 py-2.5 text-left inline-flex items-center justify-between shadow-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed"
          aria-haspopup="true"
          aria-expanded={isOpen}
          required={required}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <svg className="w-2.5 h-2.5 ms-3 text-gray-700 dark:text-gray-300" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 10 6">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 4 4 4-4"/>
          </svg>
        </button>

        {isOpen && (
          <div className="z-50 absolute mt-1 w-full bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 max-h-60 flex flex-col">
            {searchable && (
              <div className="p-2 border-b border-gray-200 dark:border-gray-600">
                <input
                  type="text"
                  placeholder={`Search ${label.toLowerCase()}...`}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white focus:ring-indigo-500 focus:border-indigo-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                />
              </div>
            )}

            <ul className="flex-grow overflow-y-auto py-1 text-sm text-gray-700 dark:text-gray-200" aria-labelledby={id}>
              {/* Clear selection option */}
              <li>
                <button 
                  type="button" 
                  onClick={() => handleSelect('')}
                  className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${!value ? 'bg-gray-50 dark:bg-gray-500' : ''}`}
                  role="menuitem"
                >
                  {placeholder}
                </button>
              </li>

              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <li key={option.value}>
                    <button 
                      type="button" 
                      onClick={() => handleSelect(option.value)}
                      className={`block w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white ${value === option.value ? 'bg-indigo-50 dark:bg-indigo-600 font-semibold' : ''}`}
                      role="menuitem"
                    >
                      {option.label}
                    </button>
                  </li>
                ))
              ) : (
                <li className="px-4 py-2 text-gray-500 dark:text-gray-400">
                  No matching options found.
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomDropdown;
