/**
 * Prompt templates for verification agent
 */

import type { FinancialFlow } from '@/types/models'

/**
 * Create prompt for diagram verification
 */
export function createVerificationPrompt(
  diagramImage: Buffer,
  originalFlows: FinancialFlow[],
  threshold: number = 0.001 // 0.1% default
): string {
  // Format flows for comparison
  const flowsDescription = originalFlows.map((flow, index) => {
    return `${index + 1}. Flow from "${flow.source}" to "${flow.target}": ${flow.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (category: ${flow.category})`
  }).join('\n')

  return `You are a financial data verification expert. Your task is to verify that a Sankey diagram accurately represents the financial flows provided.

VERIFICATION TASK:
1. Extract all flow values from the diagram image using your vision capabilities
2. Compare each extracted value against the original financial statement data
3. Calculate the percentage error for each flow
4. Identify any discrepancies exceeding ${(threshold * 100).toFixed(2)}% tolerance
5. Generate detailed reasoning explaining why the diagram is correct or incorrect

ORIGINAL FINANCIAL FLOWS (source of truth):
${flowsDescription}

VERIFICATION REQUIREMENTS:
- Extract numeric values from the diagram (ignore currency symbols, focus on numbers)
- Compare extracted values with original values
- Calculate percentage error: |extracted - original| / original * 100
- Tolerance threshold: ${(threshold * 100).toFixed(2)}%
- If any flow has error > ${(threshold * 100).toFixed(2)}%, mark as FAILED
- If all flows are within tolerance, mark as VERIFIED

OUTPUT FORMAT (JSON):
{
  "verified": boolean,
  "overallAccuracy": number (0.0-1.0),
  "flowsVerified": number,
  "flowsTotal": number,
  "discrepancies": [
    {
      "flow": "source -> target",
      "expected": number,
      "actual": number,
      "percentageError": number
    }
  ],
  "valueComparisons": [
    {
      "flow": "source -> target",
      "diagramValue": number,
      "sourceValue": number,
      "match": boolean,
      "error": number (optional, if mismatch)
    }
  ],
  "reasoning": "Detailed explanation of verification results, including specific value comparisons, accuracy metrics, and explanation of why diagram is correct/incorrect"
}

IMPORTANT:
- Be precise with number extraction from the diagram
- Account for any rounding or formatting in the diagram
- Provide specific value comparisons in your reasoning
- Explain clearly why the diagram passes or fails verification`
}

/**
 * Create enhanced prompt for retry attempts
 */
export function createRetryVerificationPrompt(
  diagramImage: Buffer,
  originalFlows: FinancialFlow[],
  previousError: string,
  threshold: number = 0.001,
  attempt: number
): string {
  const basePrompt = createVerificationPrompt(diagramImage, originalFlows, threshold)
  
  return `${basePrompt}

RETRY ATTEMPT ${attempt}: Previous verification failed with error: ${previousError}

Please be more thorough:
- Double-check all extracted values from the diagram
- Verify calculations are correct
- Ensure all flows are compared
- Provide more detailed reasoning`
}

