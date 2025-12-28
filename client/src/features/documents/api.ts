import { api, handleApiError } from '@/shared/lib/api'
import type {
  Document,
  DocumentUploadRequest,
  DocumentUploadResponse,
  PresignedUrlRequest,
  PresignedUrlResponse,
  DocumentListResponse,
  DocumentStatusResponse,
} from '@/shared/types/document'

// Document API functions
export const documentApi = {
  // Upload document directly to server
  async uploadDocument(data: DocumentUploadRequest): Promise<DocumentUploadResponse> {
    try {
      const formData = new FormData()
      formData.append('file', data.file)
      
      if (data.folder_id) {
        formData.append('folder_id', data.folder_id)
      }

      const response = await api.post<DocumentUploadResponse>('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Get presigned URL for direct S3 upload
  async getPresignedUrl(data: PresignedUrlRequest): Promise<PresignedUrlResponse> {
    try {
      const response = await api.post<PresignedUrlResponse>('/documents/presigned-upload', data)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Upload file directly to S3 using presigned URL
  async uploadToS3(
    presignedData: PresignedUrlResponse,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      const formData = new FormData()
      
      // Add all the required fields from the presigned response
      Object.entries(presignedData.fields).forEach(([key, value]) => {
        formData.append(key, value)
      })
      
      // Add the file last (required by S3)
      formData.append('file', file)

      await api.post(presignedData.upload_url, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            onProgress(progress)
          }
        },
        // Don't use the base URL for S3 uploads
        baseURL: '',
      })
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // List user documents
  async listDocuments(params?: {
    folder_id?: string
    page?: number
    page_size?: number
  }): Promise<DocumentListResponse> {
    try {
      const response = await api.get<DocumentListResponse>('/documents', { params })
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Get document details
  async getDocument(documentId: string): Promise<Document> {
    try {
      const response = await api.get<Document>(`/documents/${documentId}`)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Get document processing status
  async getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
    try {
      const response = await api.get<DocumentStatusResponse>(`/documents/${documentId}/status`)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Get download URL for document
  async getDownloadUrl(documentId: string): Promise<{ download_url: string; expires_in: number; filename: string }> {
    try {
      const response = await api.get<{ download_url: string; expires_in: number; filename: string }>(`/documents/${documentId}/download`)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Update document metadata
  async updateDocument(documentId: string, data: { name?: string; folder_id?: string | null }): Promise<Document> {
    try {
      const response = await api.patch<Document>(`/documents/${documentId}`, data)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Delete document
  async deleteDocument(documentId: string): Promise<void> {
    try {
      await api.delete(`/documents/${documentId}`)
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Bulk delete documents
  async bulkDeleteDocuments(documentIds: string[]): Promise<{
    deleted_count: number
    failed_count: number
    failed_documents: string[]
  }> {
    try {
      const response = await api.delete<{
        deleted_count: number
        failed_count: number
        failed_documents: string[]
      }>('/documents/bulk', {
        data: { document_ids: documentIds }
      })
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
}

export default documentApi