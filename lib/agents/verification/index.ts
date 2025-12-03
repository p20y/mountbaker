/**
 * Gemini Flash Vision Verification Agent
 * 
 * Verifies generated Sankey diagrams against original financial flows
 * using Gemini Flash Vision capabilities.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { VerificationInput, VerificationOutput } from '@/types/models'
import { VerificationReportSchema } from '@/lib/schemas'
import { createVerificationPrompt, createRetryVerificationPrompt } from './prompts'

export interface VerificationOptions {
  maxRetries?: number
  apiKey?: string
}

const DEFAULT_MAX_RETRIES = 1 // Verification typically doesn't need retries, but we support it

/**
 * Sleep utility for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(attempt: number): number {
  return Math.min(1000 * Math.pow(2, attempt - 1), 10000)
}

/**
 * Calculate percentage error between two values
 */
function calculatePercentageError(expected: number, actual: number): number {
  if (expected === 0) {
    return actual === 0 ? 0 : Infinity
  }
  return Math.abs((actual - expected) / expected) * 100
}

/**
 * Verify diagram against original flows
 */
export async function verifyDiagram(
  input: VerificationInput,
  options: VerificationOptions = {}
): Promise<VerificationOutput> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const apiKey = options.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY
  const threshold = input.threshold ?? 0.001 // 0.1% default

  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY is required for verification')
  }

  if (!input.diagram || input.diagram.length === 0) {
    throw new Error('Diagram image is required for verification')
  }

  if (!input.originalFlows || input.originalFlows.length === 0) {
    throw new Error('Original flows are required for verification')
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const prompt = attempt === 1
        ? createVerificationPrompt(input.diagram, input.originalFlows, threshold)
        : createRetryVerificationPrompt(
            input.diagram,
            input.originalFlows,
            lastError?.message || 'Unknown error',
            threshold,
            attempt
          )

      // Use Google Generative AI SDK directly for vision capabilities
      const genAI = new GoogleGenerativeAI(apiKey)
      
      // Use Gemini Flash with vision capabilities
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.0-flash-exp' // or 'gemini-2.0-flash' if exp not available
      })

      // Convert diagram buffer to base64 for Gemini Vision
      const imageBase64 = input.diagram.toString('base64')
      const imageMimeType = 'image/png' // Assuming PNG

      // Generate content with image and text prompt
      const result = await model.generateContent([
        {
          text: prompt
        },
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageMimeType
          }
        }
      ])

      const response = await result.response
      const responseText = response.text()

      // Parse JSON response
      let parsedResponse: any
      try {
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[0])
        } else {
          throw new Error('No JSON found in response')
        }
      } catch (parseError) {
        throw new Error(`Failed to parse verification response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
      }

      // Calculate additional metrics before validation
      const flowsTotal = input.originalFlows.length
      const overallAccuracy = parsedResponse.overallAccuracy ?? 0
      const discrepancies = parsedResponse.discrepancies ?? []
      const flowsVerified = flowsTotal - discrepancies.length

      // Determine if verification passed (all flows within threshold)
      const passed = discrepancies.length === 0 && overallAccuracy >= (1 - threshold)
      
      // Calculate confidence score if not provided
      // Confidence is based on accuracy and number of discrepancies
      const confidenceScore = parsedResponse.confidenceScore ?? 
        Math.max(0, Math.min(1, overallAccuracy * (1 - (discrepancies.length / Math.max(flowsTotal, 1)))))

      // Validate the parsed response with all required fields
      const validated = VerificationReportSchema.parse({
        timestamp: parsedResponse.timestamp ? new Date(parsedResponse.timestamp) : new Date(),
        overallAccuracy,
        flowsVerified,
        flowsTotal,
        discrepancies,
        passed,
        confidenceScore,
        reasoning: parsedResponse.reasoning || 'Verification completed',
        valueComparisons: parsedResponse.valueComparisons
      })

      // Create verification output
      const verificationOutput: VerificationOutput = {
        verified: passed,
        accuracy: overallAccuracy,
        discrepancies: validated.discrepancies,
        report: validated
      }

      return verificationOutput
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this is the last attempt, throw the error
      if (attempt > maxRetries) {
        throw new Error(
          `Verification failed after ${maxRetries + 1} attempts: ${lastError.message}`
        )
      }

      // Log the attempt
      console.warn(`Verification attempt ${attempt} failed:`, lastError.message)

      // Wait before retrying (exponential backoff)
      const delay = calculateBackoff(attempt)
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Verification failed: Maximum retries exceeded')
}

/**
 * Execute verification (main entry point)
 */
export async function executeVerification(
  input: VerificationInput,
  options: VerificationOptions = {}
): Promise<VerificationOutput> {
  return verifyDiagram(input, options)
}

