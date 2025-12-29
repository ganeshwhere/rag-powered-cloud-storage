import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { DocumentList } from '../DocumentList'
import type { Document } from '@/shared/types/document'

// Mock the hooks
jest.mock('../../hooks', () => ({
  useDocuments: jest.fn(),
}))
const mockUseDocuments = require('../../hooks').useDocuments as jest.Mock

jest.mock('../../hooks/useDocumentActions', () => ({
  useDocumentActions: jest.fn(),
}))
const mockUseDocumentActions = require('../../hooks/useDocumentActions').useDocumentActions as jest.Mock

// Mock child components
jest.mock('../DocumentCard', () => ({
  DocumentCard: ({ document, selected, onSelect, onClick }: any) => (
    <div data-testid={`document-card-${document.id}`}>
      <span>{document.name}</span>
      {onSelect && (
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(e.target.checked)}
          data-testid={`checkbox-${document.id}`}
        />
      )}
      <button onClick={onClick} data-testid={`click-${document.id}`}>
        View
      </button>
    </div>
  ),
}))

jest.mock('../DocumentListHeader', () => ({
  DocumentListHeader: ({ selectedCount, onSelectAll, onBulkDelete, showBulkActions }: any) => (
    <div data-testid="document-list-header">
      <span>Selected: {selectedCount}</span>
      {showBulkActions && (
        <>
          <button onClick={() => onSelectAll(true)}>Select All</button>
          <button onClick={onBulkDelete}>Bulk Delete</button>
        </>
      )}
    </div>
  ),
}))

jest.mock('../DocumentListEmpty', () => ({
  DocumentListEmpty: () => <div data-testid="document-list-empty">No documents</div>,
}))

jest.mock('../DocumentListSkeleton', () => ({
  DocumentListSkeleton: () => <div data-testid="document-list-skeleton">Loading...</div>,
}))

describe('DocumentList', () => {
  const mockDocuments: Document[] = [
    {
      id: 'doc-1',
      name: 'Document 1.pdf',
      original_name: 'Document 1.pdf',
      file_type: 'pdf',
      file_size: 1024,
      mime_type: 'application/pdf',
      status: 'completed',
      chunk_count: 5,
      total_tokens: 100,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      user_id: 'user-1',
      folder_id: null,
      s3_key: 'key-1',
      s3_bucket: 'bucket',
      processing_error: null,
      extra_metadata: {},
    },
    {
      id: 'doc-2',
      name: 'Document 2.pdf',
      original_name: 'Document 2.pdf',
      file_type: 'pdf',
      file_size: 2048,
      mime_type: 'application/pdf',
      status: 'processing',
      chunk_count: 0,
      total_tokens: 0,
      created_at: '2023-01-02T00:00:00Z',
      updated_at: '2023-01-02T00:00:00Z',
      user_id: 'user-1',
      folder_id: null,
      s3_key: 'key-2',
      s3_bucket: 'bucket',
      processing_error: null,
      extra_metadata: {},
    },
  ]

  const mockBulkDeleteDocuments = { mutateAsync: jest.fn(), isPending: false }

  const user = userEvent.setup()

  beforeEach(() => {
    mockUseDocuments.mockReturnValue({
      documents: mockDocuments,
      total: 2,
      isLoading: false,
      error: null,
      hasNextPage: false,
      prefetchNextPage: jest.fn(),
    })

    mockUseDocumentActions.mockReturnValue({
      bulkDeleteDocuments: mockBulkDeleteDocuments,
    })

    mockBulkDeleteDocuments.mutateAsync.mockClear()
  })

  it('renders document list with documents', () => {
    render(<DocumentList />)

    expect(screen.getByTestId('document-card-doc-1')).toBeInTheDocument()
    expect(screen.getByTestId('document-card-doc-2')).toBeInTheDocument()
    expect(screen.getByText('Document 1.pdf')).toBeInTheDocument()
    expect(screen.getByText('Document 2.pdf')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading', () => {
    mockUseDocuments.mockReturnValue({
      documents: [],
      total: 0,
      isLoading: true,
      error: null,
      hasNextPage: false,
      prefetchNextPage: jest.fn(),
    })

    render(<DocumentList />)

    expect(screen.getByTestId('document-list-skeleton')).toBeInTheDocument()
  })

  it('shows empty state when no documents', () => {
    mockUseDocuments.mockReturnValue({
      documents: [],
      total: 0,
      isLoading: false,
      error: null,
      hasNextPage: false,
      prefetchNextPage: jest.fn(),
    })

    render(<DocumentList />)

    expect(screen.getByTestId('document-list-empty')).toBeInTheDocument()
  })

  it('shows error state when error occurs', () => {
    const mockError = new Error('Failed to load documents')
    
    mockUseDocuments.mockReturnValue({
      documents: [],
      total: 0,
      isLoading: false,
      error: mockError,
      hasNextPage: false,
      prefetchNextPage: jest.fn(),
    })

    render(<DocumentList />)

    expect(screen.getAllByText('Failed to load documents')[0]).toBeInTheDocument()
  })

  it('handles document selection in selectable mode', async () => {
    render(<DocumentList selectable={true} />)

    const checkbox1 = screen.getByTestId('checkbox-doc-1')
    await user.click(checkbox1)

    expect(screen.getByText('Selected: 1')).toBeInTheDocument()
  })

  it('handles select all functionality', async () => {
    render(<DocumentList selectable={true} />)

    // Select one document first to show bulk actions
    const checkbox1 = screen.getByTestId('checkbox-doc-1')
    await user.click(checkbox1)

    const selectAllButton = screen.getByText('Select All')
    await user.click(selectAllButton)

    expect(screen.getByText('Selected: 2')).toBeInTheDocument()
  })

  it('handles bulk delete', async () => {
    render(<DocumentList selectable={true} />)

    // Select documents
    const checkbox1 = screen.getByTestId('checkbox-doc-1')
    const checkbox2 = screen.getByTestId('checkbox-doc-2')
    await user.click(checkbox1)
    await user.click(checkbox2)

    const bulkDeleteButton = screen.getByText('Bulk Delete')
    await user.click(bulkDeleteButton)

    expect(mockBulkDeleteDocuments.mutateAsync).toHaveBeenCalledWith(['doc-1', 'doc-2'])
  })

  it('handles document click', async () => {
    const mockOnDocumentSelect = jest.fn()
    
    render(<DocumentList onDocumentSelect={mockOnDocumentSelect} />)

    const viewButton = screen.getByTestId('click-doc-1')
    await user.click(viewButton)

    expect(mockOnDocumentSelect).toHaveBeenCalledWith(mockDocuments[0])
  })

  it('shows load more button when has next page', () => {
    mockUseDocuments.mockReturnValue({
      documents: mockDocuments,
      total: 50,
      isLoading: false,
      error: null,
      hasNextPage: true,
      prefetchNextPage: jest.fn(),
    })

    render(<DocumentList />)

    expect(screen.getByText('Load More')).toBeInTheDocument()
  })

  it('handles load more action', async () => {
    const mockPrefetchNextPage = jest.fn()
    
    mockUseDocuments.mockReturnValue({
      documents: mockDocuments,
      total: 50,
      isLoading: false,
      error: null,
      hasNextPage: true,
      prefetchNextPage: mockPrefetchNextPage,
    })

    render(<DocumentList />)

    const loadMoreButton = screen.getByText('Load More')
    await user.click(loadMoreButton)

    expect(mockPrefetchNextPage).toHaveBeenCalled()
  })

  it('passes folder ID to useDocuments hook', () => {
    render(<DocumentList folderId="folder-123" />)

    expect(mockUseDocuments).toHaveBeenCalledWith({
      folder_id: 'folder-123',
      page: 1,
      page_size: 20,
    })
  })

  it('shows loading state for additional pages', () => {
    mockUseDocuments.mockReturnValue({
      documents: mockDocuments,
      total: 50,
      isLoading: true,
      error: null,
      hasNextPage: true,
      prefetchNextPage: jest.fn(),
    })

    render(<DocumentList />)

    // Should show both documents and loading skeleton
    expect(screen.getByTestId('document-card-doc-1')).toBeInTheDocument()
    expect(screen.getByTestId('document-list-skeleton')).toBeInTheDocument()
  })

  it('clears selection after bulk delete', async () => {
    render(<DocumentList selectable={true} />)

    // Select a document
    const checkbox1 = screen.getByTestId('checkbox-doc-1')
    await user.click(checkbox1)

    expect(screen.getByText('Selected: 1')).toBeInTheDocument()

    // Perform bulk delete
    const bulkDeleteButton = screen.getByText('Bulk Delete')
    await user.click(bulkDeleteButton)

    await waitFor(() => {
      expect(screen.getByText('Selected: 0')).toBeInTheDocument()
    })
  })
})