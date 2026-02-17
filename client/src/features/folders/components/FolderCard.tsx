'use client'

import React from 'react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Folder, MoreVertical, Edit, Trash2, FolderOpen } from 'lucide-react'
import type { Folder as FolderType } from '@/shared/types/folder'

interface FolderCardProps {
  folder: FolderType
  onClick?: () => void
  onRename?: () => void
  onDelete?: () => void
  viewMode?: 'tree' | 'grid'
  className?: string
}

export const FolderCard: React.FC<FolderCardProps> = ({
  folder,
  onClick,
  onRename,
  onDelete,
  viewMode = 'tree',
  className,
}) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger onClick if clicking on the dropdown menu
    if ((e.target as HTMLElement).closest('[data-dropdown-trigger]')) {
      return
    }
    onClick?.()
  }

  return (
    <Card 
      className={`transition-colors duration-200 cursor-pointer group relative ${viewMode === 'grid' ? 'h-auto w-full border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50' : ''} ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className={viewMode === 'grid' ? 'p-0 h-full relative' : 'p-4'}>
        {viewMode === 'grid' ? (
          // Grid view - optimized file explorer style layout
          <div className="flex flex-col items-center text-center p-2 min-h-[120px]">
            {/* Folder Icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg flex items-center justify-center mb-1.5 flex-shrink-0 shadow-sm">
              <Folder className="w-5 h-5 text-amber-600" />
            </div>
            
            {/* Folder Name */}
            <h3 className="text-xs font-medium text-gray-900 break-words leading-tight line-clamp-2 mb-1 px-0.5 min-h-[2rem] flex items-center">
              {folder.name}
            </h3>
            
            {/* Folder Metadata - more compact */}
            <div className="space-y-0.5 text-xs">
              <div className="text-gray-500 uppercase tracking-wide font-medium text-[10px]">
                Folder
              </div>
              {folder.document_count !== undefined && (
                <div className="text-gray-400 text-[10px]">
                  {folder.document_count} {folder.document_count === 1 ? 'item' : 'items'}
                </div>
              )}
            </div>
            
            {/* Hover actions */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="h-5 w-5"
                    data-dropdown-trigger
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={onClick}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRename}>
                    <Edit className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          // Tree view - horizontal layout
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Folder className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {folder.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Folder
                </p>
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                  <span>Created {new Date(folder.created_at).toLocaleDateString()}</span>
                  {folder.document_count !== undefined && (
                    <span>{folder.document_count} documents</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClick}
                className="text-gray-500 hover:text-gray-700"
              >
                <FolderOpen className="w-4 h-4" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-500 hover:text-gray-700"
                    data-dropdown-trigger
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onClick}>
                    <FolderOpen className="w-4 h-4 mr-2" />
                    Open
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onRename}>
                    <Edit className="w-4 h-4 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}