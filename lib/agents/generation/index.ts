/**
 * Nano Banana Diagram Generation Agent
 * 
 * Generates Sankey diagrams from financial flows using Gemini 2.5 Flash Image.
 */

import { GoogleGenAI } from '@google/genai'
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

      // Initialize Gemini client using the new Gen AI SDK
      // According to https://ai.google.dev/gemini-api/docs/image-generation
      // We use @google/genai for image generation support
      const client = new GoogleGenAI({ apiKey })

      // Use Gemini Nano Banana (Gemini 2.5 Flash Image) for image generation
      // Model name: gemini-2.5-flash-image (official name per documentation)
      const modelName = 'gemini-2.5-flash-image'
      
      // Generate image using the new SDK API
      // API: client.models.generateContent({ model, contents })
      const response = await client.models.generateContent({
        model: modelName,
        contents: prompt,
      })

      // Extract image data from response
      // According to documentation: https://ai.google.dev/gemini-api/docs/image-generation
      // Response structure: response.candidates[0].content.parts[]
      // Each part can have: part.text or part.inlineData
      // Image data is in: part.inlineData.data (base64 string)
      
      let imageData: string | undefined
      
      // Extract from response.candidates[0].content.parts
      const parts = response.candidates?.[0]?.content?.parts || []
      
      for (const part of parts) {
        // Check for inlineData with image data
        if (part.inlineData?.data) {
          imageData = part.inlineData.data
          break
        }
        // Also check for text (in case model returns text description)
        if (part.text) {
          // Try to extract base64 from text if present
          const base64Match = part.text.match(/data:image\/[^;]+;base64,([A-Za-z0-9+/=]+)/)
          if (base64Match) {
            imageData = base64Match[1]
            break
          }
        }
      }
      
      if (!imageData) {
        // Log response structure for debugging
        console.error('Gemini Nano Banana response structure:', JSON.stringify({
          hasCandidates: !!response.candidates,
          candidatesLength: response.candidates?.length || 0,
          partsLength: parts.length,
          parts: parts.map((p: any) => ({
            keys: Object.keys(p),
            hasText: 'text' in p,
            hasInlineData: 'inlineData' in p,
            inlineDataKeys: p.inlineData ? Object.keys(p.inlineData) : []
          }))
        }, null, 2))
        
        throw new Error(`No image data found in Gemini Nano Banana response. Response has ${response.candidates?.length || 0} candidate(s) with ${parts.length} part(s). Expected image data in part.inlineData.data.`)
      }

      // Convert base64 to buffer
      const imageBuffer = Buffer.from(imageData, 'base64')
      
      // Validate it's a reasonable image size (at least 1KB for a valid image)
      if (imageBuffer.length < 1024) {
        throw new Error(`Image data too small (${imageBuffer.length} bytes). Expected at least 1KB for a valid image.`)
      }

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

