'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FolderDialog } from './FolderDialog'
import { FolderContents } from './FolderContents'
import { UploadOverlay } from '../../documents/components/upload/UploadOverlay'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Plus, Upload, ArrowLeft, ChevronRight, Home, Search, MoreHorizontal, Folder as FolderIcon } from 'lucide-react'
import { useFolders } from '../hooks'
import type { Folder } from '@/shared/types/folder'
import type { Document } from '@/shared/types/document'
import type { FolderOperation, FolderTreeNode } from '../types'

interface FolderManagerProps {
  onDocumentSelect?: (document: Document) => void
  showUpload?: boolean
  onShowUploadChange?: (show: boolean) => void
  className?: string
}

export const FolderManager: React.FC<FolderManagerProps> = ({
  onDocumentSelect,
  showUpload: externalShowUpload,
  onShowUploadChange,
  className,
}) => {
  const router = useRouter()
  const [selectedFolderId, setSelectedFolderId] = useState<string>()
  const [folderHistory, setFolderHistory] = useState<Array<string | undefined>>([])
  const [showUploadOverlay, setShowUploadOverlay] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { folders: allFolders } = useFolders({ parent_id: undefined })
  const { folders: currentFolders } = useFolders({ parent_id: selectedFolderId })

  const buildFolderPath = (folderId?: string): Array<{ id?: string; name: string }> => {
    if (!folderId) return [{ name: 'Home' }]

    const path: Array<{ id?: string; name: string }> = [{ name: 'Home' }]
    const folder = allFolders.find((f) => f.id === folderId)

    if (folder) {
      path.push({ id: folder.id, name: folder.name })
    }

    return path
  }

  const folderPath = buildFolderPath(selectedFolderId)
  const selectedFolder = selectedFolderId ? allFolders.find((f) => f.id === selectedFolderId) : undefined

  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    operation: FolderOperation
    folder?: Folder | FolderTreeNode
    parentId?: string
  }>({
    isOpen: false,
    operation: 'create',
  })

  const isUploadControlled = typeof externalShowUpload === 'boolean'
  const isUploadOpen = isUploadControlled ? Boolean(externalShowUpload) : showUploadOverlay

  const openUploadOverlay = () => {
    if (isUploadControlled) {
      onShowUploadChange?.(true)
      return
    }

    setShowUploadOverlay(true)
  }

  const closeUploadOverlay = () => {
    if (isUploadControlled) {
      onShowUploadChange?.(false)
      return
    }

    setShowUploadOverlay(false)
  }

  const handleFolderSelect = (folderId: string) => {
    setFolderHistory((prev) => [...prev, selectedFolderId])
    setSelectedFolderId(folderId)
  }

  const handleGoBack = () => {
    if (folderHistory.length === 0) {
      setSelectedFolderId(undefined)
      return
    }

    const previousFolderId = folderHistory[folderHistory.length - 1]
    setFolderHistory((prev) => prev.slice(0, -1))
    setSelectedFolderId(previousFolderId)
  }

  const handleBreadcrumbClick = (pathIndex: number) => {
    if (pathIndex === 0) {
      setFolderHistory([])
      setSelectedFolderId(undefined)
      return
    }

    const targetFolder = folderPath[pathIndex]
    if (!targetFolder?.id || targetFolder.id === selectedFolderId) {
      return
    }

    setFolderHistory((prev) => [...prev, selectedFolderId])
    setSelectedFolderId(targetFolder.id)
  }

  const handleQuickAction = (action: 'upload' | 'newFolder' | 'refresh') => {
    switch (action) {
      case 'upload':
        openUploadOverlay()
        break
      case 'newFolder':
        setDialogState({
          isOpen: true,
          operation: 'create',
          parentId: selectedFolderId,
        })
        break
      case 'refresh':
        router.refresh()
        break
    }
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

  const handleDialogSuccess = () => {
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

  return (
    <>
      <div className={`space-y-6 ${className ?? ''}`}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
            <p className="mt-1 text-gray-600">Organize and manage your documents</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGoBack}
                  disabled={!selectedFolderId && folderHistory.length === 0}
                  className="text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex items-center space-x-1">
                {folderPath.map((pathItem, index) => (
                  <div key={index} className="flex items-center space-x-1">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleBreadcrumbClick(index)}
                      className={`px-3 py-1 text-sm ${
                        index === folderPath.length - 1
                          ? 'bg-gray-100 font-medium text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {index === 0 ? (
                        <div className="flex items-center space-x-1">
                          <Home className="h-4 w-4" />
                          <span>{pathItem.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <FolderIcon className="h-4 w-4" />
                          <span>{pathItem.name}</span>
                        </div>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-64 rounded-lg border border-gray-200 py-2 pl-10 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction('upload')}
                  className="border-blue-200 text-blue-600 hover:bg-blue-50"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>

                <Button variant="outline" size="sm" onClick={() => handleQuickAction('newFolder')}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Folder
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => handleQuickAction('refresh')}>Refresh</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Select All</DropdownMenuItem>
                    <DropdownMenuItem>Properties</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-gray-50 px-6 py-3">
            <span className="text-sm text-gray-600">
              {currentFolders.length === 1 ? '1 folder' : `${currentFolders.length} folders`}
            </span>

            <div className="text-sm text-gray-500">{selectedFolder ? `In ${selectedFolder.name}` : 'All Items'}</div>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <FolderContents
              folderId={selectedFolderId}
              onDocumentSelect={onDocumentSelect}
              onFolderSelect={handleFolderSelect}
              onFolderRename={handleRenameFolder}
              onFolderDelete={handleDeleteFolder}
              searchQuery={searchQuery}
            />
          </div>
        </div>

        <FolderDialog
          isOpen={dialogState.isOpen}
          operation={dialogState.operation}
          folder={dialogState.folder as Folder}
          parentId={dialogState.parentId}
          onClose={handleCloseDialog}
          onSuccess={handleDialogSuccess}
        />
      </div>

      <UploadOverlay
        isOpen={isUploadOpen}
        onClose={closeUploadOverlay}
        folderId={selectedFolderId}
        folderName={selectedFolder?.name}
        onUploadComplete={closeUploadOverlay}
      />
    </>
  )
}
