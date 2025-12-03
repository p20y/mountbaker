/**
 * Processing API Endpoint
 * POST /api/process
 * 
 * Invokes orchestrator function to process financial statement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { orchestrate } from '@/lib/agents/orchestrator'
import type { OrchestratorInput } from '@/types/models'
import { getStatement, updateStatementStatus } from '@/lib/supabase/database'
import { getPDFUrl } from '@/lib/supabase/storage'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.' 
        },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { statementId, options } = body

    if (!statementId) {
      return NextResponse.json(
        { success: false, error: 'statementId is required' },
        { status: 400 }
      )
    }

    // Get statement record
    const statement = await getStatement(statementId)
    if (!statement) {
      return NextResponse.json(
        { success: false, error: 'Statement not found' },
        { status: 404 }
      )
    }

    // Update status to processing
    await updateStatementStatus(statementId, 'processing')

    // Get PDF from storage
    const pdfPath = `${statementId}/${statement.filename}`
    const pdfUrl = await getPDFUrl(pdfPath)
    
    // Fetch PDF
    const pdfResponse = await fetch(pdfUrl)
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch PDF from storage')
    }
    const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

    // Prepare orchestrator input
    const orchestratorInput: OrchestratorInput = {
      financialStatement: pdfBuffer,
      format: 'pdf',
      options: {
        maxRetries: options?.maxRetries,
        accuracyThreshold: options?.accuracyThreshold
      }
    }

    // Process (this may take a while, so in production you might want to use background jobs)
    const result = await orchestrate(orchestratorInput)

    // Return processing result
    return NextResponse.json({
      success: result.success,
      statementId,
      processing: {
        completed: true,
        accuracy: result.accuracy,
        reasoning: result.reasoning,
        metadata: result.metadata
      },
      error: result.error ? {
        code: result.error.code,
        message: result.error.message,
        stage: result.error.stage
      } : undefined
    })
  } catch (error) {
    console.error('Processing error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process statement'
      },
      { status: 500 }
    )
  }
}

