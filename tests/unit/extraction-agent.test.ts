/**
 * Unit tests for extraction agent
 * 
 * Tests extraction service, retry logic, and error handling.
 * 
 * Requirements: 1.2, 1.3, 5.1, 6.3, 6.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { extractFinancialData, executeExtraction } from '@/lib/agents/extraction'
import type { ExtractionInput } from '@/lib/agents/extraction'

// Mock Vercel AI SDK
vi.mock('ai', () => ({
  generateObject: vi.fn()
}))

vi.mock('@ai-sdk/google', () => ({
  google: vi.fn((model: string, options?: { apiKey?: string }) => ({
    model,
    apiKey: options?.apiKey
  }))
}))

describe('Extraction Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  describe('extractFinancialData', () => {
    it('should extract financial data from text-based PDF', async () => {
      const { generateObject } = await import('ai')
      
      const mockResult = {
        object: {
          flows: [
            {
              source: 'Total Revenue',
              target: 'Operating Expenses',
              amount: 1000,
              category: 'revenue' as const,
              metadata: {
                lineItem: 'Revenue',
                statementSection: 'Income Statement'
              }
            }
          ],
          metadata: {
            company: 'Test Company',
            period: {
              start: new Date('2024-01-01'),
              end: new Date('2024-03-31'),
              quarter: 1,
              year: 2024
            },
            currency: 'USD',
            statementType: ['Income Statement']
          },
          confidence: 0.95
        }
      }

      vi.mocked(generateObject).mockResolvedValue(mockResult as any)

      const input: ExtractionInput = {
        pdfText: 'Financial statement content with revenue of $1000',
        isScanned: false
      }

      const result = await extractFinancialData(input)

      expect(result.flows).toHaveLength(1)
      expect(result.flows[0].source).toBe('Total Revenue')
      expect(result.confidence).toBeGreaterThanOrEqual(0.5)
      expect(generateObject).toHaveBeenCalledTimes(1)
    })

    it('should handle scanned PDFs', async () => {
      const { generateObject } = await import('ai')
      
      const mockResult = {
        object: {
          flows: [
            {
              source: 'Revenue',
              target: 'Expenses',
              amount: 500,
              category: 'revenue' as const
            }
          ],
          metadata: {
            company: 'Test Company',
            period: {
              start: new Date('2024-01-01'),
              end: new Date('2024-03-31'),
              quarter: 1,
              year: 2024
            },
            currency: 'USD',
            statementType: ['Income Statement']
          },
          confidence: 0.85
        }
      }

      vi.mocked(generateObject).mockResolvedValue(mockResult as any)

      const input: ExtractionInput = {
        pdfText: null,
        isScanned: true
      }

      const result = await extractFinancialData(input)

      expect(result.flows).toHaveLength(1)
      expect(result.flows[0].source).toBe('Revenue')
    })

    it('should retry on failure with exponential backoff', async () => {
      const { generateObject } = await import('ai')
      
      // First attempt fails, second succeeds
      vi.mocked(generateObject)
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          object: {
            flows: [
              {
                source: 'Revenue',
                target: 'Expenses',
                amount: 1000,
                category: 'revenue' as const
              }
            ],
            metadata: {
              company: 'Test Company',
              period: {
                start: new Date('2024-01-01'),
                end: new Date('2024-03-31'),
                quarter: 1,
                year: 2024
              },
              currency: 'USD',
              statementType: ['Income Statement']
            },
            confidence: 0.9
          }
        } as any)

      const input: ExtractionInput = {
        pdfText: 'Financial statement',
        isScanned: false
      }

      const result = await extractFinancialData(input, { maxRetries: 2 })

      expect(result.flows).toHaveLength(1)
      expect(generateObject).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      const { generateObject } = await import('ai')
      
      vi.mocked(generateObject).mockRejectedValue(new Error('API error'))

      const input: ExtractionInput = {
        pdfText: 'Financial statement',
        isScanned: false
      }

      await expect(
        extractFinancialData(input, { maxRetries: 1 })
      ).rejects.toThrow('Extraction failed after 2 attempts')
    })

    it('should throw error for low confidence extraction', async () => {
      const { generateObject } = await import('ai')
      
      vi.mocked(generateObject).mockResolvedValue({
        object: {
          flows: [
            {
              source: 'Revenue',
              target: 'Expenses',
              amount: 1000,
              category: 'revenue' as const
            }
          ],
          metadata: {
            company: 'Test Company',
            period: {
              start: new Date('2024-01-01'),
              end: new Date('2024-03-31'),
              quarter: 1,
              year: 2024
            },
            currency: 'USD',
            statementType: ['Income Statement']
          },
          confidence: 0.3 // Low confidence
        }
      } as any)

      const input: ExtractionInput = {
        pdfText: 'Financial statement',
        isScanned: false
      }

      await expect(extractFinancialData(input)).rejects.toThrow(
        'Low confidence extraction'
      )
    })

    it('should use custom API key when provided', async () => {
      const { generateObject } = await import('ai')
      const { google } = await import('@ai-sdk/google')
      
      const mockResult = {
        object: {
          flows: [
            {
              source: 'Revenue',
              target: 'Expenses',
              amount: 1000,
              category: 'revenue' as const
            }
          ],
          metadata: {
            company: 'Test',
            period: {
              start: new Date('2024-01-01'),
              end: new Date('2024-03-31'),
              quarter: 1,
              year: 2024
            },
            currency: 'USD',
            statementType: ['Income Statement']
          },
          confidence: 0.9
        }
      }

      vi.mocked(generateObject).mockResolvedValue(mockResult as any)

      const input: ExtractionInput = {
        pdfText: 'Test',
        isScanned: false
      }

      await extractFinancialData(input, { apiKey: 'custom-key' })

      expect(google).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ apiKey: 'custom-key' })
      )
    })

    it('should throw error if API key is missing', async () => {
      delete process.env.GEMINI_API_KEY

      const input: ExtractionInput = {
        pdfText: 'Test',
        isScanned: false
      }

      await expect(
        extractFinancialData(input, { apiKey: undefined })
      ).rejects.toThrow('GEMINI_API_KEY is required')
    })
  })

  describe('executeExtraction', () => {
    it('should execute extraction successfully', async () => {
      const { generateObject } = await import('ai')
      
      const mockResult = {
        object: {
          flows: [
            {
              source: 'Revenue',
              target: 'Expenses',
              amount: 1000,
              category: 'revenue' as const
            }
          ],
          metadata: {
            company: 'Test Company',
            period: {
              start: new Date('2024-01-01'),
              end: new Date('2024-03-31'),
              quarter: 1,
              year: 2024
            },
            currency: 'USD',
            statementType: ['Income Statement']
          },
          confidence: 0.9
        }
      }

      vi.mocked(generateObject).mockResolvedValue(mockResult as any)

      const input: ExtractionInput = {
        pdfText: 'Financial statement',
        isScanned: false
      }

      const result = await executeExtraction(input)

      expect(result.flows).toHaveLength(1)
      expect(result.confidence).toBe(0.9)
    })
  })
})

