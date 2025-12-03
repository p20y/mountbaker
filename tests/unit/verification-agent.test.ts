/**
 * Unit tests for verification agent
 * 
 * Tests verification service, discrepancy detection, and error handling.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyDiagram, executeVerification } from '@/lib/agents/verification'
import type { VerificationInput } from '@/types/models'

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn()
    }))
  }))
}))

describe('Verification Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  describe('verifyDiagram', () => {
    it('should verify diagram with matching values', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            verified: true,
            overallAccuracy: 0.999,
            flowsVerified: 1,
            flowsTotal: 1,
            discrepancies: [],
            valueComparisons: [
              {
                flow: 'Revenue -> Expenses',
                diagramValue: 1000,
                sourceValue: 1000,
                match: true
              }
            ],
            reasoning: 'All values match within tolerance',
            passed: true,
            confidenceScore: 0.99,
            timestamp: new Date().toISOString()
          })
        }
      }

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue(mockResponse)
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: VerificationInput = {
        diagram: Buffer.from('mock-diagram'),
        originalFlows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
          }
        ],
        threshold: 0.001
      }

      const result = await verifyDiagram(input)

      expect(result.verified).toBe(true)
      expect(result.accuracy).toBeGreaterThan(0.99)
      expect(result.discrepancies).toHaveLength(0)
      expect(result.report.passed).toBe(true)
    })

    it('should detect discrepancies exceeding threshold', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            verified: false,
            overallAccuracy: 0.95,
            flowsVerified: 0,
            flowsTotal: 1,
            discrepancies: [
              {
                flow: 'Revenue -> Expenses',
                expected: 1000,
                actual: 1100,
                percentageError: 10.0
              }
            ],
            valueComparisons: [
              {
                flow: 'Revenue -> Expenses',
                diagramValue: 1100,
                sourceValue: 1000,
                match: false,
                error: 10.0
              }
            ],
            reasoning: 'Discrepancy detected: expected 1000, got 1100 (10% error)',
            passed: false,
            confidenceScore: 0.95,
            timestamp: new Date().toISOString()
          })
        }
      }

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue(mockResponse)
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: VerificationInput = {
        diagram: Buffer.from('mock-diagram'),
        originalFlows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
          }
        ],
        threshold: 0.001 // 0.1%
      }

      const result = await verifyDiagram(input)

      expect(result.verified).toBe(false)
      expect(result.discrepancies).toHaveLength(1)
      expect(result.discrepancies[0].percentageError).toBeGreaterThan(0.1)
      expect(result.report.passed).toBe(false)
    })

    it('should handle retry on failure', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            verified: true,
            overallAccuracy: 0.999,
            flowsVerified: 1,
            flowsTotal: 1,
            discrepancies: [],
            valueComparisons: [],
            reasoning: 'All values match',
            passed: true,
            confidenceScore: 0.99,
            timestamp: new Date().toISOString()
          })
        }
      }

      const mockModel = {
        generateContent: vi.fn()
          .mockRejectedValueOnce(new Error('API error'))
          .mockResolvedValueOnce(mockResponse)
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: VerificationInput = {
        diagram: Buffer.from('mock-diagram'),
        originalFlows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
          }
        ],
        threshold: 0.001
      }

      const result = await verifyDiagram(input, { maxRetries: 2 })

      expect(result.verified).toBe(true)
      expect(mockModel.generateContent).toHaveBeenCalledTimes(2)
    })

    it('should throw error if diagram is missing', async () => {
      const input: VerificationInput = {
        diagram: Buffer.alloc(0),
        originalFlows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
          }
        ],
        threshold: 0.001
      }

      await expect(verifyDiagram(input)).rejects.toThrow('Diagram image is required')
    })

    it('should throw error if original flows are missing', async () => {
      const input: VerificationInput = {
        diagram: Buffer.from('mock-diagram'),
        originalFlows: [],
        threshold: 0.001
      }

      await expect(verifyDiagram(input)).rejects.toThrow('Original flows are required')
    })

    it('should throw error if API key is missing', async () => {
      delete process.env.GEMINI_API_KEY

      const input: VerificationInput = {
        diagram: Buffer.from('mock-diagram'),
        originalFlows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
          }
        ],
        threshold: 0.001
      }

      await expect(
        verifyDiagram(input, { apiKey: undefined })
      ).rejects.toThrow('GEMINI_API_KEY is required')
    })
  })

  describe('executeVerification', () => {
    it('should execute verification successfully', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockResponse = {
        response: {
          text: () => JSON.stringify({
            verified: true,
            overallAccuracy: 0.999,
            flowsVerified: 1,
            flowsTotal: 1,
            discrepancies: [],
            valueComparisons: [],
            reasoning: 'All values match',
            passed: true,
            confidenceScore: 0.99,
            timestamp: new Date().toISOString()
          })
        }
      }

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue(mockResponse)
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: VerificationInput = {
        diagram: Buffer.from('mock-diagram'),
        originalFlows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
          }
        ],
        threshold: 0.001
      }

      const result = await executeVerification(input)

      expect(result.verified).toBe(true)
      expect(result.report.reasoning).toBe('All values match')
    })
  })
})

