/**
 * Unit tests for database operations
 * 
 * Tests statement CRUD operations, flow data insertion and retrieval,
 * and verification record creation.
 * 
 * Requirements: 7.2
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createStatement,
  getStatement,
  updateStatementStatus,
  insertFlows,
  getFlows,
  createVerification,
  getVerification,
  deleteStatement
} from '@/lib/supabase/database'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  supabaseAdmin: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              single: vi.fn()
            }))
          }))
        })),
        order: vi.fn()
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn()
          }))
        }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn()
      }))
    }))
  }
}))

describe('Database Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Statement CRUD operations', () => {
    it('should create a statement', async () => {
      const mockStatement = {
        id: '123',
        filename: 'test.pdf',
        status: 'pending' as const,
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockInsert = {
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({ data: mockStatement, error: null })
        }))
      }
      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnValue(mockInsert)
      }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await createStatement({
        filename: 'test.pdf',
        status: 'pending'
      })

      expect(result).toEqual(mockStatement)
      expect(supabaseAdmin.from).toHaveBeenCalledWith('statements')
    })

    it('should get a statement by ID', async () => {
      const mockStatement = {
        id: '123',
        filename: 'test.pdf',
        status: 'completed' as const,
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockSingle = vi.fn().mockResolvedValue({ data: mockStatement, error: null })
      const mockEq = vi.fn(() => ({ single: mockSingle }))
      const mockSelect = vi.fn(() => ({ eq: mockEq }))
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await getStatement('123')

      expect(result).toEqual(mockStatement)
      expect(mockEq).toHaveBeenCalledWith('id', '123')
    })

    it('should return null for non-existent statement', async () => {
      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Not found' }
      })
      const mockEq = vi.fn(() => ({ single: mockSingle }))
      const mockSelect = vi.fn(() => ({ eq: mockEq }))
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await getStatement('nonexistent')

      expect(result).toBeNull()
    })

    it('should update statement status', async () => {
      const mockStatement = {
        id: '123',
        filename: 'test.pdf',
        status: 'processing' as const,
        user_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockSingle = vi.fn().mockResolvedValue({ data: mockStatement, error: null })
      const mockSelect = vi.fn(() => ({ single: mockSingle }))
      const mockEq = vi.fn(() => ({ select: mockSelect }))
      const mockUpdate = vi.fn(() => ({ eq: mockEq }))
      const mockFrom = vi.fn(() => ({ update: mockUpdate }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await updateStatementStatus('123', 'processing')

      expect(result.status).toBe('processing')
      expect(mockUpdate).toHaveBeenCalled()
    })
  })

  describe('Flow data operations', () => {
    it('should insert flows for a statement', async () => {
      const mockFlows = [
        {
          id: '1',
          statement_id: '123',
          source: 'Revenue',
          target: 'Expenses',
          amount: 1000,
          category: 'revenue' as const,
          line_item: null,
          statement_section: null,
          created_at: new Date().toISOString()
        }
      ]

      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockSelect = vi.fn().mockResolvedValue({ data: mockFlows, error: null })
      const mockInsert = vi.fn(() => ({ select: mockSelect }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await insertFlows('123', [
        {
          source: 'Revenue',
          target: 'Expenses',
          amount: 1000,
          category: 'revenue'
        }
      ])

      expect(result).toEqual(mockFlows)
      expect(mockInsert).toHaveBeenCalled()
    })

    it('should get flows for a statement', async () => {
      const mockFlows = [
        {
          id: '1',
          statement_id: '123',
          source: 'Revenue',
          target: 'Expenses',
          amount: 1000,
          category: 'revenue' as const,
          line_item: null,
          statement_section: null,
          created_at: new Date().toISOString()
        }
      ]

      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockOrder = vi.fn().mockResolvedValue({ data: mockFlows, error: null })
      const mockEq = vi.fn(() => ({ order: mockOrder }))
      const mockSelect = vi.fn(() => ({ eq: mockEq }))
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await getFlows('123')

      expect(result).toEqual(mockFlows)
      expect(mockEq).toHaveBeenCalledWith('statement_id', '123')
    })
  })

  describe('Verification operations', () => {
    it('should create a verification record', async () => {
      const mockVerification = {
        id: '1',
        statement_id: '123',
        accuracy: 0.99,
        verified: true,
        reasoning: 'All values match',
        flows_verified: 10,
        flows_total: 10,
        discrepancies: null,
        value_comparisons: null,
        created_at: new Date().toISOString()
      }

      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockSingle = vi.fn().mockResolvedValue({ data: mockVerification, error: null })
      const mockSelect = vi.fn(() => ({ single: mockSingle }))
      const mockInsert = vi.fn(() => ({ select: mockSelect }))
      const mockFrom = vi.fn(() => ({ insert: mockInsert }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await createVerification({
        statement_id: '123',
        accuracy: 0.99,
        verified: true,
        reasoning: 'All values match',
        flows_verified: 10,
        flows_total: 10
      })

      expect(result).toEqual(mockVerification)
    })

    it('should get verification for a statement', async () => {
      const mockVerification = {
        id: '1',
        statement_id: '123',
        accuracy: 0.99,
        verified: true,
        reasoning: 'All values match',
        flows_verified: 10,
        flows_total: 10,
        discrepancies: null,
        value_comparisons: null,
        created_at: new Date().toISOString()
      }

      const { supabaseAdmin } = await import('@/lib/supabase/server')
      const mockSingle = vi.fn().mockResolvedValue({ data: mockVerification, error: null })
      const mockLimit = vi.fn(() => ({ single: mockSingle }))
      const mockOrder = vi.fn(() => ({ limit: mockLimit }))
      const mockEq = vi.fn(() => ({ order: mockOrder }))
      const mockSelect = vi.fn(() => ({ eq: mockEq }))
      const mockFrom = vi.fn(() => ({ select: mockSelect }))
      vi.mocked(supabaseAdmin.from).mockImplementation(mockFrom as any)

      const result = await getVerification('123')

      expect(result).toEqual(mockVerification)
    })
  })
})

