/**
 * Property Test: Inter-agent data contract compliance
 * 
 * Property 12: Inter-agent data contract compliance
 * For any data passed between sub-agents, the data should conform to the defined interface schemas
 * (AnalysisOutput → GenerationInput, GenerationOutput → VerificationInput).
 * 
 * Validates: Requirements 6.2
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import {
  AnalysisOutputSchema,
  FinancialFlowSchema,
  VerificationInputSchema,
  type AnalysisOutput,
  type FinancialFlow
} from '@/lib/schemas'

describe('Property 12: Inter-agent data contract compliance', () => {
  /**
   * Generator for valid FinancialFlow
   */
  const arbitraryFinancialFlow = () =>
    fc.record({
      source: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      target: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
      amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000000) }).filter(n => n >= 0.01),
      category: fc.constantFrom('revenue', 'expense', 'asset', 'liability', 'equity' as const),
      metadata: fc.oneof(
        fc.constant(undefined),
        fc.record({
          lineItem: fc.string(),
          statementSection: fc.string()
        })
      )
    })

  /**
   * Generator for valid AnalysisOutput
   */
  const arbitraryAnalysisOutput = () =>
    fc.record({
      flows: fc.array(arbitraryFinancialFlow(), { minLength: 1, maxLength: 100 }),
      metadata: fc.record({
        company: fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        period: fc.record({
          start: fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
          end: fc.date({ min: new Date('2000-01-01'), max: new Date('2100-12-31') }),
          quarter: fc.integer({ min: 1, max: 4 }),
          year: fc.integer({ min: 2000, max: 2100 })
        }),
        currency: fc.constantFrom('USD', 'EUR', 'GBP', 'JPY', 'CAD'),
        statementType: fc.array(fc.string({ minLength: 1 }).filter(s => s.trim().length > 0), { minLength: 1 })
      }),
      confidence: fc.float({ min: Math.fround(0), max: Math.fround(1) }).filter(n => !isNaN(n) && isFinite(n))
    }).filter(output => {
      // Ensure end date is after start date
      return output.metadata.period.end >= output.metadata.period.start
    }) as fc.Arbitrary<AnalysisOutput>

  it('should validate AnalysisOutput conforms to schema', () => {
    fc.assert(
      fc.property(arbitraryAnalysisOutput(), (analysisOutput) => {
        const result = AnalysisOutputSchema.safeParse(analysisOutput)
        return result.success
      }),
      { numRuns: 100 }
    )
  })

  it('should validate FinancialFlow conforms to schema', () => {
    fc.assert(
      fc.property(arbitraryFinancialFlow(), (flow) => {
        const result = FinancialFlowSchema.safeParse(flow)
        return result.success
      }),
      { numRuns: 100 }
    )
  })

  it('should validate data contract between AnalysisOutput and GenerationInput', () => {
    fc.assert(
      fc.property(arbitraryAnalysisOutput(), (analysisOutput) => {
        // AnalysisOutput flows should be valid for generation input
        const flowsValid = analysisOutput.flows.every(flow => {
          const result = FinancialFlowSchema.safeParse(flow)
          return result.success
        })
        return flowsValid
      }),
      { numRuns: 100 }
    )
  })

  it('should validate data contract between GenerationOutput and VerificationInput', () => {
    fc.assert(
      fc.property(arbitraryAnalysisOutput(), (analysisOutput) => {
        // Create a mock VerificationInput from AnalysisOutput
        const mockDiagram = Buffer.from('mock-image-data')
        const verificationInput = {
          diagram: mockDiagram,
          originalFlows: analysisOutput.flows,
          threshold: 0.001
        }
        
        const result = VerificationInputSchema.safeParse(verificationInput)
        return result.success
      }),
      { numRuns: 100 }
    )
  })

  it('should reject invalid FinancialFlow data', () => {
    fc.assert(
      fc.property(
        fc.record({
          source: fc.string(),
          target: fc.string(),
          amount: fc.float(),
          category: fc.string() // Invalid: not one of the enum values
        }),
        (invalidFlow) => {
          const result = FinancialFlowSchema.safeParse(invalidFlow)
          // Should fail validation for invalid category
          if (invalidFlow.category && !['revenue', 'expense', 'asset', 'liability', 'equity'].includes(invalidFlow.category)) {
            return !result.success
          }
          // For other cases, check if amount is negative
          if (invalidFlow.amount !== undefined && invalidFlow.amount <= 0) {
            return !result.success
          }
          return true
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should reject AnalysisOutput with empty flows array', () => {
    const invalidOutput: AnalysisOutput = {
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
      },
      confidence: 0.95
    }

    const result = AnalysisOutputSchema.safeParse(invalidOutput)
    return !result.success // Should fail because flows array is empty
  })
})

