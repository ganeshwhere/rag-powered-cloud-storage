'use client'

import React, { useState } from 'react'
import { 
  Folder, 
  Plus,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useFolderTree } from '../hooks'
import { useFolderActions } from '../hooks/useFolderActions'
import type { FolderTreeNode } from '../types'

interface FolderTreeProps {
  selectedFolderId?: string
  onFolderSelect?: (folderId: string) => void
  onCreateFolder?: (parentId?: string) => void
  onRenameFolder?: (folder: FolderTreeNode) => void
  onDeleteFolder?: (folder: FolderTreeNode) => void
  className?: string
}

export const FolderTree: React.FC<FolderTreeProps> = ({
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  className,
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const { folderTree, isLoading, error } = useFolderTree()

  const handleToggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center space-x-2 py-1 px-2 animate-pulse">
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="w-4 h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded flex-1"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className={`text-center text-red-600 py-4 ${className}`}>
        <p className="text-sm">Failed to load folders</p>
        <p className="text-xs text-gray-500 mt-1">{error.message}</p>
      </div>
    )
  }

  if (folderTree.length === 0) {
    return (
      <div className={`text-center text-gray-500 py-8 ${className}`}>
        <Folder className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm">No folders yet</p>
        <Button
          onClick={() => onCreateFolder?.()}
          variant="ghost"
          size="sm"
          className="mt-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Folder
        </Button>
      </div>
    )
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {folderTree.map((node) => (
        <div
          key={node.id}
          className={`
            flex items-center space-x-2 py-2 px-2 rounded-md cursor-pointer hover:bg-gray-100 group
            ${selectedFolderId === node.id ? 'bg-blue-100 text-blue-700' : ''}
          `}
          onClick={() => onFolderSelect?.(node.id)}
        >
          <Folder className="w-4 h-4 text-blue-500 flex-shrink-0" />
          
          <span className="text-sm truncate flex-1">
            {node.name}
          </span>
          
          {node.document_count !== undefined && (
            <span className="text-xs text-gray-500 flex-shrink-0">
              {node.document_count}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 group-hover:opacity-100 flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateFolder?.(node.id)}>
                <Plus className="w-4 h-4 mr-2" />
                New Folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRenameFolder?.(node)}>
                Rename
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDeleteFolder?.(node)}
                variant="destructive"
              >
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}