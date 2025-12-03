'use client'

interface ProcessingStatusProps {
  stage: 'extraction' | 'generation' | 'verification' | 'completed' | 'failed'
  retries?: number
}

const stages = [
  { id: 'extraction', label: 'Extraction', description: 'Extracting financial flows from PDF' },
  { id: 'generation', label: 'Generation', description: 'Generating Sankey diagram' },
  { id: 'verification', label: 'Verification', description: 'Verifying diagram accuracy' },
  { id: 'completed', label: 'Completed', description: 'Processing complete' }
]

export default function ProcessingStatus({ stage, retries = 0 }: ProcessingStatusProps) {
  const currentStageIndex = stages.findIndex(s => s.id === stage)
  const allCompleted = stage === 'completed'
  const isFailed = stage === 'failed'

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="space-y-4">
        {stages.map((stageItem, index) => {
          const isStageCompleted = index < currentStageIndex || (index === currentStageIndex && stage === 'completed')
          const isActive = index === currentStageIndex && !allCompleted && !isFailed
          const isPending = index > currentStageIndex

          return (
            <div
              key={stageItem.id}
              className={`
                flex items-center space-x-4 p-4 rounded-lg border-2 transition-all
                ${isActive ? 'border-blue-500 bg-blue-50' : ''}
                ${isStageCompleted ? 'border-green-500 bg-green-50' : ''}
                ${isPending ? 'border-gray-200 bg-gray-50 opacity-50' : ''}
              `}
            >
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center font-bold
                ${isActive ? 'bg-blue-500 text-white animate-pulse' : ''}
                ${isStageCompleted ? 'bg-green-500 text-white' : ''}
                ${isPending ? 'bg-gray-300 text-gray-600' : ''}
              `}>
                {isStageCompleted ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{stageItem.label}</div>
                <div className="text-sm text-gray-600">{stageItem.description}</div>
              </div>
              {isActive && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
              )}
            </div>
          )
        })}

        {retries > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Retrying generation ({retries} attempt{retries > 1 ? 's' : ''})
            </p>
          </div>
        )}

        {isFailed && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              ❌ Processing failed. Please try again.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

