/**
 * Prompt templates for extraction agent
 */

export function createExtractionPrompt(
  pdfText: string | null,
  isScanned: boolean,
  attempt: number = 1
): string {
  const basePrompt = `You are a financial data extraction expert. Extract all financial flows from the provided financial statement.

Your task is to:
1. Identify all revenue streams, expenses, assets, liabilities, and equity flows
2. Extract the source and target for each flow
3. Extract the exact numeric amounts
4. Categorize each flow as: revenue, expense, asset, liability, or equity
5. Extract metadata about the company, period, currency, and statement types

Output format: JSON with the following structure:
{
  "flows": [
    {
      "source": "string (e.g., 'Total Revenue')",
      "target": "string (e.g., 'Operating Expenses')",
      "amount": number (exact numeric value, no formatting),
      "category": "revenue" | "expense" | "asset" | "liability" | "equity",
      "metadata": {
        "lineItem": "optional line item name",
        "statementSection": "optional section name"
      }
    }
  ],
  "metadata": {
    "company": "company name",
    "period": {
      "start": "YYYY-MM-DD",
      "end": "YYYY-MM-DD",
      "quarter": 1-4,
      "year": YYYY
    },
    "currency": "USD" | "EUR" | etc (3-letter code),
    "statementType": ["Income Statement", "Balance Sheet", etc]
  },
  "confidence": 0.0-1.0 (your confidence in the extraction)
}

Important:
- Extract ALL flows, not just major ones
- Use exact numeric values (no commas, no currency symbols)
- Ensure amounts are positive numbers
- Validate that flows make financial sense (e.g., revenue flows to expenses)
- If the statement is scanned or has low text, use OCR capabilities to read the content
- Be precise with numbers - accuracy is critical (99%+ required)`

  if (isScanned || pdfText === null) {
    return `${basePrompt}

NOTE: This appears to be a scanned PDF or image-based document. Use your OCR capabilities to read and extract all text and numbers from the document. Pay special attention to:
- Table structures
- Numeric values in financial tables
- Headers and labels
- Currency symbols and formatting`
  }

  if (attempt > 1) {
    return `${basePrompt}

RETRY ATTEMPT ${attempt}: Please be more thorough. Review the document again and ensure:
- You haven't missed any flows
- All numbers are extracted with full precision
- All categories are correctly assigned
- Metadata is complete and accurate
- Confidence score reflects actual extraction quality`
  }

  return `${basePrompt}

Financial Statement Content:
${pdfText}

Extract all financial flows from the above content.`
}

export function createRetryPrompt(
  pdfText: string | null,
  previousError: string,
  attempt: number
): string {
  const basePrompt = createExtractionPrompt(pdfText, pdfText === null, attempt)
  
  return `${basePrompt}

Previous extraction attempt failed with error: ${previousError}

Please correct the issue and try again. Pay special attention to:
- Schema validation (ensure all required fields are present)
- Data types (amounts must be numbers, dates must be valid)
- Required fields (flows array must have at least one item)
- Format compliance (dates in YYYY-MM-DD format, currency as 3-letter code)`
}

