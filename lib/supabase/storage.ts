/**
 * Supabase Storage operations for Financial Sankey Agent
 */

import { supabaseAdmin } from './server'

const PDF_BUCKET = 'pdf-uploads'
const DIAGRAM_BUCKET = 'diagrams'

/**
 * Upload a PDF file to Supabase Storage
 */
export async function uploadPDF(
  file: File | Buffer,
  filename: string,
  statementId?: string
): Promise<string> {
  const path = statementId ? `${statementId}/${filename}` : filename

  const { data, error } = await supabaseAdmin.storage
    .from(PDF_BUCKET)
    .upload(path, file, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload PDF: ${error.message}`)
  }

  return data.path
}

/**
 * Get a signed URL for downloading a PDF
 */
export async function getPDFUrl(path: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(PDF_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Upload a generated diagram to Supabase Storage
 */
export async function uploadDiagram(
  file: Buffer,
  filename: string,
  statementId: string,
  contentType: 'image/png' | 'image/jpeg' | 'image/svg+xml' = 'image/png'
): Promise<string> {
  const path = `${statementId}/${filename}`

  const { data, error } = await supabaseAdmin.storage
    .from(DIAGRAM_BUCKET)
    .upload(path, file, {
      contentType,
      upsert: true, // Allow overwriting
    })

  if (error) {
    throw new Error(`Failed to upload diagram: ${error.message}`)
  }

  return data.path
}

/**
 * Get a signed URL for downloading a diagram
 */
export async function getDiagramUrl(path: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from(DIAGRAM_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`)
  }

  return data.signedUrl
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([path])

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Delete all files for a statement
 */
export async function deleteStatementFiles(statementId: string): Promise<void> {
  // Delete PDF
  const { data: pdfFiles } = await supabaseAdmin.storage
    .from(PDF_BUCKET)
    .list(statementId)

  if (pdfFiles && pdfFiles.length > 0) {
    const pdfPaths = pdfFiles.map(file => `${statementId}/${file.name}`)
    await supabaseAdmin.storage.from(PDF_BUCKET).remove(pdfPaths)
  }

  // Delete diagrams
  const { data: diagramFiles } = await supabaseAdmin.storage
    .from(DIAGRAM_BUCKET)
    .list(statementId)

  if (diagramFiles && diagramFiles.length > 0) {
    const diagramPaths = diagramFiles.map(file => `${statementId}/${file.name}`)
    await supabaseAdmin.storage.from(DIAGRAM_BUCKET).remove(diagramPaths)
  }
}

