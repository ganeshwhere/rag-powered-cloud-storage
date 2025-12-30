'use client'

import React from 'react'
import { UploadManager } from './UploadManager'
import { UploadFile } from '../../types'
import { APP_CONFIG } from '@/shared/lib/config'

export function UploadDemo() {
  const handleUploadComplete = (documentId: string, file: File) => {
    console.log('Upload completed for file:', file.name, 'Document ID:', documentId)
  }

  const handleUploadStart = (files: File[]) => {
    console.log('Upload started for files:', files.map(f => f.name))
  }

  const handleUploadProgress = (fileId: string, progress: number) => {
    console.log(`Upload progress for ${fileId}: ${progress}%`)
  }

  const handleUploadError = (fileId: string, error: string) => {
    console.error(`Upload error for ${fileId}:`, error)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Document Upload</h1>
        <p className="text-gray-600">
          Upload your documents to get started with {APP_CONFIG.tagline}.
        </p>
      </div>

      <UploadManager
        onUploadComplete={handleUploadComplete}
        onUploadStart={handleUploadStart}
        onUploadProgress={handleUploadProgress}
        onUploadError={handleUploadError}
        className="w-full"
      />
    </div>
  )
}