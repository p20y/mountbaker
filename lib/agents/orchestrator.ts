/**
 * Main Orchestrator Function
 * 
 * Coordinates the entire pipeline: Extract → Generate → Verify
 * Handles retry logic, error handling, and stores results in Supabase.
 */

import type { OrchestratorInput, OrchestratorOutput } from '@/types/models'
import { parsePDF, extractPDFText, validatePDF } from '@/lib/pdf/parser'
import { extractFinancialData } from '@/lib/agents/extraction'
import { generateDiagram } from '@/lib/agents/generation'
import { verifyDiagram } from '@/lib/agents/verification'
import { createStatement, updateStatementStatus, insertFlows, createVerification } from '@/lib/supabase/database'
import { uploadPDF, uploadDiagram } from '@/lib/supabase/storage'
import type { AnalysisOutput } from '@/lib/schemas'

const MAX_VERIFICATION_RETRIES = 3
const DEFAULT_ACCURACY_THRESHOLD = 0.001 // 0.1%

/**
 * Orchestrate the complete financial statement processing pipeline
 */
export async function orchestrate(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const startTime = Date.now()
  let retries = 0
  let statementId: string | null = null
  let extractedFlows: AnalysisOutput | null = null

  try {
    // Step 1: Parse PDF
    let pdfBuffer: Buffer
    if (typeof input.financialStatement === 'string') {
      // If it's a string, assume it's a file path or URL
      // For now, we'll require Buffer or File
      throw new Error('String input not yet supported. Please provide Buffer or File.')
    } else if (input.financialStatement instanceof File) {
      // Convert File to Buffer
      const arrayBuffer = await input.financialStatement.arrayBuffer()
      pdfBuffer = Buffer.from(arrayBuffer)
    } else {
      pdfBuffer = input.financialStatement
    }

    // Validate PDF
    validatePDF(pdfBuffer)

    // Extract text from PDF
    const pdfTextResult = await extractPDFText(pdfBuffer)
    
    // Create statement record in database
    const statement = await createStatement({
      filename: 'financial-statement.pdf',
      status: 'processing'
    })
    statementId = statement.id

    // Upload PDF to storage
    await uploadPDF(pdfBuffer, `${statementId}.pdf`, statementId)

    // Step 2: Extract financial data
    try {
      extractedFlows = await extractFinancialData(
        {
          pdfText: pdfTextResult.text,
          pdfBuffer,
          isScanned: pdfTextResult.isScanned
        },
        {
          maxRetries: input.options?.maxRetries ?? 2
        }
      )

      // Store extracted flows in database
      await insertFlows(
        statementId,
        extractedFlows.flows.map(flow => ({
          source: flow.source,
          target: flow.target,
          amount: flow.amount,
          category: flow.category,
          line_item: flow.metadata?.lineItem,
          statement_section: flow.metadata?.statementSection
        }))
      )

      await updateStatementStatus(statementId, 'processing')
    } catch (error) {
      await updateStatementStatus(statementId, 'failed')
      throw {
        code: 'EXTRACTION_ERROR',
        message: error instanceof Error ? error.message : 'Extraction failed',
        stage: 'extraction' as const,
        recoverable: false
      }
    }

    // Step 3: Generate diagram
    let diagramBuffer: Buffer
    try {
      const generationResult = await generateDiagram(
        {
          flows: extractedFlows.flows,
          metadata: extractedFlows.metadata
        },
        {
          maxRetries: 2
        }
      )

      diagramBuffer = generationResult.diagram

      // Upload diagram to storage
      await uploadDiagram(
        diagramBuffer,
        `${statementId}-diagram.png`,
        statementId,
        'image/png'
      )
    } catch (error) {
      await updateStatementStatus(statementId, 'failed')
      throw {
        code: 'GENERATION_ERROR',
        message: error instanceof Error ? error.message : 'Diagram generation failed',
        stage: 'generation' as const,
        recoverable: false
      }
    }

    // Step 4: Verify diagram (with retry logic)
    const accuracyThreshold = input.options?.accuracyThreshold ?? DEFAULT_ACCURACY_THRESHOLD
    let verificationResult
    let verificationPassed = false

    for (let attempt = 1; attempt <= MAX_VERIFICATION_RETRIES; attempt++) {
      try {
        verificationResult = await verifyDiagram(
          {
            diagram: diagramBuffer,
            originalFlows: extractedFlows.flows,
            threshold: accuracyThreshold
          },
          {
            maxRetries: 0 // Don't retry verification itself, we'll regenerate if needed
          }
        )

        if (verificationResult.verified) {
          verificationPassed = true
          break
        } else {
          // Verification failed, regenerate diagram with enhanced prompt
          if (attempt < MAX_VERIFICATION_RETRIES) {
            retries++
            console.warn(`Verification failed on attempt ${attempt}, regenerating diagram...`)
            
            // Regenerate with enhanced prompt (the generation agent handles this)
            const regenerationResult = await generateDiagram(
              {
                flows: extractedFlows.flows,
                metadata: extractedFlows.metadata
              },
              {
                maxRetries: 2
              }
            )

            diagramBuffer = regenerationResult.diagram
            await uploadDiagram(
              diagramBuffer,
              `${statementId}-diagram.png`,
              statementId,
              'image/png'
            )
          }
        }
      } catch (error) {
        if (attempt === MAX_VERIFICATION_RETRIES) {
          throw error
        }
        // Retry on error
        retries++
      }
    }

    // Store verification result
    if (verificationResult) {
      await createVerification({
        statement_id: statementId,
        accuracy: verificationResult.accuracy,
        verified: verificationPassed,
        reasoning: verificationResult.report.reasoning,
        flows_verified: verificationResult.report.flowsVerified,
        flows_total: verificationResult.report.flowsTotal,
        discrepancies: verificationResult.discrepancies.length > 0 
          ? JSON.parse(JSON.stringify(verificationResult.discrepancies))
          : null,
        value_comparisons: verificationResult.report.valueComparisons
          ? JSON.parse(JSON.stringify(verificationResult.report.valueComparisons))
          : null
      })
    }

    // Update statement status
    await updateStatementStatus(statementId, verificationPassed ? 'completed' : 'failed')

    const processingTime = Date.now() - startTime

    // Return success result
    return {
      success: verificationPassed,
      diagram: diagramBuffer,
      reasoning: verificationResult?.report.reasoning || 'Verification completed',
      accuracy: verificationResult?.accuracy || 0,
      metadata: {
        processingTime,
        retries,
        flowsExtracted: extractedFlows.flows.length
      }
    }
  } catch (error: any) {
    // Handle errors gracefully
    const processingTime = Date.now() - startTime

    // Update statement status if we have an ID
    if (statementId) {
      try {
        await updateStatementStatus(statementId, 'failed')
      } catch (updateError) {
        // Log but don't throw
        console.error('Failed to update statement status:', updateError)
      }
    }

    // Return error result with partial results if available
    return {
      success: false,
      diagram: Buffer.alloc(0), // Empty buffer on error
      reasoning: error.message || 'Processing failed',
      accuracy: 0,
      metadata: {
        processingTime,
        retries,
        flowsExtracted: extractedFlows?.flows.length || 0
      },
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message || 'An unknown error occurred',
        stage: error.stage || 'parsing'
      }
    }
  }
}

/**
 * Main entry point for orchestrator
 */
export async function executeOrchestration(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  return orchestrate(input)
}

