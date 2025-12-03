/**
 * Nano Banana Diagram Generation Agent
 * 
 * Generates Sankey diagrams from financial flows using Gemini 2.5 Flash Image.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { AnalysisOutput } from '@/lib/schemas'
import type { GenerationOutput as GenerationOutputType } from '@/types/models'
import { createDiagramPrompt, createRetryPrompt } from './prompts'

export interface GenerationInput {
  flows: AnalysisOutput['flows']
  metadata: AnalysisOutput['metadata']
}

export interface GenerationOptions {
  maxRetries?: number
  apiKey?: string
  imageDimensions?: { width: number; height: number }
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_DIMENSIONS = { width: 1024, height: 1024 }

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
 * Generate Sankey diagram from financial flows
 */
export async function generateDiagram(
  input: GenerationInput,
  options: GenerationOptions = {}
): Promise<GenerationOutputType> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES
  const apiKey = options.apiKey ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GEMINI_API_KEY
  const dimensions = options.imageDimensions ?? DEFAULT_DIMENSIONS

  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY or GEMINI_API_KEY is required for diagram generation')
  }

  if (!input.flows || input.flows.length === 0) {
    throw new Error('At least one flow is required for diagram generation')
  }

  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const prompt = attempt === 1
        ? createDiagramPrompt(
            input.flows,
            {
              company: input.metadata.company,
              period: {
                quarter: input.metadata.period.quarter,
                year: input.metadata.period.year
              },
              currency: input.metadata.currency
            },
            attempt
          )
        : createRetryPrompt(
            input.flows,
            {
              company: input.metadata.company,
              period: {
                quarter: input.metadata.period.quarter,
                year: input.metadata.period.year
              },
              currency: input.metadata.currency
            },
            lastError?.message || 'Unknown error',
            attempt
          )

      // Initialize Gemini client
      const genAI = new GoogleGenerativeAI(apiKey)
      
      // Use Gemini 2.5 Flash Image for image generation
      // Note: Model name may need adjustment based on actual available models
      const model = genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash-image-exp' // or 'gemini-2.5-flash-image' if exp not available
      })

      // Generate image
      const result = await model.generateContent(prompt)
      const response = await result.response

      // Extract image data
      // Note: The actual API response format may vary
      // This is a placeholder - adjust based on actual Gemini Image API response
      const imageData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
      
      if (!imageData) {
        // If image data is not in expected format, try alternative extraction
        // Some models return base64 encoded images
        const text = response.text()
        if (text) {
          // Try to extract base64 image data from response
          const base64Match = text.match(/data:image\/[^;]+;base64,([^"]+)/)
          if (base64Match) {
            const imageBuffer = Buffer.from(base64Match[1], 'base64')
            return {
              diagram: imageBuffer,
              renderMetadata: {
                width: dimensions.width,
                height: dimensions.height,
                format: 'png'
              },
              chartData: {
                flows: input.flows
              }
            }
          }
        }
        
        throw new Error('No image data found in response')
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageData, 'base64')

      return {
        diagram: imageBuffer,
        renderMetadata: {
          width: dimensions.width,
          height: dimensions.height,
          format: 'png'
        },
        chartData: {
          flows: input.flows
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // If this is the last attempt, throw the error
      if (attempt > maxRetries) {
        throw new Error(
          `Diagram generation failed after ${maxRetries + 1} attempts: ${lastError.message}`
        )
      }

      // Log the attempt
      console.warn(`Diagram generation attempt ${attempt} failed:`, lastError.message)

      // Wait before retrying (exponential backoff)
      const delay = calculateBackoff(attempt)
      await sleep(delay)
    }
  }

  // This should never be reached, but TypeScript needs it
  throw new Error('Diagram generation failed: Maximum retries exceeded')
}

/**
 * Execute diagram generation (main entry point)
 */
export async function executeGeneration(
  input: GenerationInput,
  options: GenerationOptions = {}
): Promise<GenerationOutputType> {
  return generateDiagram(input, options)
}

