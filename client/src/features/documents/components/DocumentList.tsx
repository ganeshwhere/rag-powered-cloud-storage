'use client'

import React, { useState } from 'react'
import { useDocuments } from '../hooks'
import { useDocumentActions } from '../hooks/useDocumentActions'
import { DocumentCard } from './DocumentCard'
import { DocumentListHeader } from './DocumentListHeader'
import { DocumentListEmpty } from './DocumentListEmpty'
import { DocumentListSkeleton } from './DocumentListSkeleton'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import type { Document } from '@/shared/types/document'

interface DocumentListProps {
  folderId?: string
  onDocumentSelect?: (document: Document) => void
  selectable?: boolean
  onUploadClick?: () => void
  className?: string
}

export const DocumentList: React.FC<DocumentListProps> = ({
  folderId,
  onDocumentSelect,
  selectable = false,
  onUploadClick,
  className,
}) => {
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20

  const {
    documents,
    total,
    isLoading,
    error,
    hasNextPage,
    prefetchNextPage,
  } = useDocuments({
    folder_id: folderId,
    page: currentPage,
    page_size: pageSize,
  })

  const { bulkDeleteDocuments } = useDocumentActions()

  const handleDocumentSelect = (documentId: string, selected: boolean) => {
    const newSelected = new Set(selectedDocuments)
    if (selected) {
      newSelected.add(documentId)
    } else {
      newSelected.delete(documentId)
    }
    setSelectedDocuments(newSelected)
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedDocuments(new Set(documents.map(doc => doc.id)))
    } else {
      setSelectedDocuments(new Set())
    }
  }

  const handleBulkDelete = async () => {
    if (selectedDocuments.size === 0) return
    
    try {
      await bulkDeleteDocuments.mutateAsync(Array.from(selectedDocuments))
      setSelectedDocuments(new Set())
    } catch (error) {
      console.error('Failed to delete documents:', error)
    }
  }

  const handleLoadMore = () => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
      prefetchNextPage()
    }
  }

  if (isLoading && documents.length === 0) {
    return <DocumentListSkeleton />
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load documents</p>
            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (documents.length === 0) {
    return <DocumentListEmpty folderId={folderId} className={className} onUploadClick={onUploadClick} />
  }

  return (
    <div className={className}>
      <DocumentListHeader
        totalDocuments={total}
        selectedCount={selectedDocuments.size}
        onSelectAll={handleSelectAll}
        onBulkDelete={handleBulkDelete}
        showBulkActions={selectable && selectedDocuments.size > 0}
        isDeleting={bulkDeleteDocuments.isPending}
      />

      <div className="grid gap-4 mt-4">
        {documents.map((document) => (
          <DocumentCard
            key={document.id}
            document={document}
            selected={selectedDocuments.has(document.id)}
            selectable={selectable}
            onSelect={(selected) => handleDocumentSelect(document.id, selected)}
            onClick={() => onDocumentSelect?.(document)}
          />
        ))}
      </div>

      {hasNextPage && (
        <div className="flex justify-center mt-6">
          <Button
            onClick={handleLoadMore}
            variant="outline"
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}

      {isLoading && documents.length > 0 && (
        <div className="mt-4">
          <DocumentListSkeleton count={3} />
        </div>
      )}
    </div>
  )
}