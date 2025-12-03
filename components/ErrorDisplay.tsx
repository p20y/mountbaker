'use client'

interface ErrorDisplayProps {
  error: {
    code: string
    message: string
    stage?: 'parsing' | 'extraction' | 'generation' | 'verification'
  }
  partialResults?: {
    flowsExtracted?: number
  }
  onRetry?: () => void
}

export default function ErrorDisplay({ error, partialResults, onRetry }: ErrorDisplayProps) {
  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'parsing': return 'PDF Parsing'
      case 'extraction': return 'Data Extraction'
      case 'generation': return 'Diagram Generation'
      case 'verification': return 'Verification'
      default: return 'Processing'
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="text-4xl">❌</div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-red-800 mb-2">Processing Error</h2>
            <div className="space-y-2">
              <div>
                <span className="font-semibold">Stage: </span>
                <span>{getStageLabel(error.stage)}</span>
              </div>
              <div>
                <span className="font-semibold">Error Code: </span>
                <span className="font-mono text-sm">{error.code}</span>
              </div>
              <div className="p-3 bg-red-100 rounded mt-3">
                <p className="text-sm text-red-800">{error.message}</p>
              </div>
              
              {/* Quota Error Help */}
              {error.message.includes('quota') || error.message.includes('Quota exceeded') ? (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Quota Exceeded - What to do:</h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Wait for the quota to reset (usually 24 hours for free tier)</li>
                    <li>Check your usage: <a href="https://ai.dev/usage?tab=rate-limit" target="_blank" rel="noopener noreferrer" className="underline">Google AI Usage Dashboard</a></li>
                    <li>Upgrade your plan: <a href="https://ai.google.dev/pricing" target="_blank" rel="noopener noreferrer" className="underline">Google AI Pricing</a></li>
                    <li>Use a different API key with available quota</li>
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Partial Results */}
            {partialResults && partialResults.flowsExtracted && partialResults.flowsExtracted > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ Partial results available: {partialResults.flowsExtracted} flow(s) extracted before error occurred.
                </p>
              </div>
            )}

            {/* Retry Button */}
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry Processing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

