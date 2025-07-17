"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { toast } from 'sonner';
import { 
  mdiFileDocumentCheckOutline, 
  mdiReload, 
  mdiEye, 
  mdiCheck, 
  mdiClose,
  mdiAlertCircle,
  mdiPrinter,
  mdiDotsVertical,
  mdiCalendarClock,
  mdiAccount,
  mdiBookOpen,
  mdiChevronDown,
  mdiPrinterSettings
} from '@mdi/js';

// Firebase imports
import { db } from '../../../firebase-config';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  where, 
  doc, 
  updateDoc, 
  serverTimestamp,
  getDocs,
  getDoc 
} from 'firebase/firestore';

// Components
import SectionMain from '../../_components/Section/Main';
import SectionTitleLineWithButton from '../../_components/Section/TitleLineWithButton';
import CardBox from '../../_components/CardBox';
import CardBoxModal from '../../_components/CardBox/Modal';
import Button from '../../_components/Button';
import Icon from '../../_components/Icon';
import LoadingSpinner from '../../_components/LoadingSpinner';
import NotificationBar from '../../_components/NotificationBar';

// Interfaces
import { PrintRequest, Document } from '../../_interfaces';

interface EnrichedPrintRequest extends PrintRequest {
  documentName?: string;
  subject?: string;
  chapter?: string;
  lessonNumber?: string;
  description?: string;
  teacherName?: string;
  teacherId?: string;
  // Print tracking fields
  printedAt?: any;
  printerUsed?: string;
  reprintCount?: number;
  lastReprintedAt?: any;
  lastPrinterUsed?: string;
  approvedAt?: any;
  approvedBy?: string;
}

interface Printer {
  id: string;
  name: string;
  displayName?: string;
  location?: string;
  type: 'printnode' | 'standard';
  printNodeId?: number;
  description?: string;
  online?: boolean;
}

export default function PrintApprovalsPage() {
  const [printRequests, setPrintRequests] = useState<EnrichedPrintRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<EnrichedPrintRequest | null>(null);
  const [isViewModalActive, setIsViewModalActive] = useState(false);
  const [isRejectModalActive, setIsRejectModalActive] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Printer management state
  const [printers, setPrinters] = useState<Printer[]>([
    {
      id: 'ricoh-mp3352',
      name: 'Ricoh MP 3352',
      location: 'Main Office',
      type: 'printnode'
    },
    {
      id: 'system-default',
      name: 'System Default Printer',
      type: 'standard'
    }
  ]);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [isPrinterDropdownOpen, setIsPrinterDropdownOpen] = useState(false);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);

  // Load print requests with document details
  const loadPrintRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get print requests based on status filter
      let requestsQuery;
      if (statusFilter === 'all') {
        requestsQuery = query(
          collection(db, 'printRequests'),
          orderBy('requestedAt', 'desc')
        );
      } else {
        requestsQuery = query(
          collection(db, 'printRequests'), 
          where('status', '==', statusFilter),
          orderBy('requestedAt', 'desc')
        );
      }
      
      const requestsSnapshot = await getDocs(requestsQuery);

      const requests = requestsSnapshot.docs.map(doc => {
        return {
          id: doc.id,
          ...(doc.data() as any)
        } as PrintRequest;
      });

      // Fetch document details for each request
      const enrichedRequests = await Promise.all(
        requests.map(async (request) => {
          try {
            const docSnapshot = await getDoc(doc(db, 'documents', request.documentId));
            if (docSnapshot.exists()) {
              const docData = docSnapshot.data() as Document;
              return {
                ...request,
                documentName: docData.fileName,
                subject: docData.subject,
                chapter: docData.chapter,
                lessonNumber: docData.lessonNumber,
                description: docData.description,
                teacherName: docData.teacherName,
                teacherId: docData.teacherId
              };
            }
            return {
              ...request,
              documentName: 'Document not found'
            };
          } catch (err) {
            console.error('Error fetching document details:', err);
            return {
              ...request,
              documentName: 'Error loading document'
            };
          }
        })
      );

      setPrintRequests(enrichedRequests);
    } catch (err) {
      console.error('Error loading print requests:', err);
      setError('Failed to load print requests');
      toast.error('Failed to load print requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadPrintRequests();
  }, [loadPrintRequests]);

  // Filter and paginate requests
  const filteredRequests = printRequests;
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-200';
      case 'printing': return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200';
      case 'completed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getCardHeaderColor = (subject: string, status: string) => {
    if (status === 'rejected') return 'bg-gradient-to-r from-red-500 to-red-600';
    if (status === 'approved') return 'bg-gradient-to-r from-green-500 to-green-600';
    
    // Subject-based colors for pending/other statuses
    const colors = {
      'Math': 'bg-gradient-to-r from-blue-500 to-blue-600',
      'English': 'bg-gradient-to-r from-purple-500 to-purple-600', 
      'Science': 'bg-gradient-to-r from-green-500 to-green-600',
      'History': 'bg-gradient-to-r from-orange-500 to-orange-600',
      'Physics': 'bg-gradient-to-r from-indigo-500 to-indigo-600',
      'Chemistry': 'bg-gradient-to-r from-teal-500 to-teal-600',
      'Biology': 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      'Geography': 'bg-gradient-to-r from-cyan-500 to-cyan-600',
    };
    return colors[subject as keyof typeof colors] || 'bg-gradient-to-r from-gray-500 to-gray-600';
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Load available printers from PrintNode
  const loadPrintersFromPrintNode = useCallback(async () => {
    try {
      setIsLoadingPrinters(true);
      console.log('🔍 Loading printers from PrintNode...');
      
      const response = await fetch('/api/printnode?action=printers');
      const data = await response.json();
      
      if (data.success) {
        const mp3352Regex = /(mp\s*3352)/i; 
        
        const printNodePrinters: Printer[] = data.printers.map((printer: any) => {
          let displayName = printer.name; // Default to full name

          // Try to extract "MP 3352" for display
          const match = printer.name.match(mp3352Regex);
          if (match && match[1]) {
            displayName = match[1].toUpperCase().replace(/\s+/, ' '); // Convert to "MP 3352" format
          } else if (printer.description) {
            // Also check description if name doesn't contain it
            const descMatch = printer.description.match(mp3352Regex);
            if (descMatch && descMatch[1]) {
              displayName = descMatch[1].toUpperCase().replace(/\s+/, ' ');
            }
          }

          return {
            id: `printnode-${printer.id}`,
            name: printer.name, // Keep original full name
            displayName: displayName, // New property for display
            location: printer.computer?.name || 'Unknown location',
            type: 'printnode' as const,
            printNodeId: printer.id,
            description: printer.description,
            online: printer.computer?.state === 'connected'
          };
        });
        
        setPrinters(printNodePrinters);
        
        console.log(`✅ Loaded ${printNodePrinters.length} PrintNode printers`);

        // This regex is correctly defined for robust matching
        const ricohModelRegex = /mp\s*3352/i; 

        // Auto-select Ricoh MP 3352 if found
        // ******* THE FIX IS HERE *******
        const ricohPrinter = printNodePrinters.find(p => 
          ricohModelRegex.test(p.name) || // Use the regex to find "MP 3352" in the name
          (p.description && ricohModelRegex.test(p.description)) // Or in the description
        );
        // *******************************
        
        if (ricohPrinter && !selectedPrinter) {
          setSelectedPrinter(ricohPrinter);
          toast.success(`Auto-selected: ${ricohPrinter.displayName || ricohPrinter.name}`);
        }
        
      } else {
        console.error('❌ Failed to load PrintNode printers:', data.error);
        toast.error('Failed to load printers from PrintNode');
      }
    } catch (error) {
      console.error('❌ PrintNode printer discovery error:', error);
      toast.error('Could not connect to PrintNode service');
    } finally {
      setIsLoadingPrinters(false);
    }
  }, [selectedPrinter]);

  // Load printers on component mount
  useEffect(() => {
    loadPrintersFromPrintNode();
  }, [loadPrintersFromPrintNode]);

  // PrintNode API printing function
  const handlePrint = async (request: EnrichedPrintRequest): Promise<boolean> => {
    try {
      if (!selectedPrinter) {
        throw new Error('No printer selected');
      }

      if (selectedPrinter.type !== 'printnode' || !selectedPrinter.printNodeId) {
        throw new Error('Selected printer is not a PrintNode printer');
      }

      console.log('🖨️ Starting PrintNode print job:', {
        printer: selectedPrinter.name,
        printNodeId: selectedPrinter.printNodeId,
        pdfUrl: request.pdfUrl,
        copies: request.amountToPrint,
        duplex: request.isBothSides
      });

      // Check printer status first
      if (!selectedPrinter.online) {
        throw new Error(`Printer ${selectedPrinter.displayName} is offline. Please check PrintNode client connection.`);
      }

      // Submit print job to PrintNode API
      const response = await fetch('/api/printnode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printerId: selectedPrinter.printNodeId,
          pdfUrl: request.pdfUrl,
          title: `${request.subject} - ${request.chapter} (${request.lessonNumber})`,
          copies: request.amountToPrint,
          duplex: request.isBothSides,
          paperSize: 'A4',
          requestId: request.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'PrintNode API error');
      }

      if (result.success) {
        console.log('✅ PrintNode job submitted successfully:', result);
        
        toast.success(`Print job sent to ${selectedPrinter.displayName}`, {
          description: `Job #${result.jobId} - ${request.amountToPrint} copies${request.isBothSides ? ' (both sides)' : ''}`
        });
        
        return true;
      } else {
        throw new Error(result.error || 'Print job submission failed');
      }

    } catch (error) {
      console.error('❌ PrintNode print error:', error);
      toast.error('Print Failed', {
        description: error instanceof Error ? error.message : 'Unknown PrintNode error'
      });
      return false;
    }
  };

  // Close printer dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isPrinterDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('.printer-dropdown')) {
          setIsPrinterDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPrinterDropdownOpen]);

  const handleApprove = async (requestId: string) => {
    const request = printRequests.find(r => r.id === requestId);
    if (!request) {
      toast.error('Request not found');
      return;
    }

    try {
      setProcessingRequest(requestId);
      
      // First update the status to approved
      await updateDoc(doc(db, 'printRequests', requestId), {
        status: 'approved',
        approvedBy: 'Admin', // TODO: Add actual admin user info
        approvedAt: serverTimestamp()
      });

      toast.success('Print request approved!');

      // Then attempt automatic printing
      if (selectedPrinter) {
        toast.promise(
          handlePrint(request),
          {
            loading: `Sending to ${selectedPrinter.displayName}...`,
            success: (success) => {
              if (success) {
                // Update status to printing/completed
                updateDoc(doc(db, 'printRequests', requestId), {
                  status: 'printing',
                  printedAt: serverTimestamp(),
                  printerUsed: selectedPrinter.name
                });
                return `✅ Document sent to ${selectedPrinter.displayName} (${request.amountToPrint} ${request.amountToPrint === 1 ? 'copy' : 'copies'})`;
              }
              return 'Print job queued';
            },
            error: (error) => {
              console.error('Print error:', error);
              return `❌ Print failed: ${error.message || 'Unknown error'}`;
            },
          }
        );
      } else {
        toast.warning('Approved, but no printer selected. Please select a printer and print manually.');
      }

      loadPrintRequests(); // Refresh the list
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReprint = async (requestId: string) => {
    const request = printRequests.find(r => r.id === requestId);
    if (!request) {
      toast.error('Request not found');
      return;
    }

    if (!selectedPrinter) {
      toast.error('Please select a printer first');
      return;
    }

    try {
      setProcessingRequest(requestId);
      
      // Attempt to reprint the document
      toast.promise(
        handlePrint(request),
        {
          loading: `Reprinting to ${selectedPrinter.displayName}...`,
          success: (success) => {
            if (success) {
                              // Update with reprint information
                updateDoc(doc(db, 'printRequests', requestId), {
                  lastReprintedAt: serverTimestamp(),
                  lastPrinterUsed: selectedPrinter.name,
                  reprintCount: request.reprintCount ? request.reprintCount + 1 : 1
                });
              return `🔄 Document reprinted to ${selectedPrinter.displayName} (${request.amountToPrint} ${request.amountToPrint === 1 ? 'copy' : 'copies'})`;
            }
            return 'Reprint job queued';
          },
          error: (error) => {
            console.error('Reprint error:', error);
            return `❌ Reprint failed: ${error.message || 'Unknown error'}`;
          },
        }
      );

      loadPrintRequests(); // Refresh the list
    } catch (err) {
      console.error('Error reprinting request:', err);
      toast.error('Failed to reprint request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingRequest(selectedRequest.id);
      
      await updateDoc(doc(db, 'printRequests', selectedRequest.id), {
        status: 'rejected',
        approvedBy: 'Admin', // TODO: Add actual admin user info
        approvedAt: serverTimestamp(),
        rejectionReason: rejectionReason.trim()
      });

      toast.success('Print request rejected');
      setIsRejectModalActive(false);
      setRejectionReason('');
      setSelectedRequest(null);
      loadPrintRequests(); // Refresh the list
    } catch (err) {
      console.error('Error rejecting request:', err);
      toast.error('Failed to reject request');
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleViewDetails = (request: EnrichedPrintRequest) => {
    setSelectedRequest(request);
    setIsViewModalActive(true);
  };

  const handleRejectClick = (request: EnrichedPrintRequest) => {
    setSelectedRequest(request);
    setIsRejectModalActive(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    // Format: "17 July" and "11:14 AM"
    const dateStr = date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long' 
    });
    const timeStr = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    return { date: dateStr, time: timeStr };
  };

  return (
    <>
      <Head>
        <title>Print Request Approvals - Admin</title>
        <meta name="description" content="Manage and approve print requests" />
      </Head>
      <SectionMain>
        <SectionTitleLineWithButton 
          icon={mdiFileDocumentCheckOutline} 
          title="Print Request Approvals" 
          main 
        >
          <div className="flex items-center space-x-4">
            {/* Printer Selection Dropdown */}
            <div className="relative printer-dropdown">
              <button
                onClick={() => setIsPrinterDropdownOpen(!isPrinterDropdownOpen)}
                className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 min-w-[200px]"
                disabled={isLoadingPrinters}
              >
                <Icon path={mdiPrinterSettings} size={18} className="mr-2 text-blue-600" />
                <div className="flex-1 text-left">
                  {isLoadingPrinters ? (
                    <span className="text-gray-500">Loading printers...</span>
                  ) : selectedPrinter ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedPrinter.displayName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                        <span>{selectedPrinter.displayName} • {selectedPrinter.type}</span>
                        {selectedPrinter.type === 'printnode' && (
                          <span className="ml-2 px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            Auto-Print
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-500">Select Printer</span>
                  )}
                </div>
                <Icon 
                  path={mdiChevronDown} 
                  size={16} 
                  className={`text-gray-400 transition-transform duration-200 ${isPrinterDropdownOpen ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Dropdown Menu */}
              {isPrinterDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl z-50 py-2">
                  <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Available Printers
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          loadPrintersFromPrintNode();
                        }}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                        title="Refresh PrintNode printers"
                      >
                        <Icon path={mdiReload} size={14} />
                      </button>
                    </div>
                  </div>
                  
                  {printers.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                      No printers found
                    </div>
                  ) : (
                    printers.map((printer) => (
                      <button
                        key={printer.id}
                        onClick={() => {
                          setSelectedPrinter(printer);
                          setIsPrinterDropdownOpen(false);
                          toast.success(`Selected ${printer.displayName}`);
                        }}
                        className={`w-full px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedPrinter?.id === printer.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {printer.displayName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {printer.location || printer.type}
                            </div>
                          </div>
                          <div className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-2 ${
                              printer.type === 'printnode' ? 'bg-blue-500' : 'bg-gray-500'
                            }`} />
                            {selectedPrinter?.id === printer.id && (
                              <Icon path={mdiCheck} size={16} className="text-blue-600" />
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <Button
              onClick={loadPrintRequests}
              icon={mdiReload}
              label="Refresh"
              color="info"
              small
            />
          </div>
        </SectionTitleLineWithButton>

        {error && (
          <NotificationBar color="danger" icon={mdiAlertCircle} className="mb-4">
            {error}
          </NotificationBar>
        )}

        {/* Status Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'pending', label: 'Pending', count: printRequests.filter(r => r.status === 'pending').length },
                { key: 'approved', label: 'Approved', count: printRequests.filter(r => r.status === 'approved').length },
                { key: 'rejected', label: 'Rejected', count: printRequests.filter(r => r.status === 'rejected').length },
                { key: 'all', label: 'All', count: printRequests.length }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setStatusFilter(tab.key);
                    setCurrentPage(1);
                  }}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                    statusFilter === tab.key
                      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : paginatedRequests.length === 0 ? (
          <CardBox>
            <div className="text-center py-8">
              <Icon path={mdiFileDocumentCheckOutline} className="text-gray-400 mb-4" size={48} />
              <p className="text-gray-500">No {statusFilter === 'all' ? '' : statusFilter} print requests</p>
            </div>
          </CardBox>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedRequests.map((request) => (
              <div 
                key={request.id} 
                className="group bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 hover:scale-[1.02] overflow-hidden border border-gray-200 dark:border-gray-700"
              >
                {/* Card Header */}
                <div 
                  className={`${getCardHeaderColor(request.subject || 'default', request.status)} px-4 py-3 relative cursor-pointer hover:brightness-110 transition-all duration-200`}
                  onClick={() => handleViewDetails(request)}
                  title="Click to view details"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-white font-semibold text-lg truncate">
                        {request.subject} {request.chapter}
                      </h3>
                      <p className="text-white/90 text-sm">
                        {request.lessonNumber}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleViewDetails(request)}
                      className="text-white/80 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
                      title="View details"
                    >
                      <Icon path={mdiDotsVertical} size={20} />
                    </button>
                  </div>
                  
                  {/* Status Badge */}
                  <div className="absolute top-2 right-12">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-white/20 text-white border border-white/30`}>
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {/* Teacher Info */}
                  {request.teacherName && (
                    <div className="flex items-center space-x-3 mb-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                      <div className="w-10 h-10 rounded-full bg-amber-700 flex items-center justify-center text-white font-semibold">
                        {getInitials(request.teacherName)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {request.teacherName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          Classroom Administrator
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Document Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm">
                      <Icon path={mdiBookOpen} size={16} className="text-gray-400 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300 truncate">
                        {request.documentName}
                      </span>
                    </div>
                    
                    {/* Print Settings */}
                    <div className="flex items-center text-sm">
                      <Icon path={mdiPrinter} size={16} className="text-gray-400 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {request.amountToPrint} {request.amountToPrint === 1 ? 'copy' : 'copies'}
                        {request.isMultiplePages && ' • Multiple pages'}
                        {request.isBothSides && ' • Both sides'}
                      </span>
                    </div>

                    <div className="flex items-center text-sm">
                      <Icon path={mdiFileDocumentCheckOutline} size={16} className="text-gray-400 mr-2" /> {/* Or another appropriate icon */}
                      <span className="text-gray-600 dark:text-gray-300">
                        Paper Sheets: {request.isBothSides 
                          ? Math.ceil(request.amountToPrint / 2) 
                          : request.amountToPrint}
                      </span>
                      </div>
                    {/* Date */}
                    <div className="flex items-center text-sm">
                      <Icon path={mdiCalendarClock} size={16} className="text-gray-400 mr-2" />
                      <span className="text-gray-600 dark:text-gray-300">
                        {(() => {
                          const dateTime = formatDate(request.requestedAt);
                          if (typeof dateTime === 'string') return dateTime;
                          return `${dateTime.date} at ${dateTime.time}`;
                        })()}
                      </span>
                    </div>

                    {request.requestedBy && (
                      <div className="flex items-center text-sm">
                        <Icon path={mdiAccount} size={16} className="text-gray-400 mr-2" />
                        <span className="text-gray-600 dark:text-gray-300">
                          by {request.requestedBy}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {request.description && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 overflow-hidden" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>
                        {request.description}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleViewDetails(request)}
                      className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-105 active:scale-95"
                      title="View full details"
                    >
                      <Icon path={mdiEye} size={18} className="mr-1" />
                      <span className="text-sm">View PDF</span>
                    </button>
                    
                    {request.status === 'pending' && (
                      <div className="flex space-x-2">
                        <Button
                          color={selectedPrinter ? "success" : "info"}
                          onClick={() => handleApprove(request.id)}
                          disabled={processingRequest === request.id || !selectedPrinter}
                          label={processingRequest === request.id 
                            ? "Processing..." 
                            : selectedPrinter 
                              ? `Approve and Print via ${selectedPrinter.displayName}`
                              : "Approve"
                          }
                          icon={processingRequest === request.id ? mdiReload : selectedPrinter ? mdiPrinter : mdiCheck}
                        />
                        <button
                          onClick={() => handleRejectClick(request)}
                          disabled={processingRequest === request.id}
                          className="flex items-center px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-all duration-200 text-sm disabled:opacity-50 hover:scale-105 active:scale-95 hover:shadow-md"
                          title="Reject this print request"
                        >
                          <Icon path={mdiClose} size={16} className="mr-1" />
                          Reject
                        </button>
                      </div>
                    )}

                    {(request.status === 'approved' || request.status === 'printing' || request.status === 'completed') && (
                      <div className="flex space-x-2">
                        <Button
                          color={selectedPrinter ? "info" : "warning"}
                          onClick={() => handleReprint(request.id)}
                          disabled={processingRequest === request.id || !selectedPrinter}
                          label={processingRequest === request.id 
                            ? "Processing..." 
                            : selectedPrinter 
                              ? `Reprint via ${selectedPrinter.displayName}`
                              : "Select Printer"
                          }
                          icon={processingRequest === request.id ? mdiReload : mdiPrinter}
                          small
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && paginatedRequests.length > 0 && totalPages > 1 && (
          <CardBox>
            <div className="flex items-center justify-between px-6 py-3">
              <div className="flex items-center">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredRequests.length)} of {filteredRequests.length} results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  color="info"
                  small
                  label="Previous"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  color="info"
                  small
                  label="Next"
                />
              </div>
            </div>
          </CardBox>
        )}

        {/* PrintNode Setup Instructions */}
        {selectedPrinter?.type === 'printnode' && (
          <CardBox>
            <div className="p-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-3 flex items-center">
                  <Icon path={mdiPrinterSettings} size={1} className="mr-2" />
                  PrintNode Remote Printing - {selectedPrinter.displayName}
                </h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">🚀 PrintNode Features</h5>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• Direct API-based printing</li>
                      <li>• Automatic PDF processing</li>
                      <li>• Real-time printer status</li>
                      <li>• Print job tracking & history</li>
                      <li>• No browser limitations</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-blue-700 dark:text-blue-300 mb-2">📊 Current Status</h5>
                    <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                      <li>• Printer: {selectedPrinter.online ? '🟢 Online' : '🔴 Offline'}</li>
                      <li>• Location: {selectedPrinter.location}</li>
                      <li>• PrintNode ID: {selectedPrinter.printNodeId}</li>
                      <li>• Type: {selectedPrinter.description || 'Printer'}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {!selectedPrinter.online && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800">
                  <div className="flex items-start">
                    <Icon path={mdiAlertCircle} size={0.8} className="text-red-600 dark:text-red-400 mr-2 mt-0.5" />
                    <div className="text-sm">
                      <p className="text-red-800 dark:text-red-200 font-medium">Printer Offline</p>
                      <p className="text-red-700 dark:text-red-300 mt-1">
                        The PrintNode client appears to be disconnected. Please ensure the PrintNode client software is running 
                        on the computer connected to your Ricoh MP 3352 printer.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardBox>
        )}

        {!selectedPrinter && (
          <CardBox>
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <Icon path={mdiAlertCircle} size={20} className="text-orange-600" />
                <div>
                  <h4 className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    ⚠️ No Printer Selected
                  </h4>
                  <p className="text-sm text-orange-700 dark:text-orange-200">
                    Please select a printer from the dropdown above to enable automatic printing when approving requests.
                  </p>
                </div>
              </div>
            </div>
          </CardBox>
        )}

        {/* View Details Modal */}
        {selectedRequest && (
          <CardBoxModal
            title="Print Request Details"
            buttonColor="info"
            buttonLabel="Close"
            isActive={isViewModalActive}
            onConfirm={() => setIsViewModalActive(false)}
            onCancel={() => setIsViewModalActive(false)}
          >
            <div className="space-y-4">
              {/* Teacher Info */}
              {selectedRequest.teacherName && (
                <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-700">
                  <div className="w-12 h-12 rounded-full bg-amber-700 flex items-center justify-center text-white font-semibold text-lg">
                    {getInitials(selectedRequest.teacherName)}
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedRequest.teacherName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Classroom Administrator
                    </p>
                  </div>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Document Information</h4>
                <div className="mt-2 text-sm">
                  <p><strong>Subject:</strong> {selectedRequest.subject}</p>
                  <p><strong>Chapter:</strong> {selectedRequest.chapter}</p>
                  <p><strong>Lesson:</strong> {selectedRequest.lessonNumber}</p>
                  <p><strong>File:</strong> {selectedRequest.documentName}</p>
                  {selectedRequest.description && (
                    <p><strong>Description:</strong> {selectedRequest.description}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Print Settings</h4>
                <div className="mt-2 text-sm">
                  <p><strong>Amount:</strong> {selectedRequest.amountToPrint} copies</p>
                  <p><strong>Multiple Pages:</strong> {selectedRequest.isMultiplePages ? 'Yes' : 'No'}</p>
                  <p><strong>Both Sides:</strong> {selectedRequest.isBothSides ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Request Information</h4>
                <div className="mt-2 text-sm">
                  <p><strong>Requested:</strong> {(() => {
                    const dateTime = formatDate(selectedRequest.requestedAt);
                    if (typeof dateTime === 'string') return dateTime;
                    return `${dateTime.date} at ${dateTime.time}`;
                  })()}</p>
                  <p><strong>Requested by:</strong> {selectedRequest.requestedBy || 'Anonymous'}</p>
                  <p><strong>Status:</strong> {selectedRequest.status}</p>
                  
                  {/* Show approval and print information */}
                  {selectedRequest.approvedAt && (
                    <p><strong>Approved:</strong> {(() => {
                      const dateTime = formatDate(selectedRequest.approvedAt);
                      if (typeof dateTime === 'string') return dateTime;
                      return `${dateTime.date} at ${dateTime.time}`;
                    })()}</p>
                  )}
                  
                  {selectedRequest.printedAt && (
                    <p><strong>First Printed:</strong> {(() => {
                      const dateTime = formatDate(selectedRequest.printedAt);
                      if (typeof dateTime === 'string') return dateTime;
                      return `${dateTime.date} at ${dateTime.time}`;
                    })()}</p>
                  )}
                  
                  {selectedRequest.printerUsed && (
                    <p><strong>Printer Used:</strong> {selectedRequest.printerUsed}</p>
                  )}
                  
                  {/* Show reprint information */}
                  {selectedRequest.reprintCount && (
                    <>
                      <p><strong>Reprint Count:</strong> {selectedRequest.reprintCount}</p>
                      {selectedRequest.lastReprintedAt && (
                        <p><strong>Last Reprinted:</strong> {(() => {
                          const dateTime = formatDate(selectedRequest.lastReprintedAt);
                          if (typeof dateTime === 'string') return dateTime;
                          return `${dateTime.date} at ${dateTime.time}`;
                        })()}</p>
                      )}
                      {selectedRequest.lastPrinterUsed && (
                        <p><strong>Last Printer Used:</strong> {selectedRequest.lastPrinterUsed}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
              
              {selectedRequest.pdfUrl && (
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Document Preview</h4>
                  <div className="mt-2">
                    <Button
                      icon={mdiEye}
                      color="info"
                      label="View PDF"
                      onClick={() => window.open(selectedRequest.pdfUrl, '_blank')}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardBoxModal>
        )}

        {/* Reject Modal */}
        <CardBoxModal
          title="Reject Print Request"
          buttonColor="danger"
          buttonLabel={processingRequest ? "Processing..." : "Reject Request"}
          isActive={isRejectModalActive}
          onConfirm={handleReject}
          onCancel={() => {
            setIsRejectModalActive(false);
            setRejectionReason('');
            setSelectedRequest(null);
          }}
        >
          <div className="space-y-4">
            <p>Are you sure you want to reject this print request?</p>
            <div>
              <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Rejection Reason (Required)
              </label>
              <textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                rows={3}
                placeholder="Please provide a reason for rejecting this request..."
              />
            </div>
          </div>
        </CardBoxModal>
      </SectionMain>
    </>
  );
} 