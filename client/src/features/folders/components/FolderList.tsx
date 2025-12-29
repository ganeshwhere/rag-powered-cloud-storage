'use client'

import React, { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  Folder, 
  MoreHorizontal,
  Plus,
  Trash2,
  Edit,
  FileText,
} from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useFolders } from '../hooks'
import { FolderDialog } from './FolderDialog'
import type { Folder as FolderType } from '@/shared/types/folder'
import type { FolderOperation } from '../types'

interface FolderListProps {
  parentId?: string
  onFolderSelect?: (folder: FolderType) => void
  selectable?: boolean
  className?: string
}

interface FolderCardProps {
  folder: FolderType
  onSelect?: () => void
  onRename?: () => void
  onDelete?: () => void
  className?: string
}

const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onSelect,
  onRename,
  onDelete,
  className,
}) => {
  return (
    <Card 
      className={`
        transition-all duration-200 hover:shadow-md cursor-pointer
        ${className}
      `}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <Folder className="w-8 h-8 text-blue-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                {folder.name}
              </h3>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                <span>
                  {formatDistanceToNow(new Date(folder.created_at), { addSuffix: true })}
                </span>
                {folder.document_count !== undefined && (
                  <div className="flex items-center space-x-1">
                    <FileText className="w-3 h-3" />
                    <span>{folder.document_count} documents</span>
                  </div>
                )}
              </div>
              
              <div className="text-xs text-gray-400 truncate">
                {folder.path}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRename}>
                <Edit className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={onDelete}
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

export const FolderList: React.FC<FolderListProps> = ({
  parentId,
  onFolderSelect,
  selectable = false,
  className,
}) => {
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean
    operation: FolderOperation
    folder?: FolderType
  }>({
    isOpen: false,
    operation: 'create',
  })

  const { folders, isLoading, error } = useFolders({
    parent_id: parentId,
    include_documents: true,
  })

  const handleCreateFolder = () => {
    setDialogState({
      isOpen: true,
      operation: 'create',
    })
  }

  const handleRenameFolder = (folder: FolderType) => {
    setDialogState({
      isOpen: true,
      operation: 'rename',
      folder,
    })
  }

  const handleDeleteFolder = (folder: FolderType) => {
    setDialogState({
      isOpen: true,
      operation: 'delete',
      folder,
    })
  }

  const handleCloseDialog = () => {
    setDialogState({
      isOpen: false,
      operation: 'create',
    })
  }

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load folders</p>
            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (folders.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-12">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No folders yet
            </h3>
            
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              Create folders to organize your documents and keep everything tidy.
            </p>
            
            <Button onClick={handleCreateFolder} className="inline-flex items-center">
              <Plus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">
          Folders ({folders.length})
        </h3>
        <Button onClick={handleCreateFolder} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((folder) => (
          <FolderCard
            key={folder.id}
            folder={folder}
            onSelect={() => onFolderSelect?.(folder)}
            onRename={() => handleRenameFolder(folder)}
            onDelete={() => handleDeleteFolder(folder)}
          />
        ))}
      </div>

      <FolderDialog
        isOpen={dialogState.isOpen}
        operation={dialogState.operation}
        folder={dialogState.folder}
        parentId={parentId}
        onClose={handleCloseDialog}
      />
    </div>
  )
}