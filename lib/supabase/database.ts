/**
 * Database operations for Financial Sankey Agent
 */

import { requireSupabase } from './server'
import type { Database } from './types'

type Statement = Database['public']['Tables']['statements']['Row']
type StatementInsert = Database['public']['Tables']['statements']['Insert']
type Flow = Database['public']['Tables']['flows']['Row']
type FlowInsert = Database['public']['Tables']['flows']['Insert']
type Verification = Database['public']['Tables']['verifications']['Row']
type VerificationInsert = Database['public']['Tables']['verifications']['Insert']

/**
 * Create a new statement record
 */
export async function createStatement(
  data: Omit<StatementInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<Statement> {
  const supabaseAdmin = requireSupabase()
  
  // Explicitly set schema
  const { data: statement, error } = await supabaseAdmin
    .schema('public')
    .from('statements')
    .insert(data)
    .select()
    .single()

  if (error) {
    // Provide more helpful error message
    if (error.message.includes('schema cache') || error.message.includes('not found')) {
      throw new Error(
        `Table 'statements' does not exist. Please run the migration: supabase/migrations/001_initial_schema.sql in your Supabase SQL Editor. Error: ${error.message}`
      )
    }
    throw new Error(`Failed to create statement: ${error.message}`)
  }

  return statement
}

/**
 * Get a statement by ID
 */
export async function getStatement(id: string): Promise<Statement | null> {
  const supabaseAdmin = requireSupabase()
  const { data, error } = await supabaseAdmin
    .from('statements')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to get statement: ${error.message}`)
  }

  return data
}

/**
 * Update statement status
 */
export async function updateStatementStatus(
  id: string,
  status: 'pending' | 'processing' | 'completed' | 'failed'
): Promise<Statement> {
  const supabaseAdmin = requireSupabase()
  const { data, error } = await supabaseAdmin
    .from('statements')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update statement: ${error.message}`)
  }

  return data
}

/**
 * Insert financial flows for a statement
 */
export async function insertFlows(
  statementId: string,
  flows: Omit<FlowInsert, 'id' | 'statement_id' | 'created_at'>[]
): Promise<Flow[]> {
  const supabaseAdmin = requireSupabase()
  const flowsToInsert: FlowInsert[] = flows.map(flow => ({
    ...flow,
    statement_id: statementId,
  }))

  const { data, error } = await supabaseAdmin
    .from('flows')
    .insert(flowsToInsert)
    .select()

  if (error) {
    throw new Error(`Failed to insert flows: ${error.message}`)
  }

  return data
}

/**
 * Get flows for a statement
 */
export async function getFlows(statementId: string): Promise<Flow[]> {
  const supabaseAdmin = requireSupabase()
  const { data, error } = await supabaseAdmin
    .from('flows')
    .select('*')
    .eq('statement_id', statementId)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to get flows: ${error.message}`)
  }

  return data || []
}

/**
 * Create verification record
 */
export async function createVerification(
  data: Omit<VerificationInsert, 'id' | 'created_at'>
): Promise<Verification> {
  const supabaseAdmin = requireSupabase()
  const { data: verification, error } = await supabaseAdmin
    .from('verifications')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create verification: ${error.message}`)
  }

  return verification
}

/**
 * Get verification for a statement
 */
export async function getVerification(statementId: string): Promise<Verification | null> {
  const supabaseAdmin = requireSupabase()
  const { data, error } = await supabaseAdmin
    .from('verifications')
    .select('*')
    .eq('statement_id', statementId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to get verification: ${error.message}`)
  }

  return data
}

/**
 * Delete statement and all related data (cascade)
 */
export async function deleteStatement(id: string): Promise<void> {
  const supabaseAdmin = requireSupabase()
  const { error } = await supabaseAdmin
    .from('statements')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete statement: ${error.message}`)
  }
}

