'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { MainLayout } from '@/shared/components/layout/main-layout'
import { FolderManager } from '@/features/folders/components'
import { DocumentViewer } from '@/features/documents/components'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import type { Document } from '@/shared/types/document'

export default function DocumentsPage() {
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null)

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document)
  }

  const handleCloseViewer = () => {
    setSelectedDocument(null)
  }

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="w-full space-y-6 animate-rise-in">
          <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <FileText className="h-3.5 w-3.5" />
              Library
            </div>
            <h1 className="mt-4 font-display text-3xl font-semibold leading-tight sm:text-4xl">Your Documents</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Browse folders, open files, and keep your knowledge base organized.
            </p>
          </section>

          <section className="surface-border rounded-2xl border-white/70 bg-white/82 p-4 sm:p-6">
            {selectedDocument ? (
              <DocumentViewer
                documentId={selectedDocument.id}
                onClose={handleCloseViewer}
                onDelete={handleCloseViewer}
              />
            ) : (
              <FolderManager onDocumentSelect={handleDocumentSelect} />
            )}
          </section>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
