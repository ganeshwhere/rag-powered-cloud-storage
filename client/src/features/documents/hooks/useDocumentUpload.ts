import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentApi } from '../api'
import type { UploadFile, UploadProgress, UploadError } from '../types'
import { DEFAULT_UPLOAD_CONFIG } from '../types'

interface UseDocumentUploadOptions {
  onUploadComplete?: (documentId: string, file: File) => void
  onUploadError?: (error: UploadError, file: File) => void
  onUploadProgress?: (progress: UploadProgress) => void
  usePresignedUrl?: boolean
  folder_id?: string
}

export const useDocumentUpload = (options: UseDocumentUploadOptions = {}) => {
  const {
    onUploadComplete,
    onUploadError,
    onUploadProgress,
    usePresignedUrl = true,
    folder_id,
  } = options

  const queryClient = useQueryClient()
  const [uploadingFiles, setUploadingFiles] = useState<Map<string, UploadFile>>(new Map())

  // Direct upload mutation
  const directUploadMutation = useMutation({
    mutationFn: ({ file, folder_id }: { file: File; folder_id?: string }) =>
      documentApi.uploadDocument({ file, folder_id }),
    onSuccess: (response, { file }) => {
      const fileId = generateFileId(file)
      updateFileStatus(fileId, 'processing', 100)
      onUploadComplete?.(response.document.id, file)
      
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error, { file }) => {
      const fileId = generateFileId(file)
      const uploadError: UploadError = {
        code: 'UPLOAD_FAILED',
        message: error.message,
        file: file.name,
      }
      updateFileStatus(fileId, 'failed', 0, uploadError.message)
      onUploadError?.(uploadError, file)
    },
  })

  // Presigned URL upload mutations
  const getPresignedUrlMutation = useMutation({
    mutationFn: ({ filename, content_type, folder_id }: {
      filename: string
      content_type: string
      folder_id?: string
    }) => documentApi.getPresignedUrl({ filename, content_type, folder_id }),
  })

  const uploadToS3Mutation = useMutation({
    mutationFn: ({ presignedData, file, fileId }: {
      presignedData: any
      file: File
      fileId: string
    }) => documentApi.uploadToS3(presignedData, file, (progress) => {
      updateFileStatus(fileId, 'uploading', progress)
      onUploadProgress?.({
        fileId,
        progress,
        status: 'uploading',
      })
    }),
    onSuccess: (_, { file, presignedData }) => {
      const fileId = generateFileId(file)
      updateFileStatus(fileId, 'processing', 100, undefined, presignedData.document_id)
      onUploadComplete?.(presignedData.document_id, file)
      
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
    onError: (error, { file }) => {
      const fileId = generateFileId(file)
      const uploadError: UploadError = {
        code: 'S3_UPLOAD_FAILED',
        message: error.message,
        file: file.name,
      }
      updateFileStatus(fileId, 'failed', 0, uploadError.message)
      onUploadError?.(uploadError, file)
    },
  })

  const generateFileId = (file: File): string => {
    return `${file.name}-${file.size}-${file.lastModified}`
  }

  const updateFileStatus = (
    fileId: string,
    status: UploadFile['status'],
    progress: number,
    error?: string,
    documentId?: string
  ) => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev)
      const existingFile = newMap.get(fileId)
      if (existingFile) {
        newMap.set(fileId, {
          ...existingFile,
          status,
          progress,
          error,
          documentId,
        })
      }
      return newMap
    })

    onUploadProgress?.({
      fileId,
      progress,
      status,
      error,
    })
  }

  const validateFile = (file: File): UploadError | null => {
    // Check file size
    if (file.size > DEFAULT_UPLOAD_CONFIG.maxFileSize) {
      return {
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds ${DEFAULT_UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB limit`,
        file: file.name,
      }
    }

    // Check file type
    if (!DEFAULT_UPLOAD_CONFIG.allowedFileTypes.includes(file.type)) {
      return {
        code: 'INVALID_FILE_TYPE',
        message: `File type ${file.type} is not supported`,
        file: file.name,
      }
    }

    return null
  }

  const uploadFile = useCallback(async (file: File, targetFolderId?: string) => {
    const fileId = generateFileId(file)
    const folderId = targetFolderId || folder_id

    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      onUploadError?.(validationError, file)
      return
    }

    // Add file to uploading state
    const uploadFile: UploadFile = {
      id: fileId,
      file,
      progress: 0,
      status: 'pending',
    }

    setUploadingFiles(prev => new Map(prev.set(fileId, uploadFile)))

    try {
      if (usePresignedUrl) {
        // Use presigned URL upload
        updateFileStatus(fileId, 'uploading', 0)
        
        const presignedData = await getPresignedUrlMutation.mutateAsync({
          filename: file.name,
          content_type: file.type,
          folder_id: folderId,
        })

        await uploadToS3Mutation.mutateAsync({
          presignedData,
          file,
          fileId,
        })
      } else {
        // Use direct upload
        updateFileStatus(fileId, 'uploading', 0)
        await directUploadMutation.mutateAsync({ file, folder_id: folderId })
      }
    } catch (error) {
      // Error handling is done in mutation onError callbacks
    }
  }, [
    usePresignedUrl,
    folder_id,
    onUploadError,
    getPresignedUrlMutation,
    uploadToS3Mutation,
    directUploadMutation,
  ])

  const uploadFiles = useCallback(async (files: File[], targetFolderId?: string) => {
    const maxConcurrent = DEFAULT_UPLOAD_CONFIG.maxConcurrentUploads
    const fileQueue = [...files]
    const activeUploads: Promise<void>[] = []

    const processNextFile = async (): Promise<void> => {
      const file = fileQueue.shift()
      if (!file) return

      await uploadFile(file, targetFolderId)
      
      // Process next file in queue
      if (fileQueue.length > 0) {
        return processNextFile()
      }
    }

    // Start initial batch of uploads
    for (let i = 0; i < Math.min(maxConcurrent, files.length); i++) {
      activeUploads.push(processNextFile())
    }

    // Wait for all uploads to complete
    await Promise.all(activeUploads)
  }, [uploadFile])

  const removeFile = useCallback((fileId: string) => {
    setUploadingFiles(prev => {
      const newMap = new Map(prev)
      newMap.delete(fileId)
      return newMap
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setUploadingFiles(prev => {
      const newMap = new Map()
      prev.forEach((file, id) => {
        if (file.status === 'uploading' || file.status === 'pending') {
          newMap.set(id, file)
        }
      })
      return newMap
    })
  }, [])

  const clearAll = useCallback(() => {
    setUploadingFiles(new Map())
  }, [])

  return {
    uploadFile,
    uploadFiles,
    uploadingFiles: Array.from(uploadingFiles.values()),
    removeFile,
    clearCompleted,
    clearAll,
    isUploading: directUploadMutation.isPending || 
                 getPresignedUrlMutation.isPending || 
                 uploadToS3Mutation.isPending,
    error: directUploadMutation.error || 
           getPresignedUrlMutation.error || 
           uploadToS3Mutation.error,
  }
}