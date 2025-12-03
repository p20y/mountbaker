/**
 * Property Tests: Partial Results on Failure
 * 
 * Property 15: Partial results on persistent failure
 * Validates: Requirements 7.5
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { formatErrorResponse } from '@/lib/formatters/response'
import type { FinancialFlow } from '@/types/models'

/**
 * Generate arbitrary FinancialFlow
 */
function arbitraryFinancialFlow(): fc.Arbitrary<FinancialFlow> {
  return fc.record({
    source: fc.string({ minLength: 1, maxLength: 200 }),
    target: fc.string({ minLength: 1, maxLength: 200 }),
    amount: fc.float({ min: 0, max: 1000000000 }).filter(Number.isFinite),
    category: fc.constantFrom('revenue', 'expense', 'asset', 'liability', 'equity' as const),
    metadata: fc.option(fc.record({
      lineItem: fc.string({ minLength: 1, maxLength: 200 }),
      statementSection: fc.string({ minLength: 1, maxLength: 200 })
    }))
  })
}

describe('Property 15: Partial results on persistent failure', () => {
  it('should include partial results when flows were extracted before failure', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryFinancialFlow(), { minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1 }), // statementId
        fc.string({ minLength: 1 }), // error code
        fc.string({ minLength: 1, maxLength: 500 }), // error message
        fc.constantFrom('parsing', 'extraction', 'generation', 'verification' as const),
        (flows, statementId, errorCode, errorMessage, stage) => {
          const error = {
            code: errorCode,
            message: errorMessage,
            stage
          }

          const partialResults = {
            flows,
            flowsCount: flows.length
          }

          const formatted = formatErrorResponse(error, partialResults, statementId)

          // Should indicate failure
          expect(formatted.success).toBe(false)

          // Should include error details
          expect(formatted.error).toBeDefined()
          expect(formatted.error?.code).toBe(errorCode)
          expect(formatted.error?.message).toBe(errorMessage)
          expect(formatted.error?.stage).toBe(stage)

          // Should include partial results
          expect(formatted.partialResults).toBeDefined()
          expect(formatted.partialResults?.flows).toBeDefined()
          expect(Array.isArray(formatted.partialResults?.flows)).toBe(true)
          expect(formatted.partialResults?.flowsCount).toBe(flows.length)

          // Verification should reflect partial state
          expect(formatted.verification.verified).toBe(false)
          expect(formatted.verification.flowsTotal).toBe(flows.length)
          expect(formatted.verification.flowsVerified).toBe(0) // None verified if failed

          // Metadata should show flows extracted
          expect(formatted.metadata.processing.flowsExtracted).toBe(flows.length)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle partial results with only count (no flow details)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 1000 }), // flowsCount
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (flowsCount, statementId, errorCode) => {
          const error = {
            code: errorCode,
            message: 'Processing failed',
            stage: 'generation' as const
          }

          const partialResults = {
            flowsCount
          }

          const formatted = formatErrorResponse(error, partialResults, statementId)

          // Should include partial results with count
          expect(formatted.partialResults).toBeDefined()
          expect(formatted.partialResults?.flowsCount).toBe(flowsCount)
          expect(formatted.partialResults?.flows).toBeUndefined() // No flow details provided

          // Metadata should reflect count
          expect(formatted.metadata.processing.flowsExtracted).toBe(flowsCount)
          expect(formatted.verification.flowsTotal).toBe(flowsCount)
        }
      ),
      { numRuns: 30 }
    )
  })

  it('should handle errors without partial results', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        fc.string({ minLength: 1 }),
        (statementId, errorCode, errorMessage) => {
          const error = {
            code: errorCode,
            message: errorMessage,
            stage: 'parsing' as const
          }

          const formatted = formatErrorResponse(error, undefined, statementId)

          // Should indicate failure
          expect(formatted.success).toBe(false)

          // Should include error
          expect(formatted.error).toBeDefined()

          // Should not have partial results
          expect(formatted.partialResults).toBeUndefined()

          // Metadata should show zero flows extracted
          expect(formatted.metadata.processing.flowsExtracted).toBe(0)
          expect(formatted.verification.flowsTotal).toBe(0)
        }
      ),
      { numRuns: 30 }
    )
  })

  it('should preserve all flow details in partial results', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryFinancialFlow(), { minLength: 1, maxLength: 50 }),
        (flows) => {
          const error = {
            code: 'EXTRACTION_ERROR',
            message: 'Failed during generation',
            stage: 'generation' as const
          }

          const partialResults = {
            flows,
            flowsCount: flows.length
          }

          const formatted = formatErrorResponse(error, partialResults, 'test-id')

          // Verify all flows are preserved
          expect(formatted.partialResults?.flows).toBeDefined()
          expect(formatted.partialResults?.flows?.length).toBe(flows.length)

          // Verify flow structure is preserved
          if (formatted.partialResults?.flows) {
            formatted.partialResults.flows.forEach((flow, index) => {
              expect(flow.source).toBe(flows[index].source)
              expect(flow.target).toBe(flows[index].target)
              expect(flow.amount).toBe(flows[index].amount)
              expect(flow.category).toBe(flows[index].category)
            })
          }
        }
      ),
      { numRuns: 30 }
    )
  })

  it('should mark error as recoverable when appropriate', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('EXTRACTION_ERROR', 'GENERATION_ERROR', 'VERIFICATION_ERROR', 'UNKNOWN_ERROR'),
        fc.string({ minLength: 1 }),
        (errorCode, errorMessage) => {
          const error = {
            code: errorCode,
            message: errorMessage,
            stage: 'extraction' as const
          }

          const formatted = formatErrorResponse(error, undefined, 'test-id')

          // UNKNOWN_ERROR should not be recoverable
          if (errorCode === 'UNKNOWN_ERROR') {
            expect(formatted.error?.recoverable).toBe(false)
          } else {
            // Other errors should be recoverable
            expect(formatted.error?.recoverable).toBe(true)
          }
        }
      ),
      { numRuns: 20 }
    )
  })
})

