/**
 * Core data models for Financial Sankey Agent
 */

export type FlowCategory = 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'

/**
 * Represents a single flow of money in the financial statement
 */
export interface FinancialFlow {
  id?: string
  source: string        // Source node (e.g., "Total Revenue")
  target: string        // Target node (e.g., "Operating Expenses")
  amount: number        // Flow amount in currency units
  category: FlowCategory
  metadata?: {
    lineItem?: string
    statementSection?: string
  }
}

/**
 * Contains contextual information about the financial statement
 */
export interface StatementMetadata {
  company: string
  period: {
    start: Date
    end: Date
    quarter: number
    year: number
  }
  currency: string
  statementType: string[]  // e.g., ["Income Statement", "Balance Sheet", "Cash Flow"]
}

/**
 * Represents a discrepancy found during verification
 */
export interface Discrepancy {
  flow: string           // Flow identifier (source -> target)
  expected: number       // Expected value from source data
  actual: number         // Actual value extracted from diagram
  percentageError: number // Percentage error
}

/**
 * Comprehensive report of verification results
 */
export interface VerificationReport {
  timestamp: Date
  overallAccuracy: number      // 0-1 accuracy score
  flowsVerified: number        // Number of flows verified
  flowsTotal: number          // Total number of flows
  discrepancies: Discrepancy[]
  passed: boolean
  confidenceScore: number      // 0-1 confidence score
  reasoning: string            // Explanation of correctness/incorrectness
  valueComparisons?: Array<{
    flow: string
    diagramValue: number
    sourceValue: number
    match: boolean
    error?: number
  }>
}

/**
 * Complete extraction output from Analysis Sub-Agent
 */
export interface AnalysisOutput {
  flows: FinancialFlow[]
  metadata: StatementMetadata
  confidence: number
}

/**
 * Generation output from Generation Sub-Agent
 */
export interface GenerationOutput {
  diagram: Buffer
  chartData?: {
    flows: FinancialFlow[]
    metadata?: Record<string, unknown>
  }
  renderMetadata?: {
    width: number
    height: number
    format: string
  }
}

/**
 * Verification input for Verification Sub-Agent
 */
export interface VerificationInput {
  diagram: Buffer
  originalFlows: FinancialFlow[]
  threshold: number  // Acceptable tolerance (e.g., 0.001 for 0.1%)
}

/**
 * Verification output from Verification Sub-Agent
 */
export interface VerificationOutput {
  verified: boolean
  accuracy: number
  discrepancies: Discrepancy[]
  report: VerificationReport
}

/**
 * Orchestrator input
 */
export interface OrchestratorInput {
  financialStatement: File | Buffer | string  // PDF file
  format: 'pdf'
  options?: {
    maxRetries?: number
    accuracyThreshold?: number
  }
}

/**
 * Orchestrator output
 */
export interface OrchestratorOutput {
  success: boolean
  diagram: Buffer
  reasoning: string
  accuracy: number
  verificationReport?: VerificationReport
  statementMetadata?: StatementMetadata
  metadata: {
    processingTime: number
    retries: number
    flowsExtracted: number
  }
  error?: {
    code: string
    message: string
    stage?: 'parsing' | 'extraction' | 'generation' | 'verification'
  }
}

/**
 * Error response format
 */
export interface ErrorResponse {
  success: false
  error: {
    code: 'PDF_ERROR' | 'EXTRACTION_ERROR' | 'GENERATION_ERROR' | 'VERIFICATION_ERROR'
    message: string
    stage: 'parsing' | 'extraction' | 'generation' | 'verification'
    recoverable: boolean
  }
  partialResults?: {
    flows?: FinancialFlow[]
  }
}

