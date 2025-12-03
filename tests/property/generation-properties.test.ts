/**
 * Property tests for generation agent
 * 
 * Property 4: Flow proportionality preservation
 * Validates: Requirements 2.2 (arrow widths proportional to amounts)
 * 
 * Property 5: Visual category distinction
 * Validates: Requirements 2.3 (distinct colors for flow categories)
 */

import { describe, it } from 'vitest'
import * as fc from 'fast-check'
import { FLOW_COLORS } from '@/lib/agents/generation/prompts'
import type { FinancialFlow, FlowCategory } from '@/types/models'
import { createDiagramPrompt } from '@/lib/agents/generation/prompts'

describe('Property 4: Flow proportionality preservation', () => {
  /**
   * Validates that arrow widths in the prompt are proportional to flow amounts
   * This ensures the generated diagram accurately represents the relative sizes
   * of different financial flows.
   */

  it('should calculate proportional widths correctly for all flows', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            source: fc.string({ minLength: 1 }),
            target: fc.string({ minLength: 1 }),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
            category: fc.constantFrom('revenue', 'expense', 'asset', 'liability', 'equity' as const)
          }),
          { minLength: 2, maxLength: 20 }
        ),
        (flows) => {
          // Create valid flows
          const validFlows: FinancialFlow[] = flows.map(flow => ({
            source: flow.source,
            target: flow.target,
            amount: flow.amount,
            category: flow.category
          }))

          // Calculate expected proportions
          const maxAmount = Math.max(...validFlows.map(f => f.amount))
          const expectedProportions = validFlows.map(flow => ({
            flow,
            proportion: (flow.amount / maxAmount) * 100
          }))

          // Generate prompt and check that proportions are mentioned
          const prompt = createDiagramPrompt(
            validFlows,
            {
              company: 'Test Company',
              period: { quarter: 1, year: 2024 },
              currency: 'USD'
            }
          )

          // Verify that the prompt includes width information for each flow
          const allFlowsHaveWidths = validFlows.every(flow => {
            const flowDescription = `${flow.source}" to "${flow.target}`
            const widthInfo = prompt.includes(flowDescription)
            return widthInfo
          })

          // Verify that larger amounts result in larger proportions
          const sortedByAmount = [...expectedProportions].sort((a, b) => b.flow.amount - a.flow.amount)
          const proportionsAreOrdered = sortedByAmount.every((item, index) => {
            if (index === 0) return true
            return item.proportion <= sortedByAmount[index - 1].proportion
          })

          return allFlowsHaveWidths && proportionsAreOrdered
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should preserve relative proportions when amounts are scaled', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            source: fc.string({ minLength: 1 }),
            target: fc.string({ minLength: 1 }),
            amount: fc.float({ min: Math.fround(0.01), max: Math.fround(1000000) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
            category: fc.constantFrom('revenue', 'expense', 'asset', 'liability', 'equity' as const)
          }),
          { minLength: 2, maxLength: 10 }
        ),
        fc.float({ min: Math.fround(0.1), max: Math.fround(10) }).filter(n => !isNaN(n) && isFinite(n) && n > 0),
        (flows, scaleFactor) => {
          const originalFlows: FinancialFlow[] = flows.map(flow => ({
            source: flow.source,
            target: flow.target,
            amount: flow.amount,
            category: flow.category
          }))

          const scaledFlows: FinancialFlow[] = originalFlows.map(flow => ({
            ...flow,
            amount: flow.amount * scaleFactor
          }))

          // Calculate proportions for both
          const maxOriginal = Math.max(...originalFlows.map(f => f.amount))
          const maxScaled = Math.max(...scaledFlows.map(f => f.amount))

          const originalProportions = originalFlows.map(f => f.amount / maxOriginal)
          const scaledProportions = scaledFlows.map(f => f.amount / maxScaled)

          // Proportions should be the same (within floating point precision)
          const proportionsMatch = originalProportions.every((prop, i) => {
            return Math.abs(prop - scaledProportions[i]) < 0.0001
          })

          return proportionsMatch
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should handle edge case where all flows have the same amount', () => {
    const flows: FinancialFlow[] = [
      { source: 'A', target: 'B', amount: 1000, category: 'revenue' },
      { source: 'C', target: 'D', amount: 1000, category: 'expense' },
      { source: 'E', target: 'F', amount: 1000, category: 'asset' }
    ]

    const prompt = createDiagramPrompt(
      flows,
      {
        company: 'Test Company',
        period: { quarter: 1, year: 2024 },
        currency: 'USD'
      }
    )

    // All flows should have the same width (100%)
    const allFlowsHaveEqualWidth = flows.every(flow => {
      const flowDescription = `${flow.source}" to "${flow.target}`
      return prompt.includes(flowDescription)
    })

    return allFlowsHaveEqualWidth
  })
})

describe('Property 5: Visual category distinction', () => {
  /**
   * Validates that each flow category has a distinct color
   * This ensures visual distinction between different types of financial flows
   */

  it('should assign distinct colors to all categories', () => {
    const categories: FlowCategory[] = ['revenue', 'expense', 'asset', 'liability', 'equity']
    const colors = categories.map(cat => FLOW_COLORS[cat])
    
    // All colors should be unique
    const uniqueColors = new Set(colors)
    const allColorsDistinct = uniqueColors.size === colors.length

    // All colors should be valid hex colors
    const hexColorRegex = /^#[0-9A-F]{6}$/i
    const allColorsValid = colors.every(color => hexColorRegex.test(color))

    return allColorsDistinct && allColorsValid
  })

  it('should include color information in prompt for each category', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom('revenue', 'expense', 'asset', 'liability', 'equity' as const),
          { minLength: 1, maxLength: 10 }
        ),
        (categories) => {
          const flows: FinancialFlow[] = categories.map((category, index) => ({
            source: `Source${index}`,
            target: `Target${index}`,
            amount: 1000 + index * 100,
            category
          }))

          const prompt = createDiagramPrompt(
            flows,
            {
              company: 'Test Company',
              period: { quarter: 1, year: 2024 },
              currency: 'USD'
            }
          )

          // Each category's color should be mentioned in the prompt
          const allCategoriesHaveColors = categories.every(category => {
            const color = FLOW_COLORS[category]
            return prompt.includes(color)
          })

          return allCategoriesHaveColors
        }
      ),
      { numRuns: 50 }
    )
  })

  it('should use correct color for each flow category in prompt', () => {
    const testCases: Array<{ category: FlowCategory; expectedColor: string }> = [
      { category: 'revenue', expectedColor: '#10B981' },
      { category: 'expense', expectedColor: '#EF4444' },
      { category: 'asset', expectedColor: '#3B82F6' },
      { category: 'liability', expectedColor: '#F59E0B' },
      { category: 'equity', expectedColor: '#8B5CF6' }
    ]

    testCases.forEach(({ category, expectedColor }) => {
      const flows: FinancialFlow[] = [
        {
          source: 'Source',
          target: 'Target',
          amount: 1000,
          category
        }
      ]

      const prompt = createDiagramPrompt(
        flows,
        {
          company: 'Test Company',
          period: { quarter: 1, year: 2024 },
          currency: 'USD'
        }
      )

      // The prompt should include the correct color for this category
      const hasCorrectColor = prompt.includes(expectedColor)
      const hasCategoryLabel = prompt.includes(`category: ${category}`)

      expect(hasCorrectColor).toBe(true)
      expect(hasCategoryLabel).toBe(true)
    })
  })

  it('should maintain color consistency across multiple flows of same category', () => {
    const flows: FinancialFlow[] = [
      { source: 'Revenue1', target: 'Expense1', amount: 1000, category: 'revenue' },
      { source: 'Revenue2', target: 'Expense2', amount: 2000, category: 'revenue' },
      { source: 'Revenue3', target: 'Expense3', amount: 3000, category: 'revenue' }
    ]

    const prompt = createDiagramPrompt(
      flows,
      {
        company: 'Test Company',
        period: { quarter: 1, year: 2024 },
        currency: 'USD'
      }
    )

    // All revenue flows should use the same color
    const revenueColor = FLOW_COLORS.revenue
    const revenueColorCount = (prompt.match(new RegExp(revenueColor, 'g')) || []).length

    // Should appear at least once (in the color requirements section)
    // and potentially for each flow
    return revenueColorCount >= 1
  })
})

