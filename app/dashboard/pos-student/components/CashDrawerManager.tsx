import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { mdiCashMultiple } from "@mdi/js";
import Icon from "../../../_components/Icon";
import Button from "../../../_components/Button";
import { Printer } from '../types';

interface CashDrawerManagerProps {
    selectedPrinter: Printer | null;
    onCashDrawerOpen?: () => void;
}

// Export the cash drawer opening function for use in other components
export const openCashDrawerWithRongata = async (): Promise<boolean> => {
    try {
        // First, get the list of printers to find Rongata 80mm
        const printersResponse = await fetch('/api/printnode?action=printers');
        const printersData = await printersResponse.json();
        
        if (!printersResponse.ok || !printersData.success) {
            console.error('Failed to get printers for cash drawer');
            return false;
        }

        const rongataPrinter = printersData.printers.find((printer: any) => 
            printer.name.toLowerCase().includes('rongta 80mm')
        );

        if (!rongataPrinter) {
            console.error('Rongata 80mm printer not found for cash drawer');
            return false;
        }

        if (rongataPrinter.computer?.state !== 'connected') {
            console.error('Rongata 80mm printer is offline');
            return false;
        }

        // Open the cash drawer
        const response = await fetch('/api/printnode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                printerId: rongataPrinter.id,
                action: 'openCashDrawer'
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            console.error('Failed to open cash drawer:', result);
            return false;
        }

        console.log('✅ Cash drawer opened automatically for cash payment');
        return true;
    } catch (error) {
        console.error('Error opening cash drawer automatically:', error);
        return false;
    }
};

export const CashDrawerManager = ({ selectedPrinter, onCashDrawerOpen }: CashDrawerManagerProps) => {
    const [isOpeningDrawer, setIsOpeningDrawer] = useState(false);
    const [cashDrawerPrinter, setCashDrawerPrinter] = useState<Printer | null>(null);
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);

    const loadPrintersFromPrintNode = useCallback(async () => {
        try {
            setIsLoadingPrinters(true);
            const response = await fetch('/api/printnode?action=printers');
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
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
                
                // Auto-select Rongata 80mm printer if available
                const rongataPrinter = printNodePrinters.find(p => p.name.toLowerCase().includes('rongta 80mm'));
                
                if (rongataPrinter) {
                    setCashDrawerPrinter(rongataPrinter);
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
    }, []);

    useEffect(() => {
        loadPrintersFromPrintNode();
    }, [loadPrintersFromPrintNode]);

    const handleOpenCashDrawer = async () => {
        if (!cashDrawerPrinter || !cashDrawerPrinter.printNodeId) {
            toast.error("Rongata 80mm printer not found. Cannot open cash drawer.");
            return;
        }

        if (!cashDrawerPrinter.online) {
            toast.error("Rongata 80mm printer is offline. Cannot open cash drawer.");
            return;
        }

        if (isOpeningDrawer) return; // Prevent multiple clicks
        setIsOpeningDrawer(true);

        try {
            const response = await fetch('/api/printnode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    printerId: cashDrawerPrinter.printNodeId,
                    action: 'openCashDrawer'
                }),
            });

            let result;
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                try {
                    result = await response.json();
                } catch (jsonError) {
                    throw new Error(`Invalid JSON response from server`);
                }
            } else {
                // Handle non-JSON responses
                const textResponse = await response.text();
                if (response.status === 503) {
                    throw new Error(`PrintNode service unavailable. Please ensure the PrintNode client is running on your computer and try again.`);
                }
                throw new Error(`Server error: ${response.status} - ${textResponse}`);
            }

            if (!response.ok) {
                let errorMessage = result?.details || result?.error || 'Failed to open cash drawer';
                if (response.status === 503) {
                    errorMessage = `PrintNode service unavailable: ${errorMessage}`;
                }
                throw new Error(errorMessage);
            }
            
            toast.success("Cash drawer opened successfully.");
        } catch (error) {
            console.error("Error opening cash drawer:", error);
            toast.error(error instanceof Error ? error.message : "Failed to open cash drawer.");
        } finally {
            setIsOpeningDrawer(false);
        }
    };

    return (
        <div className="relative w-55 cash-drawer-dropdown">
            <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center justify-between w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                disabled={isLoadingPrinters}
            >
                <div className="flex items-center">
                    <Icon path={mdiCashMultiple} size={18} className={`mr-2 ${cashDrawerPrinter?.online ? 'text-green-500' : 'text-red-500'}`} />
                    <div className="text-left">
                        {isLoadingPrinters ? (
                            <span className="text-gray-500">Loading..</span>
                        ) : cashDrawerPrinter ? (
                            <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    Cash Drawer
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-sm font-medium text-red-600 dark:text-red-400">
                                    Cash Drawer (Rongata 80mm Not Found)
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Click to refresh
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className ="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded">
                    <Button
                        color={cashDrawerPrinter?.online ? "lightDark" : "white"}
                        label={isOpeningDrawer ? "Opening..." : "Open"}
                        onClick={handleOpenCashDrawer}
                        disabled={isOpeningDrawer || !cashDrawerPrinter || !cashDrawerPrinter.online}
                        className=""
                        small
                    />
                </div> 
            </button>
        </div>
    );
};
