'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { DashboardLayout } from '@/shared/components/layout/dashboard-layout'
import { FolderManager } from '@/features/folders/components'
import { DocumentViewer } from '@/features/documents/components'
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
    <DashboardLayout title="Documents">
      <div className="space-y-6 animate-rise-in">
        <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            <FileText className="h-3.5 w-3.5" />
            Dashboard Library
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">Manage Documents</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            Browse folders, inspect files, and manage your indexed knowledge base.
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
    </DashboardLayout>
  )
}
