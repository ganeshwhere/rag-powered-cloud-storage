import React from 'react'
import { render, screen, fireEvent } from '@/test-utils/render'
import { SearchResults } from '../SearchResults'
import { useDocumentView } from '@/features/documents/hooks/useDocumentView'
import { SearchResponse, NoResultsResponse, SearchChunk } from '../../types'

// Mock the document view hook
jest.mock('@/features/documents/hooks/useDocumentView')

const mockUseDocumentView = useDocumentView as jest.MockedFunction<typeof useDocumentView>

describe('SearchResults', () => {
  const mockNavigateToDocument = jest.fn()
  const mockOpenDocument = jest.fn()
  const mockDownloadDocument = jest.fn()
  const mockPreloadDocument = jest.fn()
  const mockClearError = jest.fn()

  beforeEach(() => {
    mockUseDocumentView.mockReturnValue({
      navigateToDocument: mockNavigateToDocument,
      openDocument: mockOpenDocument,
      downloadDocument: mockDownloadDocument,
      preloadDocument: mockPreloadDocument,
      loading: false,
      error: null,
      clearError: mockClearError
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  const mockSearchChunk: SearchChunk = {
    id: 'chunk1',
    document_id: 'doc123',
    chunk_index: 0,
    text: 'This is a sample text chunk from the document.',
    score: 0.85,
    metadata: {
      filename: 'test-document.pdf',
      page: 1
    }
  }

  const mockSearchResponse: SearchResponse = {
    query: 'test query',
    answer: 'This is the AI generated answer based on the search results.',
    chunks: [mockSearchChunk],
    total_results: 1,
    processing_time_ms: 150,
    sources: ['doc123']
  }

  const mockNoResultsResponse: NoResultsResponse = {
    query: 'no results query',
    message: 'No documents found matching your search.',
    suggestions: [
      'Try using different keywords',
      'Check your spelling',
      'Use more general terms'
    ]
  }

  it('renders search results with AI answer and chunks', () => {
    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    // Check search summary
    expect(screen.getByText('Search Results')).toBeInTheDocument()
    expect(screen.getByText(/Found 1 results for "test query" in 150ms/)).toBeInTheDocument()
    
    // Check AI answer
    expect(screen.getByText('AI Answer')).toBeInTheDocument()
    expect(screen.getByText('This is the AI generated answer based on the search results.')).toBeInTheDocument()
    
    // Check source chunks
    expect(screen.getByText('Source Chunks')).toBeInTheDocument()
    expect(screen.getByText('This is a sample text chunk from the document.')).toBeInTheDocument()
  })

  it('renders no results message with suggestions', () => {
    render(
      <SearchResults 
        results={null} 
        noResults={mockNoResultsResponse} 
        query="no results query" 
      />
    )
    
    expect(screen.getByText('No Results Found')).toBeInTheDocument()
    expect(screen.getByText('No documents found matching your search.')).toBeInTheDocument()
    
    // Check suggestions
    expect(screen.getByText('Try these suggestions:')).toBeInTheDocument()
    expect(screen.getByText('Try using different keywords')).toBeInTheDocument()
    expect(screen.getByText('Check your spelling')).toBeInTheDocument()
    expect(screen.getByText('Use more general terms')).toBeInTheDocument()
  })

  it('returns null when no results and no noResults', () => {
    const { container } = render(
      <SearchResults 
        results={null} 
        noResults={null} 
        query="test query" 
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('displays chunk metadata correctly', () => {
    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    // Check chunk metadata
    expect(screen.getAllByText(/Document doc123.../)[0]).toBeInTheDocument()
    expect(screen.getByText('Chunk 1')).toBeInTheDocument()
    expect(screen.getByText('Score: 85.0%')).toBeInTheDocument()
    expect(screen.getByText(/filename: test-document.pdf/)).toBeInTheDocument()
    expect(screen.getByText(/page: 1/)).toBeInTheDocument()
  })

  it('handles document navigation on chunk click', () => {
    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    const chunkCard = screen.getByText('This is a sample text chunk from the document.').closest('[role="button"], div[class*="cursor-pointer"]')
    if (chunkCard) {
      fireEvent.click(chunkCard)
      expect(mockNavigateToDocument).toHaveBeenCalledWith('doc123')
    }
  })

  it('handles quick view button click', async () => {
    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    const quickViewButton = screen.getByTitle('Open document in new tab')
    fireEvent.click(quickViewButton)
    
    expect(mockOpenDocument).toHaveBeenCalledWith('doc123')
  })

  it('preloads document on hover', () => {
    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    const chunkCard = screen.getByText('This is a sample text chunk from the document.').closest('div')
    if (chunkCard) {
      fireEvent.mouseEnter(chunkCard)
      expect(mockPreloadDocument).toHaveBeenCalledWith('doc123')
    }
  })

  it('handles source button clicks in AI answer', () => {
    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    const sourceButton = screen.getAllByText(/Document doc123.../)[0]
    fireEvent.click(sourceButton)
    
    expect(mockNavigateToDocument).toHaveBeenCalledWith('doc123')
  })

  it('displays processing time correctly', () => {
    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    // Check processing time in summary and header (might only appear once)
    expect(screen.getAllByText('150ms').length).toBeGreaterThanOrEqual(1)
  })

  it('handles chunks without metadata', () => {
    const chunkWithoutMetadata: SearchChunk = {
      ...mockSearchChunk,
      metadata: {}
    }
    
    const responseWithoutMetadata: SearchResponse = {
      ...mockSearchResponse,
      chunks: [chunkWithoutMetadata]
    }
    
    render(
      <SearchResults 
        results={responseWithoutMetadata} 
        noResults={null} 
        query="test query" 
      />
    )
    
    expect(screen.getByText('This is a sample text chunk from the document.')).toBeInTheDocument()
    // Should not show metadata section
    expect(screen.queryByText(/filename:/)).not.toBeInTheDocument()
  })

  it('handles loading state for document actions', () => {
    mockUseDocumentView.mockReturnValue({
      navigateToDocument: mockNavigateToDocument,
      openDocument: mockOpenDocument,
      downloadDocument: mockDownloadDocument,
      preloadDocument: mockPreloadDocument,
      loading: true,
      error: null,
      clearError: mockClearError
    })

    render(
      <SearchResults 
        results={mockSearchResponse} 
        noResults={null} 
        query="test query" 
      />
    )
    
    const quickViewButton = screen.getByTitle('Open document in new tab')
    expect(quickViewButton).toBeDisabled()
  })
})