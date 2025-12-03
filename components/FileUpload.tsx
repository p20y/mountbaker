'use client'

import { useState, useCallback } from 'react'

interface FileUploadProps {
  onUpload: (file: File) => Promise<{ statementId: string }>
  onError?: (error: string) => void
}

export default function FileUpload({ onUpload, onError }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  const validateFile = (file: File): string | null => {
    if (file.type !== 'application/pdf') {
      return 'Invalid file type. Only PDF files are allowed.'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
    if (file.size === 0) {
      return 'File is empty'
    }
    return null
  }

  const handleFile = useCallback(async (file: File) => {
    const error = validateFile(file)
    if (error) {
      onError?.(error)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const result = await onUpload(file)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      
      // Reset after a moment
      setTimeout(() => {
        setIsUploading(false)
        setUploadProgress(0)
      }, 500)
    } catch (error) {
      setIsUploading(false)
      setUploadProgress(0)
      onError?.(error instanceof Error ? error.message : 'Upload failed')
    }
  }, [onUpload, onError])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileInput}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="space-y-4">
            <div className="text-6xl">📄</div>
            <div>
              <p className="text-xl font-semibold mb-2">
                {isUploading ? 'Uploading...' : 'Drop your PDF here or click to browse'}
              </p>
              <p className="text-sm text-gray-500">
                PDF files only, max {MAX_FILE_SIZE / 1024 / 1024}MB
              </p>
            </div>
            {isUploading && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  )
}

