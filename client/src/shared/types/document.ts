export interface Document {
  id: string
  user_id: string
  folder_id?: string
  name: string
  original_name: string
  file_type: string
  file_size: number
  mime_type?: string
  s3_key: string
  s3_bucket: string
  status: DocumentStatus
  processing_error?: string
  chunk_count: number
  total_tokens: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface DocumentUploadRequest {
  file: File
  folder_id?: string
}

export interface DocumentUploadResponse {
  document: Document
  upload_url?: string
}

export interface PresignedUrlRequest {
  filename: string
  content_type: string
  folder_id?: string
}

export interface PresignedUrlResponse {
  upload_url: string
  document_id: string
  fields: Record<string, string>
}

export interface DocumentListResponse {
  documents: Document[]
  total: number
  page: number
  size: number
}

export interface DocumentStatusResponse {
  id: string
  status: DocumentStatus
  processing_error?: string
  chunk_count: number
  total_tokens: number
  updated_at: string
}