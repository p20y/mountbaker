# Deployment Guide

This guide covers deployment configuration for the Financial Sankey Agent.

## Requirements

- Vercel account
- Supabase account
- Google AI API key (Gemini)

## 1. Vercel Deployment

### 1.1 Build Settings

The project is configured for Next.js deployment on Vercel. Build settings are automatically detected from `package.json`.

### 1.2 Environment Variables

Set the following environment variables in Vercel:

#### Required Variables

```bash
# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here  # Fallback

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NODE_ENV=production
```

#### Setting Environment Variables in Vercel

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add each variable for Production, Preview, and Development environments
4. Use Vercel's encrypted secrets for sensitive values

### 1.3 Serverless Function Settings

The `vercel.json` file configures:

- **Function Timeout**: 60 seconds (default)
- **Body Size Limit**: 10MB for file uploads

To adjust these settings, edit `vercel.json`:

```json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 300  // 5 minutes for long-running operations
    }
  }
}
```

### 1.4 Memory Configuration

By default, Vercel allocates 1024MB to serverless functions. For processing large financial statements, you may need to increase this:

1. Go to Vercel project settings
2. Navigate to "Functions"
3. Adjust memory allocation per function route

## 2. Supabase Production Environment

### 2.1 Database Setup

1. **Run Migrations**:
   - Go to Supabase Dashboard → SQL Editor
   - Run `supabase/migrations/001_initial_schema.sql`
   - Run `supabase/migrations/002_allow_zero_amounts.sql`

2. **Verify Tables**:
   ```sql
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('statements', 'flows', 'verifications');
   ```

### 2.2 Storage Buckets

1. **Create Storage Buckets**:
   - Go to Supabase Dashboard → Storage
   - Run the SQL from `supabase/storage-setup.sql` in SQL Editor

2. **Verify Buckets**:
   ```sql
   SELECT name FROM storage.buckets 
   WHERE name IN ('pdf-uploads', 'diagrams');
   ```

### 2.3 Row Level Security (RLS)

RLS policies are automatically created by the migration scripts. Verify they're active:

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
```

## 3. API Key Management

### 3.1 Google Gemini API Key

1. **Get API Key**:
   - Go to https://ai.google.dev/
   - Create a new API key
   - Copy the key

2. **Store in Vercel**:
   - Add as environment variable `GOOGLE_GENERATIVE_AI_API_KEY`
   - Mark as "Sensitive" to encrypt

3. **Key Rotation**:
   - Generate new key in Google AI Console
   - Update in Vercel environment variables
   - Redeploy application

### 3.2 Supabase Credentials

1. **Get Credentials**:
   - Go to Supabase Dashboard → Settings → API
   - Copy:
     - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
     - Anon Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - Service Role Key → `SUPABASE_SERVICE_ROLE_KEY`

2. **Security Notes**:
   - Service Role Key has admin access - keep it secret
   - Never expose Service Role Key in client-side code
   - Use Anon Key for client-side operations (if needed)

## 4. Deployment Steps

### 4.1 Initial Deployment

1. **Connect Repository**:
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login
   vercel login
   
   # Link project
   vercel link
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

### 4.2 Continuous Deployment

If connected to GitHub:
- Push to `main` branch → Auto-deploy to production
- Push to other branches → Auto-deploy to preview

### 4.3 Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

## 5. Post-Deployment Verification

### 5.1 Health Check

1. Visit your Vercel deployment URL
2. Verify the application loads
3. Check browser console for errors

### 5.2 API Endpoints

Test each endpoint:

```bash
# Upload endpoint
curl -X POST https://your-app.vercel.app/api/upload \
  -F "file=@test.pdf"

# Process endpoint
curl -X POST https://your-app.vercel.app/api/process \
  -H "Content-Type: application/json" \
  -d '{"statementId": "your-statement-id"}'

# Results endpoint
curl https://your-app.vercel.app/api/results/your-statement-id
```

### 5.3 Database Verification

```sql
-- Check recent statements
SELECT id, filename, status, created_at 
FROM statements 
ORDER BY created_at DESC 
LIMIT 10;

-- Check flows
SELECT COUNT(*) as flow_count 
FROM flows;

-- Check verifications
SELECT COUNT(*) as verification_count 
FROM verifications;
```

## 6. Monitoring

### 6.1 Vercel Logs

- Go to Vercel Dashboard → Your Project → Logs
- Monitor function execution times
- Check for errors

### 6.2 Supabase Logs

- Go to Supabase Dashboard → Logs
- Monitor database queries
- Check for slow queries

### 6.3 Application Logs

The application uses structured logging (see `lib/logging/logger.ts`). Logs are output to:
- Vercel function logs (serverless)
- Browser console (client-side)

## 7. Troubleshooting

### 7.1 Function Timeout

If processing times out:
- Increase `maxDuration` in `vercel.json`
- Consider using background jobs for long operations

### 7.2 API Quota Errors

If you hit Google AI API quotas:
- Check usage at https://ai.dev/usage
- Upgrade your plan if needed
- Implement rate limiting

### 7.3 Database Connection Issues

If Supabase connection fails:
- Verify environment variables are set correctly
- Check Supabase project status
- Verify RLS policies allow service role access

## 8. Cost Optimization

### 8.1 Vercel

- Use Hobby plan for development
- Upgrade to Pro for production (better limits)
- Monitor function execution time

### 8.2 Supabase

- Free tier: 500MB database, 1GB storage
- Pro tier: For production workloads
- Monitor usage in dashboard

### 8.3 Google AI

- Free tier: Limited requests
- Pay-as-you-go: For production
- Monitor usage at https://ai.dev/usage

## 9. Security Checklist

- [ ] All API keys stored in Vercel secrets (encrypted)
- [ ] Service Role Key never exposed to client
- [ ] RLS policies enabled on all tables
- [ ] CORS configured correctly
- [ ] File upload size limits enforced
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info

## 10. Backup and Recovery

### 10.1 Database Backups

Supabase automatically backs up databases:
- Daily backups for Pro tier
- Point-in-time recovery available

### 10.2 Code Backups

- Code in Git repository (GitHub/GitLab)
- Vercel keeps deployment history

### 10.3 Storage Backups

- PDFs and diagrams stored in Supabase Storage
- Consider periodic exports for critical data

