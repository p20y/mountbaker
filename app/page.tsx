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
  const [diagramUrl, setDiagramUrl] = useState<string | null>(null)

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
      setDiagramUrl(null) // Reset diagram URL

      // Move to generation stage
      setStage('generation')

      // Start processing (this runs in the background)
      const processPromise = fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statementId: id })
      })

      // Poll for diagram availability after generation stage
      // Check every 2 seconds for up to 60 seconds
      const pollForDiagram = async () => {
        // Wait a bit for generation to start
        await new Promise(resolve => setTimeout(resolve, 5000))
        
        for (let i = 0; i < 30; i++) {
          await new Promise(resolve => setTimeout(resolve, 2000))
          
          try {
            const diagramResponse = await fetch(`/api/diagram/${id}`)
            const diagramData = await diagramResponse.json()
            
            if (diagramData.success && diagramData.diagramUrl) {
              console.log('Diagram found:', diagramData.diagramUrl)
              setDiagramUrl(diagramData.diagramUrl)
              setStage('verification') // Move to verification stage once diagram is available
              return // Diagram found, stop polling
            } else {
              console.log('Diagram not yet available, attempt:', i + 1)
            }
          } catch (err) {
            console.log('Error polling for diagram:', err)
            // Continue polling
          }
        }
        console.log('Diagram polling completed without finding diagram')
      }

      // Start polling for diagram
      pollForDiagram()

      // Wait for processing to complete
      const response = await processPromise
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error?.message || 'Processing failed')
      }

      // If diagram not yet found, try one more time
      if (!diagramUrl) {
        try {
          const diagramResponse = await fetch(`/api/diagram/${id}`)
          const diagramData = await diagramResponse.json()
          if (diagramData.success && diagramData.diagramUrl) {
            setDiagramUrl(diagramData.diagramUrl)
          }
        } catch (err) {
          // Ignore
        }
      }

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
    setDiagramUrl(null)
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
          <div className="space-y-6">
            <ProcessingStatus stage={stage} retries={retries} />
            
            {/* Display diagram if available (after generation, during verification) */}
            {diagramUrl && (stage === 'verification' || stage === 'generation') && (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold mb-4">Generated Diagram</h2>
                <p className="text-sm text-gray-600 mb-4">
                  {stage === 'verification' ? 'Diagram generated. Verifying accuracy...' : 'Diagram generated. Waiting for verification...'}
                </p>
                <div className="border-2 border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={diagramUrl} 
                    alt="Generated Sankey Diagram" 
                    className="w-full h-auto"
                    onError={(e) => {
                      console.error('Error loading diagram image:', e)
                      setDiagramUrl(null)
                    }}
                  />
                </div>
              </div>
            )}
          </div>
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
