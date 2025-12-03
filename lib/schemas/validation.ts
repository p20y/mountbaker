/**
 * Zod schemas for runtime validation
 */

import { z } from 'zod'

/**
 * Flow category enum schema
 */
export const FlowCategorySchema = z.enum([
  'revenue',
  'expense',
  'asset',
  'liability',
  'equity'
])

/**
 * FinancialFlow schema
 */
export const FinancialFlowSchema = z.object({
  id: z.string().optional(),
  source: z.string().min(1, 'Source is required'),
  target: z.string().min(1, 'Target is required'),
  amount: z.number().positive('Amount must be positive'),
  category: FlowCategorySchema,
  metadata: z.object({
    lineItem: z.string().optional(),
    statementSection: z.string().optional()
  }).optional()
})

/**
 * StatementMetadata schema
 */
export const StatementMetadataSchema = z.object({
  company: z.string().min(1, 'Company name is required'),
  period: z.object({
    start: z.date(),
    end: z.date(),
    quarter: z.number().int().min(1).max(4),
    year: z.number().int().min(2000).max(2100)
  }),
  currency: z.string().length(3, 'Currency must be 3 characters (e.g., USD)'),
  statementType: z.array(z.string()).min(1, 'At least one statement type is required')
})

/**
 * Discrepancy schema
 */
export const DiscrepancySchema = z.object({
  flow: z.string(),
  expected: z.number(),
  actual: z.number(),
  percentageError: z.number()
})

/**
 * VerificationReport schema
 */
export const VerificationReportSchema = z.object({
  timestamp: z.date(),
  overallAccuracy: z.number().min(0).max(1),
  flowsVerified: z.number().int().nonnegative(),
  flowsTotal: z.number().int().positive(),
  discrepancies: z.array(DiscrepancySchema),
  passed: z.boolean(),
  confidenceScore: z.number().min(0).max(1),
  reasoning: z.string(),
  valueComparisons: z.array(z.object({
    flow: z.string(),
    diagramValue: z.number(),
    sourceValue: z.number(),
    match: z.boolean(),
    error: z.number().optional()
  })).optional()
})

/**
 * AnalysisOutput schema (from Extraction Agent)
 */
export const AnalysisOutputSchema = z.object({
  flows: z.array(FinancialFlowSchema).min(1, 'At least one flow is required'),
  metadata: StatementMetadataSchema,
  confidence: z.number().min(0).max(1)
})

/**
 * Gemini API response schema for extraction
 */
export const GeminiExtractionResponseSchema = z.object({
  flows: z.array(FinancialFlowSchema)
})

/**
 * API request schema for processing
 */
export const ProcessRequestSchema = z.object({
  file: z.instanceof(File).or(z.instanceof(Buffer)).or(z.string()),
  format: z.literal('pdf'),
  options: z.object({
    maxRetries: z.number().int().min(1).max(5).optional(),
    accuracyThreshold: z.number().min(0).max(1).optional()
  }).optional()
})

/**
 * API response schema
 */
export const ProcessResponseSchema = z.object({
  success: z.boolean(),
  diagram: z.string().optional(), // Base64 encoded image
  reasoning: z.string().optional(),
  accuracy: z.number().min(0).max(1).optional(),
  metadata: z.object({
    processingTime: z.number(),
    retries: z.number(),
    flowsExtracted: z.number()
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    stage: z.enum(['parsing', 'extraction', 'generation', 'verification']).optional()
  }).optional()
})

/**
 * VerificationInput schema
 */
export const VerificationInputSchema = z.object({
  diagram: z.instanceof(Buffer),
  originalFlows: z.array(FinancialFlowSchema).min(1),
  threshold: z.number().min(0).max(1)
})

/**
 * VerificationOutput schema
 */
export const VerificationOutputSchema = z.object({
  verified: z.boolean(),
  accuracy: z.number().min(0).max(1),
  discrepancies: z.array(DiscrepancySchema),
  report: VerificationReportSchema
})

/**
 * Error response schema
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: z.enum(['PDF_ERROR', 'EXTRACTION_ERROR', 'GENERATION_ERROR', 'VERIFICATION_ERROR']),
    message: z.string(),
    stage: z.enum(['parsing', 'extraction', 'generation', 'verification']),
    recoverable: z.boolean()
  }),
  partialResults: z.object({
    flows: z.array(FinancialFlowSchema).optional()
  }).optional()
})

