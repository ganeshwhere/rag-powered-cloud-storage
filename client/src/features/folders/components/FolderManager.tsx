'use client'

import React, { useState } from 'react'
import { FolderTree } from './FolderTree'
import { FolderBreadcrumbs } from './FolderBreadcrumbs'
import { FolderDialog } from './FolderDialog'
import { DocumentList } from '../../documents/components/DocumentList'
import { UploadManager } from '../../documents/components/upload/UploadManager'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Plus, Grid, List, Upload } from 'lucide-react'
import type { Folder } from '@/shared/types/folder'
import type { Document } from '@/shared/types/document'
import type { FolderOperation, FolderTreeNode } from '../types'

interface FolderManagerProps {
  onDocumentSelect?: (document: Document) => void
  className?: string
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  onDocumentSelect,
  className,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>()
  const [viewMode, setViewMode] = useState<'tree' | 'grid'>('tree')
  const [showUpload, setShowUpload] = useState(false)
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    operation: FolderOperation
    folder?: Folder | FolderTreeNode
    parentId?: string
  }>({
    isOpen: false,
    operation: 'create',
  })

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId)
  }

  const handleNavigate = (folderId?: string) => {
    setSelectedFolderId(folderId)
  }

  const handleCreateFolder = (parentId?: string) => {
    setDialogState({
      isOpen: true,
      operation: 'create',
      parentId: parentId || selectedFolderId,
    })
  }

  const handleRenameFolder = (folder: Folder | FolderTreeNode) => {
    setDialogState({
      isOpen: true,
      operation: 'rename',
      folder,
    })
  }

  const handleDeleteFolder = (folder: Folder | FolderTreeNode) => {
    setDialogState({
      isOpen: true,
      operation: 'delete',
      folder,
    })
  }

  const handleDialogSuccess = (folder?: Folder) => {
    // If a folder was deleted and it was the currently selected folder,
    // reset the selection to avoid 404 errors
    if (dialogState.operation === 'delete' && dialogState.folder && selectedFolderId === dialogState.folder.id) {
      setSelectedFolderId(undefined)
    }
  }

  const handleCloseDialog = () => {
    setDialogState({
      isOpen: false,
      operation: 'create',
    })
  }

  const handleUploadComplete = () => {
    // Refresh the document list when upload completes
    // The DocumentList component will automatically refresh via React Query
  }

  if (showUpload) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Documents</h2>
            <p className="text-gray-600 mt-1">Upload documents to your library</p>
          </div>
          
          <Button onClick={() => setShowUpload(false)} variant="outline">
            Back to Documents
          </Button>
        </div>

        {/* Upload Interface */}
        <UploadManager 
          folderId={selectedFolderId}
          onUploadComplete={handleUploadComplete}
        />
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
          <p className="text-gray-600 mt-1">Organize and manage your documents</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'tree' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('tree')}
          >
            <List className="w-4 h-4 mr-2" />
            Tree
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4 mr-2" />
            Grid
          </Button>
          <Button onClick={() => setShowUpload(true)} variant="default">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
          <Button onClick={() => handleCreateFolder()}>
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </div>
      </div>

      {/* Breadcrumbs */}
      {selectedFolderId && (
        <FolderBreadcrumbs
          folderId={selectedFolderId}
          onNavigate={handleNavigate}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Folder Tree */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Folders</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <FolderTree
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onDeleteFolder={handleDeleteFolder}
              />
            </CardContent>
          </Card>
        </div>

        {/* Main Content - Documents */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedFolderId ? 'Documents in Folder' : 'All Documents'}
                </CardTitle>
                <Button 
                  onClick={() => setShowUpload(true)} 
                  size="sm"
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <DocumentList
                folderId={selectedFolderId}
                onDocumentSelect={onDocumentSelect}
                selectable={false}
                onUploadClick={() => setShowUpload(true)}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Folder Dialog */}
      <FolderDialog
        isOpen={dialogState.isOpen}
        operation={dialogState.operation}
        folder={dialogState.folder as Folder}
        parentId={dialogState.parentId}
        onClose={handleCloseDialog}
        onSuccess={handleDialogSuccess}
      />
    </div>
  )
}