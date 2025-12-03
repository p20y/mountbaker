/**
 * Unit tests for generation agent
 * 
 * Tests diagram generation service, retry logic, and error handling.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateDiagram, executeGeneration } from '@/lib/agents/generation'
import type { GenerationInput } from '@/lib/agents/generation'

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: vi.fn(() => ({
      generateContent: vi.fn()
    }))
  }))
}))

describe('Generation Agent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.GEMINI_API_KEY = 'test-api-key'
  })

  describe('generateDiagram', () => {
    it('should generate diagram from financial flows', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockImageBuffer = Buffer.from('mock-image-data')
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  data: mockImageBuffer.toString('base64')
                }
              }]
            }
          }]
        }
      }

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue(mockResponse)
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: GenerationInput = {
        flows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
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
        }
      }

      const result = await generateDiagram(input)

      expect(result.diagram).toBeInstanceOf(Buffer)
      expect(result.renderMetadata).toBeDefined()
      expect(result.renderMetadata?.width).toBe(1024)
      expect(result.renderMetadata?.height).toBe(1024)
      expect(result.chartData?.flows).toHaveLength(1)
    })

    it('should handle retry on failure', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockImageBuffer = Buffer.from('mock-image-data')
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  data: mockImageBuffer.toString('base64')
                }
              }]
            }
          }]
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

      const input: GenerationInput = {
        flows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
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
        }
      }

      const result = await generateDiagram(input, { maxRetries: 2 })

      expect(result.diagram).toBeInstanceOf(Buffer)
      expect(mockModel.generateContent).toHaveBeenCalledTimes(2)
    })

    it('should throw error after max retries', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockModel = {
        generateContent: vi.fn().mockRejectedValue(new Error('API error'))
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: GenerationInput = {
        flows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
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
        }
      }

      await expect(
        generateDiagram(input, { maxRetries: 1 })
      ).rejects.toThrow('Diagram generation failed after 2 attempts')
    })

    it('should throw error if no flows provided', async () => {
      const input: GenerationInput = {
        flows: [],
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
        }
      }

      await expect(generateDiagram(input)).rejects.toThrow(
        'At least one flow is required'
      )
    })

    it('should throw error if API key is missing', async () => {
      delete process.env.GEMINI_API_KEY

      const input: GenerationInput = {
        flows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
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
        }
      }

      await expect(
        generateDiagram(input, { apiKey: undefined })
      ).rejects.toThrow('GEMINI_API_KEY is required')
    })

    it('should use custom image dimensions', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockImageBuffer = Buffer.from('mock-image-data')
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  data: mockImageBuffer.toString('base64')
                }
              }]
            }
          }]
        }
      }

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue(mockResponse)
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: GenerationInput = {
        flows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
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
        }
      }

      const result = await generateDiagram(input, {
        imageDimensions: { width: 2048, height: 2048 }
      })

      expect(result.renderMetadata?.width).toBe(2048)
      expect(result.renderMetadata?.height).toBe(2048)
    })
  })

  describe('executeGeneration', () => {
    it('should execute generation successfully', async () => {
      const { GoogleGenerativeAI } = await import('@google/generative-ai')
      
      const mockImageBuffer = Buffer.from('mock-image-data')
      const mockResponse = {
        response: {
          candidates: [{
            content: {
              parts: [{
                inlineData: {
                  data: mockImageBuffer.toString('base64')
                }
              }]
            }
          }]
        }
      }

      const mockModel = {
        generateContent: vi.fn().mockResolvedValue(mockResponse)
      }
      
      vi.mocked(GoogleGenerativeAI).mockImplementation(() => ({
        getGenerativeModel: vi.fn(() => mockModel)
      } as any))

      const input: GenerationInput = {
        flows: [
          {
            source: 'Revenue',
            target: 'Expenses',
            amount: 1000,
            category: 'revenue'
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
        }
      }

      const result = await executeGeneration(input)

      expect(result.diagram).toBeInstanceOf(Buffer)
      expect(result.chartData?.flows).toHaveLength(1)
    })
  })
})

