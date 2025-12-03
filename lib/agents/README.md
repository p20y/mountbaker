# Agent Architecture

## Vercel AI SDK Implementation

This project uses **Vercel AI SDK** for agent implementation. This approach:

- ✅ Provides unified interface for AI model interactions
- ✅ Built-in utilities for prompt management and streaming
- ✅ Excellent TypeScript support
- ✅ Works seamlessly with Google Gemini
- ✅ Optimized for Vercel serverless functions

## Agent Structure

```
lib/agents/
  extraction/
    index.ts        # Extraction agent service
    prompts.ts      # Prompt templates
  generation/
    index.ts        # Generation agent service
    prompts.ts      # Prompt templates
  verification/
    index.ts        # Verification agent service
    prompts.ts      # Prompt templates
  orchestrator.ts   # Main orchestrator
  types.ts          # Shared agent types
```

## Vercel AI SDK Usage

The agents use Vercel AI SDK's `generateText` and `generateObject` utilities:

```typescript
import { generateText, generateObject } from 'ai'
import { google } from '@ai-sdk/google'

// For structured output (extraction)
const result = await generateObject({
  model: google('gemini-2.0-flash-exp'),
  schema: FinancialFlowSchema,
  prompt: extractionPrompt
})

// For image generation (Nano Banana)
const imageResult = await generateText({
  model: google('gemini-2.5-flash-image-exp'),
  prompt: diagramPrompt
})
```

## Agent Interface Pattern

Each agent follows a consistent interface:

```typescript
interface Agent<TInput, TOutput> {
  execute(input: TInput, options?: AgentOptions): Promise<TOutput>
  retry(input: TInput, attempt: number, previousError?: Error): Promise<TOutput>
}
```

## Communication

- **Data Contracts**: TypeScript interfaces + Zod schemas (already defined)
- **Error Handling**: Graceful degradation with partial results
- **Retry Logic**: Built into each agent with exponential backoff
- **Logging**: Structured logging for debugging
- **Vercel AI SDK**: Handles API calls, retries, and error handling

## Benefits

1. **Unified API**: Consistent interface across all AI operations
2. **Type Safety**: Full TypeScript support with Zod schema validation
3. **Vercel Optimized**: Built for serverless, works great on Vercel
4. **Error Handling**: Built-in retry and error handling utilities
5. **Streaming Support**: Ready for future streaming features if needed

## Dependencies

- `@vercel/ai`: Vercel AI SDK
- `@ai-sdk/google`: Google provider for Vercel AI SDK
- `@google/generative-ai`: Direct Gemini SDK (for Nano Banana image generation)

## Implementation Status

- ✅ Agent types and interfaces defined
- ⏳ Extraction agent (Task 5)
- ⏳ Generation agent (Task 7)
- ⏳ Verification agent (Task 8)
- ⏳ Orchestrator (Task 9)

