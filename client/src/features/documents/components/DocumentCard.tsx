'use client'

import React from 'react'
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
  className?: string
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  selected = false,
  selectable = false,
  onSelect,
  onClick,
  className,
}) => {
  const { deleteDocument, getDownloadUrl } = useDocumentActions()

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await getDownloadUrl.mutateAsync(document.id)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm(`Are you sure you want to delete "${document.name}"?`)) {
      try {
        await deleteDocument.mutateAsync(document.id)
      } catch (error) {
        console.error('Failed to delete document:', error)
      }
    }
  }

  const handleCardClick = () => {
    if (selectable && onSelect) {
      onSelect(!selected)
    } else if (onClick) {
      onClick()
    }
  }

  const getStatusIcon = () => {
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
  }

  const getStatusColor = () => {
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
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const fileTypeName = FILE_TYPE_NAMES[document.mime_type || document.file_type] || document.file_type

  return (
    <Card 
      className={`
        transition-all duration-200 hover:shadow-md cursor-pointer
        ${selected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
        ${className}
      `}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            {selectable && (
              <input
                type="checkbox"
                checked={selected}
                onChange={(e) => {
                  e.stopPropagation()
                  onSelect?.(e.target.checked)
                }}
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
                {getStatusIcon()}
              </div>
              
              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                <span>{fileTypeName}</span>
                <span>{formatFileSize(document.file_size)}</span>
                <span>
                  {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                </span>
              </div>
              
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}>
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
      </CardContent>
    </Card>
  )
}