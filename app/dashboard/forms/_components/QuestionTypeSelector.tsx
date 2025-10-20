"use client";

import { QuestionType } from "@/app/_interfaces/forms";
import Icon from "@/app/_components/Icon";
import CustomCombobox, { ComboboxOption } from "@/app/_components/CustomCombobox";
import { 
  mdiFormatText, 
  mdiTextBox, 
  mdiRadioboxMarked, 
  mdiCheckboxMultipleMarked,
  mdiMenuDown,
  mdiNumeric,
  mdiFileUpload
} from "@mdi/js";

interface QuestionTypeSelectorProps {
  selectedType: QuestionType;
  onTypeChange: (type: QuestionType) => void;
}

const questionTypes: { type: QuestionType; label: string; icon: string }[] = [
  { type: 'short_answer', label: 'Short Answer', icon: mdiFormatText },
  { type: 'paragraph', label: 'Paragraph', icon: mdiTextBox },
  { type: 'multiple_choice', label: 'Multiple Choice', icon: mdiRadioboxMarked },
  { type: 'checkboxes', label: 'Checkboxes', icon: mdiCheckboxMultipleMarked },
  { type: 'dropdown', label: 'Dropdown', icon: mdiMenuDown },
  { type: 'linear_scale', label: 'Linear Scale', icon: mdiNumeric },
  { type: 'file_upload', label: 'File Upload', icon: mdiFileUpload },
];

const options: ComboboxOption[] = questionTypes.map(qt => ({ value: qt.type, label: qt.label, icon: qt.icon }));

const QuestionTypeSelector: React.FC<QuestionTypeSelectorProps> = ({ selectedType, onTypeChange }) => {
  const selectedOption = options.find(o => o.value === selectedType);
  const placeholder = selectedOption ? selectedOption.label : "Select question type...";

  return (
    <div className="relative nokora-font">
      <CustomCombobox
        options={options}
        selectedValue=""
        onChange={onTypeChange}
        placeholder={placeholder}
        fieldData={{ className: "w-full bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md px-3 py-2 pr-8 text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors cursor-pointer placeholder:text-white" }}
      />
    </div>
  );
};

export default QuestionTypeSelector;
