/**
 * Unit tests for API endpoints
 * 
 * Tests file upload, processing, and results endpoints.
 * 
 * Requirements: 1.1, 1.4, 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST as uploadPOST } from '@/app/api/upload/route'
import { POST as processPOST } from '@/app/api/process/route'
import { GET as resultsGET } from '@/app/api/results/[id]/route'

// Mock dependencies
vi.mock('@/lib/pdf/parser', () => ({
  validatePDF: vi.fn()
}))

vi.mock('@/lib/supabase/storage', () => ({
  uploadPDF: vi.fn(),
  getPDFUrl: vi.fn(),
  getDiagramUrl: vi.fn()
}))

vi.mock('@/lib/supabase/database', () => ({
  createStatement: vi.fn(),
  getStatement: vi.fn(),
  updateStatementStatus: vi.fn(),
  getFlows: vi.fn(),
  getVerification: vi.fn()
}))

vi.mock('@/lib/agents/orchestrator', () => ({
  orchestrate: vi.fn()
}))

describe('API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('POST /api/upload', () => {
    it('should upload valid PDF file', async () => {
      const { validatePDF } = await import('@/lib/pdf/parser')
      const { uploadPDF } = await import('@/lib/supabase/storage')
      const { createStatement } = await import('@/lib/supabase/database')

      const mockFile = new File(['mock pdf content'], 'test.pdf', { type: 'application/pdf' })
      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'pending' as const }

      vi.mocked(validatePDF).mockReturnValue(true)
      vi.mocked(createStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(uploadPDF).mockResolvedValue('test/path.pdf')

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadPOST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.statementId).toBe('test-id')
      expect(validatePDF).toHaveBeenCalled()
      expect(createStatement).toHaveBeenCalled()
      expect(uploadPDF).toHaveBeenCalled()
    })

    it('should reject non-PDF files', async () => {
      const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadPOST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid file type')
      expect(response.status).toBe(400)
    })

    it('should reject files exceeding size limit', async () => {
      // Create a file larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024)
      const mockFile = new File([largeContent], 'test.pdf', { type: 'application/pdf' })

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadPOST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('File size exceeds')
      expect(response.status).toBe(400)
    })

    it('should reject invalid PDF files', async () => {
      const { validatePDF } = await import('@/lib/pdf/parser')

      const mockFile = new File(['invalid content'], 'test.pdf', { type: 'application/pdf' })

      vi.mocked(validatePDF).mockImplementation(() => {
        throw new Error('Invalid PDF file')
      })

      const formData = new FormData()
      formData.append('file', mockFile)

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadPOST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('Invalid PDF file')
      expect(response.status).toBe(400)
    })

    it('should reject requests without file', async () => {
      const formData = new FormData()

      const request = new Request('http://localhost/api/upload', {
        method: 'POST',
        body: formData
      })

      const response = await uploadPOST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('No file provided')
      expect(response.status).toBe(400)
    })
  })

  describe('POST /api/process', () => {
    it('should process statement successfully', async () => {
      const { getStatement, updateStatementStatus } = await import('@/lib/supabase/database')
      const { getPDFUrl } = await import('@/lib/supabase/storage')
      const { orchestrate } = await import('@/lib/agents/orchestrator')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'pending' as const }
      const mockOrchestratorResult = {
        success: true,
        diagram: Buffer.from('diagram'),
        reasoning: 'All values match',
        accuracy: 0.999,
        metadata: { processingTime: 1000, retries: 0, flowsExtracted: 5 }
      }

      vi.mocked(getStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(updateStatementStatus).mockResolvedValue(mockStatement as any)
      vi.mocked(getPDFUrl).mockResolvedValue('https://example.com/pdf.pdf')
      
      // Mock fetch for PDF download
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8)
      } as any)

      vi.mocked(orchestrate).mockResolvedValue(mockOrchestratorResult as any)

      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId: 'test-id' })
      })

      const response = await processPOST(request)
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.processing.completed).toBe(true)
      expect(data.processing.accuracy).toBe(0.999)
      expect(orchestrate).toHaveBeenCalled()
    })

    it('should reject requests without statementId', async () => {
      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      const response = await processPOST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('statementId is required')
      expect(response.status).toBe(400)
    })

    it('should handle processing errors', async () => {
      const { getStatement } = await import('@/lib/supabase/database')
      const { getPDFUrl } = await import('@/lib/supabase/storage')
      const { orchestrate } = await import('@/lib/agents/orchestrator')

      const mockStatement = { id: 'test-id', filename: 'test.pdf', status: 'pending' as const }

      vi.mocked(getStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(getPDFUrl).mockResolvedValue('https://example.com/pdf.pdf')
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8)
      } as any)

      vi.mocked(orchestrate).mockRejectedValue(new Error('Processing failed'))

      const request = new Request('http://localhost/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId: 'test-id' })
      })

      const response = await processPOST(request)
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('Processing failed')
      expect(response.status).toBe(500)
    })
  })

  describe('GET /api/results/:id', () => {
    it('should retrieve results successfully', async () => {
      const { getStatement, getFlows, getVerification } = await import('@/lib/supabase/database')
      const { getDiagramUrl, getPDFUrl } = await import('@/lib/supabase/storage')

      const mockStatement = {
        id: 'test-id',
        filename: 'test.pdf',
        status: 'completed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const mockFlows = [
        {
          id: 'flow-1',
          statement_id: 'test-id',
          source: 'Revenue',
          target: 'Expenses',
          amount: 1000,
          category: 'revenue' as const,
          line_item: null,
          statement_section: null,
          created_at: new Date().toISOString()
        }
      ]
      const mockVerification = {
        id: 'ver-1',
        statement_id: 'test-id',
        accuracy: 0.999,
        verified: true,
        reasoning: 'All values match',
        flows_verified: 1,
        flows_total: 1,
        discrepancies: null,
        value_comparisons: null,
        created_at: new Date().toISOString()
      }

      vi.mocked(getStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(getFlows).mockResolvedValue(mockFlows as any)
      vi.mocked(getVerification).mockResolvedValue(mockVerification as any)
      vi.mocked(getDiagramUrl).mockResolvedValue('https://example.com/diagram.png')
      vi.mocked(getPDFUrl).mockResolvedValue('https://example.com/pdf.pdf')

      const request = new Request('http://localhost/api/results/test-id')
      const response = await resultsGET(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.statement.id).toBe('test-id')
      expect(data.flows).toHaveLength(1)
      expect(data.verification).toBeDefined()
      expect(data.verification.verified).toBe(true)
      expect(data.urls.diagram).toBeDefined()
    })

    it('should return 404 for non-existent statement', async () => {
      const { getStatement } = await import('@/lib/supabase/database')

      vi.mocked(getStatement).mockResolvedValue(null)

      const request = new Request('http://localhost/api/results/non-existent')
      const response = await resultsGET(request, { params: { id: 'non-existent' } })
      const data = await response.json()

      expect(data.success).toBe(false)
      expect(data.error).toContain('Statement not found')
      expect(response.status).toBe(404)
    })

    it('should handle missing diagram gracefully', async () => {
      const { getStatement, getFlows, getVerification } = await import('@/lib/supabase/database')
      const { getDiagramUrl, getPDFUrl } = await import('@/lib/supabase/storage')

      const mockStatement = {
        id: 'test-id',
        filename: 'test.pdf',
        status: 'completed' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      vi.mocked(getStatement).mockResolvedValue(mockStatement as any)
      vi.mocked(getFlows).mockResolvedValue([])
      vi.mocked(getVerification).mockResolvedValue(null)
      vi.mocked(getDiagramUrl).mockRejectedValue(new Error('Not found'))
      vi.mocked(getPDFUrl).mockResolvedValue('https://example.com/pdf.pdf')

      const request = new Request('http://localhost/api/results/test-id')
      const response = await resultsGET(request, { params: { id: 'test-id' } })
      const data = await response.json()

      expect(data.success).toBe(true)
      expect(data.urls.diagram).toBeNull()
    })
  })
})

