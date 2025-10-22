"use client";

import { FormType } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import CustomCombobox, { ComboboxOption } from "@/app/_components/CustomCombobox";
import { FORM_TYPES } from "@/app/_constants/formTypes";

interface FormTypeSelectorProps {
  selectedType: FormType;
  onTypeChange: (type: FormType) => void;
}

const options: ComboboxOption[] = FORM_TYPES.map(ft => ({
  value: ft.value,
  label: ft.label,
  icon: ft.icon
}));

const FormTypeSelector: React.FC<FormTypeSelectorProps> = ({ selectedType, onTypeChange }) => {
  const selectedOption = options.find(o => o.value === selectedType);
  const placeholder = selectedOption ? selectedOption.label : "Select form type...";

  return (
    <div className="relative nokora-font">
      <CustomCombobox
        options={options}
        selectedValue={selectedType}
        onChange={onTypeChange}
        placeholder={placeholder}
        fieldData={{
          className: "w-full bg-gray-50 dark:bg-slate-700/50 border-2 border-gray-200 dark:border-slate-600 rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
        }}
      />
    </div>
  );
};

export default FormTypeSelector;