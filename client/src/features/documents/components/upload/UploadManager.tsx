'use client'

import React, { useState, useCallback, useRef } from 'react'
import { FileUploadZone } from './FileUploadZone'
import { UploadProgress } from './UploadProgress'
import { UploadFile, UploadConfig, DEFAULT_UPLOAD_CONFIG } from '../../types'

interface UploadManagerProps {
  onUploadComplete?: (files: UploadFile[]) => void
  onUploadStart?: (files: UploadFile[]) => void
  onUploadProgress?: (fileId: string, progress: number) => void
  onUploadError?: (fileId: string, error: string) => void
  config?: Partial<UploadConfig>
  folderId?: string
  className?: string
}

export function UploadManager({
  onUploadComplete,
  onUploadStart,
  onUploadProgress,
  onUploadError,
  config = {},
  folderId,
  className,
}: UploadManagerProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const uploadConfig = { ...DEFAULT_UPLOAD_CONFIG, ...config }
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

  const updateFileStatus = useCallback((fileId: string, updates: Partial<UploadFile>) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId ? { ...file, ...updates } : file
    ))
  }, [])

  const simulateUpload = useCallback(async (file: UploadFile) => {
    const controller = new AbortController()
    abortControllersRef.current.set(file.id, controller)

    try {
      updateFileStatus(file.id, { status: 'uploading', progress: 0 })
      
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        if (controller.signal.aborted) {
          throw new Error('Upload cancelled')
        }
        
        await new Promise(resolve => setTimeout(resolve, 200))
        updateFileStatus(file.id, { progress })
        onUploadProgress?.(file.id, progress)
      }

      // Simulate processing phase
      updateFileStatus(file.id, { status: 'processing', progress: 100 })
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Simulate random success/failure for demo
      const success = Math.random() > 0.2 // 80% success rate
      
      if (success) {
        const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        updateFileStatus(file.id, { 
          status: 'completed', 
          progress: 100,
          documentId 
        })
      } else {
        throw new Error('Processing failed - simulated error')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateFileStatus(file.id, { 
        status: 'failed', 
        error: errorMessage 
      })
      onUploadError?.(file.id, errorMessage)
    } finally {
      abortControllersRef.current.delete(file.id)
    }
  }, [updateFileStatus, onUploadProgress, onUploadError])

  const handleFilesSelected = useCallback(async (newFiles: UploadFile[]) => {
    setFiles(prev => [...prev, ...newFiles])
    setIsUploading(true)
    onUploadStart?.(newFiles)

    // Process uploads with concurrency limit
    const uploadPromises: Promise<void>[] = []
    let activeUploads = 0

    for (const file of newFiles) {
      if (activeUploads >= uploadConfig.maxConcurrentUploads) {
        await Promise.race(uploadPromises)
        activeUploads--
      }

      activeUploads++
      const uploadPromise = simulateUpload(file).finally(() => {
        activeUploads--
      })
      uploadPromises.push(uploadPromise)
    }

    // Wait for all uploads to complete
    await Promise.allSettled(uploadPromises)
    setIsUploading(false)

    // Notify completion
    const completedFiles = files.filter(f => f.status === 'completed')
    if (completedFiles.length > 0) {
      onUploadComplete?.(completedFiles)
    }
  }, [files, uploadConfig.maxConcurrentUploads, simulateUpload, onUploadStart, onUploadComplete])

  const handleRetry = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId)
    if (file) {
      updateFileStatus(fileId, { status: 'pending', progress: 0, error: undefined })
      simulateUpload(file)
    }
  }, [files, updateFileStatus, simulateUpload])

  const handleCancel = useCallback((fileId: string) => {
    const controller = abortControllersRef.current.get(fileId)
    if (controller) {
      controller.abort()
    }
    updateFileStatus(fileId, { status: 'failed', error: 'Upload cancelled' })
  }, [updateFileStatus])

  const handleRemove = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
    const controller = abortControllersRef.current.get(fileId)
    if (controller) {
      controller.abort()
      abortControllersRef.current.delete(fileId)
    }
  }, [])

  const clearCompleted = useCallback(() => {
    setFiles(prev => prev.filter(f => f.status !== 'completed'))
  }, [])

  const clearAll = useCallback(() => {
    // Cancel all active uploads
    abortControllersRef.current.forEach(controller => controller.abort())
    abortControllersRef.current.clear()
    setFiles([])
    setIsUploading(false)
  }, [])

  return (
    <div className={className}>
      <FileUploadZone
        onFilesSelected={handleFilesSelected}
        config={config}
        disabled={isUploading}
        folderId={folderId}
      />
      
      {files.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Upload Progress</h3>
            <div className="flex gap-2">
              {files.some(f => f.status === 'completed') && (
                <button
                  onClick={clearCompleted}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear completed
                </button>
              )}
              <button
                onClick={clearAll}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          </div>
          
          <UploadProgress
            files={files}
            onRetry={handleRetry}
            onCancel={handleCancel}
            onRemove={handleRemove}
          />
        </div>
      )}
    </div>
  )
}