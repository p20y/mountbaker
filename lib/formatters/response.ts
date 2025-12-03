/**
 * Response Formatter
 * 
 * Formats final output with diagram, report, metadata, and confidence scores.
 * Structures output for easy integration.
 */

import type { 
  OrchestratorOutput, 
  VerificationReport, 
  FinancialFlow,
  StatementMetadata 
} from '@/types/models'

/**
 * Complete formatted response structure
 */
export interface FormattedResponse {
  success: boolean
  statementId?: string
  diagram?: {
    image: string  // Base64 encoded image
    format: string // e.g., 'image/png'
    width?: number
    height?: number
  }
  verification: {
    verified: boolean
    accuracy: number
    confidenceScore: number
    reasoning: string
    flowsVerified: number
    flowsTotal: number
    discrepancies: Array<{
      flow: string
      expected: number
      actual: number
      percentageError: number
    }>
    valueComparisons?: Array<{
      flow: string
      diagramValue: number
      sourceValue: number
      match: boolean
      error?: number
    }>
  }
  metadata: {
    company?: string
    period?: {
      start: string  // ISO date string
      end: string    // ISO date string
      quarter: number
      year: number
    }
    currency?: string
    statementType?: string[]
    processing: {
      time: number  // milliseconds
      timeFormatted: string  // human-readable
      retries: number
      flowsExtracted: number
    }
  }
  error?: {
    code: string
    message: string
    stage?: 'parsing' | 'extraction' | 'generation' | 'verification'
    recoverable?: boolean
  }
  partialResults?: {
    flows?: FinancialFlow[]
    flowsCount?: number
  }
}

/**
 * Format processing time to human-readable string
 */
function formatProcessingTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`
  } else {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }
}

/**
 * Format orchestrator output into standardized response structure
 */
export function formatResponse(
  output: OrchestratorOutput,
  options: {
    statementId?: string
    statementMetadata?: StatementMetadata
    verificationReport?: VerificationReport
    includeDiagram?: boolean
  } = {}
): FormattedResponse {
  const {
    statementId,
    statementMetadata,
    verificationReport,
    includeDiagram = true
  } = options

  // Convert diagram buffer to base64 if included
  let diagramData: FormattedResponse['diagram'] | undefined
  if (includeDiagram && output.diagram && output.diagram.length > 0) {
    diagramData = {
      image: output.diagram.toString('base64'),
      format: 'image/png',
      // Note: Width/height would need to be extracted from image metadata
      // For now, we'll leave them optional
    }
  }

  // Build verification data
  const verification: FormattedResponse['verification'] = {
    verified: output.success,
    accuracy: output.accuracy,
    confidenceScore: verificationReport?.confidenceScore ?? (output.success ? 0.95 : 0.0),
    reasoning: output.reasoning,
    flowsVerified: verificationReport?.flowsVerified ?? 0,
    flowsTotal: verificationReport?.flowsTotal ?? output.metadata.flowsExtracted,
    discrepancies: verificationReport?.discrepancies.map(d => ({
      flow: d.flow,
      expected: d.expected,
      actual: d.actual,
      percentageError: d.percentageError
    })) ?? [],
    valueComparisons: verificationReport?.valueComparisons
  }

  // Build metadata
  const metadata: FormattedResponse['metadata'] = {
    company: statementMetadata?.company,
    period: statementMetadata?.period ? {
      start: statementMetadata.period.start.toISOString(),
      end: statementMetadata.period.end.toISOString(),
      quarter: statementMetadata.period.quarter,
      year: statementMetadata.period.year
    } : undefined,
    currency: statementMetadata?.currency,
    statementType: statementMetadata?.statementType,
    processing: {
      time: output.metadata.processingTime,
      timeFormatted: formatProcessingTime(output.metadata.processingTime),
      retries: output.metadata.retries,
      flowsExtracted: output.metadata.flowsExtracted
    }
  }

  // Build response
  const response: FormattedResponse = {
    success: output.success,
    statementId,
    diagram: diagramData,
    verification,
    metadata,
    error: output.error ? {
      code: output.error.code,
      message: output.error.message,
      stage: output.error.stage,
      recoverable: output.error.code !== 'UNKNOWN_ERROR'
    } : undefined
  }

  // Add partial results if available (when error occurred but some data was extracted)
  if (!output.success && output.metadata.flowsExtracted > 0) {
    response.partialResults = {
      flowsCount: output.metadata.flowsExtracted
    }
  }

  return response
}

/**
 * Format error response with partial results
 */
export function formatErrorResponse(
  error: {
    code: string
    message: string
    stage?: 'parsing' | 'extraction' | 'generation' | 'verification'
  },
  partialResults?: {
    flows?: FinancialFlow[]
    flowsCount?: number
  },
  statementId?: string
): FormattedResponse {
  return {
    success: false,
    statementId,
    verification: {
      verified: false,
      accuracy: 0,
      confidenceScore: 0,
      reasoning: error.message,
      flowsVerified: 0,
      flowsTotal: partialResults?.flowsCount ?? partialResults?.flows?.length ?? 0,
      discrepancies: []
    },
    metadata: {
      processing: {
        time: 0,
        timeFormatted: '0ms',
        retries: 0,
        flowsExtracted: partialResults?.flowsCount ?? partialResults?.flows?.length ?? 0
      }
    },
    error: {
      code: error.code,
      message: error.message,
      stage: error.stage,
      recoverable: error.code !== 'UNKNOWN_ERROR'
    },
    partialResults: partialResults ? {
      flows: partialResults.flows,
      flowsCount: partialResults.flowsCount ?? partialResults.flows?.length
    } : undefined
  }
}

/**
 * Format success response
 */
export function formatSuccessResponse(
  output: OrchestratorOutput,
  statementId: string,
  statementMetadata?: StatementMetadata,
  verificationReport?: VerificationReport
): FormattedResponse {
  return formatResponse(output, {
    statementId,
    statementMetadata,
    verificationReport,
    includeDiagram: true
  })
}

