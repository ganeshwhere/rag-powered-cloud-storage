// Re-export shared document types for feature-specific use
export type {
  Document,
  DocumentStatus,
  DocumentUploadRequest,
  DocumentUploadResponse,
  PresignedUrlRequest,
  PresignedUrlResponse,
  DocumentListResponse,
  DocumentStatusResponse,
} from '@/shared/types/document'
import { APP_CONFIG } from '@/shared/lib/config'

// Upload-specific types for the upload components
export interface UploadFile {
  id: string
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  error?: string
  documentId?: string
}

export interface UploadConfig {
  maxFileSize: number // in bytes
  allowedFileTypes: string[]
  maxConcurrentUploads: number
}

export interface UploadError {
  code: string
  message: string
  file?: string
}

export interface UploadProgress {
  fileId: string
  progress: number
  status: UploadFile['status']
  error?: string
}

// Default upload configuration
export const DEFAULT_UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: APP_CONFIG.maxFileSizeMB * 1024 * 1024, // Convert MB to bytes
  allowedFileTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/markdown',
  ],
  maxConcurrentUploads: 3,
}

// File type display names
export const FILE_TYPE_NAMES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
  'application/msword': 'Word Document',
  'text/plain': 'Text File',
  'text/csv': 'CSV File',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
  'application/vnd.ms-excel': 'Excel Spreadsheet',
  'text/markdown': 'Markdown File',
}