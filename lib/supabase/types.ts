// Database types matching the Supabase schema
// These types correspond to the tables defined in supabase/migrations/001_initial_schema.sql

export interface Database {
  public: {
    Tables: {
      statements: {
        Row: {
          id: string
          user_id: string | null
          filename: string
          status: 'pending' | 'processing' | 'completed' | 'failed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          filename: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          filename?: string
          status?: 'pending' | 'processing' | 'completed' | 'failed'
          created_at?: string
          updated_at?: string
        }
      }
      flows: {
        Row: {
          id: string
          statement_id: string
          source: string
          target: string
          amount: number // NUMERIC(15, 2) in database
          category: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'
          line_item: string | null
          statement_section: string | null
          created_at: string
        }
        Insert: {
          id?: string
          statement_id: string
          source: string
          target: string
          amount: number
          category: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'
          line_item?: string | null
          statement_section?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          statement_id?: string
          source?: string
          target?: string
          amount?: number
          category?: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'
          line_item?: string | null
          statement_section?: string | null
          created_at?: string
        }
      }
      verifications: {
        Row: {
          id: string
          statement_id: string
          accuracy: number // NUMERIC(5, 4) in database
          verified: boolean
          reasoning: string
          flows_verified: number
          flows_total: number
          discrepancies: Record<string, unknown> | null // JSONB
          value_comparisons: Record<string, unknown> | null // JSONB
          created_at: string
        }
        Insert: {
          id?: string
          statement_id: string
          accuracy: number
          verified?: boolean
          reasoning: string
          flows_verified?: number
          flows_total?: number
          discrepancies?: Record<string, unknown> | null
          value_comparisons?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          statement_id?: string
          accuracy?: number
          verified?: boolean
          reasoning?: string
          flows_verified?: number
          flows_total?: number
          discrepancies?: Record<string, unknown> | null
          value_comparisons?: Record<string, unknown> | null
          created_at?: string
        }
      }
    }
  }
}

