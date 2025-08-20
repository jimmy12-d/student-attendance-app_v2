import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, positionAbove: false });
  const dropdownRef = useRef(null);

  const filteredOptions = searchable && searchTerm.trim() 
    ? options.filter(option => 
        option.label.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : options;

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is on the dropdown content or search input
      const dropdownContent = document.querySelector('[data-dropdown-content]');
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) && 
          (!dropdownContent || !dropdownContent.contains(event.target))) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    const updatePosition = () => {
      if (dropdownRef.current && isOpen) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Calculate actual dropdown height needed
        const baseHeight = 40; // padding and border
        const searchHeight = searchable ? 60 : 0; // search input height
        const itemHeight = 30; // approximate height per item
        const currentOptions = searchable && searchTerm.trim() 
          ? options.filter(option => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
          : options;
        const maxItems = Math.min(currentOptions.length + 1, 6); // +1 for clear option, max 6 visible
        const actualDropdownHeight = Math.min(baseHeight + searchHeight + (itemHeight * maxItems), 240);
        
        // Position dropdown above if there's more space above and not enough below
        const shouldPositionAbove = spaceBelow < actualDropdownHeight && spaceAbove > spaceBelow;
        
        setDropdownPosition({
          top: shouldPositionAbove ? rect.top - actualDropdownHeight - 4 : rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          positionAbove: shouldPositionAbove
        });
      }
    };

    const handleScroll = (event) => {
      if (isOpen) {
        updatePosition(); // Always update position on scroll
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener("mousedown", handleClickOutside);
      window.addEventListener("resize", updatePosition);
      // Use passive listeners for better performance and avoid preventing scroll
      window.addEventListener("scroll", handleScroll, { passive: true, capture: true });
      document.addEventListener("scroll", handleScroll, { passive: true, capture: true });
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, { passive: true, capture: true });
      document.removeEventListener("scroll", handleScroll, { passive: true, capture: true });
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", handleScroll, { passive: true, capture: true });
      document.removeEventListener("scroll", handleScroll, { passive: true, capture: true });
    };
  }, [isOpen, searchTerm]);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      <div className="mt-1 relative z-50" ref={dropdownRef}>
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

        {isOpen && typeof document !== 'undefined' && createPortal(
          <div 
            data-dropdown-content
            className={`fixed bg-white rounded-lg shadow-lg dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex flex-col min-w-[200px] z-[1000] ${
              dropdownPosition.positionAbove ? 'max-h-60' : 'max-h-60'
            }`}
            style={{ 
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxHeight: '240px' // Fixed max height for scrolling
            }}
          >
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

            <ul 
              className="flex-grow overflow-y-auto py-1 text-sm text-gray-700 dark:text-gray-200" 
              aria-labelledby={id}
              style={{ maxHeight: searchable ? '180px' : '200px' }}
            >
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
          </div>,
          document.body
        )}
      </div>
    </div>
  );
};

export default CustomDropdown;
