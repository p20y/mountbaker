/**
 * File Upload API Endpoint
 * POST /api/upload
 * 
 * Handles PDF file upload, validates format and size, stores in Supabase Storage.
 */

import { NextRequest, NextResponse } from 'next/server'
import { validatePDF } from '@/lib/pdf/parser'
import { uploadPDF } from '@/lib/supabase/storage'
import { createStatement } from '@/lib/supabase/database'
import { isSupabaseConfigured } from '@/lib/supabase/server'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Only PDF files are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      )
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate PDF format
    try {
      validatePDF(buffer)
    } catch (error) {
      return NextResponse.json(
        { success: false, error: `Invalid PDF file: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 400 }
      )
    }

    // Create statement record
    const statement = await createStatement({
      filename: file.name,
      status: 'pending'
    })

    // Upload to Supabase Storage
    const storagePath = await uploadPDF(buffer, file.name, statement.id)

    return NextResponse.json({
      success: true,
      statementId: statement.id,
      filename: file.name,
      size: file.size,
      storagePath,
      message: 'File uploaded successfully'
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload file'
      },
      { status: 500 }
    )
  }
}

