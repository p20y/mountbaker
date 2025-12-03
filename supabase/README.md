# Supabase Setup Guide

This directory contains SQL migrations and setup scripts for the Financial Sankey Agent database and storage.

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and API keys:
   - Project URL: `https://<project-id>.supabase.co`
   - Anon Key: Found in Settings > API
   - Service Role Key: Found in Settings > API (keep this secret!)

### 2. Run Database Migration

1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `migrations/001_initial_schema.sql`
4. Run the migration
5. Verify tables were created: `statements`, `flows`, `verifications`

### 3. Set Up Storage Buckets

1. In Supabase dashboard, go to SQL Editor
2. Copy and paste the contents of `storage-setup.sql`
3. Run the script
4. Verify buckets were created:
   - `pdf-uploads` (private, 10MB limit)
   - `diagrams` (private, 5MB limit)

Alternatively, you can create buckets via the Storage UI:
- Go to Storage in the dashboard
- Create bucket `pdf-uploads` (private)
- Create bucket `diagrams` (private)

### 4. Configure Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-id>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Database Schema

### Tables

- **statements**: Stores financial statement metadata
- **flows**: Stores extracted financial flows
- **verifications**: Stores verification results and reasoning

See `migrations/001_initial_schema.sql` for full schema details.

## Storage Buckets

- **pdf-uploads**: Stores uploaded PDF files (private)
- **diagrams**: Stores generated Sankey diagram images (private)

## Row Level Security (RLS)

RLS is enabled on all tables. Policies allow:
- Service role: Full access (for server-side operations)
- Authenticated users: Read access to their own data
- Anonymous: Read access to public statements (where user_id is null)

Adjust policies in the migration file based on your security requirements.

## Testing

Unit tests for database operations are in `tests/unit/database.test.ts`.

To test with a real Supabase instance, you'll need to:
1. Set up a test Supabase project
2. Configure test environment variables
3. Run migrations on the test database

