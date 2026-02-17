'use client'

import React, { memo, useCallback } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  FileText, 
  Download, 
  Trash2, 
  MoreHorizontal,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  FileIcon,
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
import { useDocumentActions } from '../hooks/useDocumentActions'
import { FILE_TYPE_NAMES } from '../types'
import type { Document } from '@/shared/types/document'

interface DocumentCardProps {
  document: Document
  selected?: boolean
  selectable?: boolean
  onSelect?: (selected: boolean) => void
  onClick?: () => void
  viewMode?: 'tree' | 'grid'
  className?: string
}

const DocumentCardComponent: React.FC<DocumentCardProps> = ({
  document,
  selected = false,
  selectable = false,
  onSelect,
  onClick,
  viewMode = 'tree',
  className,
}) => {
  const { deleteDocument, getDownloadUrl } = useDocumentActions()

  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await getDownloadUrl.mutateAsync(document.id)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }, [getDownloadUrl, document.id])

  const handleDelete = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${document.name}"?`)) {
      try {
        await deleteDocument.mutateAsync(document.id)
      } catch (error) {
        console.error('Failed to delete document:', error)
      }
    }
  }, [deleteDocument, document.id, document.name])

  const handleCardClick = useCallback(() => {
    if (selectable && onSelect) {
      onSelect(!selected)
    } else if (onClick) {
      onClick()
    }
  }, [selectable, onSelect, selected, onClick])

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSelect?.(e.target.checked)
  }, [onSelect])

  const getStatusIcon = useCallback(() => {
    switch (document.status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'processing':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <FileIcon className="w-4 h-4 text-gray-400" />
    }
  }, [document.status])

  const getStatusColor = useCallback(() => {
    switch (document.status) {
      case 'completed':
        return 'text-green-600 bg-green-50'
      case 'processing':
        return 'text-blue-600 bg-blue-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }, [document.status])

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }, [])

  const fileTypeName = FILE_TYPE_NAMES[document.mime_type || document.file_type] || document.file_type
  const formattedSize = formatFileSize(document.file_size)
  const formattedDate = formatDistanceToNow(new Date(document.created_at), { addSuffix: true })
  const statusIcon = getStatusIcon()
  const statusColor = getStatusColor()

  return (
    <Card 
      className={`
        transition-colors duration-200 cursor-pointer group relative
        ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50/50'}
        ${viewMode === 'grid' ? 'h-auto w-full border border-gray-100 hover:border-gray-200' : ''}
        ${className}
      `}
      onClick={handleCardClick}
    >
      <CardContent className={viewMode === 'grid' ? 'p-0 h-full relative' : 'p-4'}>
        {viewMode === 'grid' ? (
          // Grid view - optimized file explorer style layout
          <div className="flex flex-col items-center text-center p-2 min-h-[120px]">
            {selectable && (
              <div className="absolute top-1 left-1 z-10">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={handleCheckboxChange}
                  className="w-3 h-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500 focus:ring-1"
                />
              </div>
            )}
            
            {/* Document Icon */}
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center mb-1.5 flex-shrink-0 shadow-sm">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            
            {/* Document Name */}
            <h3 className="text-xs font-medium text-gray-900 break-words text-center leading-tight line-clamp-2 mb-1 px-0.5 min-h-[2rem] flex items-center">
              {document.name}
            </h3>
            
            {/* File Metadata - more compact */}
            <div className="space-y-0.5 text-xs">
              <div className="text-gray-500 uppercase tracking-wide font-medium text-[10px]">
                {fileTypeName}
              </div>
              <div className="text-gray-400 text-[10px]">
                {formattedSize}
              </div>
            </div>
            
            {/* Status - only show if not completed */}
            {document.status !== 'completed' && (
              <div className="flex items-center justify-center mt-1">
                {statusIcon}
                <span className={`ml-1 text-[10px] font-medium ${statusColor.split(' ')[0]}`}>
                  {document.status}
                </span>
              </div>
            )}
            
            {/* Hover actions */}
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={(e) => e.stopPropagation()}
                    className="h-5 w-5"
                  >
                    <MoreHorizontal className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleDownload} disabled={getDownloadUrl.isPending}>
                    <Download className="w-4 h-4 mr-2" />
                    {getDownloadUrl.isPending ? 'Downloading...' : 'Download'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleDelete}
                    disabled={deleteDocument.isPending}
                    variant="destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : (
          // Tree view - horizontal layout
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              {selectable && (
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={handleCheckboxChange}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              )}
              
              <div className="flex-shrink-0">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {document.name}
                  </h3>
                  {statusIcon}
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                  <span>{fileTypeName}</span>
                  <span>{formattedSize}</span>
                  <span>{formattedDate}</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                    {document.status}
                  </span>
                  
                  {document.status === 'completed' && (
                    <div className="flex items-center space-x-3 text-xs text-gray-500">
                      <span>{document.chunk_count} chunks</span>
                      <span>{document.total_tokens.toLocaleString()} tokens</span>
                    </div>
                  )}
                  
                  {document.status === 'failed' && document.processing_error && (
                    <span className="text-xs text-red-600 truncate max-w-xs">
                      {document.processing_error}
                    </span>
                  )}
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
                <DropdownMenuItem onClick={handleDownload} disabled={getDownloadUrl.isPending}>
                  <Download className="w-4 h-4 mr-2" />
                  {getDownloadUrl.isPending ? 'Downloading...' : 'Download'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete}
                  disabled={deleteDocument.isPending}
                  variant="destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Memoize the component with custom comparison
export const DocumentCard = memo(DocumentCardComponent, (prevProps, nextProps) => {
  // Custom comparison for better performance
  return (
    prevProps.document.id === nextProps.document.id &&
    prevProps.document.status === nextProps.document.status &&
    prevProps.document.name === nextProps.document.name &&
    prevProps.document.file_size === nextProps.document.file_size &&
    prevProps.document.created_at === nextProps.document.created_at &&
    prevProps.document.chunk_count === nextProps.document.chunk_count &&
    prevProps.document.total_tokens === nextProps.document.total_tokens &&
    prevProps.document.processing_error === nextProps.document.processing_error &&
    prevProps.selected === nextProps.selected &&
    prevProps.selectable === nextProps.selectable &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.className === nextProps.className
  )
})