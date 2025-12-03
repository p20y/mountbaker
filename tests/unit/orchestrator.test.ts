/**
 * Unit tests for orchestrator
 * 
 * Tests orchestration logic, retry mechanism, and error handling.
 * 
 * Requirements: 6.2, 7.2, 5.4, 2.5, 6.3, 6.4, 7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { orchestrate, executeOrchestration } from '@/lib/agents/orchestrator'
import type { OrchestratorInput } from '@/types/models'

// Mock all dependencies
vi.mock('@/lib/pdf/parser', () => ({
  parsePDF: vi.fn(),
  extractPDFText: vi.fn(),
  validatePDF: vi.fn()
}))

vi.mock('@/lib/agents/extraction', () => ({
  extractFinancialData: vi.fn()
}))

vi.mock('@/lib/agents/generation', () => ({
  generateDiagram: vi.fn()
}))

vi.mock('@/lib/agents/verification', () => ({
  verifyDiagram: vi.fn()
}))

vi.mock('@/lib/supabase/database', () => ({
  createStatement: vi.fn(),
  updateStatementStatus: vi.fn(),
  insertFlows: vi.fn(),
  createVerification: vi.fn()
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadPDF: vi.fn(),
  uploadDiagram: vi.fn()
}))

describe('Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('orchestrate', () => {
    it('should execute complete pipeline successfully', async () => {
      const { validatePDF, extractPDFText } = await import('@/lib/pdf/parser')
      const { extractFinancialData } = await import('@/lib/agents/extraction')
      const { generateDiagram } = await import('@/lib/agents/generation')
      const { verifyDiagram } = await import('@/lib/agents/verification')
      const { createStatement, insertFlows, createVerification, updateStatementStatus } = await import('@/lib/supabase/database')
      const { uploadPDF, uploadDiagram } = await import('@/lib/supabase/storage')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'processing' as const }
      const mockFlows = {
        flows: [
          { source: 'Revenue', target: 'Expenses', amount: 1000, category: 'revenue' as const }
        ],
        metadata: {
          company: 'Test Company',
          period: { start: new Date(), end: new Date(), quarter: 1, year: 2024 },
          currency: 'USD',
          statementType: ['Income Statement']
        },
        confidence: 0.95
      }
      const mockDiagram = Buffer.from('mock-diagram')
      const mockVerification = {
        verified: true,
        accuracy: 0.999,
        discrepancies: [],
        report: {
          timestamp: new Date(),
          overallAccuracy: 0.999,
          flowsVerified: 1,
          flowsTotal: 1,
          discrepancies: [],
          passed: true,
          confidenceScore: 0.99,
          reasoning: 'All values match',
          valueComparisons: []
        }
      }

      vi.mocked(validatePDF).mockReturnValue(true)
      vi.mocked(extractPDFText).mockResolvedValue({ text: 'test text', isScanned: false, needsOCR: false })
      vi.mocked(createStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(uploadPDF).mockResolvedValue('test-path')
      vi.mocked(extractFinancialData).mockResolvedValue(mockFlows as any)
      vi.mocked(insertFlows).mockResolvedValue([] as any)
      vi.mocked(updateStatementStatus).mockResolvedValue(mockStatement as any)
      vi.mocked(generateDiagram).mockResolvedValue({ diagram: mockDiagram, renderMetadata: { width: 1024, height: 1024, format: 'png' }, chartData: { flows: mockFlows.flows } } as any)
      vi.mocked(uploadDiagram).mockResolvedValue('test-diagram-path')
      vi.mocked(verifyDiagram).mockResolvedValue(mockVerification as any)
      vi.mocked(createVerification).mockResolvedValue({} as any)

      const input: OrchestratorInput = {
        financialStatement: Buffer.from('mock-pdf'),
        format: 'pdf'
      }

      const result = await orchestrate(input)

      expect(result.success).toBe(true)
      expect(result.diagram).toBeInstanceOf(Buffer)
      expect(result.reasoning).toBe('All values match')
      expect(result.accuracy).toBe(0.999)
      expect(createStatement).toHaveBeenCalled()
      expect(extractFinancialData).toHaveBeenCalled()
      expect(generateDiagram).toHaveBeenCalled()
      expect(verifyDiagram).toHaveBeenCalled()
    })

    it('should retry generation on verification failure', async () => {
      const { validatePDF, extractPDFText } = await import('@/lib/pdf/parser')
      const { extractFinancialData } = await import('@/lib/agents/extraction')
      const { generateDiagram } = await import('@/lib/agents/generation')
      const { verifyDiagram } = await import('@/lib/agents/verification')
      const { createStatement, insertFlows, updateStatementStatus } = await import('@/lib/supabase/database')
      const { uploadPDF, uploadDiagram } = await import('@/lib/supabase/storage')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'processing' as const }
      const mockFlows = {
        flows: [{ source: 'Revenue', target: 'Expenses', amount: 1000, category: 'revenue' as const }],
        metadata: {
          company: 'Test',
          period: { start: new Date(), end: new Date(), quarter: 1, year: 2024 },
          currency: 'USD',
          statementType: ['Income Statement']
        },
        confidence: 0.95
      }
      const mockDiagram = Buffer.from('mock-diagram')
      const failedVerification = {
        verified: false,
        accuracy: 0.95,
        discrepancies: [{ flow: 'test', expected: 1000, actual: 1100, percentageError: 10 }],
        report: {
          timestamp: new Date(),
          overallAccuracy: 0.95,
          flowsVerified: 0,
          flowsTotal: 1,
          discrepancies: [],
          passed: false,
          confidenceScore: 0.9,
          reasoning: 'Verification failed',
          valueComparisons: []
        }
      }
      const passedVerification = {
        verified: true,
        accuracy: 0.999,
        discrepancies: [],
        report: {
          timestamp: new Date(),
          overallAccuracy: 0.999,
          flowsVerified: 1,
          flowsTotal: 1,
          discrepancies: [],
          passed: true,
          confidenceScore: 0.99,
          reasoning: 'All values match',
          valueComparisons: []
        }
      }

      vi.mocked(validatePDF).mockReturnValue(true)
      vi.mocked(extractPDFText).mockResolvedValue({ text: 'test', isScanned: false, needsOCR: false })
      vi.mocked(createStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(uploadPDF).mockResolvedValue('test-path')
      vi.mocked(extractFinancialData).mockResolvedValue(mockFlows as any)
      vi.mocked(insertFlows).mockResolvedValue([] as any)
      vi.mocked(updateStatementStatus).mockResolvedValue(mockStatement as any)
      vi.mocked(generateDiagram).mockResolvedValue({ diagram: mockDiagram, renderMetadata: { width: 1024, height: 1024, format: 'png' }, chartData: { flows: mockFlows.flows } } as any)
      vi.mocked(uploadDiagram).mockResolvedValue('test-path')
      vi.mocked(verifyDiagram)
        .mockResolvedValueOnce(failedVerification as any)
        .mockResolvedValueOnce(passedVerification as any)

      const input: OrchestratorInput = {
        financialStatement: Buffer.from('mock-pdf'),
        format: 'pdf'
      }

      const result = await orchestrate(input)

      expect(result.success).toBe(true)
      expect(generateDiagram).toHaveBeenCalledTimes(2) // Initial + retry
      expect(verifyDiagram).toHaveBeenCalledTimes(2)
    })

    it('should handle extraction errors gracefully', async () => {
      const { validatePDF, extractPDFText } = await import('@/lib/pdf/parser')
      const { extractFinancialData } = await import('@/lib/agents/extraction')
      const { createStatement, updateStatementStatus } = await import('@/lib/supabase/database')
      const { uploadPDF } = await import('@/lib/supabase/storage')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'processing' as const }

      vi.mocked(validatePDF).mockReturnValue(true)
      vi.mocked(extractPDFText).mockResolvedValue({ text: 'test', isScanned: false, needsOCR: false })
      vi.mocked(createStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(uploadPDF).mockResolvedValue('test-path')
      vi.mocked(extractFinancialData).mockRejectedValue(new Error('Extraction failed'))
      vi.mocked(updateStatementStatus).mockResolvedValue({ ...mockStatement, status: 'failed' } as any)

      const input: OrchestratorInput = {
        financialStatement: Buffer.from('mock-pdf'),
        format: 'pdf'
      }

      const result = await orchestrate(input)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('EXTRACTION_ERROR')
      expect(result.error?.stage).toBe('extraction')
      expect(updateStatementStatus).toHaveBeenCalledWith(mockStatement.id, 'failed')
    })

    it('should handle generation errors gracefully', async () => {
      const { validatePDF, extractPDFText } = await import('@/lib/pdf/parser')
      const { extractFinancialData } = await import('@/lib/agents/extraction')
      const { generateDiagram } = await import('@/lib/agents/generation')
      const { createStatement, insertFlows, updateStatementStatus } = await import('@/lib/supabase/database')
      const { uploadPDF } = await import('@/lib/supabase/storage')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'processing' as const }
      const mockFlows = {
        flows: [{ source: 'Revenue', target: 'Expenses', amount: 1000, category: 'revenue' as const }],
        metadata: {
          company: 'Test',
          period: { start: new Date(), end: new Date(), quarter: 1, year: 2024 },
          currency: 'USD',
          statementType: ['Income Statement']
        },
        confidence: 0.95
      }

      vi.mocked(validatePDF).mockReturnValue(true)
      vi.mocked(extractPDFText).mockResolvedValue({ text: 'test', isScanned: false, needsOCR: false })
      vi.mocked(createStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(uploadPDF).mockResolvedValue('test-path')
      vi.mocked(extractFinancialData).mockResolvedValue(mockFlows as any)
      vi.mocked(insertFlows).mockResolvedValue([] as any)
      vi.mocked(updateStatementStatus).mockResolvedValue(mockStatement as any)
      vi.mocked(generateDiagram).mockRejectedValue(new Error('Generation failed'))
      vi.mocked(updateStatementStatus).mockResolvedValue({ ...mockStatement, status: 'failed' } as any)

      const input: OrchestratorInput = {
        financialStatement: Buffer.from('mock-pdf'),
        format: 'pdf'
      }

      const result = await orchestrate(input)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('GENERATION_ERROR')
      expect(result.error?.stage).toBe('generation')
    })

    it('should return partial results on failure', async () => {
      const { validatePDF, extractPDFText } = await import('@/lib/pdf/parser')
      const { extractFinancialData } = await import('@/lib/agents/extraction')
      const { generateDiagram } = await import('@/lib/agents/generation')
      const { createStatement, insertFlows, updateStatementStatus } = await import('@/lib/supabase/database')
      const { uploadPDF } = await import('@/lib/supabase/storage')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'processing' as const }
      const mockFlows = {
        flows: [
          { source: 'Revenue', target: 'Expenses', amount: 1000, category: 'revenue' as const },
          { source: 'Revenue2', target: 'Expenses2', amount: 2000, category: 'revenue' as const }
        ],
        metadata: {
          company: 'Test',
          period: { start: new Date(), end: new Date(), quarter: 1, year: 2024 },
          currency: 'USD',
          statementType: ['Income Statement']
        },
        confidence: 0.95
      }

      vi.mocked(validatePDF).mockReturnValue(true)
      vi.mocked(extractPDFText).mockResolvedValue({ text: 'test', isScanned: false, needsOCR: false })
      vi.mocked(createStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(uploadPDF).mockResolvedValue('test-path')
      vi.mocked(extractFinancialData).mockResolvedValue(mockFlows as any)
      vi.mocked(insertFlows).mockResolvedValue([] as any)
      vi.mocked(updateStatementStatus).mockResolvedValue(mockStatement as any)
      vi.mocked(generateDiagram).mockRejectedValue(new Error('Generation failed'))

      const input: OrchestratorInput = {
        financialStatement: Buffer.from('mock-pdf'),
        format: 'pdf'
      }

      const result = await orchestrate(input)

      expect(result.success).toBe(false)
      expect(result.metadata.flowsExtracted).toBe(2) // Partial result
    })
  })

  describe('executeOrchestration', () => {
    it('should execute orchestration successfully', async () => {
      const { validatePDF, extractPDFText } = await import('@/lib/pdf/parser')
      const { extractFinancialData } = await import('@/lib/agents/extraction')
      const { generateDiagram } = await import('@/lib/agents/generation')
      const { verifyDiagram } = await import('@/lib/agents/verification')
      const { createStatement, insertFlows, createVerification, updateStatementStatus } = await import('@/lib/supabase/database')
      const { uploadPDF, uploadDiagram } = await import('@/lib/supabase/storage')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'processing' as const }
      const mockFlows = {
        flows: [{ source: 'Revenue', target: 'Expenses', amount: 1000, category: 'revenue' as const }],
        metadata: {
          company: 'Test',
          period: { start: new Date(), end: new Date(), quarter: 1, year: 2024 },
          currency: 'USD',
          statementType: ['Income Statement']
        },
        confidence: 0.95
      }
      const mockDiagram = Buffer.from('mock-diagram')
      const mockVerification = {
        verified: true,
        accuracy: 0.999,
        discrepancies: [],
        report: {
          timestamp: new Date(),
          overallAccuracy: 0.999,
          flowsVerified: 1,
          flowsTotal: 1,
          discrepancies: [],
          passed: true,
          confidenceScore: 0.99,
          reasoning: 'All values match',
          valueComparisons: []
        }
      }

      vi.mocked(validatePDF).mockReturnValue(true)
      vi.mocked(extractPDFText).mockResolvedValue({ text: 'test', isScanned: false, needsOCR: false })
      vi.mocked(createStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(uploadPDF).mockResolvedValue('test-path')
      vi.mocked(extractFinancialData).mockResolvedValue(mockFlows as any)
      vi.mocked(insertFlows).mockResolvedValue([] as any)
      vi.mocked(updateStatementStatus).mockResolvedValue(mockStatement as any)
      vi.mocked(generateDiagram).mockResolvedValue({ diagram: mockDiagram, renderMetadata: { width: 1024, height: 1024, format: 'png' }, chartData: { flows: mockFlows.flows } } as any)
      vi.mocked(uploadDiagram).mockResolvedValue('test-path')
      vi.mocked(verifyDiagram).mockResolvedValue(mockVerification as any)
      vi.mocked(createVerification).mockResolvedValue({} as any)

      const input: OrchestratorInput = {
        financialStatement: Buffer.from('mock-pdf'),
        format: 'pdf'
      }

      const result = await executeOrchestration(input)

      expect(result.success).toBe(true)
      expect(result.diagram).toBeInstanceOf(Buffer)
    })
  })
})

