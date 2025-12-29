import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { DocumentViewer } from '../DocumentViewer'
import type { Document } from '@/shared/types/document'

// Mock the hooks
jest.mock('../../hooks/useDocument', () => ({
  useDocument: jest.fn(),
}))
const mockUseDocument = require('../../hooks/useDocument').useDocument as jest.Mock

jest.mock('../../hooks/useDocumentStatus', () => ({
  useDocumentStatus: jest.fn(),
}))
const mockUseDocumentStatus = require('../../hooks/useDocumentStatus').useDocumentStatus as jest.Mock

jest.mock('../../hooks/useDocumentActions', () => ({
  useDocumentActions: jest.fn(),
}))
const mockUseDocumentActions = require('../../hooks/useDocumentActions').useDocumentActions as jest.Mock

// Mock window.confirm
const mockConfirm = jest.fn()
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
})

describe('DocumentViewer', () => {
  const mockDocument: Document = {
    id: 'doc-1',
    name: 'Test Document.pdf',
    original_name: 'Test Document.pdf',
    file_type: 'pdf',
    file_size: 1024000,
    mime_type: 'application/pdf',
    status: 'completed',
    chunk_count: 10,
    total_tokens: 500,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    user_id: 'user-1',
    folder_id: null,
    s3_key: 'test-key',
    s3_bucket: 'test-bucket',
    processing_error: null,
    extra_metadata: { author: 'Test Author' },
  }

  const mockDeleteDocument = { mutateAsync: jest.fn(), isPending: false }
  const mockGetDownloadUrl = { mutateAsync: jest.fn(), isPending: false }

  const user = userEvent.setup()

  beforeEach(() => {
    mockUseDocument.mockReturnValue({
      data: mockDocument,
      isLoading: false,
      error: null,
    })

    mockUseDocumentStatus.mockReturnValue({
      data: null,
    })

    mockUseDocumentActions.mockReturnValue({
      deleteDocument: mockDeleteDocument,
      getDownloadUrl: mockGetDownloadUrl,
    })

    mockDeleteDocument.mutateAsync.mockClear()
    mockGetDownloadUrl.mutateAsync.mockClear()
    mockConfirm.mockClear()
  })

  it('renders document information correctly', () => {
    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('Test Document.pdf')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(screen.getByText('1000 KB')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument() // chunk count
    expect(screen.getByText('500')).toBeInTheDocument() // token count
  })

  it('shows loading state', () => {
    mockUseDocument.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.queryByText('Test Document.pdf')).not.toBeInTheDocument()
    // Check for loading skeleton
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument()
  })

  it('shows error state', () => {
    const mockError = new Error('Document not found')
    
    mockUseDocument.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('Failed to load document')).toBeInTheDocument()
    expect(screen.getByText('Document not found')).toBeInTheDocument()
  })

  it('handles download action', async () => {
    render(<DocumentViewer documentId="doc-1" />)

    const downloadButton = screen.getByText('Download')
    await user.click(downloadButton)

    expect(mockGetDownloadUrl.mutateAsync).toHaveBeenCalledWith('doc-1')
  })

  it('handles delete action with confirmation', async () => {
    const mockOnDelete = jest.fn()
    const mockOnClose = jest.fn()
    mockConfirm.mockReturnValue(true)
    
    render(
      <DocumentViewer 
        documentId="doc-1" 
        onDelete={mockOnDelete}
        onClose={mockOnClose}
      />
    )

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete "Test Document.pdf"?')
    expect(mockDeleteDocument.mutateAsync).toHaveBeenCalledWith('doc-1')
    
    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalled()
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('cancels delete when not confirmed', async () => {
    mockConfirm.mockReturnValue(false)
    
    render(<DocumentViewer documentId="doc-1" />)

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockConfirm).toHaveBeenCalled()
    expect(mockDeleteDocument.mutateAsync).not.toHaveBeenCalled()
  })

  it('shows processing status', () => {
    const processingDoc = { ...mockDocument, status: 'processing' as const }
    
    mockUseDocument.mockReturnValue({
      data: processingDoc,
      isLoading: false,
      error: null,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('processing')).toBeInTheDocument()
    expect(screen.getByText('Processing Document')).toBeInTheDocument()
    expect(screen.getByText(/your document is being processed/i)).toBeInTheDocument()
  })

  it('shows failed status with error', () => {
    const failedDoc = { 
      ...mockDocument, 
      status: 'failed' as const,
      processing_error: 'File format not supported'
    }
    
    mockUseDocument.mockReturnValue({
      data: failedDoc,
      isLoading: false,
      error: null,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('failed')).toBeInTheDocument()
    expect(screen.getByText('Processing Failed')).toBeInTheDocument()
    expect(screen.getByText('File format not supported')).toBeInTheDocument()
  })

  it('shows pending status', () => {
    const pendingDoc = { ...mockDocument, status: 'pending' as const }
    
    mockUseDocument.mockReturnValue({
      data: pendingDoc,
      isLoading: false,
      error: null,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('Queued for Processing')).toBeInTheDocument()
  })

  it('displays metadata when available', () => {
    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('Metadata')).toBeInTheDocument()
    expect(screen.getByText(/"author": "Test Author"/)).toBeInTheDocument()
  })

  it('hides metadata section when no metadata', () => {
    const docWithoutMetadata = { ...mockDocument, extra_metadata: {} }
    
    mockUseDocument.mockReturnValue({
      data: docWithoutMetadata,
      isLoading: false,
      error: null,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.queryByText('Metadata')).not.toBeInTheDocument()
  })

  it('shows close button when onClose provided', async () => {
    const mockOnClose = jest.fn()
    
    render(<DocumentViewer documentId="doc-1" onClose={mockOnClose} />)

    const closeButton = screen.getByText('×')
    await user.click(closeButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('shows loading states for actions', () => {
    mockUseDocumentActions.mockReturnValue({
      deleteDocument: { ...mockDeleteDocument, isPending: true },
      getDownloadUrl: { ...mockGetDownloadUrl, isPending: true },
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('Downloading...')).toBeInTheDocument()
    expect(screen.getByText('Deleting...')).toBeInTheDocument()
  })

  it('uses status data when available', () => {
    const statusData = {
      status: 'processing' as const,
      chunk_count: 15,
      total_tokens: 750,
      processing_error: null,
    }

    mockUseDocumentStatus.mockReturnValue({
      data: statusData,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('processing')).toBeInTheDocument()
    // Should use status data instead of document data
    expect(screen.getByText('Processing Document')).toBeInTheDocument()
  })

  it('formats file size correctly', () => {
    const largeDoc = { ...mockDocument, file_size: 1024 * 1024 * 5 } // 5MB
    
    mockUseDocument.mockReturnValue({
      data: largeDoc,
      isLoading: false,
      error: null,
    })

    render(<DocumentViewer documentId="doc-1" />)

    expect(screen.getByText('5 MB')).toBeInTheDocument()
  })

  it('auto-closes when document not found (404 error)', async () => {
    const mockOnClose = jest.fn()
    const notFoundError = new Error('Document not found')
    
    mockUseDocument.mockReturnValue({
      data: null,
      isLoading: false,
      error: notFoundError,
    })

    render(<DocumentViewer documentId="doc-1" onClose={mockOnClose} />)

    // Should auto-close when 404 error occurs
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('auto-closes when document returns 404 status error', async () => {
    const mockOnClose = jest.fn()
    const error404 = new Error('Request failed with status 404')
    
    mockUseDocument.mockReturnValue({
      data: null,
      isLoading: false,
      error: error404,
    })

    render(<DocumentViewer documentId="doc-1" onClose={mockOnClose} />)

    // Should auto-close when 404 error occurs
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })
})