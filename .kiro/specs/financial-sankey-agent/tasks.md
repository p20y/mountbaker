# Implementation Plan

- [x] 1. Set up project structure and dependencies
  - Initialize Next.js project with TypeScript
  - Configure Vercel deployment settings
  - Set up Supabase project and connection
  - Install required dependencies: @google/generative-ai, pdf-parse, zod
  - Configure environment variables for API keys
  - _Requirements: 4.1, 6.1_

- [x] 2. Implement core data models and schemas
  - [x] 2.1 Create TypeScript interfaces for FinancialFlow, StatementMetadata, VerificationReport
    - Define FinancialFlow interface with source, target, amount, category
    - Define StatementMetadata interface with company, period, currency
    - Define VerificationReport interface with accuracy metrics
    - _Requirements: 1.3, 6.2_

  - [x] 2.2 Create Zod schemas for runtime validation
    - Create Zod schema for FinancialFlow validation
    - Create Zod schema for API request/response validation
    - Create Zod schema for Gemini API responses
    - _Requirements: 1.4, 6.2_

  - [x]* 2.3 Write property test for data model validation
    - **Property 12: Inter-agent data contract compliance**
    - **Validates: Requirements 6.2**

- [ ] 3. Set up Supabase database and storage
  - [ ] 3.1 Create database schema
    - Create statements table (id, user_id, filename, status, created_at)
    - Create flows table (id, statement_id, source, target, amount, category)
    - Create verifications table (id, statement_id, accuracy, verified, reasoning, created_at)
    - Set up Row Level Security policies
    - _Requirements: 7.2, 7.3_

  - [ ] 3.2 Configure Supabase Storage buckets
    - Create bucket for PDF uploads
    - Create bucket for generated diagrams
    - Configure access policies and CORS
    - _Requirements: 7.1_

  - [ ]* 3.3 Write unit tests for database operations
    - Test statement CRUD operations
    - Test flow data insertion and retrieval
    - Test verification record creation
    - _Requirements: 7.2_

- [ ] 4. Implement PDF parsing and text extraction
  - [ ] 4.1 Create PDF parser utility
    - Implement PDF text extraction using pdf-parse
    - Handle scanned PDFs (detect low text content)
    - Extract tables and structured data
    - _Requirements: 1.1, 1.2_

  - [ ]* 4.2 Write unit tests for PDF parsing
    - Test with sample financial statement PDFs
    - Test with scanned PDFs
    - Test error handling for corrupted PDFs
    - _Requirements: 1.4_

- [ ] 5. Implement Gemini Flash extraction agent
  - [ ] 5.1 Create extraction service
    - Initialize Gemini Flash client with API key
    - Implement structured output extraction with JSON schema
    - Create prompt template for financial data extraction
    - Parse and validate Gemini response with Zod
    - _Requirements: 1.2, 1.3, 5.1_

  - [ ] 5.2 Implement retry logic for extraction failures
    - Add retry mechanism with exponential backoff
    - Enhance prompts on retry attempts
    - Log extraction attempts and results
    - _Requirements: 6.3, 6.4_

  - [ ]* 5.3 Write property test for extraction accuracy
    - **Property 10: Extraction accuracy threshold**
    - **Validates: Requirements 5.1**

  - [ ]* 5.4 Write property test for complete data extraction
    - **Property 2: Complete data extraction**
    - **Validates: Requirements 1.2, 1.3**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement Nano Banana diagram generation agent
  - [ ] 7.1 Create generation service
    - Initialize Gemini 2.5 Flash Image client
    - Create prompt template for Sankey diagram generation
    - Format financial flows into clear prompt structure
    - Handle image response and convert to buffer
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 7.2 Implement diagram styling and configuration
    - Define color scheme for flow categories (revenue=green, expense=red, etc.)
    - Configure image dimensions (1024x1024)
    - Ensure arrow widths proportional to amounts in prompt
    - _Requirements: 2.2, 2.3_

  - [ ]* 7.3 Write property test for flow proportionality
    - **Property 4: Flow proportionality preservation**
    - **Validates: Requirements 2.2**

  - [ ]* 7.4 Write property test for visual category distinction
    - **Property 5: Visual category distinction**
    - **Validates: Requirements 2.3**

- [ ] 8. Implement Gemini Flash Vision verification agent
  - [ ] 8.1 Create verification service
    - Initialize Gemini Flash Vision client
    - Create prompt template for diagram verification
    - Extract flow values from diagram image using vision
    - Compare extracted values against original flows
    - _Requirements: 3.1, 3.2, 5.3_

  - [ ] 8.2 Implement discrepancy detection and reporting
    - Calculate percentage error for each flow
    - Identify discrepancies exceeding 0.1% threshold
    - Generate reasoning for correctness/incorrectness
    - Create detailed verification report
    - _Requirements: 3.3, 3.4, 3.5, 5.3_

  - [ ]* 8.3 Write property test for verification accuracy detection
    - **Property 7: Verification accuracy detection**
    - **Validates: Requirements 3.4, 5.3**

  - [ ]* 8.4 Write property test for successful verification outcomes
    - **Property 8: Successful verification outcomes**
    - **Validates: Requirements 3.3, 3.5**

- [ ] 9. Implement orchestrator function
  - [ ] 9.1 Create main orchestration logic
    - Implement pipeline: Extract → Generate → Verify
    - Handle data flow between agents
    - Store intermediate results in Supabase
    - _Requirements: 6.2, 7.2_

  - [ ] 9.2 Implement retry and regeneration logic
    - Add retry loop for verification failures (max 3 retries)
    - Enhance generation prompts on retry attempts
    - Track retry count and log attempts
    - _Requirements: 5.4_

  - [ ] 9.3 Implement error handling and graceful degradation
    - Handle agent failures without cascading errors
    - Return partial results when possible
    - Log detailed error information
    - Generate user-friendly error messages
    - _Requirements: 2.5, 6.3, 6.4, 7.5_

  - [ ]* 9.4 Write property test for retry logic
    - **Property 9: Retry logic on verification failure**
    - **Validates: Requirements 5.4**

  - [ ]* 9.5 Write property test for graceful failure handling
    - **Property 13: Graceful failure handling**
    - **Validates: Requirements 2.5, 6.3, 6.4**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Create Vercel API endpoints
  - [ ] 11.1 Implement file upload endpoint
    - Create POST /api/upload endpoint
    - Handle PDF file upload
    - Validate file format and size
    - Store file in Supabase Storage
    - Return upload confirmation
    - _Requirements: 1.1, 1.4_

  - [ ] 11.2 Implement processing endpoint
    - Create POST /api/process endpoint
    - Invoke orchestrator function
    - Return processing status
    - _Requirements: 1.1_

  - [ ] 11.3 Implement results endpoint
    - Create GET /api/results/:id endpoint
    - Retrieve diagram and verification report
    - Format response with metadata
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]* 11.4 Write property test for valid input acceptance
    - **Property 1: Valid input acceptance and processing**
    - **Validates: Requirements 1.1, 2.1, 2.4**

  - [ ]* 11.5 Write property test for invalid input rejection
    - **Property 3: Invalid input rejection**
    - **Validates: Requirements 1.4, 1.5**

- [ ] 12. Build Next.js frontend
  - [ ] 12.1 Create file upload component
    - Build drag-and-drop file upload UI
    - Add file validation (PDF only, size limits)
    - Show upload progress
    - _Requirements: 1.1_

  - [ ] 12.2 Create processing status component
    - Display processing stages (Extract → Generate → Verify)
    - Show progress indicators
    - Handle loading states
    - _Requirements: 7.3_

  - [ ] 12.3 Create results display component
    - Display generated Sankey diagram
    - Show verification report with accuracy metrics
    - Display reasoning for correctness
    - Show processing metadata (time, retries)
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ] 12.4 Implement error handling UI
    - Display user-friendly error messages
    - Show partial results when available
    - Provide retry option
    - _Requirements: 1.4, 7.5_

- [ ] 13. Implement output formatting and response structure
  - [ ] 13.1 Create response formatter
    - Format final output with diagram, report, metadata
    - Include accuracy confidence score
    - Structure output for easy integration
    - _Requirements: 5.5, 7.4_

  - [ ]* 13.2 Write property test for complete output structure
    - **Property 14: Complete output structure**
    - **Validates: Requirements 5.5, 7.1, 7.2, 7.3, 7.4**

  - [ ]* 13.3 Write property test for partial results on failure
    - **Property 15: Partial results on persistent failure**
    - **Validates: Requirements 7.5**

- [ ] 14. Implement logging and monitoring
  - [ ] 14.1 Set up structured logging
    - Log all agent invocations with timestamps
    - Log extraction results and confidence scores
    - Log verification results and discrepancies
    - Log errors with full context
    - _Requirements: 6.4_

  - [ ] 14.2 Add performance monitoring
    - Track processing time for each stage
    - Monitor API call latency
    - Track retry rates
    - _Requirements: 7.3_

- [ ] 15. Write end-to-end integration tests
  - [ ]* 15.1 Test complete pipeline with sample statements
    - Upload PDF → Extract → Generate → Verify → Return results
    - Test with various financial statement formats
    - Verify accuracy of end-to-end flow
    - _Requirements: 1.1, 2.1, 3.1, 7.1_

  - [ ]* 15.2 Test retry mechanism
    - Trigger verification failures
    - Verify retry logic executes correctly
    - Confirm regeneration with improved prompts
    - _Requirements: 5.4_

  - [ ]* 15.3 Test error recovery scenarios
    - Test with corrupted PDFs
    - Test with API failures
    - Verify graceful degradation
    - Verify partial results returned
    - _Requirements: 1.4, 6.3, 7.5_

- [ ] 16. Write property test for stateless execution
  - [ ]* 16.1 Test stateless execution consistency
    - **Property 11: Stateless execution consistency**
    - **Validates: Requirements 4.4**

- [ ] 17. Configure deployment and environment
  - [ ] 17.1 Set up Vercel deployment
    - Configure build settings
    - Set up environment variables
    - Configure serverless function settings (memory, timeout)
    - _Requirements: 4.1, 4.2_

  - [ ] 17.2 Configure Supabase production environment
    - Set up production database
    - Configure storage buckets
    - Set up RLS policies
    - _Requirements: 4.1_

  - [ ] 17.3 Set up API key management
    - Store Gemini API key in Vercel secrets
    - Store Supabase credentials securely
    - Configure key rotation policies
    - _Requirements: 4.1_

- [ ] 18. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
