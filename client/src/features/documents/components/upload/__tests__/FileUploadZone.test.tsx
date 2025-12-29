import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { FileUploadZone } from '../FileUploadZone'
import { DEFAULT_UPLOAD_CONFIG } from '../../../types'

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(),
}))

const mockUseDropzone = require('react-dropzone').useDropzone as jest.Mock

describe('FileUploadZone', () => {
  const mockOnFilesSelected = jest.fn()
  const user = userEvent.setup()

  const mockDropzoneProps = {
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
  }

  beforeEach(() => {
    mockOnFilesSelected.mockClear()
    mockUseDropzone.mockReturnValue(mockDropzoneProps)
  })

  it('renders upload zone with default configuration', () => {
    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)

    expect(screen.getByText('Drag & drop files here, or click to select')).toBeInTheDocument()
    expect(screen.getByText('Choose Files')).toBeInTheDocument()
    expect(screen.getByText(/maximum file size: 100mb/i)).toBeInTheDocument()
  })

  it('shows drag active state', () => {
    mockUseDropzone.mockReturnValue({
      ...mockDropzoneProps,
      isDragActive: true,
    })

    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)

    expect(screen.getByText('Drop files here')).toBeInTheDocument()
  })

  it('disables upload zone when disabled prop is true', () => {
    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} disabled={true} />)

    expect(screen.queryByText('Choose Files')).not.toBeInTheDocument()
  })

  it('displays custom configuration', () => {
    const customConfig = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      allowedFileTypes: ['application/pdf'],
    }

    render(
      <FileUploadZone 
        onFilesSelected={mockOnFilesSelected} 
        config={customConfig}
      />
    )

    expect(screen.getByText(/maximum file size: 50mb/i)).toBeInTheDocument()
    expect(screen.getByText(/supports: pdf/i)).toBeInTheDocument()
  })

  it('handles file drop with valid files', () => {
    const mockFile = new File(['content'], 'test.pdf', { type: 'application/pdf' })

    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)

    // Get the onDrop function that was passed to useDropzone
    const onDrop = mockUseDropzone.mock.calls[0][0].onDrop
    
    // Simulate file drop
    onDrop([mockFile], [])

    expect(mockOnFilesSelected).toHaveBeenCalledWith([
      expect.objectContaining({
        file: mockFile,
        progress: 0,
        status: 'pending',
      })
    ])
  })

  it('displays errors for invalid files', async () => {
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    mockUseDropzone.mockImplementation(({ onDrop }) => {
      return mockDropzoneProps
    })

    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)

    // Simulate file drop with rejected files
    const onDrop = mockUseDropzone.mock.calls[0][0].onDrop
    onDrop([], [{
      file: mockFile,
      errors: [{ code: 'file-invalid-type', message: 'File type not supported' }]
    }])

    await waitFor(() => {
      expect(screen.getByText('Upload Errors')).toBeInTheDocument()
      expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
    })
  })

  it('clears errors when clear button is clicked', async () => {
    const mockFile = new File(['content'], 'test.txt', { type: 'text/plain' })
    
    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)

    // Simulate error
    const onDrop = mockUseDropzone.mock.calls[0][0].onDrop
    onDrop([], [{
      file: mockFile,
      errors: [{ code: 'file-invalid-type', message: 'File type not supported' }]
    }])

    await waitFor(() => {
      expect(screen.getByText('Upload Errors')).toBeInTheDocument()
    })

    // Click clear button
    const clearButton = screen.getByRole('button', { name: /×/i })
    await user.click(clearButton)

    expect(screen.queryByText('Upload Errors')).not.toBeInTheDocument()
  })

  it('validates file size', () => {
    // Create a mock file that appears large without actually creating large content
    const largeFile = new File(['content'], 'large.pdf', { 
      type: 'application/pdf' 
    })
    // Mock the file size property
    Object.defineProperty(largeFile, 'size', {
      value: 200 * 1024 * 1024, // 200MB
      writable: false
    })
    
    render(<FileUploadZone onFilesSelected={mockOnFilesSelected} />)

    const onDrop = mockUseDropzone.mock.calls[0][0].onDrop
    onDrop([largeFile], [])

    expect(screen.getByText(/file size exceeds 100mb limit/i)).toBeInTheDocument()
    expect(mockOnFilesSelected).not.toHaveBeenCalled()
  })

  it('calls useDropzone with correct configuration', () => {
    const customConfig = {
      maxFileSize: 50 * 1024 * 1024,
      allowedFileTypes: ['application/pdf', 'text/plain'],
    }

    render(
      <FileUploadZone 
        onFilesSelected={mockOnFilesSelected} 
        config={customConfig}
        disabled={true}
      />
    )

    expect(mockUseDropzone).toHaveBeenCalledWith(
      expect.objectContaining({
        accept: {
          'application/pdf': [],
          'text/plain': [],
        },
        maxSize: 50 * 1024 * 1024,
        disabled: true,
        multiple: true,
      })
    )
  })
})