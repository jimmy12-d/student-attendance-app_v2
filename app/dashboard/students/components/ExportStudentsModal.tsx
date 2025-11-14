import React, { useState } from 'react';
import { Student } from '../../../_interfaces';
import { mdiCheck, mdiAccount, mdiSchool, mdiCash, mdiAlertCircle, mdiPhone, mdiNote } from '@mdi/js';
import Icon from '../../../_components/Icon';
import Button from '../../../_components/Button';
import CardBoxModal from '../../../_components/CardBox/Modal';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import { getPaymentStatus, getPaymentStatusDisplayText } from '../../_lib/paymentLogic';

interface ExportField {
  id: string;
  label: string;
  enabled: boolean;
}

interface ExportFieldGroup {
  title: string;
  description: string;
  icon: string;
  fields: ExportField[];
}

interface ExportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  droppedStudents?: Student[];
  title?: string;
}

export const ExportStudentsModal: React.FC<ExportStudentsModalProps> = ({
  isOpen,
  onClose,
  students,
  droppedStudents = [],
  title = "Export Students"
}) => {
  const [includeDroppedAndBreak, setIncludeDroppedAndBreak] = useState(false);
  const [exportFieldGroups, setExportFieldGroups] = useState<ExportFieldGroup[]>([
    {
      title: "Basic Information",
      description: "Essential student details",
      icon: mdiAccount,
      fields: [
        { id: 'fullName', label: 'Full Name', enabled: true },
        { id: 'nameKhmer', label: 'Khmer Name', enabled: true },
        { id: 'phone', label: 'Phone Number', enabled: true },
        { id: 'status', label: 'Student Status', enabled: true },
      ]
    },
    {
      title: "Academic Information",
      description: "Class and school details",
      icon: mdiSchool,
      fields: [
        { id: 'ay', label: 'Academic Year', enabled: false },
        { id: 'class', label: 'Class', enabled: false },
        { id: 'shift', label: 'Shift', enabled: false },
        { id: 'school', label: 'School', enabled: false },
        { id: 'scheduleType', label: 'Schedule Type', enabled: true },
        { id: 'createdAt', label: 'Enrollment Date', enabled: false },
      ]
    },
    {
      title: "Payment Information",
      description: "Billing and payment details",
      icon: mdiCash,
      fields: [
        { id: 'paymentStatus', label: 'Payment Status', enabled: true },
        { id: 'lastPaymentMonth', label: 'Last Payment Month', enabled: false },
        { id: 'discount', label: 'Discount', enabled: false },
      ]
    },
    {
      title: "Status Information",
      description: "Enrollment and warning status",
      icon: mdiAlertCircle,
      fields: [
        { id: 'droppedAt', label: 'Dropped Date', enabled: true },
        { id: 'breakAt', label: 'Break Start Date', enabled: true },
        { id: 'warning', label: 'Warning Status', enabled: false },
      ]
    },
    {
      title: "Contact Information",
      description: "Parent and guardian details",
      icon: mdiPhone,
      fields: [
        { id: 'motherName', label: 'Mother Name', enabled: false },
        { id: 'motherPhone', label: 'Mother Phone', enabled: false },
        { id: 'fatherName', label: 'Father Name', enabled: false },
        { id: 'fatherPhone', label: 'Father Phone', enabled: false },
      ]
    },
    {
      title: "Additional Information",
      description: "Notes and metadata",
      icon: mdiNote,
      fields: [
        { id: 'note', label: 'Notes', enabled: false },
      ]
    },
  ]);

  const [isExporting, setIsExporting] = useState(false);

  const handleFieldToggle = (fieldId: string) => {
    setExportFieldGroups(prev => 
      prev.map(group => ({
        ...group,
        fields: group.fields.map(field => 
          field.id === fieldId 
            ? { ...field, enabled: !field.enabled }
            : field
        )
      }))
    );
  };

  const handleSelectAll = () => {
    const allFields = exportFieldGroups.flatMap(group => group.fields);
    const allEnabled = allFields.every(field => field.enabled);
    setExportFieldGroups(prev => 
      prev.map(group => ({
        ...group,
        fields: group.fields.map(field => ({ ...field, enabled: !allEnabled }))
      }))
    );
  };

  const formatDate = (date: any): string => {
    if (!date) return '';
    
    let dateObj: Date | null = null;
    
    if (date.toDate) {
      dateObj = date.toDate();
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return String(date);
    }
    
    if (!dateObj) return '';
    
    // Format as dd/mm/yyyy
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    return `${day}/${month}/${year}`;
  };

  const formatPhoneNumber = (phone: string | undefined | null): string => {
    if (!phone) return '';
    const cleaned = ('' + phone).replace(/\D/g, '');
    
    let digits = cleaned;
    if (digits.length === 9 && !digits.startsWith('0')) {
      digits = '0' + digits;
    }
    
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
    }
    
    if (digits.length === 9) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}`;
    }
    
    return phone;
  };

  const getPaymentStatusForExport = (student: Student): string => {
    const status = getPaymentStatus(student.lastPaymentMonth);
    return getPaymentStatusDisplayText(status);
  };

  const handleExport = async () => {
    const allFields = exportFieldGroups.flatMap(group => group.fields);
    const enabledFields = allFields.filter(field => field.enabled);
    
    if (enabledFields.length === 0) {
      toast.error('Please select at least one field to export');
      return;
    }

    // Combine active students with dropped/break students if the option is enabled
    const studentsToExport = includeDroppedAndBreak 
      ? [...students, ...droppedStudents]
      : students;

    if (studentsToExport.length === 0) {
      toast.error('No students to export');
      return;
    }

    setIsExporting(true);

    try {
      const exportData = studentsToExport.map(student => {
        const row: any = {};
        
        enabledFields.forEach(field => {
          switch (field.id) {
            case 'fullName':
              row[field.label] = student.fullName || '';
              break;
            case 'nameKhmer':
              row[field.label] = student.nameKhmer || '';
              break;
            case 'phone':
              row[field.label] = formatPhoneNumber(student.phone);
              break;
            case 'status':
              if (student.dropped) {
                row[field.label] = 'Dropped';
              } else if (student.onBreak) {
                row[field.label] = 'On Break';
              } else if (student.onWaitlist) {
                row[field.label] = 'Waitlist';
              } else {
                row[field.label] = 'Active';
              }
              break;
            case 'droppedAt':
              row[field.label] = student.dropped && student.droppedAt ? formatDate(student.droppedAt) : '';
              break;
            case 'breakAt':
              row[field.label] = student.onBreak && student.breakStartDate ? formatDate(student.breakStartDate) : '';
              break;
            case 'scheduleType':
              row[field.label] = student.scheduleType || '';
              break;
            case 'paymentStatus':
              row[field.label] = getPaymentStatusForExport(student);
              break;
            case 'lastPaymentMonth':
              row[field.label] = student.lastPaymentMonth || '';
              break;
            case 'warning':
              row[field.label] = student.warning ? 'Yes' : 'No';
              break;
            case 'createdAt':
              row[field.label] = formatDate(student.createdAt);
              break;
            case 'ay':
              row[field.label] = student.ay || '';
              break;
            case 'class':
              row[field.label] = student.class || '';
              break;
            case 'shift':
              row[field.label] = student.shift || '';
              break;
            case 'school':
              row[field.label] = student.school || '';
              break;
            case 'motherName':
              row[field.label] = student.motherName || '';
              break;
            case 'motherPhone':
              row[field.label] = formatPhoneNumber(student.motherPhone);
              break;
            case 'fatherName':
              row[field.label] = student.fatherName || '';
              break;
            case 'fatherPhone':
              row[field.label] = formatPhoneNumber(student.fatherPhone);
              break;
            case 'discount':
              row[field.label] = student.discount || '';
              break;
            case 'note':
              row[field.label] = student.note || '';
              break;
            default:
              row[field.label] = '';
          }
        });
        
        return row;
      });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      
      // Auto-size columns
      const colWidths = exportData.reduce((widths, row) => {
        Object.keys(row).forEach((key, index) => {
          const value = String(row[key] || '');
          const width = Math.max(value.length, key.length) + 2;
          widths[index] = Math.max(widths[index] || 0, Math.min(width, 50));
        });
        return widths;
      }, {} as { [key: number]: number });
      
      worksheet['!cols'] = Object.values(colWidths).map((width: number) => ({ width }));
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      
      // Generate filename with current date
      const currentDate = new Date().toISOString().slice(0, 10);
      const filename = `students_export_${currentDate}.xlsx`;
      
      // Write and download file
      XLSX.writeFile(workbook, filename);
      
      toast.success(`Successfully exported ${studentsToExport.length} students to ${filename}`);
      onClose();
      
    } catch (error) {
      console.error('Error exporting students:', error);
      toast.error('Failed to export students. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const enabledCount = exportFieldGroups.flatMap(group => group.fields).filter(field => field.enabled).length;

  return (
    <CardBoxModal
      title={title}
      buttonColor="success"
      buttonLabel={isExporting ? "Exporting..." : `Export (${enabledCount} fields)`}
      isActive={isOpen}
      onConfirm={handleExport}
      onCancel={onClose}
      modalClassName="p-6 max-w-4xl"
    >
      <div className="space-y-6">
        {/* Include Dropped/Break Students Option */}
        {droppedStudents.length > 0 && (
          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={includeDroppedAndBreak}
                onChange={(e) => setIncludeDroppedAndBreak(e.target.checked)}
                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Include Dropped & On-Break Students
                </span>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Export {droppedStudents.length} additional student{droppedStudents.length !== 1 ? 's' : ''} (dropped or on break)
                </p>
              </div>
            </label>
          </div>
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the fields you want to include in the Excel export:
          </p>
          <Button
            onClick={handleSelectAll}
            color={exportFieldGroups.flatMap(g => g.fields).every(field => field.enabled) ? "danger" : "info"}
            label={exportFieldGroups.flatMap(g => g.fields).every(field => field.enabled) ? "Deselect All" : "Select All"}
            small
          />
        </div>

        <div className="space-y-6 max-h-96 overflow-y-auto">
          {exportFieldGroups.map((group, groupIndex) => (
            <div key={group.title} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <Icon path={group.icon} size={20} className="text-gray-500 dark:text-gray-400" />
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {group.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {group.description}
                    </p>
                  </div>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {group.fields.filter(f => f.enabled).length}/{group.fields.length} selected
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {group.fields.map(field => (
                  <label
                    key={field.id}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      field.enabled
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={field.enabled}
                      onChange={() => handleFieldToggle(field.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span className={`text-sm font-medium ${
                      field.enabled
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {field.label}
                    </span>
                    {field.enabled && (
                      <Icon path={mdiCheck} className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-auto" />
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Total students to export: <strong>{includeDroppedAndBreak ? students.length + droppedStudents.length : students.length}</strong></span>
          <span>Selected fields: <strong>{enabledCount}</strong></span>
        </div>
      </div>
    </CardBoxModal>
  );
};

export default ExportStudentsModal;
