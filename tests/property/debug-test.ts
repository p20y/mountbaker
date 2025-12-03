/**
 * Debug test to see what's actually failing
 */
import { AnalysisOutputSchema, FinancialFlowSchema } from '@/lib/schemas'

// Test with the counterexample from the error
const testCase = {
  flows: [{
    source: "!",
    target: "!",
    amount: 0.010000000707805157,
    category: "revenue" as const,
    metadata: undefined
  }],
  metadata: {
    company: "!",
    period: {
      start: new Date("2000-01-01T00:00:00.000Z"),
      end: new Date("2000-01-01T00:00:00.000Z"),
      quarter: 1,
      year: 2000
    },
    currency: "USD",
    statementType: ["!"]
  },
  confidence: 0
}

console.log('Testing AnalysisOutput:')
const result = AnalysisOutputSchema.safeParse(testCase)
if (!result.success) {
  console.log('Validation failed:')
  console.log(JSON.stringify(result.error.errors, null, 2))
} else {
  console.log('Validation passed!')
}

console.log('\nTesting FinancialFlow:')
const flowResult = FinancialFlowSchema.safeParse(testCase.flows[0])
if (!flowResult.success) {
  console.log('Validation failed:')
  console.log(JSON.stringify(flowResult.error.errors, null, 2))
} else {
  console.log('Validation passed!')
}

