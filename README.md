# Financial Sankey Agent

A serverless application that processes quarterly financial statements (PDF format) and generates verified Sankey diagrams using Google Gemini models.

## Architecture

- **Extraction**: Gemini Flash extracts structured financial data from PDFs
- **Generation**: Nano Banana (Gemini 2.5 Flash Image) generates Sankey diagram images
- **Verification**: Gemini Flash Vision verifies diagram accuracy and generates reasoning

## Technology Stack

- **Frontend**: Next.js 14 with TypeScript
- **Backend**: Vercel Serverless Functions
- **Storage**: Supabase (Postgres + Storage)
- **AI Models**: Google Gemini Flash, Gemini 2.5 Flash Image
- **Deployment**: Vercel

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.local.example .env.local
```

3. Fill in your environment variables in `.env.local`:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
   - `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase service role key

4. Run development server:
```bash
npm run dev
```

## Environment Variables

See `.env.local.example` for required environment variables.

## Deployment

This project is configured for Vercel deployment. Push to your repository and connect it to Vercel for automatic deployments.

## Requirements

- Node.js 18+
- npm or yarn

