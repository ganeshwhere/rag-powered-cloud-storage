'use client'

import React, { useState, useCallback } from 'react'
import { FileUploadZone } from './FileUploadZone'
import { UploadProgress } from './UploadProgress'
import { useDocumentUpload } from '../../hooks/useDocumentUpload'
import { UploadFile, UploadConfig, DEFAULT_UPLOAD_CONFIG } from '../../types'

interface UploadManagerProps {
  onUploadComplete?: (documentId: string, file: File) => void
  onUploadStart?: (files: File[]) => void
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
  const uploadConfig = { ...DEFAULT_UPLOAD_CONFIG, ...config }

  const {
    uploadFiles,
    uploadingFiles,
    removeFile,
    clearCompleted,
    clearAll,
    isUploading,
    error,
  } = useDocumentUpload({
    folder_id: folderId,
    onUploadComplete: (documentId, file) => {
      onUploadComplete?.(documentId, file)
    },
    onUploadError: (error, file) => {
      const fileId = `${file.name}-${file.size}-${file.lastModified}`
      onUploadError?.(fileId, error.message)
    },
    onUploadProgress: (progress) => {
      onUploadProgress?.(progress.fileId, progress.progress)
    },
    usePresignedUrl: true,
  })

  const handleFilesSelected = useCallback(async (newFiles: UploadFile[]) => {
    const files = newFiles.map(uf => uf.file)
    onUploadStart?.(files)
    await uploadFiles(files, folderId)
  }, [uploadFiles, folderId, onUploadStart])

  const handleRetry = useCallback((fileId: string) => {
    const uploadFile = uploadingFiles.find(f => f.id === fileId)
    if (uploadFile) {
      uploadFiles([uploadFile.file], folderId)
    }
  }, [uploadingFiles, uploadFiles, folderId])

  const handleCancel = useCallback((fileId: string) => {
    removeFile(fileId)
  }, [removeFile])

  const handleRemove = useCallback((fileId: string) => {
    removeFile(fileId)
  }, [removeFile])

  return (
    <div className={className}>
      <FileUploadZone
        onFilesSelected={handleFilesSelected}
        config={config}
        disabled={isUploading}
        folderId={folderId}
      />
      
      {uploadingFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">Upload Progress</h3>
            <div className="flex gap-2">
              {uploadingFiles.some(f => f.status === 'completed') && (
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
            files={uploadingFiles}
            onRetry={handleRetry}
            onCancel={handleCancel}
            onRemove={handleRemove}
          />
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">
            Upload Error: {error.message}
          </p>
        </div>
      )}
    </div>
  )
}