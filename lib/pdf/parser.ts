/**
 * PDF parsing and text extraction utility
 * 
 * Handles PDF text extraction, detects scanned PDFs, and prepares
 * content for AI processing.
 */

import pdf from 'pdf-parse'

export interface PDFParseResult {
  text: string
  isScanned: boolean
  pageCount: number
  metadata: {
    title?: string
    author?: string
    subject?: string
    creator?: string
    producer?: string
  }
}

/**
 * Parse PDF and extract text content
 * 
 * @param buffer - PDF file buffer
 * @returns Parsed PDF result with text and metadata
 */
export async function parsePDF(buffer: Buffer): Promise<PDFParseResult> {
  try {
    const data = await pdf(buffer, {
      // Options for better text extraction
      max: 0, // Parse all pages
    })

    const text = data.text || ''
    const pageCount = data.numpages || 0
    
    // Detect scanned PDF: if text content is very low (< 100 chars per page on average)
    // or if text length is less than 100 total, likely scanned
    // But only if we have at least one page
    const avgCharsPerPage = pageCount > 0 ? text.length / pageCount : 0
    const isScanned = pageCount > 0 && (text.length < 100 || avgCharsPerPage < 100)

    return {
      text: text.trim(),
      isScanned,
      pageCount,
      metadata: {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
      },
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse PDF: ${error.message}`)
    }
    throw new Error('Failed to parse PDF: Unknown error')
  }
}

/**
 * Extract text from PDF, handling both text-based and scanned PDFs
 * 
 * For scanned PDFs, returns minimal text and flag indicating OCR is needed.
 * The actual OCR will be handled by Gemini Flash which has built-in OCR capabilities.
 * 
 * @param buffer - PDF file buffer
 * @returns Text content and scanned flag
 */
export async function extractPDFText(buffer: Buffer): Promise<{
  text: string | null
  isScanned: boolean
  needsOCR: boolean
}> {
  const result = await parsePDF(buffer)
  
  // If scanned or low text content, return null to signal OCR needed
  // Gemini Flash will handle OCR when text is null
  if (result.isScanned || result.text.length < 100) {
    return {
      text: null,
      isScanned: true,
      needsOCR: true,
    }
  }

  return {
    text: result.text,
    isScanned: false,
    needsOCR: false,
  }
}

/**
 * Validate PDF file
 * 
 * @param buffer - PDF file buffer
 * @returns true if valid PDF, throws error if invalid
 */
export function validatePDF(buffer: Buffer): boolean {
  // Check minimum size first (very small files are likely corrupted)
  if (buffer.length < 100) {
    throw new Error('Invalid PDF file: File too small')
  }

  // Check PDF magic number: %PDF
  const pdfHeader = buffer.toString('ascii', 0, 4)
  if (pdfHeader !== '%PDF') {
    throw new Error('Invalid PDF file: Missing PDF header')
  }

  return true
}

/**
 * Check if PDF is password-protected
 * 
 * @param buffer - PDF file buffer
 * @returns true if password-protected
 */
export async function isPasswordProtected(buffer: Buffer): Promise<boolean> {
  try {
    await pdf(buffer, { max: 1 })
    return false
  } catch (error) {
    if (error instanceof Error) {
      // pdf-parse throws specific error for password-protected PDFs
      if (error.message.includes('password') || error.message.includes('encrypted')) {
        return true
      }
    }
    throw error
  }
}

