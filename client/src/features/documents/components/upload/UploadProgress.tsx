'use client'

import React from 'react'
import { CheckCircle, XCircle, Clock, Upload, FileText, AlertCircle } from 'lucide-react'
import { Progress } from '@/shared/components/ui/progress'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { UploadFile, FILE_TYPE_NAMES } from '../../types'

interface UploadProgressProps {
  files: UploadFile[]
  onRetry?: (fileId: string) => void
  onCancel?: (fileId: string) => void
  onRemove?: (fileId: string) => void
  className?: string
}

export function UploadProgress({
  files,
  onRetry,
  onCancel,
  onRemove,
  className,
}: UploadProgressProps) {
  if (files.length === 0) {
    return null
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusIcon = (status: UploadFile['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-destructive" />
      case 'uploading':
        return <Upload className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'processing':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'pending':
      default:
        return <FileText className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusText = (file: UploadFile): string => {
    switch (file.status) {
      case 'pending':
        return 'Waiting to upload...'
      case 'uploading':
        return `Uploading... ${file.progress}%`
      case 'processing':
        return 'Processing document...'
      case 'completed':
        return 'Upload complete'
      case 'failed':
        return file.error || 'Upload failed'
      default:
        return 'Unknown status'
    }
  }

  const getStatusColor = (status: UploadFile['status']): string => {
    switch (status) {
      case 'completed':
        return 'text-green-600'
      case 'failed':
        return 'text-destructive'
      case 'uploading':
        return 'text-blue-600'
      case 'processing':
        return 'text-yellow-600'
      case 'pending':
      default:
        return 'text-gray-500'
    }
  }

  const completedCount = files.filter(f => f.status === 'completed').length
  const failedCount = files.filter(f => f.status === 'failed').length
  const uploadingCount = files.filter(f => f.status === 'uploading' || f.status === 'processing').length

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="font-medium">{files.length}</span> file{files.length !== 1 ? 's' : ''}
          </div>
          {completedCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-green-600">
              <CheckCircle className="h-4 w-4" />
              {completedCount} completed
            </div>
          )}
          {uploadingCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-blue-600">
              <Upload className="h-4 w-4" />
              {uploadingCount} uploading
            </div>
          )}
          {failedCount > 0 && (
            <div className="flex items-center gap-1 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              {failedCount} failed
            </div>
          )}
        </div>
      </div>

      {/* Individual file progress */}
      <div className="space-y-3">
        {files.map((file) => (
          <div
            key={file.id}
            className="flex items-center gap-3 p-4 border rounded-lg bg-white"
          >
            {getStatusIcon(file.status)}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium truncate" title={file.file.name}>
                  {file.file.name}
                </p>
                <span className="text-xs text-gray-500">
                  {formatFileSize(file.file.size)}
                </span>
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-gray-500">
                  {FILE_TYPE_NAMES[file.file.type] || file.file.type}
                </span>
                <span className={cn('text-xs', getStatusColor(file.status))}>
                  {getStatusText(file)}
                </span>
              </div>

              {(file.status === 'uploading' || file.status === 'processing') && (
                <Progress 
                  value={file.progress} 
                  className="h-2"
                />
              )}
            </div>

            <div className="flex items-center gap-2">
              {file.status === 'failed' && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onRetry(file.id)}
                >
                  Retry
                </Button>
              )}
              
              {(file.status === 'uploading' || file.status === 'processing') && onCancel && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onCancel(file.id)}
                >
                  Cancel
                </Button>
              )}
              
              {(file.status === 'completed' || file.status === 'failed') && onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(file.id)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}