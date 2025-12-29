'use client'

import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  FileText, 
  Download, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  HardDrive,
  Hash,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { useDocument } from '../hooks/useDocument'
import { useDocumentStatus } from '../hooks/useDocumentStatus'
import { useDocumentActions } from '../hooks/useDocumentActions'
import { FILE_TYPE_NAMES } from '../types'
import type { Document } from '@/shared/types/document'

interface DocumentViewerProps {
  documentId: string
  onClose?: () => void
  onDelete?: () => void
  className?: string
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  onClose,
  onDelete,
  className,
}) => {
  const { data: document, isLoading, error } = useDocument({ documentId })
  const { data: status } = useDocumentStatus(documentId, { enabled: !!document })
  const { deleteDocument, getDownloadUrl } = useDocumentActions()

  // Auto-close viewer if document is not found (404 error)
  React.useEffect(() => {
    if (error && (error.message?.includes('not found') || error.message?.includes('404'))) {
      onClose?.()
    }
  }, [error, onClose])

  const handleDownload = async () => {
    try {
      await getDownloadUrl.mutateAsync(documentId)
    } catch (error) {
      console.error('Failed to download document:', error)
    }
  }

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete "${document?.name}"?`)) {
      try {
        await deleteDocument.mutateAsync(documentId)
        onDelete?.()
        onClose?.()
      } catch (error) {
        console.error('Failed to delete document:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !document) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Failed to load document</p>
            <p className="text-sm text-gray-500 mt-1">
              {error?.message || 'Document not found'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const getStatusIcon = () => {
    const currentStatus = status?.status || document.status
    switch (currentStatus) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />
      default:
        return <FileText className="w-5 h-5 text-gray-400" />
    }
  }

  const getStatusColor = () => {
    const currentStatus = status?.status || document.status
    switch (currentStatus) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'processing':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
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
  const currentStatus = status?.status || document.status
  const currentChunkCount = status?.chunk_count || document.chunk_count
  const currentTokenCount = status?.total_tokens || document.total_tokens
  const processingError = status?.processing_error || document.processing_error

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <FileText className="w-8 h-8 text-blue-500 flex-shrink-0 mt-1" />
            <div>
              <CardTitle className="text-xl mb-2">{document.name}</CardTitle>
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor()}`}>
                  {currentStatus}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              disabled={getDownloadUrl.isPending}
            >
              <Download className="w-4 h-4 mr-2" />
              {getDownloadUrl.isPending ? 'Downloading...' : 'Download'}
            </Button>
            <Button
              onClick={handleDelete}
              variant="destructive"
              size="sm"
              disabled={deleteDocument.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
            </Button>
            {onClose && (
              <Button onClick={onClose} variant="ghost" size="sm">
                ×
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* File Information */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Type:</span>
              <span className="font-medium">{fileTypeName}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <HardDrive className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Size:</span>
              <span className="font-medium">{formatFileSize(document.file_size)}</span>
            </div>
            
            <div className="flex items-center space-x-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Created:</span>
              <span className="font-medium">
                {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          <div className="space-y-3">
            {currentStatus === 'completed' && (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <Layers className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Chunks:</span>
                  <span className="font-medium">{currentChunkCount.toLocaleString()}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Tokens:</span>
                  <span className="font-medium">{currentTokenCount.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Processing Status */}
        {currentStatus === 'processing' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
              <span className="text-blue-700 font-medium">Processing Document</span>
            </div>
            <p className="text-blue-600 text-sm">
              Your document is being processed for search. This may take a few minutes depending on the file size.
            </p>
          </div>
        )}

        {/* Processing Error */}
        {currentStatus === 'failed' && processingError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span className="text-red-700 font-medium">Processing Failed</span>
            </div>
            <p className="text-red-600 text-sm">{processingError}</p>
          </div>
        )}

        {/* Pending Status */}
        {currentStatus === 'pending' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-700 font-medium">Queued for Processing</span>
            </div>
            <p className="text-yellow-600 text-sm">
              Your document is in the processing queue and will be processed shortly.
            </p>
          </div>
        )}

        {/* Metadata */}
        {document.extra_metadata && Object.keys(document.extra_metadata).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Metadata</h4>
            <div className="bg-gray-50 rounded-lg p-3">
              <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                {JSON.stringify(document.extra_metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}