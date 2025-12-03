/**
 * Results API Endpoint
 * GET /api/results/:id
 * 
 * Retrieves diagram and verification report for a processed statement.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStatement, getFlows, getVerification } from '@/lib/supabase/database'
import { getDiagramUrl, getPDFUrl } from '@/lib/supabase/storage'
import { isSupabaseConfigured } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const statementId = params.id

    if (!statementId) {
      return NextResponse.json(
        { success: false, error: 'Statement ID is required' },
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

    // Get flows
    const flows = await getFlows(statementId)

    // Get verification result
    const verification = await getVerification(statementId)

    // Get diagram URL
    let diagramUrl: string | null = null
    try {
      const diagramPath = `${statementId}/${statementId}-diagram.png`
      diagramUrl = await getDiagramUrl(diagramPath, 3600) // 1 hour expiry
    } catch (error) {
      // Diagram might not exist yet
      console.warn('Diagram not found:', error)
    }

    // Get PDF URL
    let pdfUrl: string | null = null
    try {
      const pdfPath = `${statementId}/${statement.filename}`
      pdfUrl = await getPDFUrl(pdfPath, 3600) // 1 hour expiry
    } catch (error) {
      console.warn('PDF not found:', error)
    }

    // Format response
    return NextResponse.json({
      success: true,
      statement: {
        id: statement.id,
        filename: statement.filename,
        status: statement.status,
        createdAt: statement.created_at,
        updatedAt: statement.updated_at
      },
      flows: flows.map(flow => ({
        id: flow.id,
        source: flow.source,
        target: flow.target,
        amount: flow.amount,
        category: flow.category,
        lineItem: flow.line_item,
        statementSection: flow.statement_section
      })),
      verification: verification ? {
        id: verification.id,
        accuracy: verification.accuracy,
        verified: verification.verified,
        reasoning: verification.reasoning,
        flowsVerified: verification.flows_verified,
        flowsTotal: verification.flows_total,
        discrepancies: verification.discrepancies,
        valueComparisons: verification.value_comparisons,
        createdAt: verification.created_at
      } : null,
      urls: {
        diagram: diagramUrl,
        pdf: pdfUrl
      }
    })
  } catch (error) {
    console.error('Results retrieval error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve results'
      },
      { status: 500 }
    )
  }
}

