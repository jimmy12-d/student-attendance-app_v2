import React from 'react';

const CollapsibleSection = ({ 
  title, 
  isCollapsed, 
  onToggle, 
  children, 
  className = "",
  showOnlyInEditMode = false,
  isEditMode = false 
}) => {
  // If showOnlyInEditMode is true and we're not in edit mode, render children without collapse
  if (showOnlyInEditMode && !isEditMode) {
    return (
      <div className={className}>
        <p className="text-lg font-semibold text-gray-800 dark:text-white mb-4">{title}</p>
        {children}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left text-lg font-semibold text-gray-800 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 mb-4"
      >
        <span>{title}</span>
        <svg
          className={`w-5 h-5 transform transition-transform duration-300 ${
            isCollapsed ? 'rotate-0' : 'rotate-180'
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'
        }`}
      >
        <div className="pb-2">
          {children}
        </div>
      </div>
    </div>
  );
};

export default CollapsibleSection;
