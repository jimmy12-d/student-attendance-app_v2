import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

// PrintNode API configuration
const PRINTNODE_API_KEY = process.env.PRINTNODE_API_KEY;
const PRINTNODE_BASE_URL = 'https://api.printnode.com';

// PrintNode API client
class PrintNodeClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = PRINTNODE_BASE_URL;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorMessage;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } else {
          errorMessage = await response.text();
        }
      } catch {
        errorMessage = `HTTP ${response.status} ${response.statusText}`;
      }
      throw new Error(`PrintNode API error: ${response.status} - ${errorMessage}`);
    }

    try {
      return await response.json();
    } catch (parseError) {
      throw new Error(`PrintNode API returned invalid JSON: ${parseError}`);
    }
  }

  // Get all available printers
  async getPrinters() {
    return this.makeRequest('/printers');
  }

  // Get specific printer by ID
  async getPrinter(printerId: number) {
    const printers = await this.makeRequest(`/printers/${printerId}`);
    // The API returns an array, even for a single printer ID
    if (Array.isArray(printers) && printers.length > 0) {
      return printers[0];
    }
    return null; // Return null if no printer is found
  }

  // Submit a print job
  async submitPrintJob(printJob: {
    printerId: number;
    title: string;
    contentType: string;
    content: string;
    source?: string;
    options?: any;
  }) {
    return this.makeRequest('/printjobs', {
      method: 'POST',
      body: JSON.stringify(printJob),
    });
  }

  // Get print job status
  async getPrintJobStatus(jobId: number) {
    return this.makeRequest(`/printjobs/${jobId}`);
  }

  // Get computer status (PrintNode clients)
  async getComputers() {
    return this.makeRequest('/computers');
  }
}

// Helper function to download PDF and convert to base64
async function downloadPdfAsBase64(pdfUrl: string): Promise<string> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Failed to download PDF for printing');
  }
}

async function generateReceiptPdf(transaction: any, pageHeight: number, action: string = 'print'): Promise<string> {
    const pdfDoc = await PDFDocument.create();
    
    // Force content to start at the very top by using a minimal page height
    // and setting no top margin - this prevents driver centering
    const page = pdfDoc.addPage([226.77, pageHeight]); 
    const { width,  height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 15; // Side margins only

    // Add top padding for downloads, but not for printing (printer already has empty space)
    const topPadding = action === 'generate' ? 10 : 0;

    // Start content at the absolute top of the page (no top margin for printing)
    // Add padding for downloads to provide better spacing
    
    // --- Logo ---
    const logoPath = path.resolve('./public', 'icon-192x192.png');
    const logoImageBytes = await fs.readFile(logoPath);
    const logoImage = await pdfDoc.embedPng(logoImageBytes);
    const logoDims = logoImage.scale(0.33);
    page.drawImage(logoImage, {
      x: (width - logoDims.width) / 2, // Center the logo horizontally
      y: height - logoDims.height - topPadding, // Add top padding for downloads
      width: logoDims.width,
      height: logoDims.height,
    });

    let y = height - logoDims.height - topPadding - 15; // Minimal gap after logo, accounting for padding

    const centerTextX = (text: string, textFont: any, size: number) => (width - textFont.widthOfTextAtSize(text, size)) / 2;

    // --- Headers ---
    page.drawText('RODWELL LEARNING CENTER', { x: centerTextX('RODWELL LEARNING CENTER', boldFont, 9), y, font: boldFont, size: 9 });
    y -= 13;
    page.drawText('RECEIPT OF PAYMENT', { x: centerTextX('RECEIPT OF PAYMENT', font, 8), y, font, size: 8 });
    y -= 13;

    page.drawLine({ start: { x: margin, y: y }, end: { x: width - margin, y: y }, thickness: 0.5 });
    y -= 13;

    // --- Details ---
    const detailFontSize = 10; // Increased text size
    const labelX = margin;
    const valueX = 85; // Increased to prevent overlap

    page.drawText('Date:', { x: labelX, y, font: boldFont, size: detailFontSize });
    page.drawText(new Date(transaction.date).toLocaleString(), { x: valueX, y, font, size: detailFontSize, maxWidth: width - margin - valueX });
    y -= 13;
    page.drawText('Method:', { x: labelX, y, font: boldFont, size: detailFontSize });
    page.drawText(transaction.paymentMethod, { x: valueX, y, font, size: detailFontSize });
    y -= 13;
    page.drawText('Payment For:', { x: labelX, y, font: boldFont, size: detailFontSize });
    page.drawText(transaction.paymentMonth, { x: valueX, y, font, size: detailFontSize, maxWidth: width - margin - valueX });
    y -= 13;
    page.drawText('Receipt #:', { x: labelX, y, font: boldFont, size: detailFontSize });
    page.drawText(transaction.receiptNumber, { x: valueX, y, font, size: detailFontSize });
    y -= 13;
    page.drawText('Student:', { x: labelX, y, font: boldFont, size: detailFontSize });
    page.drawText(transaction.studentName, { x: valueX, y, font, size: detailFontSize, maxWidth: width - margin - valueX });
    y -= 13;
    page.drawText('Class:', { x: labelX, y, font: boldFont, size: detailFontSize });
    page.drawText(transaction.className, { x: valueX, y, font, size: detailFontSize, maxWidth: width - margin - valueX });
    y -= 13;

    page.drawLine({ start: { x: margin, y: y }, end: { x: width - margin, y: y }, thickness: 0.5 });
    y -= 13;

    page.drawText('DESCRIPTION', { x: margin, y, font: boldFont, size: detailFontSize });
    y -= 13;
    page.drawText(`Full Amount: $${transaction.fullAmount.toFixed(2)}`, { x: margin + 4, y, font, size: detailFontSize, maxWidth: width - margin * 2 - 4 });
    y -= 13;
    page.drawText(`Final Amount: $${transaction.amount.toFixed(2)}`, { x: margin + 4, y, font: boldFont, size: detailFontSize, maxWidth: width - margin * 2 - 4 });
    y -= 13;
    page.drawText('Subjects Included:', { x: margin + 4, y, font: boldFont, size: detailFontSize });
    y -= 11;
    
    const subjectsText = transaction.subjects.join(', ');
    const textWidth = width - (margin + 8) * 2; 
    const words = subjectsText.split(' ');
    let line = '';
    
    for (const word of words) {
        const testLine = line.length > 0 ? `${line} ${word}` : word;
        const currentWidth = font.widthOfTextAtSize(testLine, detailFontSize);
        if (currentWidth > textWidth) {
            page.drawText(line, { x: margin + 8, y, font, size: detailFontSize });
            y -= 11;
            line = word;
        } else {
            line = testLine;
        }
    }
    page.drawText(line, { x: margin + 8, y, font, size: detailFontSize });
    y -= 13;


    page.drawLine({ start: { x: margin, y: y }, end: { x: width - margin, y: y }, thickness: 0.5 });
    y -= 16;

    page.drawText('Amount Paid:', { x: margin, y, font: boldFont, size: 11 });
    const amountText = `$${transaction.amount.toFixed(2)}`;
    page.drawText(amountText, { x: width - margin - boldFont.widthOfTextAtSize(amountText, 11), y, font: boldFont, size: 11 });
    y -= 22;

    page.drawText('Thank you!', { x: centerTextX('Thank you!', boldFont, 9), y, font: boldFont, size: 9 });

    return pdfDoc.saveAsBase64();
}

// API route handlers
export async function GET(request: NextRequest) {
  console.log('\n✅ [PrintNode API] Received GET request at:', new Date().toISOString());
  try {
    if (!PRINTNODE_API_KEY || PRINTNODE_API_KEY === 'your_printnode_api_key_here') {
      console.error('❌ [PrintNode API] FATAL: PRINTNODE_API_KEY is not configured in environment variables.');
      return NextResponse.json(
        { error: 'PrintNode API key not configured on the server. Please check your .env.local file and restart the server.' },
        { status: 500 }
      );
    }
    console.log('🔑 [PrintNode API] API Key is present for GET.');

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    console.log(`🔍 [PrintNode API] Action: ${action}`);

    // Debug PDF generation
    if (action === 'debug-pdf') {
      const mockTransaction = {
        studentName: "John Doe",
        className: "Class 12A",
        classType: "Grade 12",
        subjects: ["Math", "Chemistry", "Physics", "Khmer", "Biology", "History"],
        amount: 150,
        receiptNumber: "RCPT-1234567890",
        paymentMonth: "July 2024",
        paymentMethod: "Cash",
        date: new Date().toISOString(),
        transactionId: "test-123",
        cashier: "Admin"
      };

      const pdfBase64 = await generateReceiptPdf(mockTransaction, 600, 'debug');
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="debug-receipt.pdf"'
        }
      });
    }

    const client = new PrintNodeClient(PRINTNODE_API_KEY);

    switch (action) {
      case 'printers':
        const printers = await client.getPrinters();
        console.log(`🖨️ [PrintNode API] Found ${printers.length} total printers.`);
        
        // Return all printers, filtering will be done on the client side if needed
        return NextResponse.json({
          success: true,
          printers: printers,
          message: `Found ${printers.length} total printers`
        });

      case 'computers':
        const computers = await client.getComputers();
        console.log(`💻 [PrintNode API] Found ${computers.length} computers.`);
        return NextResponse.json({
          success: true,
          computers,
          message: `Found ${computers.length} PrintNode clients`
        });

      case 'status':
        const printerId = searchParams.get('printerId');
        console.log(`ℹ️ [PrintNode API] Checking status for printer ID: ${printerId}`);
        if (!printerId) {
          return NextResponse.json(
            { error: 'Printer ID required for status check' },
            { status: 400 }
          );
        }
        
        const printer = await client.getPrinter(parseInt(printerId));
        console.log(`🟢 [PrintNode API] Printer status: ${printer.computer?.state}`);
        return NextResponse.json({
          success: true,
          printer,
          online: printer.computer?.state === 'connected',
          lastSeen: printer.computer?.createTimestamp
        });

      default:
        console.warn(`[PrintNode API] Invalid action requested: ${action}`);
        return NextResponse.json(
          { error: 'Invalid action. Use: printers, computers, or status' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('❌ [PrintNode API] GET Error:', error);
    return NextResponse.json(
      { 
        error: 'PrintNode service error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestUrl = request.url;
  console.log(`\n✅ [PrintNode API] Received POST request at: ${new Date().toISOString()}`);
  console.log(`[PrintNode API] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`[PrintNode API] Request URL: ${requestUrl}`);
  
  try {
    if (!PRINTNODE_API_KEY || PRINTNODE_API_KEY === 'your_printnode_api_key_here') {
      console.error('❌ [PrintNode API] FATAL: PRINTNODE_API_KEY is not configured in environment variables.');
      return NextResponse.json(
        { error: 'PrintNode API key not configured on the server. Please check your .env.local file and restart the server.' },
        { status: 500 }
      );
    }
    console.log(`🔑 [PrintNode API] API Key is present for POST (${PRINTNODE_API_KEY.substring(0, 8)}...)`);

    const body = await request.json();
    console.log('📦 [PrintNode API] Request body received from frontend:', body);
    const { 
      printerId, 
      pdfUrl, 
      rawContent,
      transactionData,
      pageHeight, // New parameter for height
      action = 'print', // 'print' or 'generate'
      contentType = 'pdf_base64',
      title, 
      copies = 1, 
      duplex = false,
      paperSize = 'A4',
      customPageRange,
      requestId 
    } = body;

    if (!printerId && action === 'print') {
        return NextResponse.json({ error: 'Printer ID is required for printing.' }, { status: 400 });
    }

    let contentBase64;

    if (transactionData) {
        console.log(`📄 [PrintNode API] Generating PDF receipt with height: ${pageHeight} for action: ${action}`);
        contentBase64 = await generateReceiptPdf(transactionData, pageHeight, action);
    } else if (pdfUrl) {
      console.log('📄 [PrintNode API] Downloading PDF from:', pdfUrl);
      contentBase64 = await downloadPdfAsBase64(pdfUrl);
      console.log(`[PrintNode API] PDF downloaded, size: ${Math.round(contentBase64.length / 1024)} KB`);
    } else if (rawContent) {
      console.log('📄 [PrintNode API] Using raw content for printing.');
      contentBase64 = Buffer.from(rawContent).toString('base64');
      console.log(`[PrintNode API] Raw content encoded, size: ${Math.round(contentBase64.length / 1024)} KB`);
    } else {
        return NextResponse.json({ error: 'No content provided.' }, { status: 400 });
    }

    // If the action is just to generate the PDF, return it now.
    if (action === 'generate') {
        return NextResponse.json({ success: true, pdfBase64: contentBase64 });
    }

    // --- The rest of this logic is for the 'print' action ---

    const client = new PrintNodeClient(PRINTNODE_API_KEY);

    // First, check if printer is available
    console.log(`[PrintNode API] Checking status of printer ID: ${printerId}`);
    
    let printer;
    try {
      printer = await client.getPrinter(printerId);
      console.log('[PrintNode API] Raw printer data from API:', JSON.stringify(printer, null, 2));
    } catch (printerError) {
      console.error(`[PrintNode API] Error fetching printer ${printerId}:`, printerError);
      
      // Check if this is a network/API error vs printer not found
      if (printerError instanceof Error && printerError.message.includes('PrintNode API error')) {
        return NextResponse.json(
          { 
            error: 'PrintNode API communication failed',
            details: `Cannot communicate with PrintNode service: ${printerError.message}. Please check your internet connection and PrintNode account status.`
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to check printer status',
          details: printerError instanceof Error ? printerError.message : 'Unknown printer error'
        },
        { status: 503 }
      );
    }

    if (!printer) {
      console.error(`[PrintNode API] Printer with ID ${printerId} not found.`);
      return NextResponse.json(
        { error: 'Printer not found. Please check if the PrintNode client is running and the printer is configured.' },
        { status: 404 }
      );
    }
    
    console.log(`[PrintNode API] Printer found: ${printer.name}`);
    console.log(`[PrintNode API] Computer state: ${printer.computer?.state}, Computer name: ${printer.computer?.name}`);
    console.log(`[PrintNode API] Computer ID: ${printer.computer?.id}, Computer createTimestamp: ${printer.computer?.createTimestamp}`);

    // More lenient computer state check - allow PrintNode to handle routing
    if (printer.computer?.state && printer.computer.state !== 'connected') {
      console.warn(`[PrintNode API] Printer/computer not connected. State: ${printer.computer?.state}`);
      // Don't fail immediately - let PrintNode try to deliver the job
      console.log(`[PrintNode API] Continuing with print job submission despite computer state: ${printer.computer?.state}`);
    }

    const printJob = {
      printerId: printerId,
      title: title || `Print Job - ${requestId || 'Unknown'}`,
      contentType: 'pdf_base64', // Forcing raw PDF printing
      content: contentBase64,
      source: 'Student Attendance App',
      options: {
        copies: copies,
        paper: '80 x 210mm', // Set appropriate thermal paper size
        media: 'No Cash Drawer', // Disable cash drawer
        bin: 'Document[PartialCut]', // Use partial cut for receipts
        fit_to_page: false, // CRITICAL: Disable scaling to prevent centering
        pages: '-', // Print all pages without modification
        margins: {
          top: 0,    // No top margin
          bottom: 0, // No bottom margin  
          left: 0,   // No left margin
          right: 0   // No right margin
        },
        scale: 'noscale', // Prevent any scaling
        position: 'topleft' // Force content to top-left corner
      }
    };

    console.log('📤 [PrintNode API] Submitting print job to PrintNode with options:', {
      copies: printJob.options.copies,
      paper: printJob.options.paper,
      media: printJob.options.media,
      bin: printJob.options.bin,
      fit_to_page: printJob.options.fit_to_page,
      pages: printJob.options.pages,
      margins: printJob.options.margins,
      scale: printJob.options.scale,
      position: printJob.options.position
    });

    // Submit print job
    let result;
    try {
      console.log('📤 [PrintNode API] Submitting print job to PrintNode...');
      result = await client.submitPrintJob(printJob);
      console.log('✅ [PrintNode API] Print job submitted successfully:', JSON.stringify(result, null, 2));
    } catch (submitError) {
      console.error('❌ [PrintNode API] Failed to submit print job:', submitError);
      
      // More specific error handling for print job submission
      if (submitError instanceof Error) {
        if (submitError.message.includes('PrintNode API error: 503')) {
          return NextResponse.json(
            { 
              error: 'PrintNode service temporarily unavailable',
              details: 'The PrintNode service is currently unavailable. This may be due to network issues or the PrintNode client not being connected. Please ensure the PrintNode client is running on the target computer and try again.'
            },
            { status: 503 }
          );
        } else if (submitError.message.includes('PrintNode API error: 401')) {
          return NextResponse.json(
            { 
              error: 'PrintNode authentication failed',
              details: 'Invalid PrintNode API key. Please check your PrintNode account settings.'
            },
            { status: 401 }
          );
        } else if (submitError.message.includes('PrintNode API error: 404')) {
          return NextResponse.json(
            { 
              error: 'Printer not accessible',
              details: 'The specified printer is not accessible through PrintNode. Please check if the printer is still configured and the PrintNode client is running.'
            },
            { status: 404 }
          );
        }
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to submit print job',
          details: submitError instanceof Error ? submitError.message : 'Unknown submission error'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      jobId: result.id,
      printer: {
        id: printer.id,
        name: printer.name,
        description: printer.description
      },
      settings: {
        copies,
        paper: '80 x 210mm',
        media: 'No Cash Drawer',
        bin: 'Document[PartialCut]',
        fit_to_page: false,
        pages: '-',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        scale: 'noscale',
        position: 'topleft'
      },
      message: `Print job submitted to ${printer.name}`,
      printNodeJobId: result.id
    });

  } catch (error) {
    console.error('❌ [PrintNode API] POST Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to submit print job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 