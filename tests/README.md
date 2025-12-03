# Testing Guide

## Running Tests

Once Node.js is installed and dependencies are installed, you can run tests with:

```bash
# Install dependencies first
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest tests/property/data-contract.test.ts
```

## Property Tests

Property tests use `fast-check` to generate random test data and verify properties hold across many inputs.

### Property 12: Inter-agent data contract compliance

**Location**: `tests/property/data-contract.test.ts`

**What it tests**:
- AnalysisOutput conforms to schema
- FinancialFlow conforms to schema  
- Data contracts between AnalysisOutput → GenerationInput
- Data contracts between GenerationOutput → VerificationInput
- Invalid data is properly rejected

**Expected behavior**:
- All property tests should pass with 100 random inputs each
- Tests verify that data structures conform to Zod schemas
- Tests ensure data can flow correctly between agents

## Test Structure

```
tests/
  property/
    data-contract.test.ts  # Property 12 tests
```

## Dependencies

Tests require:
- `vitest` - Test runner
- `fast-check` - Property-based testing
- `zod` - Schema validation

All are included in `package.json` devDependencies.

