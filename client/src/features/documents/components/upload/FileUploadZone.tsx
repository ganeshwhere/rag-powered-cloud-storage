'use client'

import React, { useCallback, useState, useMemo } from 'react'
import { useDropzone, FileRejection } from 'react-dropzone'
import { Upload, X, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'
import { UploadFile, UploadConfig, DEFAULT_UPLOAD_CONFIG, FILE_TYPE_NAMES } from '../../types'

interface FileUploadZoneProps {
  onFilesSelected: (files: UploadFile[]) => void
  config?: Partial<UploadConfig>
  disabled?: boolean
  className?: string
  folderId?: string
}

export function FileUploadZone({
  onFilesSelected,
  config = {},
  disabled = false,
  className,
  folderId,
}: FileUploadZoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const uploadConfig = useMemo(() => ({ ...DEFAULT_UPLOAD_CONFIG, ...config }), [config])

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > uploadConfig.maxFileSize) {
      const maxSizeMB = Math.round(uploadConfig.maxFileSize / (1024 * 1024))
      return `File size exceeds ${maxSizeMB}MB limit`
    }

    // Check file type
    if (!uploadConfig.allowedFileTypes.includes(file.type)) {
      const allowedTypes = uploadConfig.allowedFileTypes
        .map(type => FILE_TYPE_NAMES[type] || type)
        .join(', ')
      return `File type not supported. Allowed types: ${allowedTypes}`
    }

    return null
  }, [uploadConfig])

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
    setErrors([])
    const newErrors: string[] = []

    // Handle rejected files
    rejectedFiles.forEach(({ file, errors: fileErrors }) => {
      fileErrors.forEach((error) => {
        if (error.code === 'file-too-large') {
          const maxSizeMB = Math.round(uploadConfig.maxFileSize / (1024 * 1024))
          newErrors.push(`${file.name}: File size exceeds ${maxSizeMB}MB limit`)
        } else if (error.code === 'file-invalid-type') {
          newErrors.push(`${file.name}: File type not supported`)
        } else {
          newErrors.push(`${file.name}: ${error.message}`)
        }
      })
    })

    // Validate accepted files
    const validFiles: UploadFile[] = []
    acceptedFiles.forEach(file => {
      const error = validateFile(file)
      if (error) {
        newErrors.push(`${file.name}: ${error}`)
      } else {
        validFiles.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          progress: 0,
          status: 'pending',
        })
      }
    })

    if (newErrors.length > 0) {
      setErrors(newErrors)
    }

    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }

    setDragActive(false)
  }, [onFilesSelected, validateFile, uploadConfig.maxFileSize])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    accept: uploadConfig.allowedFileTypes.reduce((acc, type) => {
      acc[type] = []
      return acc
    }, {} as Record<string, string[]>),
    maxSize: uploadConfig.maxFileSize,
    disabled,
    multiple: true,
  })

  const clearErrors = () => setErrors([])

  const maxSizeMB = Math.round(uploadConfig.maxFileSize / (1024 * 1024))
  const allowedTypesDisplay = uploadConfig.allowedFileTypes
    .map(type => FILE_TYPE_NAMES[type] || type)
    .join(', ')

  return (
    <div className={cn('w-full', className)}>
      <div
        {...getRootProps()}
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          'hover:border-primary/50 hover:bg-primary/5',
          {
            'border-primary bg-primary/10': isDragActive || dragActive,
            'border-gray-300': !isDragActive && !dragActive,
            'opacity-50 cursor-not-allowed': disabled,
            'border-destructive bg-destructive/5': errors.length > 0,
          }
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center gap-4">
          <div className={cn(
            'p-3 rounded-full',
            isDragActive || dragActive ? 'bg-primary/20' : 'bg-gray-100'
          )}>
            <Upload className={cn(
              'h-8 w-8',
              isDragActive || dragActive ? 'text-primary' : 'text-gray-500'
            )} />
          </div>
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive || dragActive
                ? 'Drop files here'
                : 'Drag & drop files here, or click to select'
              }
            </p>
            <p className="text-sm text-gray-500">
              Supports: {allowedTypesDisplay}
            </p>
            <p className="text-xs text-gray-400">
              Maximum file size: {maxSizeMB}MB
            </p>
          </div>

          {!disabled && (
            <Button variant="outline" size="sm" type="button">
              Choose Files
            </Button>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="font-medium text-destructive mb-2">Upload Errors</h4>
              <ul className="space-y-1 text-sm text-destructive/80">
                {errors.map((error, index) => (
                  <li key={index}>• {error}</li>
                ))}
              </ul>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={clearErrors}
              className="text-destructive hover:text-destructive/80"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}