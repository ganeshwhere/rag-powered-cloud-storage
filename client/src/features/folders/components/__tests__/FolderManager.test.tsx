import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { FolderManager } from '../FolderManager'
import type { Document } from '@/shared/types/document'

// Mock child components
jest.mock('../FolderTree', () => ({
  FolderTree: ({ onFolderSelect, onCreateFolder, selectedFolderId }: any) => (
    <div data-testid="folder-tree">
      <span>Selected: {selectedFolderId || 'none'}</span>
      <button onClick={() => onFolderSelect('folder-1')}>Select Folder</button>
      <button onClick={() => onCreateFolder()}>Create Folder</button>
    </div>
  ),
}))

jest.mock('../FolderBreadcrumbs', () => ({
  FolderBreadcrumbs: ({ folderId, onNavigate }: any) => (
    <div data-testid="folder-breadcrumbs">
      <span>Breadcrumbs for: {folderId}</span>
      <button onClick={() => onNavigate()}>Navigate Home</button>
    </div>
  ),
}))

jest.mock('../FolderDialog', () => ({
  FolderDialog: ({ isOpen, operation, onClose }: any) => (
    isOpen ? (
      <div data-testid="folder-dialog">
        <span>Dialog: {operation}</span>
        <button onClick={onClose}>Close Dialog</button>
      </div>
    ) : null
  ),
}))

jest.mock('../../documents/components/DocumentList', () => ({
  DocumentList: ({ folderId, onDocumentSelect, onUploadClick }: any) => (
    <div data-testid="document-list">
      <span>Documents for folder: {folderId || 'all'}</span>
      <button onClick={() => onDocumentSelect({ id: 'doc-1', name: 'Test Doc' })}>
        Select Document
      </button>
      <button onClick={onUploadClick}>Upload from List</button>
    </div>
  ),
}))

jest.mock('../../documents/components/upload/UploadManager', () => ({
  UploadManager: ({ folderId, onUploadComplete }: any) => (
    <div data-testid="upload-manager">
      <span>Upload to folder: {folderId || 'root'}</span>
      <button onClick={onUploadComplete}>Complete Upload</button>
    </div>
  ),
}))

describe('FolderManager', () => {
  const user = userEvent.setup()

  it('renders folder manager with default view', () => {
    render(<FolderManager />)

    expect(screen.getByText('Document Library')).toBeInTheDocument()
    expect(screen.getByText('Organize and manage your documents')).toBeInTheDocument()
    expect(screen.getByTestId('folder-tree')).toBeInTheDocument()
    expect(screen.getByTestId('document-list')).toBeInTheDocument()
  })

  it('handles folder selection', async () => {
    render(<FolderManager />)

    const selectFolderButton = screen.getByText('Select Folder')
    await user.click(selectFolderButton)

    expect(screen.getByText('Selected: folder-1')).toBeInTheDocument()
    expect(screen.getByText('Documents for folder: folder-1')).toBeInTheDocument()
  })

  it('shows breadcrumbs when folder is selected', async () => {
    render(<FolderManager />)

    const selectFolderButton = screen.getByText('Select Folder')
    await user.click(selectFolderButton)

    expect(screen.getByTestId('folder-breadcrumbs')).toBeInTheDocument()
    expect(screen.getByText('Breadcrumbs for: folder-1')).toBeInTheDocument()
  })

  it('handles breadcrumb navigation', async () => {
    render(<FolderManager />)

    // Select a folder first
    const selectFolderButton = screen.getByText('Select Folder')
    await user.click(selectFolderButton)

    // Navigate home via breadcrumbs
    const navigateHomeButton = screen.getByText('Navigate Home')
    await user.click(navigateHomeButton)

    expect(screen.getByText('Selected: none')).toBeInTheDocument()
    expect(screen.queryByTestId('folder-breadcrumbs')).not.toBeInTheDocument()
  })

  it('switches between view modes', async () => {
    render(<FolderManager />)

    const gridButton = screen.getByText('Grid')
    await user.click(gridButton)

    // Check that grid button is now active (default variant)
    expect(gridButton.closest('button')).toHaveAttribute('data-variant', 'default')

    const treeButton = screen.getByText('Tree')
    await user.click(treeButton)

    // Check that tree button is now active
    expect(treeButton.closest('button')).toHaveAttribute('data-variant', 'default')
  })

  it('opens create folder dialog', async () => {
    render(<FolderManager />)

    const newFolderButton = screen.getByText('New Folder')
    await user.click(newFolderButton)

    expect(screen.getByTestId('folder-dialog')).toBeInTheDocument()
    expect(screen.getByText('Dialog: create')).toBeInTheDocument()
  })

  it('closes folder dialog', async () => {
    render(<FolderManager />)

    // Open dialog
    const newFolderButton = screen.getByText('New Folder')
    await user.click(newFolderButton)

    expect(screen.getByTestId('folder-dialog')).toBeInTheDocument()

    // Close dialog
    const closeDialogButton = screen.getByText('Close Dialog')
    await user.click(closeDialogButton)

    expect(screen.queryByTestId('folder-dialog')).not.toBeInTheDocument()
  })

  it('switches to upload view', async () => {
    render(<FolderManager />)

    const uploadButton = screen.getByText('Upload')
    await user.click(uploadButton)

    expect(screen.getByText('Upload Documents')).toBeInTheDocument()
    expect(screen.getByText('Upload documents to your library')).toBeInTheDocument()
    expect(screen.getByTestId('upload-manager')).toBeInTheDocument()
    expect(screen.getByText('Back to Documents')).toBeInTheDocument()
  })

  it('returns from upload view', async () => {
    render(<FolderManager />)

    // Switch to upload view
    const uploadButton = screen.getByText('Upload')
    await user.click(uploadButton)

    // Return to document view
    const backButton = screen.getByText('Back to Documents')
    await user.click(backButton)

    expect(screen.getByText('Document Library')).toBeInTheDocument()
    expect(screen.getByTestId('folder-tree')).toBeInTheDocument()
  })

  it('handles document selection', async () => {
    const mockOnDocumentSelect = jest.fn()
    
    render(<FolderManager onDocumentSelect={mockOnDocumentSelect} />)

    const selectDocumentButton = screen.getByText('Select Document')
    await user.click(selectDocumentButton)

    expect(mockOnDocumentSelect).toHaveBeenCalledWith({ id: 'doc-1', name: 'Test Doc' })
  })

  it('handles upload from document list', async () => {
    render(<FolderManager />)

    const uploadFromListButton = screen.getByText('Upload from List')
    await user.click(uploadFromListButton)

    expect(screen.getByText('Upload Documents')).toBeInTheDocument()
    expect(screen.getByTestId('upload-manager')).toBeInTheDocument()
  })

  it('handles upload completion', async () => {
    render(<FolderManager />)

    // Switch to upload view
    const uploadButton = screen.getByText('Upload')
    await user.click(uploadButton)

    // Complete upload
    const completeUploadButton = screen.getByText('Complete Upload')
    await user.click(completeUploadButton)

    // Should still be in upload view
    expect(screen.getByText('Upload Documents')).toBeInTheDocument()
  })

  it('passes selected folder to upload manager', async () => {
    render(<FolderManager />)

    // Select a folder
    const selectFolderButton = screen.getByText('Select Folder')
    await user.click(selectFolderButton)

    // Switch to upload view
    const uploadButton = screen.getByText('Upload')
    await user.click(uploadButton)

    expect(screen.getByText('Upload to folder: folder-1')).toBeInTheDocument()
  })

  it('shows different title based on folder selection', async () => {
    render(<FolderManager />)

    // Initially shows "All Documents"
    expect(screen.getByText('All Documents')).toBeInTheDocument()

    // Select a folder
    const selectFolderButton = screen.getByText('Select Folder')
    await user.click(selectFolderButton)

    // Should show "Documents in Folder"
    expect(screen.getByText('Documents in Folder')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<FolderManager className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles create folder from tree', async () => {
    render(<FolderManager />)

    const createFolderButton = screen.getByText('Create Folder')
    await user.click(createFolderButton)

    expect(screen.getByTestId('folder-dialog')).toBeInTheDocument()
    expect(screen.getByText('Dialog: create')).toBeInTheDocument()
  })
})