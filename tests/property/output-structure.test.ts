/**
 * Property Tests: Output Structure
 * 
 * Property 14: Complete output structure
 * Validates: Requirements 5.5, 7.1, 7.2, 7.3, 7.4
 */

import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { formatResponse, formatSuccessResponse, formatErrorResponse } from '@/lib/formatters/response'
import type { OrchestratorOutput, VerificationReport, StatementMetadata, FinancialFlow } from '@/types/models'

/**
 * Generate arbitrary VerificationReport
 */
function arbitraryVerificationReport(): fc.Arbitrary<VerificationReport> {
  return fc.record({
    timestamp: fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
    overallAccuracy: fc.float({ min: Math.fround(0), max: Math.fround(1) }).filter(Number.isFinite),
    flowsVerified: fc.integer({ min: 0, max: 1000 }),
    flowsTotal: fc.integer({ min: 1, max: 1000 }),
    discrepancies: fc.array(fc.record({
      flow: fc.string({ minLength: 1 }),
      expected: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000000) }).filter(Number.isFinite),
      actual: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000000) }).filter(Number.isFinite),
      percentageError: fc.float({ min: Math.fround(0), max: Math.fround(100) }).filter(Number.isFinite)
    }), { maxLength: 50 }),
    passed: fc.boolean(),
    confidenceScore: fc.float({ min: Math.fround(0), max: Math.fround(1) }).filter(Number.isFinite),
    reasoning: fc.string({ minLength: 1, maxLength: 5000 }),
    valueComparisons: fc.option(fc.array(fc.record({
      flow: fc.string({ minLength: 1 }),
      diagramValue: fc.float({ min: Math.fround(0), max: Math.fround(1000000000) }).filter(Number.isFinite),
      sourceValue: fc.float({ min: Math.fround(0), max: Math.fround(1000000000) }).filter(Number.isFinite),
      match: fc.boolean(),
      error: fc.option(fc.float({ min: Math.fround(0), max: Math.fround(100) }).filter(Number.isFinite))
    }), { maxLength: 50 }))
  }).map(record => ({
    ...record,
    flowsTotal: Math.max(record.flowsTotal, record.flowsVerified), // Ensure flowsTotal >= flowsVerified
    timestamp: record.timestamp
  }))
}

/**
 * Generate arbitrary StatementMetadata
 */
function arbitraryStatementMetadata(): fc.Arbitrary<StatementMetadata> {
  return fc.record({
    company: fc.string({ minLength: 1, maxLength: 200 }),
    period: fc.record({
      start: fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
      end: fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
      quarter: fc.integer({ min: 1, max: 4 }),
      year: fc.integer({ min: 2000, max: 2100 })
    }).filter(p => p.end >= p.start), // Ensure end >= start
    currency: fc.constantFrom('USD', 'EUR', 'GBP', 'JPY', 'CNY'),
    statementType: fc.array(fc.string({ minLength: 1 }), { minLength: 1, maxLength: 5 })
  })
}

/**
 * Generate arbitrary OrchestratorOutput (success case)
 */
function arbitrarySuccessOutput(): fc.Arbitrary<OrchestratorOutput> {
  return fc.record({
    success: fc.constant(true),
    diagram: fc.uint8Array({ minLength: 100, maxLength: 1000000 }).map(arr => Buffer.from(arr)),
    reasoning: fc.string({ minLength: 1, maxLength: 5000 }),
    accuracy: fc.float({ min: Math.fround(0), max: Math.fround(1) }).filter(Number.isFinite),
    metadata: fc.record({
      processingTime: fc.integer({ min: 0, max: 3600000 }), // 0 to 1 hour in ms
      retries: fc.integer({ min: 0, max: 10 }),
      flowsExtracted: fc.integer({ min: 1, max: 1000 })
    }),
    verificationReport: fc.option(arbitraryVerificationReport()),
    statementMetadata: fc.option(arbitraryStatementMetadata())
  })
}

describe('Property 14: Complete output structure', () => {
  it('should format success response with all required fields', () => {
    fc.assert(
      fc.property(
        arbitrarySuccessOutput(),
        fc.string({ minLength: 1 }), // statementId
        (output, statementId) => {
          const formatted = formatSuccessResponse(
            output,
            statementId,
            output.statementMetadata,
            output.verificationReport
          )

          // Verify structure
          expect(formatted).toHaveProperty('success')
          expect(formatted).toHaveProperty('statementId')
          expect(formatted).toHaveProperty('diagram')
          expect(formatted).toHaveProperty('verification')
          expect(formatted).toHaveProperty('metadata')

          // Verify success flag
          expect(formatted.success).toBe(true)

          // Verify statementId
          expect(formatted.statementId).toBe(statementId)

          // Verify diagram structure
          if (output.diagram.length > 0) {
            expect(formatted.diagram).toBeDefined()
            expect(formatted.diagram?.image).toBeDefined()
            expect(formatted.diagram?.format).toBe('image/png')
            expect(typeof formatted.diagram?.image).toBe('string')
          }

          // Verify verification structure
          expect(formatted.verification).toBeDefined()
          expect(formatted.verification.verified).toBe(output.success)
          expect(formatted.verification.accuracy).toBe(output.accuracy)
          expect(formatted.verification.reasoning).toBe(output.reasoning)
          expect(formatted.verification.flowsVerified).toBeGreaterThanOrEqual(0)
          expect(formatted.verification.flowsTotal).toBeGreaterThanOrEqual(formatted.verification.flowsVerified)
          expect(Array.isArray(formatted.verification.discrepancies)).toBe(true)

          // Verify metadata structure
          expect(formatted.metadata).toBeDefined()
          expect(formatted.metadata.processing).toBeDefined()
          expect(formatted.metadata.processing.time).toBe(output.metadata.processingTime)
          expect(formatted.metadata.processing.retries).toBe(output.metadata.retries)
          expect(formatted.metadata.processing.flowsExtracted).toBe(output.metadata.flowsExtracted)
          expect(typeof formatted.metadata.processing.timeFormatted).toBe('string')

          // Verify statement metadata if provided
          if (output.statementMetadata) {
            expect(formatted.metadata.company).toBe(output.statementMetadata.company)
            expect(formatted.metadata.currency).toBe(output.statementMetadata.currency)
            expect(formatted.metadata.period).toBeDefined()
            expect(formatted.metadata.period?.start).toBe(output.statementMetadata.period.start.toISOString())
            expect(formatted.metadata.period?.end).toBe(output.statementMetadata.period.end.toISOString())
          }

          // Verify no error field on success
          expect(formatted.error).toBeUndefined()
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should include confidence score in verification', () => {
    fc.assert(
      fc.property(
        arbitrarySuccessOutput(),
        fc.string({ minLength: 1 }),
        (output, statementId) => {
          const formatted = formatSuccessResponse(
            output,
            statementId,
            output.statementMetadata,
            output.verificationReport
          )

          // Confidence score should be present
          expect(formatted.verification.confidenceScore).toBeDefined()
          expect(typeof formatted.verification.confidenceScore).toBe('number')
          expect(formatted.verification.confidenceScore).toBeGreaterThanOrEqual(0)
          expect(formatted.verification.confidenceScore).toBeLessThanOrEqual(1)

          // If verification report provided, use its confidence score
          if (output.verificationReport) {
            expect(formatted.verification.confidenceScore).toBe(output.verificationReport.confidenceScore)
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should format processing time as human-readable string', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 3600000 }), // 0 to 1 hour in ms
        (processingTime) => {
          const output: OrchestratorOutput = {
            success: true,
            diagram: Buffer.from('test'),
            reasoning: 'Test',
            accuracy: 0.95,
            metadata: {
              processingTime,
              retries: 0,
              flowsExtracted: 10
            }
          }

          const formatted = formatResponse(output)

          // Time formatted should be a string
          expect(typeof formatted.metadata.processing.timeFormatted).toBe('string')
          expect(formatted.metadata.processing.timeFormatted.length).toBeGreaterThan(0)

          // Should contain time unit (ms, s, m)
          const hasTimeUnit = /(ms|s|m)/.test(formatted.metadata.processing.timeFormatted)
          expect(hasTimeUnit).toBe(true)
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should include value comparisons when available', () => {
    fc.assert(
      fc.property(
        arbitrarySuccessOutput(),
        fc.string({ minLength: 1 }),
        (output, statementId) => {
          // Ensure verification report has value comparisons
          const outputWithComparisons: OrchestratorOutput = {
            ...output,
            verificationReport: {
              timestamp: new Date(),
              overallAccuracy: output.accuracy,
              flowsVerified: output.metadata.flowsExtracted,
              flowsTotal: output.metadata.flowsExtracted,
              discrepancies: [],
              passed: true,
              confidenceScore: 0.95,
              reasoning: output.reasoning,
              valueComparisons: [
                {
                  flow: 'Test Flow',
                  diagramValue: 100,
                  sourceValue: 100,
                  match: true
                }
              ]
            }
          }

          const formatted = formatSuccessResponse(
            outputWithComparisons,
            statementId,
            output.statementMetadata,
            outputWithComparisons.verificationReport
          )

          // Value comparisons should be included
          expect(formatted.verification.valueComparisons).toBeDefined()
          expect(Array.isArray(formatted.verification.valueComparisons)).toBe(true)
          expect(formatted.verification.valueComparisons?.length).toBeGreaterThan(0)
        }
      ),
      { numRuns: 20 }
    )
  })

  it('should handle missing optional fields gracefully', () => {
    fc.assert(
      fc.property(
        fc.record({
          success: fc.constant(true),
          diagram: fc.uint8Array({ minLength: 100 }).map(arr => Buffer.from(arr)),
          reasoning: fc.string({ minLength: 1 }),
          accuracy: fc.float({ min: 0, max: 1 }).filter(Number.isFinite),
          metadata: fc.record({
            processingTime: fc.integer({ min: 0 }),
            retries: fc.integer({ min: 0 }),
            flowsExtracted: fc.integer({ min: 1 })
          })
        }),
        fc.string({ minLength: 1 }),
        (output, statementId) => {
          const orchestratorOutput: OrchestratorOutput = {
            ...output,
            verificationReport: undefined,
            statementMetadata: undefined
          }

          const formatted = formatSuccessResponse(
            orchestratorOutput,
            statementId,
            undefined,
            undefined
          )

          // Should still have all required fields
          expect(formatted.success).toBe(true)
          expect(formatted.verification).toBeDefined()
          expect(formatted.metadata).toBeDefined()

          // Optional fields should be undefined or have defaults
          expect(formatted.metadata.company).toBeUndefined()
          expect(formatted.metadata.period).toBeUndefined()
          expect(formatted.verification.confidenceScore).toBeGreaterThanOrEqual(0)
        }
      ),
      { numRuns: 30 }
    )
  })
})

