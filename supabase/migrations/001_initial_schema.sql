-- Initial database schema for Financial Sankey Agent
-- Run this migration in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Statements table: stores information about uploaded financial statements
CREATE TABLE IF NOT EXISTS statements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID, -- Optional: for multi-user support
  filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Flows table: stores extracted financial flows from statements
CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  target TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  category TEXT NOT NULL,
  line_item TEXT,
  statement_section TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Verifications table: stores verification results for generated diagrams
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  statement_id UUID NOT NULL REFERENCES statements(id) ON DELETE CASCADE,
  accuracy NUMERIC(5, 4) NOT NULL,
  verified BOOLEAN NOT NULL DEFAULT false,
  reasoning TEXT NOT NULL,
  flows_verified INTEGER NOT NULL DEFAULT 0,
  flows_total INTEGER NOT NULL DEFAULT 0,
  discrepancies JSONB, -- Array of discrepancy objects
  value_comparisons JSONB, -- Array of value comparison objects
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_statements_user_id ON statements(user_id);
CREATE INDEX IF NOT EXISTS idx_statements_status ON statements(status);
CREATE INDEX IF NOT EXISTS idx_statements_created_at ON statements(created_at);
CREATE INDEX IF NOT EXISTS idx_flows_statement_id ON flows(statement_id);
CREATE INDEX IF NOT EXISTS idx_flows_category ON flows(category);
CREATE INDEX IF NOT EXISTS idx_verifications_statement_id ON verifications(statement_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verified ON verifications(verified);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_statements_updated_at
  BEFORE UPDATE ON statements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to do everything (for server-side operations)
CREATE POLICY "Service role can manage all statements"
  ON statements FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all flows"
  ON flows FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all verifications"
  ON verifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: Allow anonymous/authenticated users to read their own data (if user_id is set)
-- Note: Adjust these policies based on your authentication requirements
CREATE POLICY "Users can read their own statements"
  ON statements FOR SELECT
  USING (
    user_id IS NULL OR -- Public statements
    user_id = auth.uid() -- User's own statements
  );

CREATE POLICY "Users can read flows for their statements"
  ON flows FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM statements
      WHERE statements.id = flows.statement_id
      AND (statements.user_id IS NULL OR statements.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can read verifications for their statements"
  ON verifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM statements
      WHERE statements.id = verifications.statement_id
      AND (statements.user_id IS NULL OR statements.user_id = auth.uid())
    )
  );

