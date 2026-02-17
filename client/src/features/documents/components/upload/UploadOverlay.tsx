'use client'

import React, { useState, useCallback } from 'react'
import { X, Upload, FileText, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { FileUploadZone } from './FileUploadZone'
import { UploadProgress } from './UploadProgress'
import { useDocumentUpload } from '../../hooks/useDocumentUpload'
import { UploadFile, UploadConfig, DEFAULT_UPLOAD_CONFIG } from '../../types'

interface UploadOverlayProps {
  isOpen: boolean
  onClose: () => void
  folderId?: string
  folderName?: string
  onUploadComplete?: () => void
  config?: Partial<UploadConfig>
}

export function UploadOverlay({
  isOpen,
  onClose,
  folderId,
  folderName,
  onUploadComplete,
  config = {},
}: UploadOverlayProps) {
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
      // Auto-close overlay when all uploads are complete
      if (uploadingFiles.every(f => f.status === 'completed' || f.status === 'failed')) {
        setTimeout(() => {
          onUploadComplete?.()
          onClose()
        }, 1000)
      }
    },
    usePresignedUrl: true,
  })

  const handleFilesSelected = useCallback(async (newFiles: UploadFile[]) => {
    const files = newFiles.map(uf => uf.file)
    await uploadFiles(files, folderId)
  }, [uploadFiles, folderId])

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

  const handleClose = useCallback(() => {
    if (isUploading) {
      const confirmClose = window.confirm('Upload is in progress. Are you sure you want to close?')
      if (!confirmClose) return
    }
    onClose()
  }, [isUploading, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Upload Documents</h2>
              <p className="text-sm text-gray-500">
                {folderName ? `Upload to "${folderName}" folder` : 'Upload to root directory'}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Upload Zone */}
          <FileUploadZone
            onFilesSelected={handleFilesSelected}
            config={uploadConfig}
            disabled={isUploading}
            folderId={folderId}
          />

          {/* Upload Progress */}
          {uploadingFiles.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Upload Progress</h3>
                <div className="flex gap-2">
                  {uploadingFiles.some(f => f.status === 'completed') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearCompleted}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear completed
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </Button>
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

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-red-800">Upload Error</h4>
                <p className="text-sm text-red-600 mt-1">{error.message}</p>
              </div>
            </div>
          )}

          {/* Upload Stats */}
          {uploadingFiles.length > 0 && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-600">
                    Total files: <span className="font-medium">{uploadingFiles.length}</span>
                  </span>
                  <span className="text-green-600">
                    Completed: <span className="font-medium">
                      {uploadingFiles.filter(f => f.status === 'completed').length}
                    </span>
                  </span>
                  {uploadingFiles.some(f => f.status === 'failed') && (
                    <span className="text-red-600">
                      Failed: <span className="font-medium">
                        {uploadingFiles.filter(f => f.status === 'failed').length}
                      </span>
                    </span>
                  )}
                </div>
                
                {isUploading && (
                  <div className="flex items-center space-x-2 text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">Uploading...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            {isUploading ? 'Cancel Upload' : 'Close'}
          </Button>
          
          {uploadingFiles.length > 0 && !isUploading && (
            <Button
              onClick={() => {
                onUploadComplete?.()
                onClose()
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileText className="w-4 h-4 mr-2" />
              Done
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}