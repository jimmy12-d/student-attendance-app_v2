import React from 'react';

interface Option {
  value: string | number;
  label: string;
}

interface CustomDropdownProps {
  label?: string;
  value: string | number | null;
  onChange: (value: string | number) => void;
  options?: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  id?: string;
  className?: string;
}

declare const CustomDropdown: React.FC<CustomDropdownProps>;

export default CustomDropdown;