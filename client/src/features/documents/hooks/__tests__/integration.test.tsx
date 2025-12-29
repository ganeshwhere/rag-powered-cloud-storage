/**
 * Integration tests for document hooks
 * Tests document upload hooks with file handling and progress,
 * and document hooks with status tracking and actions
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDocumentUpload } from '../useDocumentUpload'
import { useDocumentStatus } from '../useDocumentStatus'
import { useDocumentActions } from '../useDocumentActions'
import { useDocuments } from '../useDocuments'
import { documentApi } from '../../api'

// Mock the document API
jest.mock('../../api')
const mockDocumentApi = documentApi as jest.Mocked<typeof documentApi>

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Document Hooks Integration', () => {
  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
  const mockDocument = {
    id: 'doc123',
    name: 'test.pdf',
    original_name: 'test.pdf',
    file_type: 'pdf',
    file_size: 1024,
    status: 'processing' as const,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    folder_id: null,
    user_id: 'user123'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Upload and Status Integration', () => {
    it('integrates upload with status tracking through complete workflow', async () => {
      // Mock API responses for complete workflow
      mockDocumentApi.uploadDocument.mockResolvedValue({
        document: mockDocument
      } as any)
      
      mockDocumentApi.getDocumentStatus
        .mockResolvedValueOnce({
          id: 'doc123',
          status: 'processing',
          processing_error: undefined,
          chunk_count: 0,
          total_tokens: 0,
          updated_at: '2023-01-01T00:30:00Z'
        })
        .mockResolvedValueOnce({
          id: 'doc123',
          status: 'completed',
          processing_error: undefined,
          chunk_count: 5,
          total_tokens: 1500,
          updated_at: '2023-01-01T01:00:00Z'
        })

      const wrapper = createWrapper()
      
      // Track upload completion
      let uploadedDocumentId: string | null = null
      const onUploadComplete = jest.fn((documentId: string) => {
        uploadedDocumentId = documentId
      })

      // Setup upload hook
      const { result: uploadResult } = renderHook(() => useDocumentUpload({
        onUploadComplete,
        usePresignedUrl: false
      }), { wrapper })

      // Start upload
      await act(async () => {
        await uploadResult.current.uploadFile(mockFile)
      })

      // Verify upload completed
      expect(onUploadComplete).toHaveBeenCalledWith('doc123', mockFile)
      expect(uploadedDocumentId).toBe('doc123')

      // Now test status tracking for the uploaded document
      const { result: statusResult } = renderHook(() => useDocumentStatus({
        documentId: uploadedDocumentId!
      }), { wrapper })

      // Wait for status to load
      await waitFor(() => {
        expect(statusResult.current.isLoading).toBe(false)
      })

      // Verify initial processing status
      expect(statusResult.current.data?.status).toBe('processing')
    })

    it('handles upload failure and error status tracking', async () => {
      const uploadError = new Error('Upload failed')
      mockDocumentApi.uploadDocument.mockRejectedValue(uploadError)

      const wrapper = createWrapper()
      
      let uploadErrorReceived: any = null
      const onUploadError = jest.fn((error) => {
        uploadErrorReceived = error
      })

      const { result } = renderHook(() => useDocumentUpload({
        onUploadError,
        usePresignedUrl: false
      }), { wrapper })

      await act(async () => {
        await result.current.uploadFile(mockFile)
      })

      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UPLOAD_FAILED',
          message: 'Upload failed',
          file: 'test.pdf'
        }),
        mockFile
      )
      expect(uploadErrorReceived).toBeTruthy()
    })

    it('tracks multiple file uploads with progress updates', async () => {
      const files = [
        new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
        new File(['content3'], 'file3.pdf', { type: 'application/pdf' })
      ]

      mockDocumentApi.uploadDocument
        .mockResolvedValueOnce({ document: { ...mockDocument, id: 'doc1', name: 'file1.pdf' } } as any)
        .mockResolvedValueOnce({ document: { ...mockDocument, id: 'doc2', name: 'file2.pdf' } } as any)
        .mockResolvedValueOnce({ document: { ...mockDocument, id: 'doc3', name: 'file3.pdf' } } as any)

      const wrapper = createWrapper()
      
      const progressUpdates: any[] = []
      const completedUploads: string[] = []

      const { result } = renderHook(() => useDocumentUpload({
        onUploadProgress: (progress) => progressUpdates.push(progress),
        onUploadComplete: (documentId) => completedUploads.push(documentId),
        usePresignedUrl: false
      }), { wrapper })

      await act(async () => {
        await result.current.uploadFiles(files)
      })

      // Verify all files were uploaded
      expect(mockDocumentApi.uploadDocument).toHaveBeenCalledTimes(3)
      expect(completedUploads).toEqual(['doc1', 'doc2', 'doc3'])
      
      // Verify progress was tracked for each file
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates.some(p => p.status === 'uploading')).toBe(true)
      expect(progressUpdates.some(p => p.status === 'processing')).toBe(true)
    })
  })

  describe('Document Actions Integration', () => {
    it('integrates document actions with document list updates', async () => {
      const mockDocuments = [
        { ...mockDocument, id: 'doc1', name: 'document1.pdf' },
        { ...mockDocument, id: 'doc2', name: 'document2.pdf' }
      ]

      // Mock API responses
      mockDocumentApi.listDocuments.mockResolvedValue({
        documents: mockDocuments,
        total: 2,
        page: 1,
        size: 10
      } as any)

      mockDocumentApi.deleteDocument.mockResolvedValue(undefined as any)

      const wrapper = createWrapper()

      // Setup document list hook
      const { result: documentsResult } = renderHook(() => useDocuments(), { wrapper })

      // Setup document actions hook
      const { result: actionsResult } = renderHook(() => useDocumentActions(), { wrapper })

      // Wait for documents to load
      await waitFor(() => {
        expect(documentsResult.current.isLoading).toBe(false)
      })

      expect(documentsResult.current.documents).toHaveLength(2)

      // Delete a document
      await act(async () => {
        await actionsResult.current.deleteDocument.mutateAsync('doc1')
      })

      // Verify delete was called
      expect(mockDocumentApi.deleteDocument).toHaveBeenCalledWith('doc1')

      // The documents list should be invalidated and refetched
      // Mock the updated response
      mockDocumentApi.listDocuments.mockResolvedValue({
        documents: [mockDocuments[1]], // Only doc2 remains
        total: 1,
        page: 1,
        size: 10
      } as any)

      // Wait for the list to update
      await waitFor(() => {
        expect(documentsResult.current.documents).toHaveLength(1)
      })

      expect(documentsResult.current.documents?.[0].id).toBe('doc2')
    })

    it('handles bulk document operations with state updates', async () => {
      const mockDocuments = [
        { ...mockDocument, id: 'doc1', name: 'document1.pdf' },
        { ...mockDocument, id: 'doc2', name: 'document2.pdf' },
        { ...mockDocument, id: 'doc3', name: 'document3.pdf' }
      ]

      mockDocumentApi.listDocuments.mockResolvedValue({
        documents: mockDocuments,
        total: 3,
        page: 1,
        size: 10
      } as any)

      mockDocumentApi.bulkDeleteDocuments.mockResolvedValue({
        deleted_count: 2,
        failed_count: 1,
        failed_documents: ['doc2']
      } as any)

      const wrapper = createWrapper()

      const { result: documentsResult } = renderHook(() => useDocuments(), { wrapper })
      const { result: actionsResult } = renderHook(() => useDocumentActions(), { wrapper })

      await waitFor(() => {
        expect(documentsResult.current.isLoading).toBe(false)
      })

      expect(documentsResult.current.documents).toHaveLength(3)

      // Perform bulk delete
      await act(async () => {
        await actionsResult.current.bulkDeleteDocuments.mutateAsync(['doc1', 'doc2', 'doc3'])
      })

      expect(mockDocumentApi.bulkDeleteDocuments).toHaveBeenCalledWith(['doc1', 'doc2', 'doc3'])

      // Mock updated response (only doc2 remains since it failed to delete)
      mockDocumentApi.listDocuments.mockResolvedValue({
        documents: [mockDocuments[1]],
        total: 1,
        page: 1,
        size: 10
      } as any)

      await waitFor(() => {
        expect(documentsResult.current.documents).toHaveLength(1)
      })
    })
  })

  describe('Presigned URL Upload Integration', () => {
    it('integrates presigned URL upload with progress tracking', async () => {
      const presignedData = {
        document_id: 'doc123',
        upload_url: 'https://s3.example.com/upload',
        fields: { key: 'test-key' }
      }

      mockDocumentApi.getPresignedUrl.mockResolvedValue(presignedData as any)
      mockDocumentApi.uploadToS3.mockResolvedValue(undefined as any)
      mockDocumentApi.confirmUpload.mockResolvedValue(undefined as any)

      const wrapper = createWrapper()
      
      const progressUpdates: any[] = []
      let completedDocumentId: string | null = null

      const { result } = renderHook(() => useDocumentUpload({
        usePresignedUrl: true,
        onUploadProgress: (progress) => progressUpdates.push(progress),
        onUploadComplete: (documentId) => { completedDocumentId = documentId }
      }), { wrapper })

      await act(async () => {
        await result.current.uploadFile(mockFile)
      })

      // Verify the complete presigned URL workflow
      expect(mockDocumentApi.getPresignedUrl).toHaveBeenCalledWith({
        filename: 'test.pdf',
        content_type: 'application/pdf',
        folder_id: undefined
      })
      
      expect(mockDocumentApi.uploadToS3).toHaveBeenCalledWith(
        presignedData,
        mockFile,
        expect.any(Function) // progress callback
      )
      
      expect(mockDocumentApi.confirmUpload).toHaveBeenCalledWith('doc123', mockFile.size)
      expect(completedDocumentId).toBe('doc123')

      // Verify progress tracking occurred
      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates.some(p => p.status === 'uploading')).toBe(true)
      expect(progressUpdates.some(p => p.status === 'processing')).toBe(true)
    })
  })

  describe('Error Handling Integration', () => {
    it('handles network errors across multiple hooks', async () => {
      const networkError = new Error('Network error')
      mockDocumentApi.uploadDocument.mockRejectedValue(networkError)
      mockDocumentApi.getDocumentStatus.mockRejectedValue(networkError)

      const wrapper = createWrapper()
      
      let uploadError: any = null
      const { result: uploadResult } = renderHook(() => useDocumentUpload({
        onUploadError: (error) => { uploadError = error },
        usePresignedUrl: false
      }), { wrapper })

      const { result: statusResult } = renderHook(() => useDocumentStatus({
        documentId: 'doc123'
      }), { wrapper })

      // Test upload error handling
      await act(async () => {
        await uploadResult.current.uploadFile(mockFile)
      })

      expect(uploadError).toEqual(
        expect.objectContaining({
          code: 'UPLOAD_FAILED',
          message: 'Network error'
        })
      )

      // Test status error handling
      await waitFor(() => {
        expect(statusResult.current.isLoading).toBe(false)
      })

      expect(statusResult.current.isError).toBe(true)
      expect(statusResult.current.error).toEqual(networkError)
    })
  })
})