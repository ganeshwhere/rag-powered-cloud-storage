import React from 'react'
import { render, screen, fireEvent, waitFor } from '@/test-utils/render'
import { SearchInterface } from '../SearchInterface'
import { useSearch } from '../../hooks/useSearch'
import { useSearchHistory } from '../../hooks/useSearchHistory'
import { useSearchSuggestions } from '../../hooks/useSearchSuggestions'

// Mock the hooks
jest.mock('../../hooks/useSearch')
jest.mock('../../hooks/useSearchHistory')
jest.mock('../../hooks/useSearchSuggestions')

const mockUseSearch = useSearch as jest.MockedFunction<typeof useSearch>
const mockUseSearchHistory = useSearchHistory as jest.MockedFunction<typeof useSearchHistory>
const mockUseSearchSuggestions = useSearchSuggestions as jest.MockedFunction<typeof useSearchSuggestions>

describe('SearchInterface', () => {
  const mockSearchDocuments = jest.fn()
  const mockClearResults = jest.fn()
  const mockRefetchHistory = jest.fn()
  const mockGetSuggestions = jest.fn()

  beforeEach(() => {
    mockUseSearch.mockReturnValue({
      searchDocuments: mockSearchDocuments,
      isSearching: false,
      results: null,
      noResults: null,
      error: null,
      clearResults: mockClearResults,
      performanceMetrics: null
    })

    mockUseSearchHistory.mockReturnValue({
      history: [],
      total: 0,
      currentPage: 1,
      itemsPerPage: 20,
      hasNextPage: false,
      hasPreviousPage: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetchHistory,
      isFetching: false
    })

    mockUseSearchSuggestions.mockReturnValue({
      suggestions: [],
      getSuggestions: mockGetSuggestions,
      clearSuggestions: jest.fn(),
      isLoading: false,
      error: null
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders search input with placeholder', () => {
    render(<SearchInterface />)
    
    expect(screen.getByPlaceholderText('Search your documents...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument()
  })

  it('handles query input and triggers search on Enter', async () => {
    render(<SearchInterface />)
    
    const input = screen.getByPlaceholderText('Search your documents...')
    const searchButton = screen.getByRole('button', { name: /search/i })
    
    // Type query
    fireEvent.change(input, { target: { value: 'test query' } })
    expect(input).toHaveValue('test query')
    
    // Press Enter
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    
    await waitFor(() => {
      expect(mockSearchDocuments).toHaveBeenCalledWith({
        query: 'test query'
      })
    })
  })

  it('handles search button click', async () => {
    render(<SearchInterface />)
    
    const input = screen.getByPlaceholderText('Search your documents...')
    const searchButton = screen.getByRole('button', { name: /search/i })
    
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.click(searchButton)
    
    await waitFor(() => {
      expect(mockSearchDocuments).toHaveBeenCalledWith({
        query: 'test query'
      })
    })
  })

  it('shows loading state during search', () => {
    mockUseSearch.mockReturnValue({
      searchDocuments: mockSearchDocuments,
      isSearching: true,
      results: null,
      noResults: null,
      error: null,
      clearResults: mockClearResults,
      performanceMetrics: null
    })

    render(<SearchInterface />)
    
    const searchButton = screen.getByRole('button')
    expect(searchButton).toBeDisabled()
  })

  it('displays search suggestions when typing', async () => {
    const mockSuggestions = ['suggestion 1', 'suggestion 2']
    mockUseSearchSuggestions.mockReturnValue({
      suggestions: mockSuggestions,
      getSuggestions: mockGetSuggestions,
      clearSuggestions: jest.fn(),
      isLoading: false,
      error: null
    })

    render(<SearchInterface />)
    
    const input = screen.getByPlaceholderText('Search your documents...')
    fireEvent.change(input, { target: { value: 'test' } })
    
    await waitFor(() => {
      expect(mockGetSuggestions).toHaveBeenCalledWith('test')
    })
  })

  it('displays search history when input is focused and empty', async () => {
    const mockHistory = [
      { id: '1', query: 'previous search', results_count: 5, created_at: '2023-01-01T00:00:00Z' }
    ]
    mockUseSearchHistory.mockReturnValue({
      history: mockHistory,
      total: 1,
      currentPage: 1,
      itemsPerPage: 20,
      hasNextPage: false,
      hasPreviousPage: false,
      isLoading: false,
      isError: false,
      error: null,
      refetch: mockRefetchHistory,
      isFetching: false
    })

    render(<SearchInterface />)
    
    const input = screen.getByPlaceholderText('Search your documents...')
    fireEvent.focus(input)
    
    await waitFor(() => {
      expect(screen.getAllByText('Recent Searches')[0]).toBeInTheDocument()
    })
  })

  it('handles clear button click', () => {
    render(<SearchInterface />)
    
    const input = screen.getByPlaceholderText('Search your documents...')
    fireEvent.change(input, { target: { value: 'test query' } })
    
    const clearButton = screen.getByRole('button', { name: /×/i })
    fireEvent.click(clearButton)
    
    expect(input).toHaveValue('')
    expect(mockClearResults).toHaveBeenCalled()
  })

  it('displays error message when search fails', () => {
    mockUseSearch.mockReturnValue({
      searchDocuments: mockSearchDocuments,
      isSearching: false,
      results: null,
      noResults: null,
      error: 'Search failed',
      clearResults: mockClearResults,
      performanceMetrics: null
    })

    render(<SearchInterface />)
    
    expect(screen.getByText('Search failed')).toBeInTheDocument()
  })

  it('applies filters when provided', async () => {
    const filters = { document_ids: ['doc1', 'doc2'], min_score: 0.5 }
    render(<SearchInterface filters={filters} />)
    
    const input = screen.getByPlaceholderText('Search your documents...')
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
    
    await waitFor(() => {
      expect(mockSearchDocuments).toHaveBeenCalledWith({
        query: 'test query',
        document_ids: ['doc1', 'doc2'],
        min_score: 0.5
      })
    })
  })

  it('disables search button when query is empty', () => {
    render(<SearchInterface />)
    
    const searchButton = screen.getByRole('button', { name: /search/i })
    expect(searchButton).toBeDisabled()
  })
})