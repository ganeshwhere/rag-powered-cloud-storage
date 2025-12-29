import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useSearch } from '../useSearch'
import { searchApi } from '../../api'
import { SearchRequest, SearchResponse, NoResultsResponse } from '../../types'

// Mock the search API
jest.mock('../../api')
const mockSearchApi = searchApi as jest.Mocked<typeof searchApi>

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

describe('useSearch', () => {
  const mockSearchResponse: SearchResponse = {
    query: 'test query',
    answer: 'This is the AI answer',
    chunks: [
      {
        id: 'chunk1',
        document_id: 'doc123',
        chunk_index: 0,
        text: 'Sample chunk text',
        score: 0.85,
        metadata: { filename: 'test.pdf' }
      }
    ],
    total_results: 1,
    processing_time_ms: 150,
    sources: ['doc123']
  }

  const mockNoResultsResponse: NoResultsResponse = {
    query: 'no results query',
    message: 'No documents found',
    suggestions: ['Try different keywords']
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('initializes with empty state', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    expect(result.current.results).toBeNull()
    expect(result.current.noResults).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isSearching).toBe(false)
    expect(result.current.performanceMetrics).toBeNull()
  })

  it('performs successful search with results', async () => {
    mockSearchApi.searchDocuments.mockResolvedValue(mockSearchResponse)

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    const searchRequest: SearchRequest = {
      query: 'test query',
      top_k: 10
    }

    await act(async () => {
      await result.current.searchDocuments(searchRequest)
    })

    expect(mockSearchApi.searchDocuments).toHaveBeenCalledWith(
      searchRequest,
      expect.any(Object)
    )
    expect(result.current.results).toEqual(mockSearchResponse)
    expect(result.current.noResults).toBeNull()
    expect(result.current.error).toBeNull()
    expect(result.current.isSearching).toBe(false)
  })

  it('handles search with no results', async () => {
    mockSearchApi.searchDocuments.mockResolvedValue(mockNoResultsResponse)

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.searchDocuments({ query: 'no results query' })
    })

    expect(result.current.results).toBeNull()
    expect(result.current.noResults).toEqual(mockNoResultsResponse)
    expect(result.current.error).toBeNull()
  })

  it('handles search errors', async () => {
    const errorMessage = 'Search service unavailable'
    mockSearchApi.searchDocuments.mockRejectedValue({
      response: { data: { detail: errorMessage } }
    })

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.searchDocuments({ query: 'error query' })
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.results).toBeNull()
    expect(result.current.noResults).toBeNull()
    expect(result.current.error).toBe(errorMessage)
    expect(result.current.isSearching).toBe(false)
  })

  it('handles generic error without response data', async () => {
    mockSearchApi.searchDocuments.mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.searchDocuments({ query: 'error query' })
      } catch (error) {
        // Expected to throw
      }
    })

    expect(result.current.error).toBe('An error occurred while searching')
  })

  it('shows loading state during search', async () => {
    let resolveSearch: (value: any) => void
    const searchPromise = new Promise(resolve => {
      resolveSearch = resolve
    })
    mockSearchApi.searchDocuments.mockReturnValue(searchPromise)

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    // Start search
    act(() => {
      result.current.searchDocuments({ query: 'test query' })
    })

    // Check loading state (might not be immediately true due to async nature)
    await waitFor(() => {
      expect(result.current.isSearching).toBe(true)
    })

    // Resolve search
    await act(async () => {
      resolveSearch!(mockSearchResponse)
      await searchPromise
    })

    expect(result.current.isSearching).toBe(false)
  })

  it('clears results', () => {
    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    // Set some initial state
    act(() => {
      result.current.searchDocuments({ query: 'test' })
    })

    // Clear results
    act(() => {
      result.current.clearResults()
    })

    expect(result.current.results).toBeNull()
    expect(result.current.noResults).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('calculates performance metrics correctly', async () => {
    mockSearchApi.searchDocuments.mockResolvedValue(mockSearchResponse)

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.searchDocuments({ query: 'test query' })
    })

    const metrics = result.current.performanceMetrics
    expect(metrics).toEqual({
      processingTime: 150,
      totalResults: 1,
      chunksReturned: 1,
      searchTime: expect.any(Number),
      isFastSearch: true, // 150ms < 2000ms
      cacheHit: true // 150ms < 500ms
    })
  })

  it('uses cached results when available', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    // Pre-populate cache
    queryClient.setQueryData(['search', 'results', 'cached query'], mockSearchResponse)

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    const { result } = renderHook(() => useSearch(), { wrapper })

    await act(async () => {
      await result.current.searchDocuments({ query: 'cached query' })
    })

    // Should use cached result without calling API
    expect(mockSearchApi.searchDocuments).not.toHaveBeenCalled()
    expect(result.current.results).toEqual(mockSearchResponse)
  })

  it('retries failed searches with exponential backoff', async () => {
    // Mock server error (5xx)
    mockSearchApi.searchDocuments
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockRejectedValueOnce({ response: { status: 500 } })
      .mockResolvedValueOnce(mockSearchResponse)

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.searchDocuments({ query: 'retry test' })
    })

    // Should have retried and eventually succeeded
    expect(mockSearchApi.searchDocuments).toHaveBeenCalledTimes(3)
    expect(result.current.results).toEqual(mockSearchResponse)
    expect(result.current.error).toBeNull()
  })

  it('does not retry client errors (4xx)', async () => {
    mockSearchApi.searchDocuments.mockRejectedValue({
      response: { status: 400, data: { detail: 'Bad request' } }
    })

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.searchDocuments({ query: 'bad query' })
      } catch (error) {
        // Expected to throw
      }
    })

    // Should not retry 4xx errors
    expect(mockSearchApi.searchDocuments).toHaveBeenCalledTimes(1)
    expect(result.current.error).toBe('Bad request')
  })

  it('handles search with filters', async () => {
    mockSearchApi.searchDocuments.mockResolvedValue(mockSearchResponse)

    const { result } = renderHook(() => useSearch(), {
      wrapper: createWrapper(),
    })

    const searchRequest: SearchRequest = {
      query: 'filtered search',
      document_ids: ['doc1', 'doc2'],
      min_score: 0.7,
      top_k: 5
    }

    await act(async () => {
      await result.current.searchDocuments(searchRequest)
    })

    expect(mockSearchApi.searchDocuments).toHaveBeenCalledWith(
      searchRequest,
      expect.any(Object)
    )
    expect(result.current.results).toEqual(mockSearchResponse)
  })
})