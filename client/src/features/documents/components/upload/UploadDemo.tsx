'use client'

import React from 'react'
import { UploadCloud } from 'lucide-react'
import { UploadManager } from './UploadManager'
import { APP_CONFIG } from '@/shared/lib/config'

interface UploadDemoProps {
  className?: string
}

export function UploadDemo({ className }: UploadDemoProps) {
  const handleUploadComplete = (documentId: string, file: File) => {
    console.log('Upload completed for file:', file.name, 'Document ID:', documentId)
  }

  const handleUploadStart = (files: File[]) => {
    console.log('Upload started for files:', files.map((f) => f.name))
  }

  const handleUploadProgress = (fileId: string, progress: number) => {
    console.log(`Upload progress for ${fileId}: ${progress}%`)
  }

  const handleUploadError = (fileId: string, error: string) => {
    console.error(`Upload error for ${fileId}:`, error)
  }

  return (
    <div className={className}>
      <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
          <UploadCloud className="h-3.5 w-3.5" />
          Upload Center
        </div>
        <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">Document Upload</h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          Upload your documents to get started with {APP_CONFIG.tagline}.
        </p>
      </section>

      <section className="surface-border mt-6 rounded-2xl border-white/70 bg-white/85 p-5 sm:p-6">
        <UploadManager
          onUploadComplete={handleUploadComplete}
          onUploadStart={handleUploadStart}
          onUploadProgress={handleUploadProgress}
          onUploadError={handleUploadError}
          className="w-full"
        />
      </section>
    </div>
  )
}
