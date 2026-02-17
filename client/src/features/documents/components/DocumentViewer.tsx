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
  X,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Separator } from '@/shared/components/ui/separator'
import { useDocument } from '../hooks/useDocument'
import { useDocumentStatus } from '../hooks/useDocumentStatus'
import { useDocumentActions } from '../hooks/useDocumentActions'
import { FILE_TYPE_NAMES } from '../types'

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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusConfig = () => {
    const currentStatus = status?.status || document?.status
    switch (currentStatus) {
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          label: 'Completed'
        }
      case 'processing':
        return {
          icon: Loader2,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          label: 'Processing',
          animate: true
        }
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          label: 'Failed'
        }
      case 'pending':
        return {
          icon: Clock,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          label: 'Pending'
        }
      default:
        return {
          icon: FileText,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          label: 'Unknown'
        }
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="flex items-center justify-center space-x-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-muted-foreground">Loading document...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !document) {
    return (
      <Card className={className}>
        <CardContent className="p-8">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Failed to load document</h3>
            <p className="text-muted-foreground">
              {error?.message || 'Document not found'}
            </p>
            {onClose && (
              <Button onClick={onClose} variant="outline" className="mt-4">
                Go Back
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const statusConfig = getStatusConfig()
  const StatusIcon = statusConfig.icon
  const fileTypeName = FILE_TYPE_NAMES[document.mime_type || document.file_type] || document.file_type
  const currentChunkCount = status?.chunk_count || document.chunk_count
  const currentTokenCount = status?.total_tokens || document.total_tokens
  const processingError = status?.processing_error || document.processing_error

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-2xl mb-2">{document.name}</CardTitle>
                <div className="flex items-center space-x-3">
                  <StatusIcon 
                    className={`w-5 h-5 ${statusConfig.color} ${statusConfig.animate ? 'animate-spin' : ''}`} 
                  />
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusConfig.color} ${statusConfig.bgColor} ${statusConfig.borderColor}`}>
                    {statusConfig.label}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                disabled={getDownloadUrl.isPending}
              >
                <Download className="w-4 h-4 mr-2" />
                {getDownloadUrl.isPending ? 'Downloading...' : 'Download'}
              </Button>
              <Button
                onClick={handleDelete}
                variant="destructive"
                disabled={deleteDocument.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteDocument.isPending ? 'Deleting...' : 'Delete'}
              </Button>
              {onClose && (
                <Button onClick={onClose} variant="ghost" size="icon">
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status Alert */}
      {document.status === 'processing' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <div>
                <h4 className="font-medium text-blue-900">Processing Document</h4>
                <p className="text-sm text-blue-700">
                  Your document is being processed for search. This may take a few minutes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {document.status === 'failed' && processingError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <XCircle className="w-5 h-5 text-red-500" />
              <div>
                <h4 className="font-medium text-red-900">Processing Failed</h4>
                <p className="text-sm text-red-700">{processingError}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {document.status === 'pending' && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <h4 className="font-medium text-yellow-900">Queued for Processing</h4>
                <p className="text-sm text-yellow-700">
                  Your document is in the processing queue and will be processed shortly.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Type</p>
                  <p className="font-medium">{fileTypeName}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <HardDrive className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">File Size</p>
                  <p className="font-medium">{formatFileSize(document.file_size)}</p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Created</p>
                  <p className="font-medium">
                    {formatDistanceToNow(new Date(document.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {document.status === 'completed' && (
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <p className="font-medium text-green-600">Ready for search</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Processing Stats */}
          {document.status === 'completed' && (currentChunkCount > 0 || currentTokenCount > 0) && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-4">Processing Statistics</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentChunkCount > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Layers className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Text Chunks</p>
                        <p className="text-lg font-semibold">{currentChunkCount.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                  
                  {currentTokenCount > 0 && (
                    <div className="flex items-center space-x-3 p-3 bg-muted/50 rounded-lg">
                      <Hash className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                        <p className="text-lg font-semibold">{currentTokenCount.toLocaleString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Metadata */}
          {document.extra_metadata && Object.keys(document.extra_metadata).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-3">Additional Metadata</h4>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="text-sm text-muted-foreground whitespace-pre-wrap overflow-x-auto">
                    {JSON.stringify(document.extra_metadata, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}