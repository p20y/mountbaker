/**
 * Diagram API Endpoint
 * GET /api/diagram/:id
 * 
 * Retrieves the generated diagram for a statement (available after generation, before verification).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStatement } from '@/lib/supabase/database'
import { getDiagramUrl } from '@/lib/supabase/storage'
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

    // Get diagram URL
    let diagramUrl: string | null = null
    try {
      const diagramPath = `${statementId}/${statementId}-diagram.png`
      diagramUrl = await getDiagramUrl(diagramPath, 3600) // 1 hour expiry
    } catch (error) {
      // Diagram might not exist yet
      return NextResponse.json(
        { 
          success: false, 
          error: 'Diagram not yet generated',
          available: false
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      diagramUrl,
      statementId
    })
  } catch (error) {
    console.error('Diagram retrieval error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve diagram'
      },
      { status: 500 }
    )
  }
}

