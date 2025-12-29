import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDocumentUpload } from '../useDocumentUpload'
import { documentApi } from '../../api'
import { DEFAULT_UPLOAD_CONFIG } from '../../types'

// Mock the document API
jest.mock('../../api')
const mockDocumentApi = documentApi as jest.Mocked<typeof documentApi>

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useDocumentUpload', () => {
  const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
  const mockOnUploadComplete = jest.fn()
  const mockOnUploadError = jest.fn()
  const mockOnUploadProgress = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful API responses
    mockDocumentApi.uploadDocument.mockResolvedValue({
      document: { id: 'doc123', filename: 'test.pdf' }
    } as any)
    
    mockDocumentApi.getPresignedUrl.mockResolvedValue({
      document_id: 'doc123',
      upload_url: 'https://s3.example.com/upload',
      fields: {}
    } as any)
    
    mockDocumentApi.uploadToS3.mockResolvedValue(undefined as any)
    mockDocumentApi.confirmUpload.mockResolvedValue(undefined as any)
  })

  it('initializes with empty uploading files', () => {
    const { result } = renderHook(() => useDocumentUpload(), {
      wrapper: createWrapper(),
    })

    expect(result.current.uploadingFiles).toEqual([])
    expect(result.current.isUploading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('uploads file using direct upload method', async () => {
    const { result } = renderHook(() => useDocumentUpload({
      usePresignedUrl: false,
      onUploadComplete: mockOnUploadComplete,
      onUploadProgress: mockOnUploadProgress,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(mockFile)
    })

    expect(mockDocumentApi.uploadDocument).toHaveBeenCalledWith({
      file: mockFile,
      folder_id: undefined,
    })
    expect(mockOnUploadComplete).toHaveBeenCalledWith('doc123', mockFile)
  })

  it('uploads file using presigned URL method', async () => {
    const { result } = renderHook(() => useDocumentUpload({
      usePresignedUrl: true,
      onUploadComplete: mockOnUploadComplete,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(mockFile)
    })

    expect(mockDocumentApi.getPresignedUrl).toHaveBeenCalledWith({
      filename: 'test.pdf',
      content_type: 'application/pdf',
      folder_id: undefined,
    })
    expect(mockDocumentApi.uploadToS3).toHaveBeenCalled()
    expect(mockDocumentApi.confirmUpload).toHaveBeenCalledWith('doc123', mockFile.size)
    expect(mockOnUploadComplete).toHaveBeenCalledWith('doc123', mockFile)
  })

  it('uploads file to specific folder', async () => {
    const { result } = renderHook(() => useDocumentUpload({
      folder_id: 'folder123',
      usePresignedUrl: false,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(mockFile)
    })

    expect(mockDocumentApi.uploadDocument).toHaveBeenCalledWith({
      file: mockFile,
      folder_id: 'folder123',
    })
  })

  it('validates file size and rejects large files', async () => {
    const largeFile = new File(['x'.repeat(DEFAULT_UPLOAD_CONFIG.maxFileSize + 1)], 'large.pdf', {
      type: 'application/pdf'
    })

    const { result } = renderHook(() => useDocumentUpload({
      onUploadError: mockOnUploadError,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(largeFile)
    })

    expect(mockOnUploadError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'FILE_TOO_LARGE',
        file: 'large.pdf',
      }),
      largeFile
    )
    expect(mockDocumentApi.uploadDocument).not.toHaveBeenCalled()
  })

  it('validates file type and rejects unsupported files', async () => {
    const unsupportedFile = new File(['test'], 'test.exe', { type: 'application/x-executable' })

    const { result } = renderHook(() => useDocumentUpload({
      onUploadError: mockOnUploadError,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(unsupportedFile)
    })

    expect(mockOnUploadError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'INVALID_FILE_TYPE',
        file: 'test.exe',
      }),
      unsupportedFile
    )
  })

  it('tracks upload progress', async () => {
    const { result } = renderHook(() => useDocumentUpload({
      onUploadProgress: mockOnUploadProgress,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(mockFile)
    })

    // Should track progress from pending to uploading to processing
    expect(mockOnUploadProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'uploading',
        progress: 0,
      })
    )
    expect(mockOnUploadProgress).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        progress: 100,
      })
    )
  })

  it('uploads multiple files with concurrency control', async () => {
    const files = [
      new File(['content1'], 'file1.pdf', { type: 'application/pdf' }),
      new File(['content2'], 'file2.pdf', { type: 'application/pdf' }),
      new File(['content3'], 'file3.pdf', { type: 'application/pdf' }),
    ]

    const { result } = renderHook(() => useDocumentUpload({
      usePresignedUrl: false,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFiles(files)
    })

    expect(mockDocumentApi.uploadDocument).toHaveBeenCalledTimes(3)
    files.forEach(file => {
      expect(mockDocumentApi.uploadDocument).toHaveBeenCalledWith({
        file,
        folder_id: undefined,
      })
    })
  })

  it('handles upload errors', async () => {
    mockDocumentApi.uploadDocument.mockRejectedValue(new Error('Upload failed'))

    const { result } = renderHook(() => useDocumentUpload({
      usePresignedUrl: false,
      onUploadError: mockOnUploadError,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(mockFile)
    })

    expect(mockOnUploadError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'UPLOAD_FAILED',
        message: 'Upload failed',
        file: 'test.pdf',
      }),
      mockFile
    )
  })

  it('removes files from uploading list', async () => {
    const { result } = renderHook(() => useDocumentUpload(), {
      wrapper: createWrapper(),
    })

    // Start upload to add file to list
    act(() => {
      result.current.uploadFile(mockFile)
    })

    await waitFor(() => {
      expect(result.current.uploadingFiles.length).toBe(1)
    })

    const fileId = result.current.uploadingFiles[0].id

    // Remove file
    act(() => {
      result.current.removeFile(fileId)
    })

    expect(result.current.uploadingFiles.length).toBe(0)
  })

  it('clears completed uploads', async () => {
    const { result } = renderHook(() => useDocumentUpload({
      onUploadComplete: mockOnUploadComplete,
    }), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.uploadFile(mockFile)
    })

    // Clear completed uploads
    act(() => {
      result.current.clearCompleted()
    })

    expect(result.current.uploadingFiles.length).toBe(0)
  })

  it('clears all uploads', async () => {
    const { result } = renderHook(() => useDocumentUpload(), {
      wrapper: createWrapper(),
    })

    // Start upload
    act(() => {
      result.current.uploadFile(mockFile)
    })

    await waitFor(() => {
      expect(result.current.uploadingFiles.length).toBe(1)
    })

    // Clear all
    act(() => {
      result.current.clearAll()
    })

    expect(result.current.uploadingFiles.length).toBe(0)
  })
})