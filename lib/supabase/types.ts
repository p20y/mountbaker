// This file will be generated from Supabase schema
// For now, defining basic types manually

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
          amount: number
          category: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'
          created_at: string
        }
        Insert: {
          id?: string
          statement_id: string
          source: string
          target: string
          amount: number
          category: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'
          created_at?: string
        }
        Update: {
          id?: string
          statement_id?: string
          source?: string
          target?: string
          amount?: number
          category?: 'revenue' | 'expense' | 'asset' | 'liability' | 'equity'
          created_at?: string
        }
      }
      verifications: {
        Row: {
          id: string
          statement_id: string
          accuracy: number
          verified: boolean
          reasoning: string
          created_at: string
        }
        Insert: {
          id?: string
          statement_id: string
          accuracy: number
          verified: boolean
          reasoning: string
          created_at?: string
        }
        Update: {
          id?: string
          statement_id?: string
          accuracy?: number
          verified?: boolean
          reasoning?: string
          created_at?: string
        }
      }
    }
  }
}

