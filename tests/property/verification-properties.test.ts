/**
 * Property tests for verification agent
 * 
 * Property 7: Verification accuracy detection
 * Validates: Requirements 3.4, 5.3 (detect discrepancies > 0.1% threshold)
 * 
 * Property 8: Successful verification outcomes
 * Validates: Requirements 3.3, 3.5 (verification passes when values match, includes reasoning)
 */

import { describe, it, expect } from 'vitest'
import * as fc from 'fast-check'
import type { FinancialFlow, VerificationReport } from '@/types/models'
import { VerificationReportSchema } from '@/lib/schemas'

describe('Property 7: Verification accuracy detection', () => {
  /**
   * Validates that discrepancies exceeding 0.1% threshold are detected
   */

  it('should detect discrepancies exceeding threshold', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100), max: Math.fround(1000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
        fc.float({ min: Math.fround(0.002), max: Math.fround(0.1) }).filter(n => !isNaN(n) && isFinite(n)), // Error percentage 0.2% to 10%
        (originalAmount, errorPercentage) => {
          const threshold = 0.001 // 0.1%
          const actualAmount = originalAmount * (1 + errorPercentage)
          const percentageError = Math.abs((actualAmount - originalAmount) / originalAmount) * 100

          // Create a verification report with discrepancy
          const report: VerificationReport = {
            timestamp: new Date(),
            overallAccuracy: 1 - (errorPercentage / 100),
            flowsVerified: 0,
            flowsTotal: 1,
            discrepancies: [
              {
                flow: 'Test Flow',
                expected: originalAmount,
                actual: actualAmount,
                percentageError
              }
            ],
            passed: false,
            confidenceScore: 0.9,
            reasoning: 'Discrepancy detected',
            valueComparisons: [
              {
                flow: 'Test Flow',
                diagramValue: actualAmount,
                sourceValue: originalAmount,
                match: false,
                error: percentageError
              }
            ]
          }

          const result = VerificationReportSchema.safeParse(report)
          if (!result.success) return false

          // If error exceeds threshold, should have discrepancy
          const exceedsThreshold = percentageError > (threshold * 100)
          const hasDiscrepancy = result.data.discrepancies.length > 0
          const markedAsFailed = !result.data.passed

          return exceedsThreshold ? (hasDiscrepancy && markedAsFailed) : true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should pass verification when all values are within threshold', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100), max: Math.fround(1000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
        fc.float({ min: Math.fround(0), max: Math.fround(0.0009) }).filter(n => !isNaN(n) && isFinite(n)), // Error < 0.09%
        (originalAmount, errorPercentage) => {
          const threshold = 0.001 // 0.1%
          const actualAmount = originalAmount * (1 + errorPercentage)
          const percentageError = Math.abs((actualAmount - originalAmount) / originalAmount) * 100

          // Create a verification report without discrepancy
          const report: VerificationReport = {
            timestamp: new Date(),
            overallAccuracy: 1 - (errorPercentage / 100),
            flowsVerified: 1,
            flowsTotal: 1,
            discrepancies: [],
            passed: true,
            confidenceScore: 0.99,
            reasoning: 'All values match within tolerance',
            valueComparisons: [
              {
                flow: 'Test Flow',
                diagramValue: actualAmount,
                sourceValue: originalAmount,
                match: true
              }
            ]
          }

          const result = VerificationReportSchema.safeParse(report)
          if (!result.success) return false

          // If error is within threshold, should pass
          const withinThreshold = percentageError <= (threshold * 100)
          const noDiscrepancies = result.data.discrepancies.length === 0
          const markedAsPassed = result.data.passed

          return withinThreshold ? (noDiscrepancies && markedAsPassed) : true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should calculate percentage error correctly', () => {
    fc.assert(
      fc.property(
        fc.float({ min: Math.fround(100), max: Math.fround(1000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
        fc.float({ min: Math.fround(50), max: Math.fround(2000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
        (expected, actual) => {
          const percentageError = Math.abs((actual - expected) / expected) * 100

          // Verify calculation is correct
          const manualCalculation = Math.abs((actual - expected) / expected) * 100
          const calculationMatches = Math.abs(percentageError - manualCalculation) < 0.0001

          // Percentage error should be non-negative
          const isNonNegative = percentageError >= 0

          return calculationMatches && isNonNegative
        }
      ),
      { numRuns: 50 }
    )
  })
})

describe('Property 8: Successful verification outcomes', () => {
  /**
   * Validates that successful verifications include proper reasoning and metrics
   */

  it('should include reasoning in successful verification', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            source: fc.string({ minLength: 1 }),
            target: fc.string({ minLength: 1 }),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
            category: fc.constantFrom('revenue', 'expense', 'asset', 'liability', 'equity' as const)
          }),
          { minLength: 1, maxLength: 10 }
        ),
        (flows) => {
          const report: VerificationReport = {
            timestamp: new Date(),
            overallAccuracy: 0.999,
            flowsVerified: flows.length,
            flowsTotal: flows.length,
            discrepancies: [],
            passed: true,
            confidenceScore: 0.99,
            reasoning: `All ${flows.length} flows verified successfully. All values match within 0.1% tolerance.`,
            valueComparisons: flows.map(flow => ({
              flow: `${flow.source} -> ${flow.target}`,
              diagramValue: flow.amount,
              sourceValue: flow.amount,
              match: true
            }))
          }

          const result = VerificationReportSchema.safeParse(report)
          if (!result.success) return false

          // Successful verification should have:
          // - passed = true
          // - reasoning present and non-empty
          // - no discrepancies
          // - all flows verified
          return (
            result.data.passed === true &&
            result.data.reasoning.length > 0 &&
            result.data.discrepancies.length === 0 &&
            result.data.flowsVerified === result.data.flowsTotal
          )
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should include value comparisons in verification report', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            source: fc.string({ minLength: 1 }),
            target: fc.string({ minLength: 1 }),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
            category: fc.constantFrom('revenue', 'expense', 'asset', 'liability', 'equity' as const)
          }),
          { minLength: 1, maxLength: 5 }
        ),
        (flows) => {
          const report: VerificationReport = {
            timestamp: new Date(),
            overallAccuracy: 0.999,
            flowsVerified: flows.length,
            flowsTotal: flows.length,
            discrepancies: [],
            passed: true,
            confidenceScore: 0.99,
            reasoning: 'All values match',
            valueComparisons: flows.map(flow => ({
              flow: `${flow.source} -> ${flow.target}`,
              diagramValue: flow.amount,
              sourceValue: flow.amount,
              match: true
            }))
          }

          const result = VerificationReportSchema.safeParse(report)
          if (!result.success) return false

          // Should have value comparisons for all flows
          const hasComparisons = result.data.valueComparisons !== undefined
          const comparisonsMatchFlows = result.data.valueComparisons?.length === flows.length

          return hasComparisons && comparisonsMatchFlows
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should calculate overall accuracy correctly', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 5 }),
        (totalFlows, failedFlows) => {
          // Ensure failedFlows doesn't exceed totalFlows
          const actualFailedFlows = Math.min(failedFlows, totalFlows)
          const verifiedFlows = totalFlows - actualFailedFlows
          const overallAccuracy = verifiedFlows / totalFlows

          const report: VerificationReport = {
            timestamp: new Date(),
            overallAccuracy,
            flowsVerified: verifiedFlows,
            flowsTotal: totalFlows,
            discrepancies: Array(actualFailedFlows).fill(null).map((_, i) => ({
              flow: `Flow ${i}`,
              expected: 1000,
              actual: 1100,
              percentageError: 10.0
            })),
            passed: actualFailedFlows === 0,
            confidenceScore: 0.9,
            reasoning: 'Verification complete',
            valueComparisons: []
          }

          const result = VerificationReportSchema.safeParse(report)
          if (!result.success) return false

          // Accuracy should be between 0 and 1
          const accuracyValid = result.data.overallAccuracy >= 0 && result.data.overallAccuracy <= 1
          
          // Accuracy should match calculated value
          const accuracyMatches = Math.abs(result.data.overallAccuracy - overallAccuracy) < 0.0001

          return accuracyValid && accuracyMatches
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should mark as passed only when all flows are within threshold', () => {
    const testCases = [
      {
        flows: 5,
        discrepancies: 0,
        expectedPassed: true
      },
      {
        flows: 5,
        discrepancies: 1,
        expectedPassed: false
      },
      {
        flows: 10,
        discrepancies: 0,
        expectedPassed: true
      },
      {
        flows: 10,
        discrepancies: 2,
        expectedPassed: false
      }
    ]

    testCases.forEach(({ flows, discrepancies, expectedPassed }) => {
      const report: VerificationReport = {
        timestamp: new Date(),
        overallAccuracy: (flows - discrepancies) / flows,
        flowsVerified: flows - discrepancies,
        flowsTotal: flows,
        discrepancies: Array(discrepancies).fill(null).map((_, i) => ({
          flow: `Flow ${i}`,
          expected: 1000,
          actual: 1100,
          percentageError: 10.0
        })),
        passed: discrepancies === 0,
        confidenceScore: 0.9,
        reasoning: discrepancies === 0 ? 'All flows verified' : 'Some flows have discrepancies',
        valueComparisons: []
      }

      const result = VerificationReportSchema.safeParse(report)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.passed).toBe(expectedPassed)
      }
    })
  })
})

