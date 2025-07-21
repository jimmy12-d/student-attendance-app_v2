import { NextRequest, NextResponse } from 'next/server';

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
      const error = await response.text();
      throw new Error(`PrintNode API error: ${response.status} - ${error}`);
    }

    return response.json();
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

    const client = new PrintNodeClient(PRINTNODE_API_KEY);

    switch (action) {
      case 'printers':
        const printers = await client.getPrinters();
        console.log(`🖨️ [PrintNode API] Found ${printers.length} total printers.`);
        
        // Filter for Ricoh printers and add helpful metadata
        const ricohPrinters = printers.filter((printer: any) => 
          printer.name.toLowerCase().includes('ricoh') || 
          printer.name.toLowerCase().includes('mp') ||
          printer.description?.toLowerCase().includes('ricoh')
        );
        
        return NextResponse.json({
          success: true,
          printers: ricohPrinters,
          allPrinters: printers,
          message: `Found ${ricohPrinters.length} Ricoh printers out of ${printers.length} total`
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
  console.log('\n✅ [PrintNode API] Received POST request at:', new Date().toISOString());
  try {
    if (!PRINTNODE_API_KEY || PRINTNODE_API_KEY === 'your_printnode_api_key_here') {
      console.error('❌ [PrintNode API] FATAL: PRINTNODE_API_KEY is not configured in environment variables.');
      return NextResponse.json(
        { error: 'PrintNode API key not configured on the server. Please check your .env.local file and restart the server.' },
        { status: 500 }
      );
    }
    console.log('🔑 [PrintNode API] API Key is present for POST.');

    const body = await request.json();
    console.log('📦 [PrintNode API] Request body received from frontend:', body);
    const { 
      printerId, 
      pdfUrl, 
      title, 
      copies = 1, 
      duplex = false,
      paperSize = 'A4',
      customPageRange,
      requestId 
    } = body;

    if (!printerId || !pdfUrl) {
      console.error('[PrintNode API] Missing printerId or pdfUrl in request body.');
      return NextResponse.json(
        { error: 'Printer ID and PDF URL are required' },
        { status: 400 }
      );
    }

    const client = new PrintNodeClient(PRINTNODE_API_KEY);

    // First, check if printer is available
    console.log(`[PrintNode API] Checking status of printer ID: ${printerId}`);
    const printer = await client.getPrinter(printerId);
    console.log('[PrintNode API] Raw printer data from API:', printer); // New log

    if (!printer) {
      console.error(`[PrintNode API] Printer with ID ${printerId} not found.`);
      return NextResponse.json(
        { error: 'Printer not found' },
        { status: 404 }
      );
    }
    console.log(`[PrintNode API] Printer found: ${printer.name}, State: ${printer.computer?.state}`);

    if (printer.computer?.state !== 'connected') {
      console.error(`[PrintNode API] Printer offline. State: ${printer.computer?.state}`);
      return NextResponse.json(
        { 
          error: 'Printer offline',
          details: `PrintNode client is ${printer.computer?.state || 'disconnected'}`
        },
        { status: 503 }
      );
    }

    // Download PDF and convert to base64
    console.log('📄 [PrintNode API] Downloading PDF from:', pdfUrl);
    const pdfBase64 = await downloadPdfAsBase64(pdfUrl);
    console.log(`[PrintNode API] PDF downloaded, size: ${Math.round(pdfBase64.length / 1024)} KB`);

    // Prepare print job
    const printJob = {
      printerId: printerId,
      title: title || `Print Job - ${requestId || 'Unknown'}`,
      contentType: 'pdf_base64',
      content: pdfBase64,
      source: 'Student Attendance App',
      options: {
        copies: copies,
        duplex: duplex ? 'long-edge' : 'simplex',
        paper: paperSize.toLowerCase(),
        'fit-to-page': true,
        'color': false, // Force black and white printing with a boolean
        ...(customPageRange && { pages: customPageRange }), // Add page range if specified
        ...(printer.capabilities && {
          // Use printer's specific capabilities if available
          resolution: printer.capabilities.resolutions?.[0]
        })
      }
    };

    console.log('📤 [PrintNode API] Submitting print job to PrintNode:', printJob.options);

    // Submit print job
    const result = await client.submitPrintJob(printJob);

    console.log('✅ [PrintNode API] Print job submitted successfully:', result);

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
        duplex,
        paperSize
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