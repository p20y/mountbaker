-- Migration: Remove all CHECK constraints to keep database generic
-- Application-level validation (Zod schemas) will handle validation logic

-- Drop all CHECK constraints from flows table
ALTER TABLE flows DROP CONSTRAINT IF EXISTS flows_amount_check;
ALTER TABLE flows DROP CONSTRAINT IF EXISTS flows_category_check;

-- Drop CHECK constraint from statements table
ALTER TABLE statements DROP CONSTRAINT IF EXISTS statements_status_check;

-- Drop CHECK constraint from verifications table
ALTER TABLE verifications DROP CONSTRAINT IF EXISTS verifications_accuracy_check;

