'use client'

import React from 'react'
import { useFolders } from '../hooks'
import { useDocuments } from '../../documents/hooks'
import { FolderCard } from './FolderCard'
import { DocumentCard } from '../../documents/components/DocumentCard'
import { DocumentListSkeleton } from '../../documents/components/DocumentListSkeleton'
import { FileText, Folder, SearchX, XCircle } from 'lucide-react'
import type { Document } from '@/shared/types/document'
import type { Folder as FolderType } from '@/shared/types/folder'

interface FolderContentsProps {
  folderId?: string
  onDocumentSelect?: (document: Document) => void
  onFolderSelect?: (folderId: string) => void
  onFolderRename?: (folder: FolderType) => void
  onFolderDelete?: (folder: FolderType) => void
  searchQuery?: string
  className?: string
}

export const FolderContents: React.FC<FolderContentsProps> = ({
  folderId,
  onDocumentSelect,
  onFolderSelect,
  onFolderRename,
  onFolderDelete,
  searchQuery = '',
  className,
}) => {
  const {
    folders,
    isLoading: foldersLoading,
    error: foldersError,
  } = useFolders({
    parent_id: folderId,
  })

  const {
    documents,
    isLoading: documentsLoading,
    error: documentsError,
  } = useDocuments({
    folder_id: folderId,
    page: 1,
    page_size: 50,
  })

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredFolders = normalizedQuery
    ? folders.filter((folder) => folder.name.toLowerCase().includes(normalizedQuery))
    : folders

  const filteredDocuments = normalizedQuery
    ? documents.filter((document) => document.name.toLowerCase().includes(normalizedQuery))
    : documents

  const isLoading = foldersLoading || documentsLoading
  const hasError = foldersError || documentsError
  const isEmpty = filteredFolders.length === 0 && filteredDocuments.length === 0

  if (isLoading) {
    return <DocumentListSkeleton />
  }

  if (hasError) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className ?? ''}`}>
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-red-100 to-red-200">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-900">Failed to load folder contents</h3>

        <p className="max-w-sm text-center text-gray-500">{foldersError?.message || documentsError?.message}</p>
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className={`flex flex-col items-center justify-center py-16 ${className ?? ''}`}>
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200">
          {normalizedQuery ? <SearchX className="h-10 w-10 text-gray-400" /> : <Folder className="h-10 w-10 text-gray-400" />}
        </div>

        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          {normalizedQuery ? 'No matching items' : 'No data available'}
        </h3>

        <p className="max-w-sm text-center text-gray-500">
          {normalizedQuery
            ? `No folders or documents match "${searchQuery}".`
            : folderId
              ? 'This folder is empty. Create subfolders or upload documents to get started.'
              : 'No folders or documents found. Create a new folder or upload documents to get started.'}
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      <div className="space-y-4">
        {filteredFolders.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700">
              <Folder className="mr-2 h-4 w-4" />
              Folders ({filteredFolders.length})
            </h4>
            <div className="grid gap-3">
              {filteredFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => onFolderSelect?.(folder.id)}
                  onRename={() => onFolderRename?.(folder)}
                  onDelete={() => onFolderDelete?.(folder)}
                />
              ))}
            </div>
          </div>
        )}

        {filteredDocuments.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center text-sm font-medium text-gray-700">
              <FileText className="mr-2 h-4 w-4" />
              Documents ({filteredDocuments.length})
            </h4>
            <div className="grid gap-3">
              {filteredDocuments.map((document) => (
                <DocumentCard
                  key={document.id}
                  document={document}
                  selected={false}
                  selectable={false}
                  onSelect={() => {}}
                  onClick={() => onDocumentSelect?.(document)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
