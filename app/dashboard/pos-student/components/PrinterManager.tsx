import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { mdiPrinter, mdiChevronDown, mdiReload } from "@mdi/js";
import Icon from "../../../_components/Icon";
import { Printer } from '../types';

interface PrinterManagerProps {
    selectedPrinter: Printer | null;
    onPrinterSelect: (printer: Printer | null) => void;
}

export const PrinterManager = ({ selectedPrinter, onPrinterSelect }: PrinterManagerProps) => {
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [isPrinterDropdownOpen, setIsPrinterDropdownOpen] = useState(false);
    const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);

    const loadPrintersFromPrintNode = useCallback(async () => {
        try {
            setIsLoadingPrinters(true);
            const response = await fetch('/api/printnode?action=printers');
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                // Handle non-JSON responses
                const textResponse = await response.text();
                if (response.status === 503) {
                    throw new Error(`PrintNode service unavailable. Please ensure the PrintNode client is running and try again.`);
                }
                throw new Error(`Server error: ${response.status} - ${textResponse}`);
            }

            if (!response.ok) {
                let errorMessage = data.details || data.error || 'Failed to load printers';
                if (response.status === 503) {
                    errorMessage = `PrintNode service unavailable: ${errorMessage}`;
                }
                throw new Error(errorMessage);
            }
            
            if (data.success) {
                const printNodePrinters: Printer[] = data.printers.map((printer: any) => ({
                    id: `printnode-${printer.id}`,
                    name: printer.name,
                    displayName: printer.name,
                    location: printer.computer?.name || 'Unknown location',
                    type: 'printnode' as const,
                    printNodeId: printer.id,
                    description: printer.description,
                    online: printer.computer?.state === 'connected'
                }));
                
                setPrinters(printNodePrinters);
                
                const targetPrinter = printNodePrinters.find(p => p.name.includes('RONGTA 80mm Printer'));
                if (targetPrinter) {    
                    onPrinterSelect(targetPrinter);
                    toast.info(`Printer RONGTA 80mm Printer auto-selected.`);
                }
            } else {
                toast.error(data.error || 'Failed to load printers from PrintNode');
            }
        } catch (error) {
            console.error('PrintNode service error:', error);
            toast.error(error instanceof Error ? error.message : 'Could not connect to PrintNode service');
        } finally {
            setIsLoadingPrinters(false);
        }
    }, [onPrinterSelect]);

    useEffect(() => {
        loadPrintersFromPrintNode();
    }, [loadPrintersFromPrintNode]);

    return (
        <div className="relative w-72 printer-dropdown">
            <button
                onClick={() => setIsPrinterDropdownOpen(!isPrinterDropdownOpen)}
                className="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                disabled={isLoadingPrinters}
            >
                <div className="flex items-center">
                    <Icon path={mdiPrinter} size={18} className={`mr-2 ${selectedPrinter?.online ? 'text-green-500' : 'text-red-500'}`} />
                    <div className="text-left">
                        {isLoadingPrinters ? (
                            <span className="text-gray-500">Loading printers...</span>
                        ) : selectedPrinter ? (
                            <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {selectedPrinter.displayName}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {selectedPrinter.location === 'DESKTOP-A3RVKTM_@' ? 'Admin Desktop' : selectedPrinter.location}
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-500">Select Printer</span>
                        )}
                    </div>
                </div>
                <Icon path={mdiChevronDown} size={16} className={`text-gray-400 transition-transform duration-200 ${isPrinterDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPrinterDropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 py-2">
                    <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Available Printers</span>
                            <button onClick={loadPrintersFromPrintNode} className="text-blue-600 hover:text-blue-700">
                                <Icon path={mdiReload} size={14} />
                            </button>
                        </div>
                    </div>
                    {printers.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">No printers found</div>
                    ) : (
                        printers.map((printer) => (
                            <button
                                key={printer.id}
                                onClick={() => { 
                                    onPrinterSelect(printer); 
                                    setIsPrinterDropdownOpen(false); 
                                }}
                                className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    selectedPrinter?.id === printer.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                            {printer.displayName}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {printer.location === 'DESKTOP-A3RVKTM_2' ? 'Admin Desktop' : printer.location}
                                        </div>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${printer.online ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};
