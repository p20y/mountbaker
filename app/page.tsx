'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import ProcessingStatus from '@/components/ProcessingStatus'
import ResultsDisplay from '@/components/ResultsDisplay'
import ErrorDisplay from '@/components/ErrorDisplay'

type ProcessingStage = 'idle' | 'uploading' | 'extraction' | 'generation' | 'verification' | 'completed' | 'failed'

export default function Home() {
  const [stage, setStage] = useState<ProcessingStage>('idle')
  const [statementId, setStatementId] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)
  const [error, setError] = useState<any>(null)
  const [retries, setRetries] = useState(0)

  const handleUpload = async (file: File): Promise<{ statementId: string }> => {
    setStage('uploading')
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Upload failed')
      }

      setStatementId(data.statementId)
      setStage('extraction')

      // Start processing
      await handleProcess(data.statementId)

      return { statementId: data.statementId }
    } catch (err) {
      setStage('failed')
      setError({
        code: 'UPLOAD_ERROR',
        message: err instanceof Error ? err.message : 'Upload failed',
        stage: 'parsing'
      })
      throw err
    }
  }

  const handleProcess = async (id: string) => {
    try {
      setStage('extraction')
      setRetries(0)

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId: id })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Processing failed')
      }

      // Simulate stage progression (in real app, you might poll for status)
      setStage('generation')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setStage('verification')
      await new Promise(resolve => setTimeout(resolve, 1000))

      setStage('completed')
      
      // Fetch results
      await handleGetResults(id)
    } catch (err) {
      setStage('failed')
      setError({
        code: 'PROCESSING_ERROR',
        message: err instanceof Error ? err.message : 'Processing failed',
        stage: 'extraction'
      })
    }
  }

  const handleGetResults = async (id: string) => {
    try {
      const response = await fetch(`/api/results/${id}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Failed to retrieve results')
      }

      setResults(data)
    } catch (err) {
      setError({
        code: 'RESULTS_ERROR',
        message: err instanceof Error ? err.message : 'Failed to retrieve results'
      })
    }
  }

  const handleRetry = () => {
    if (statementId) {
      setError(null)
      handleProcess(statementId)
    }
  }

  const handleReset = () => {
    setStage('idle')
    setStatementId(null)
    setResults(null)
    setError(null)
    setRetries(0)
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="z-10 max-w-5xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Financial Sankey Agent</h1>
          <p className="text-lg text-gray-600">
            Upload a financial statement to generate a verified Sankey diagram
          </p>
        </div>

        {stage === 'idle' && (
          <FileUpload
            onUpload={handleUpload}
            onError={(err) => {
              setError({
                code: 'UPLOAD_ERROR',
                message: err,
                stage: 'parsing'
              })
              setStage('failed')
            }}
          />
        )}

        {(stage === 'uploading' || stage === 'extraction' || stage === 'generation' || stage === 'verification') && (
          <ProcessingStatus stage={stage} retries={retries} />
        )}

        {stage === 'completed' && results && results.urls?.diagram && (
          <div className="space-y-4">
            <ResultsDisplay
              diagramUrl={results.urls.diagram}
              verification={{
                accuracy: results.verification?.accuracy || 0,
                verified: results.verification?.verified || false,
                reasoning: results.verification?.reasoning || 'No reasoning available',
                flowsVerified: results.verification?.flowsVerified || 0,
                flowsTotal: results.verification?.flowsTotal || 0,
                discrepancies: results.verification?.discrepancies || []
              }}
              metadata={{
                processingTime: 0, // Would come from results
                retries: retries,
                flowsExtracted: results.flows?.length || 0
              }}
            />
            <div className="text-center">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Process Another Statement
              </button>
            </div>
          </div>
        )}

        {stage === 'failed' && error && (
          <div className="space-y-4">
            <ErrorDisplay
              error={error}
              partialResults={results ? { flowsExtracted: results.flows?.length } : undefined}
              onRetry={handleRetry}
            />
            <div className="text-center">
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Start Over
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
