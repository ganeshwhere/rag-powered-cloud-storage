'use client'

import { MainLayout } from "@/shared/components/layout/main-layout"
import { FolderManager } from "@/features/folders/components"
import { DocumentViewer } from "@/features/documents/components"
import { ProtectedRoute } from "@/shared/components/ProtectedRoute"
import { useState } from "react"
import type { Document } from "@/shared/types/document"

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
        <div className="max-w-7xl mx-auto p-6">
          {selectedDocument ? (
            <DocumentViewer
              documentId={selectedDocument.id}
              onClose={handleCloseViewer}
              onDelete={handleCloseViewer}
            />
          ) : (
            <FolderManager onDocumentSelect={handleDocumentSelect} />
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}