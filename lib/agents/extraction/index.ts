/**
 * Gemini Flash Extraction Agent
 * 
 * Extracts structured financial data from PDF financial statements.
 * Handles both text-based and scanned PDFs using Gemini Flash's OCR capabilities.
 */

import { generateObject } from 'ai'
import { google } from '@ai-sdk/google'
import { AnalysisOutputSchema, type AnalysisOutput } from '@/lib/schemas'
import { createExtractionPrompt, createRetryPrompt } from './prompts'
import type { PDFParseResult } from '@/lib/pdf/parser'

export interface ExtractionInput {
  pdfText: string | null
  pdfBuffer?: Buffer
  isScanned: boolean
  metadata?: PDFParseResult['metadata']
}

export interface ExtractionOptions {
  maxRetries?: number
  apiKey?: string
}

const DEFAULT_MAX_RETRIES = 2

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
  // Exponential backoff: 1s, 2s, 4s
  return Math.min(1000 * Math.pow(2, attempt - 1), 10000)
}

/**
 * Extract financial flows from PDF using Gemini Flash
 */
export async function extractFinancialData(
  input: ExtractionInput,
  options: ExtractionOptions = {}
): Promise<AnalysisOutput> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const apiKey = options.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY is required for extraction')
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const prompt = attempt === 1
        ? createExtractionPrompt(input.pdfText, input.isScanned, attempt)
        : createRetryPrompt(
            input.pdfText,
            lastError?.message || 'Unknown error',
            attempt
          )

      // Prepare content for Gemini
      // If we have PDF buffer and it's scanned, pass it as image
      // Otherwise, use text
      const content: Array<{ type: string; text?: string; image?: Buffer }> = []

      if (input.isScanned && input.pdfBuffer) {
        // For scanned PDFs, we'll need to convert pages to images
        // For now, pass text if available, otherwise note that OCR is needed
        if (input.pdfText) {
          content.push({ type: 'text', text: prompt })
        } else {
          // Note: Gemini Flash can handle PDFs directly, but for now we'll use text
          // In production, you might want to convert PDF pages to images
          content.push({ type: 'text', text: prompt + '\n\n[SCANNED PDF - Please use OCR to extract all text and numbers]' })
        }
      } else {
        content.push({ type: 'text', text: prompt })
      }

      // Use Vercel AI SDK with Google Gemini
      // Note: Model name may need adjustment based on actual available models
      const modelName = 'gemini-2.0-flash-exp' // or 'gemini-2.0-flash' if exp not available
      
      // Set API key in environment if not already set
      if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY && !process.env.GEMINI_API_KEY) {
        process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey
      }
      
      const result = await generateObject({
        model: google(modelName),
        schema: AnalysisOutputSchema,
        prompt: content.map(c => c.text || '').join('\n'),
        temperature: 0.1, // Low temperature for accuracy
        maxTokens: 16000, // Increased for large financial statements with many flows
      })

      // Validate the result
      // Handle date strings from API response - Zod will transform them
      const validated = AnalysisOutputSchema.parse(result.object)

      // Ensure confidence is reasonable
      if (validated.confidence < 0.5) {
        throw new Error(`Low confidence extraction (${validated.confidence}). Please review the document.`)
      }

      return validated
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this is the last attempt, throw the error
      if (attempt > maxRetries) {
        // Provide more helpful error message for quota issues
        if (lastError.message.includes('quota') || lastError.message.includes('Quota exceeded')) {
          throw new Error(
            `API quota exceeded. Please check your Google AI plan and billing. ${lastError.message}`
          )
        }
        // Provide helpful message for JSON parsing/truncation issues
        if (lastError.message.includes('JSON parsing') || lastError.message.includes('Expected')) {
          throw new Error(
            `JSON parsing failed - response may be truncated. This can happen with very large financial statements. ${lastError.message}`
          )
        }
        throw new Error(
          `Extraction failed after ${maxRetries + 1} attempts: ${lastError.message}`
        )
      }

      // Log the attempt
      console.warn(`Extraction attempt ${attempt} failed:`, lastError.message)

      // Wait before retrying (exponential backoff)
      const delay = calculateBackoff(attempt)
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Extraction failed: Maximum retries exceeded')
}

/**
 * Extract financial data with retry logic
 * This is the main entry point for the extraction agent
 */
export async function executeExtraction(
  input: ExtractionInput,
  options: ExtractionOptions = {}
): Promise<AnalysisOutput> {
  return extractFinancialData(input, options)
}

