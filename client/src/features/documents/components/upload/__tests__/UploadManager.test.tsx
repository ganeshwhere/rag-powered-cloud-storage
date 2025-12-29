import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { UploadManager } from '../UploadManager'

// Mock the hooks
jest.mock('../../hooks/useDocumentUpload', () => ({
  useDocumentUpload: jest.fn(),
}))
const mockUseDocumentUpload = require('../../hooks/useDocumentUpload').useDocumentUpload as jest.Mock

// Mock FileUploadZone
jest.mock('../FileUploadZone', () => ({
  FileUploadZone: ({ onFilesSelected, disabled }: any) => (
    <div data-testid="file-upload-zone">
      <button 
        onClick={() => onFilesSelected([{ id: '1', file: new File([''], 'test.pdf'), progress: 0, status: 'pending' }])}
        disabled={disabled}
      >
        Select Files
      </button>
    </div>
  ),
}))

// Mock UploadProgress
jest.mock('../UploadProgress', () => ({
  UploadProgress: ({ files, onRetry, onCancel, onRemove }: any) => (
    <div data-testid="upload-progress">
      {files.map((file: any) => (
        <div key={file.id} data-testid={`file-${file.id}`}>
          <span>{file.file.name} - {file.status}</span>
          <button onClick={() => onRetry(file.id)}>Retry</button>
          <button onClick={() => onCancel(file.id)}>Cancel</button>
          <button onClick={() => onRemove(file.id)}>Remove</button>
        </div>
      ))}
    </div>
  ),
}))

describe('UploadManager', () => {
  const mockUploadFiles = jest.fn()
  const mockRemoveFile = jest.fn()
  const mockClearCompleted = jest.fn()
  const mockClearAll = jest.fn()

  const mockUploadHook = {
    uploadFiles: mockUploadFiles,
    uploadingFiles: [],
    removeFile: mockRemoveFile,
    clearCompleted: mockClearCompleted,
    clearAll: mockClearAll,
    isUploading: false,
    error: null,
  }

  const user = userEvent.setup()

  beforeEach(() => {
    mockUseDocumentUpload.mockReturnValue(mockUploadHook)
    mockUploadFiles.mockClear()
    mockRemoveFile.mockClear()
    mockClearCompleted.mockClear()
    mockClearAll.mockClear()
  })

  it('renders file upload zone', () => {
    render(<UploadManager />)

    expect(screen.getByTestId('file-upload-zone')).toBeInTheDocument()
    expect(screen.getByText('Select Files')).toBeInTheDocument()
  })

  it('handles file selection and starts upload', async () => {
    const mockOnUploadStart = jest.fn()
    
    render(<UploadManager onUploadStart={mockOnUploadStart} />)

    const selectButton = screen.getByText('Select Files')
    await user.click(selectButton)

    expect(mockOnUploadStart).toHaveBeenCalledWith([expect.any(File)])
    expect(mockUploadFiles).toHaveBeenCalledWith([expect.any(File)], undefined)
  })

  it('disables upload zone when uploading', () => {
    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      isUploading: true,
    })

    render(<UploadManager />)

    const selectButton = screen.getByText('Select Files')
    expect(selectButton).toBeDisabled()
  })

  it('shows upload progress when files are uploading', () => {
    const mockFiles = [
      {
        id: '1',
        file: new File([''], 'test1.pdf'),
        progress: 50,
        status: 'uploading',
      },
      {
        id: '2',
        file: new File([''], 'test2.pdf'),
        progress: 100,
        status: 'completed',
      },
    ]

    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      uploadingFiles: mockFiles,
    })

    render(<UploadManager />)

    expect(screen.getByText('Upload Progress')).toBeInTheDocument()
    expect(screen.getByTestId('upload-progress')).toBeInTheDocument()
    expect(screen.getByTestId('file-1')).toBeInTheDocument()
    expect(screen.getByTestId('file-2')).toBeInTheDocument()
  })

  it('shows clear completed button when there are completed files', () => {
    const mockFiles = [
      {
        id: '1',
        file: new File([''], 'test1.pdf'),
        progress: 100,
        status: 'completed',
      },
    ]

    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      uploadingFiles: mockFiles,
    })

    render(<UploadManager />)

    expect(screen.getByText('Clear completed')).toBeInTheDocument()
    expect(screen.getByText('Clear all')).toBeInTheDocument()
  })

  it('handles clear completed action', async () => {
    const mockFiles = [
      {
        id: '1',
        file: new File([''], 'test1.pdf'),
        progress: 100,
        status: 'completed',
      },
    ]

    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      uploadingFiles: mockFiles,
    })

    render(<UploadManager />)

    const clearCompletedButton = screen.getByText('Clear completed')
    await user.click(clearCompletedButton)

    expect(mockClearCompleted).toHaveBeenCalled()
  })

  it('handles clear all action', async () => {
    const mockFiles = [
      {
        id: '1',
        file: new File([''], 'test1.pdf'),
        progress: 50,
        status: 'uploading',
      },
    ]

    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      uploadingFiles: mockFiles,
    })

    render(<UploadManager />)

    const clearAllButton = screen.getByText('Clear all')
    await user.click(clearAllButton)

    expect(mockClearAll).toHaveBeenCalled()
  })

  it('handles retry action', async () => {
    const mockFiles = [
      {
        id: '1',
        file: new File([''], 'test1.pdf'),
        progress: 0,
        status: 'failed',
      },
    ]

    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      uploadingFiles: mockFiles,
    })

    render(<UploadManager />)

    const retryButton = screen.getByText('Retry')
    await user.click(retryButton)

    expect(mockUploadFiles).toHaveBeenCalledWith([mockFiles[0].file], undefined)
  })

  it('handles cancel and remove actions', async () => {
    const mockFiles = [
      {
        id: '1',
        file: new File([''], 'test1.pdf'),
        progress: 50,
        status: 'uploading',
      },
    ]

    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      uploadingFiles: mockFiles,
    })

    render(<UploadManager />)

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)
    expect(mockRemoveFile).toHaveBeenCalledWith('1')

    const removeButton = screen.getByText('Remove')
    await user.click(removeButton)
    expect(mockRemoveFile).toHaveBeenCalledWith('1')
  })

  it('displays upload error', () => {
    const mockError = new Error('Upload failed')
    
    mockUseDocumentUpload.mockReturnValue({
      ...mockUploadHook,
      error: mockError,
    })

    render(<UploadManager />)

    expect(screen.getByText('Upload Error: Upload failed')).toBeInTheDocument()
  })

  it('calls upload callbacks', async () => {
    const mockOnUploadComplete = jest.fn()
    const mockOnUploadProgress = jest.fn()
    const mockOnUploadError = jest.fn()

    render(
      <UploadManager
        onUploadComplete={mockOnUploadComplete}
        onUploadProgress={mockOnUploadProgress}
        onUploadError={mockOnUploadError}
      />
    )

    // Verify the hook was called with the correct callbacks
    const hookCall = mockUseDocumentUpload.mock.calls[0][0]
    
    // Test onUploadComplete callback
    const testFile = new File([''], 'test.pdf')
    hookCall.onUploadComplete('doc-123', testFile)
    expect(mockOnUploadComplete).toHaveBeenCalledWith('doc-123', testFile)

    // Test onUploadError callback
    const testError = new Error('Test error')
    hookCall.onUploadError(testError, testFile)
    expect(mockOnUploadError).toHaveBeenCalledWith(
      expect.stringContaining('test.pdf'),
      'Test error'
    )

    // Test onUploadProgress callback
    hookCall.onUploadProgress({ fileId: 'file-1', progress: 75 })
    expect(mockOnUploadProgress).toHaveBeenCalledWith('file-1', 75)
  })
})