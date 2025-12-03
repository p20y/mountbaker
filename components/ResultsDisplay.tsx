'use client'

import Image from 'next/image'

interface ResultsDisplayProps {
  diagramUrl: string
  verification: {
    accuracy: number
    verified: boolean
    reasoning: string
    flowsVerified: number
    flowsTotal: number
    discrepancies?: Array<{
      flow: string
      expected: number
      actual: number
      percentageError: number
    }>
  }
  metadata: {
    processingTime: number
    retries: number
    flowsExtracted: number
  }
}

export default function ResultsDisplay({
  diagramUrl,
  verification,
  metadata
}: ResultsDisplayProps) {
  const accuracyPercentage = (verification.accuracy * 100).toFixed(2)
  const processingTimeSeconds = (metadata.processingTime / 1000).toFixed(2)

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Diagram */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Generated Sankey Diagram</h2>
        <div className="relative w-full aspect-square bg-gray-100 rounded-lg overflow-hidden">
          <Image
            src={diagramUrl}
            alt="Sankey Diagram"
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      </div>

      {/* Verification Report */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Verification Report</h2>
        
        <div className="space-y-4">
          {/* Accuracy Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-600">Overall Accuracy</div>
              <div className="text-2xl font-bold text-blue-600">{accuracyPercentage}%</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-gray-600">Flows Verified</div>
              <div className="text-2xl font-bold text-green-600">
                {verification.flowsVerified}/{verification.flowsTotal}
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-gray-600">Processing Time</div>
              <div className="text-2xl font-bold text-purple-600">{processingTimeSeconds}s</div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-sm text-gray-600">Retries</div>
              <div className="text-2xl font-bold text-orange-600">{metadata.retries}</div>
            </div>
          </div>

          {/* Verification Status */}
          <div className={`
            p-4 rounded-lg border-2
            ${verification.verified 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
            }
          `}>
            <div className="flex items-center space-x-2">
              <span className="text-2xl">
                {verification.verified ? '✅' : '❌'}
              </span>
              <span className="font-semibold">
                {verification.verified ? 'Verification Passed' : 'Verification Failed'}
              </span>
            </div>
          </div>

          {/* Reasoning */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold mb-2">Reasoning for Correctness</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {verification.reasoning}
            </p>
          </div>

          {/* Discrepancies */}
          {verification.discrepancies && verification.discrepancies.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-semibold mb-2 text-red-800">Discrepancies Found</h3>
              <div className="space-y-2">
                {verification.discrepancies.map((disc, index) => (
                  <div key={index} className="text-sm">
                    <div className="font-medium">{disc.flow}</div>
                    <div className="text-gray-600">
                      Expected: {disc.expected.toLocaleString()} | 
                      Actual: {disc.actual.toLocaleString()} | 
                      Error: {disc.percentageError.toFixed(2)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Processing Metadata */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold mb-4">Processing Metadata</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-600">Flows Extracted</div>
            <div className="font-semibold">{metadata.flowsExtracted}</div>
          </div>
          <div>
            <div className="text-gray-600">Processing Time</div>
            <div className="font-semibold">{processingTimeSeconds}s</div>
          </div>
          <div>
            <div className="text-gray-600">Retry Attempts</div>
            <div className="font-semibold">{metadata.retries}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

