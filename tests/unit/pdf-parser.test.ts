/**
 * Unit tests for PDF parsing
 * 
 * Tests PDF text extraction, scanned PDF detection, and error handling.
 * 
 * Requirements: 1.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  parsePDF,
  extractPDFText,
  validatePDF,
  isPasswordProtected
} from '@/lib/pdf/parser'
import pdf from 'pdf-parse'

// Mock pdf-parse
vi.mock('pdf-parse', () => ({
  default: vi.fn()
}))

describe('PDF Parser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('parsePDF', () => {
    it('should extract text from text-based PDF', async () => {
      // Create text with more than 100 chars to avoid scanned detection
      const longText = 'This is a financial statement with revenue of $1000 and expenses of $500. ' +
        'The company had total assets of $5000 and liabilities of $2000. ' +
        'Net income for the quarter was $300.'
      const mockPDFData = {
        text: longText,
        numpages: 1,
        info: {
          Title: 'Q1 Financial Statement',
          Author: 'Finance Team'
        }
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await parsePDF(Buffer.from('mock-pdf'))

      expect(result.text).toBe(longText.trim())
      expect(result.isScanned).toBe(false)
      expect(result.pageCount).toBe(1)
      expect(result.metadata.title).toBe('Q1 Financial Statement')
    })

    it('should detect scanned PDF when text content is low', async () => {
      const mockPDFData = {
        text: '   ', // Very little text (scanned PDF)
        numpages: 5,
        info: {}
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await parsePDF(Buffer.from('mock-pdf'))

      expect(result.isScanned).toBe(true)
      expect(result.text.length).toBeLessThan(100)
    })

    it('should detect scanned PDF when average chars per page is low', async () => {
      const mockPDFData = {
        text: 'abc', // 3 chars for 5 pages = 0.6 chars/page
        numpages: 5,
        info: {}
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await parsePDF(Buffer.from('mock-pdf'))

      expect(result.isScanned).toBe(true)
    })

    it('should handle PDF with no text', async () => {
      const mockPDFData = {
        text: '',
        numpages: 1,
        info: {}
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await parsePDF(Buffer.from('mock-pdf'))

      expect(result.text).toBe('')
      expect(result.isScanned).toBe(true)
    })

    it('should extract metadata from PDF', async () => {
      const mockPDFData = {
        text: 'Financial statement content',
        numpages: 1,
        info: {
          Title: 'Q1 2024',
          Author: 'Company Inc',
          Subject: 'Financial Report',
          Creator: 'Excel',
          Producer: 'Adobe PDF'
        }
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await parsePDF(Buffer.from('mock-pdf'))

      expect(result.metadata.title).toBe('Q1 2024')
      expect(result.metadata.author).toBe('Company Inc')
      expect(result.metadata.subject).toBe('Financial Report')
    })

    it('should throw error for corrupted PDF', async () => {
      vi.mocked(pdf).mockRejectedValue(new Error('Invalid PDF structure'))

      await expect(parsePDF(Buffer.from('invalid-pdf'))).rejects.toThrow(
        'Failed to parse PDF'
      )
    })
  })

  describe('extractPDFText', () => {
    it('should return text for text-based PDF', async () => {
      // Create text with more than 100 chars to avoid scanned detection
      const longText = 'This is a valid financial statement with sufficient text content. ' +
        'It contains detailed financial information including revenue, expenses, assets, and liabilities. ' +
        'The statement covers the quarterly period and includes all necessary financial data.'
      const mockPDFData = {
        text: longText,
        numpages: 1,
        info: {}
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await extractPDFText(Buffer.from('mock-pdf'))

      expect(result.text).toBe(longText.trim())
      expect(result.isScanned).toBe(false)
      expect(result.needsOCR).toBe(false)
    })

    it('should return null text for scanned PDF', async () => {
      const mockPDFData = {
        text: '  ', // Scanned PDF with minimal text
        numpages: 3,
        info: {}
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await extractPDFText(Buffer.from('mock-pdf'))

      expect(result.text).toBeNull()
      expect(result.isScanned).toBe(true)
      expect(result.needsOCR).toBe(true)
    })

    it('should detect scanned PDF when text is less than 100 chars', async () => {
      const mockPDFData = {
        text: 'Short', // Less than 100 chars
        numpages: 1,
        info: {}
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await extractPDFText(Buffer.from('mock-pdf'))

      expect(result.needsOCR).toBe(true)
    })
  })

  describe('validatePDF', () => {
    it('should validate correct PDF header', () => {
      // Create a buffer that's large enough and has valid PDF header
      const validPDF = Buffer.alloc(200)
      validPDF.write('%PDF-1.4', 0)
      expect(() => validatePDF(validPDF)).not.toThrow()
    })

    it('should throw error for invalid PDF header', () => {
      // Create a buffer that's large enough but doesn't have PDF header
      const invalidPDF = Buffer.alloc(200)
      invalidPDF.write('NOT A PDF FILE', 0)
      expect(() => validatePDF(invalidPDF)).toThrow('Invalid PDF file: Missing PDF header')
    })

    it('should throw error for file too small', () => {
      const smallBuffer = Buffer.alloc(50)
      expect(() => validatePDF(smallBuffer)).toThrow('Invalid PDF file: File too small')
    })
  })

  describe('isPasswordProtected', () => {
    it('should return false for non-password-protected PDF', async () => {
      const mockPDFData = {
        text: 'Content',
        numpages: 1,
        info: {}
      }

      vi.mocked(pdf).mockResolvedValue(mockPDFData as any)

      const result = await isPasswordProtected(Buffer.from('mock-pdf'))
      expect(result).toBe(false)
    })

    it('should return true for password-protected PDF', async () => {
      vi.mocked(pdf).mockRejectedValue(new Error('PDF is encrypted and requires a password'))

      const result = await isPasswordProtected(Buffer.from('mock-pdf'))
      expect(result).toBe(true)
    })

    it('should throw error for other parsing errors', async () => {
      vi.mocked(pdf).mockRejectedValue(new Error('Corrupted PDF file'))

      await expect(isPasswordProtected(Buffer.from('mock-pdf'))).rejects.toThrow('Corrupted PDF file')
    })
  })

  describe('Error handling for corrupted PDFs', () => {
    it('should handle corrupted PDF gracefully', async () => {
      vi.mocked(pdf).mockRejectedValue(new Error('Corrupted PDF'))

      await expect(parsePDF(Buffer.from('corrupted'))).rejects.toThrow('Failed to parse PDF')
    })

    it('should provide clear error message for corrupted PDFs', async () => {
      vi.mocked(pdf).mockRejectedValue(new Error('Invalid PDF structure'))

      try {
        await parsePDF(Buffer.from('corrupted'))
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('Failed to parse PDF')
      }
    })
  })
})

