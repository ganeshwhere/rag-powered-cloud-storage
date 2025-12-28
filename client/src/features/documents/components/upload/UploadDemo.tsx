'use client'

import React from 'react'
import { UploadManager } from './UploadManager'
import { UploadFile } from '../../types'

export function UploadDemo() {
  const handleUploadComplete = (files: UploadFile[]) => {
    console.log('Upload completed for files:', files.map(f => f.file.name))
  }

  const handleUploadStart = (files: UploadFile[]) => {
    console.log('Upload started for files:', files.map(f => f.file.name))
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
          Upload your documents to get started with AI-powered search and analysis.
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