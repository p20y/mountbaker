/**
 * Prompt templates for diagram generation agent
 */

import type { FinancialFlow, FlowCategory } from '@/types/models'

/**
 * Color scheme for flow categories
 */
export const FLOW_COLORS: Record<FlowCategory, string> = {
  revenue: '#10B981',      // Green
  expense: '#EF4444',      // Red
  asset: '#3B82F6',        // Blue
  liability: '#F59E0B',    // Amber
  equity: '#8B5CF6'        // Purple
}

/**
 * Create prompt for Sankey diagram generation
 */
export function createDiagramPrompt(
  flows: FinancialFlow[],
  metadata: {
    company: string
    period: { quarter: number; year: number }
    currency: string
  },
  attempt: number = 1
): string {
  // Calculate total for each category to normalize arrow widths
  const categoryTotals: Record<FlowCategory, number> = {
    revenue: 0,
    expense: 0,
    asset: 0,
    liability: 0,
    equity: 0
  }

  flows.forEach(flow => {
    categoryTotals[flow.category] += flow.amount
  })

  const maxTotal = Math.max(...Object.values(categoryTotals))

  // Format flows with proportional widths
  const flowDescriptions = flows.map(flow => {
    const width = (flow.amount / maxTotal) * 100 // Percentage width
    const color = FLOW_COLORS[flow.category]
    
    return `- Flow from "${flow.source}" to "${flow.target}": ${flow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${metadata.currency} (width: ${width.toFixed(1)}%, color: ${color}, category: ${flow.category})`
  }).join('\n')

  const basePrompt = `Generate a professional Sankey diagram (flow diagram) for financial data visualization.

Requirements:
1. Image dimensions: 1024x1024 pixels
2. Format: PNG with transparent or white background
3. Style: Clean, professional, suitable for financial reports

Financial Data:
Company: ${metadata.company}
Period: Q${metadata.period.quarter} ${metadata.period.year}
Currency: ${metadata.currency}

Financial Flows:
${flowDescriptions}

Visual Requirements:
1. **Arrow Width Proportionality**: The width of each arrow/flow must be proportional to its amount. Larger amounts = wider arrows.
2. **Color Coding**: Use distinct colors for each category:
   - Revenue flows: Green (#10B981)
   - Expense flows: Red (#EF4444)
   - Asset flows: Blue (#3B82F6)
   - Liability flows: Amber (#F59E0B)
   - Equity flows: Purple (#8B5CF6)
3. **Node Labels**: Clearly label all source and target nodes with their names
4. **Flow Labels**: Show the amount on or near each flow arrow
5. **Layout**: Arrange nodes logically (sources on left, targets on right)
6. **Readability**: Ensure all text is readable and numbers are clearly visible

Important:
- Arrow widths MUST be proportional to amounts (this is critical for accuracy)
- Use the exact colors specified for each category
- Include all flows listed above
- Make sure numeric values are clearly visible and accurate
- The diagram should be professional and suitable for financial reporting`

  if (attempt > 1) {
    return `${basePrompt}

RETRY ATTEMPT ${attempt}: Please pay special attention to:
- Ensuring arrow widths are EXACTLY proportional to amounts
- Using the exact colors specified for each category
- Making all numeric values clearly visible and accurate
- Ensuring the diagram is properly formatted and professional`
  }

  return basePrompt
}

/**
 * Create enhanced prompt for retry attempts
 */
export function createRetryPrompt(
  flows: FinancialFlow[],
  metadata: {
    company: string
    period: { quarter: number; year: number }
    currency: string
  },
  previousError: string,
  attempt: number
): string {
  const basePrompt = createDiagramPrompt(flows, metadata, attempt)
  
  return `${basePrompt}

Previous generation attempt failed with error: ${previousError}

Please correct the issue and ensure:
- All arrow widths are precisely proportional to amounts
- All colors match the specified category colors exactly
- All numeric values are accurate and clearly visible
- The diagram meets all visual requirements`
}

