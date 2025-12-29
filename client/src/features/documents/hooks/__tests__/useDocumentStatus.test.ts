import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useDocumentStatus } from '../useDocumentStatus'
import { documentApi } from '../../api'

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

describe('useDocumentStatus', () => {
  const mockDocumentStatus = {
    id: 'doc123',
    status: 'processing' as const,
    processing_progress: 75,
    error_message: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:30:00Z'
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('fetches document status successfully', async () => {
    mockDocumentApi.getDocumentStatus.mockResolvedValue(mockDocumentStatus)

    const { result } = renderHook(() => useDocumentStatus('doc123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockDocumentApi.getDocumentStatus).toHaveBeenCalledWith('doc123')
    expect(result.current.status).toEqual(mockDocumentStatus)
    expect(result.current.isError).toBe(false)
  })

  it('handles document status fetch error', async () => {
    const error = new Error('Failed to fetch status')
    mockDocumentApi.getDocumentStatus.mockRejectedValue(error)

    const { result } = renderHook(() => useDocumentStatus('doc123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.error).toEqual(error)
    expect(result.current.status).toBeUndefined()
  })

  it('shows loading state initially', () => {
    mockDocumentApi.getDocumentStatus.mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useDocumentStatus('doc123'), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(true)
    expect(result.current.status).toBeUndefined()
  })

  it('provides helper properties for different statuses', async () => {
    // Test processing status
    mockDocumentApi.getDocumentStatus.mockResolvedValue({
      ...mockDocumentStatus,
      status: 'processing'
    })

    const { result, rerender } = renderHook(
      ({ documentId }) => useDocumentStatus(documentId),
      {
        wrapper: createWrapper(),
        initialProps: { documentId: 'doc123' }
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isProcessing).toBe(true)
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.isFailed).toBe(false)

    // Test completed status
    mockDocumentApi.getDocumentStatus.mockResolvedValue({
      ...mockDocumentStatus,
      status: 'completed'
    })

    rerender({ documentId: 'doc123' })

    await waitFor(() => {
      expect(result.current.status?.status).toBe('completed')
    })

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.isCompleted).toBe(true)
    expect(result.current.isFailed).toBe(false)

    // Test failed status
    mockDocumentApi.getDocumentStatus.mockResolvedValue({
      ...mockDocumentStatus,
      status: 'failed',
      error_message: 'Processing failed'
    })

    rerender({ documentId: 'doc123' })

    await waitFor(() => {
      expect(result.current.status?.status).toBe('failed')
    })

    expect(result.current.isProcessing).toBe(false)
    expect(result.current.isCompleted).toBe(false)
    expect(result.current.isFailed).toBe(true)
  })

  it('refetches status when document ID changes', async () => {
    mockDocumentApi.getDocumentStatus
      .mockResolvedValueOnce({ ...mockDocumentStatus, id: 'doc123' })
      .mockResolvedValueOnce({ ...mockDocumentStatus, id: 'doc456' })

    const { result, rerender } = renderHook(
      ({ documentId }) => useDocumentStatus(documentId),
      {
        wrapper: createWrapper(),
        initialProps: { documentId: 'doc123' }
      }
    )

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockDocumentApi.getDocumentStatus).toHaveBeenCalledWith('doc123')
    expect(result.current.status?.id).toBe('doc123')

    // Change document ID
    rerender({ documentId: 'doc456' })

    await waitFor(() => {
      expect(result.current.status?.id).toBe('doc456')
    })

    expect(mockDocumentApi.getDocumentStatus).toHaveBeenCalledWith('doc456')
    expect(mockDocumentApi.getDocumentStatus).toHaveBeenCalledTimes(2)
  })

  it('handles polling for processing documents', async () => {
    // Mock processing status first, then completed
    mockDocumentApi.getDocumentStatus
      .mockResolvedValueOnce({ ...mockDocumentStatus, status: 'processing' })
      .mockResolvedValueOnce({ ...mockDocumentStatus, status: 'completed' })

    const { result } = renderHook(() => useDocumentStatus('doc123', {
      refetchInterval: 100, // Fast polling for test
      enabled: true
    }), {
      wrapper: createWrapper(),
    })

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.isProcessing).toBe(true)

    // Wait for polling to update status
    await waitFor(() => {
      expect(result.current.isCompleted).toBe(true)
    }, { timeout: 1000 })

    expect(mockDocumentApi.getDocumentStatus).toHaveBeenCalledTimes(2)
  })

  it('can be disabled', () => {
    const { result } = renderHook(() => useDocumentStatus('doc123', {
      enabled: false
    }), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.status).toBeUndefined()
    expect(mockDocumentApi.getDocumentStatus).not.toHaveBeenCalled()
  })

  it('handles manual refetch', async () => {
    mockDocumentApi.getDocumentStatus.mockResolvedValue(mockDocumentStatus)

    const { result } = renderHook(() => useDocumentStatus('doc123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockDocumentApi.getDocumentStatus).toHaveBeenCalledTimes(1)

    // Manual refetch
    await act(async () => {
      await result.current.refetch()
    })

    expect(mockDocumentApi.getDocumentStatus).toHaveBeenCalledTimes(2)
  })

  it('provides progress percentage', async () => {
    mockDocumentApi.getDocumentStatus.mockResolvedValue({
      ...mockDocumentStatus,
      processing_progress: 65
    })

    const { result } = renderHook(() => useDocumentStatus('doc123'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.progress).toBe(65)
  })

  it('handles null document ID', () => {
    const { result } = renderHook(() => useDocumentStatus(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.status).toBeUndefined()
    expect(mockDocumentApi.getDocumentStatus).not.toHaveBeenCalled()
  })

  it('handles undefined document ID', () => {
    const { result } = renderHook(() => useDocumentStatus(undefined), {
      wrapper: createWrapper(),
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.status).toBeUndefined()
    expect(mockDocumentApi.getDocumentStatus).not.toHaveBeenCalled()
  })
})