import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { FolderDialog } from '../FolderDialog'
import type { Folder } from '@/shared/types/folder'

// Mock the hooks
jest.mock('../hooks/useFolderActions', () => ({
  useFolderActions: jest.fn(),
}))
const mockUseFolderActions = require('../hooks/useFolderActions').useFolderActions as jest.Mock

// Mock validation function
jest.mock('../types', () => ({
  validateFolderName: jest.fn(),
}))
const mockValidateFolderName = require('../types').validateFolderName as jest.Mock

describe('FolderDialog', () => {
  const mockFolder: Folder = {
    id: 'folder-1',
    name: 'Test Folder',
    parent_id: null,
    path: '/Test Folder',
    user_id: 'user-1',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }

  const mockCreateFolder = { mutateAsync: jest.fn(), isPending: false }
  const mockUpdateFolder = { mutateAsync: jest.fn(), isPending: false }
  const mockDeleteFolder = { mutateAsync: jest.fn(), isPending: false }

  const user = userEvent.setup()

  beforeEach(() => {
    mockUseFolderActions.mockReturnValue({
      createFolder: mockCreateFolder,
      updateFolder: mockUpdateFolder,
      deleteFolder: mockDeleteFolder,
    })

    mockValidateFolderName.mockReturnValue({
      isValid: true,
      errors: [],
    })

    mockCreateFolder.mutateAsync.mockClear()
    mockUpdateFolder.mutateAsync.mockClear()
    mockDeleteFolder.mutateAsync.mockClear()
  })

  it('renders create folder dialog', () => {
    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('Create New Folder')).toBeInTheDocument()
    expect(screen.getByText('Enter a name for the new folder.')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Folder name')).toBeInTheDocument()
    expect(screen.getByText('Create')).toBeInTheDocument()
  })

  it('renders rename folder dialog', () => {
    render(
      <FolderDialog
        isOpen={true}
        operation="rename"
        folder={mockFolder}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('Rename Folder')).toBeInTheDocument()
    expect(screen.getByText('Enter a new name for the folder.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Folder')).toBeInTheDocument()
    expect(screen.getByText('Rename')).toBeInTheDocument()
  })

  it('renders delete folder dialog', () => {
    render(
      <FolderDialog
        isOpen={true}
        operation="delete"
        folder={mockFolder}
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('Delete Folder')).toBeInTheDocument()
    expect(screen.getByText(/are you sure you want to delete "test folder"/i)).toBeInTheDocument()
    expect(screen.getByText('Also delete all documents in this folder')).toBeInTheDocument()
    expect(screen.getByText('Delete')).toBeInTheDocument()
  })

  it('handles create folder submission', async () => {
    const mockOnClose = jest.fn()
    const mockOnSuccess = jest.fn()
    
    mockCreateFolder.mutateAsync.mockResolvedValue(mockFolder)

    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        parentId="parent-1"
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const nameInput = screen.getByPlaceholderText('Folder name')
    await user.type(nameInput, 'New Folder')

    const createButton = screen.getByText('Create')
    await user.click(createButton)

    expect(mockCreateFolder.mutateAsync).toHaveBeenCalledWith({
      name: 'New Folder',
      parent_id: 'parent-1',
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith(mockFolder)
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles rename folder submission', async () => {
    const mockOnClose = jest.fn()
    const mockOnSuccess = jest.fn()
    
    mockUpdateFolder.mutateAsync.mockResolvedValue({ ...mockFolder, name: 'Renamed Folder' })

    render(
      <FolderDialog
        isOpen={true}
        operation="rename"
        folder={mockFolder}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    )

    const nameInput = screen.getByDisplayValue('Test Folder')
    await user.clear(nameInput)
    await user.type(nameInput, 'Renamed Folder')

    const renameButton = screen.getByText('Rename')
    await user.click(renameButton)

    expect(mockUpdateFolder.mutateAsync).toHaveBeenCalledWith({
      folderId: 'folder-1',
      data: { name: 'Renamed Folder' },
    })

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledWith({ ...mockFolder, name: 'Renamed Folder' })
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles delete folder submission', async () => {
    const mockOnClose = jest.fn()
    
    render(
      <FolderDialog
        isOpen={true}
        operation="delete"
        folder={mockFolder}
        onClose={mockOnClose}
      />
    )

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockDeleteFolder.mutateAsync).toHaveBeenCalledWith({
      folderId: 'folder-1',
      options: { delete_documents: false },
    })

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('handles delete with documents option', async () => {
    const mockOnClose = jest.fn()
    
    render(
      <FolderDialog
        isOpen={true}
        operation="delete"
        folder={mockFolder}
        onClose={mockOnClose}
      />
    )

    const deleteDocumentsCheckbox = screen.getByLabelText(/also delete all documents/i)
    await user.click(deleteDocumentsCheckbox)

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockDeleteFolder.mutateAsync).toHaveBeenCalledWith({
      folderId: 'folder-1',
      options: { delete_documents: true },
    })
  })

  it('shows validation errors', async () => {
    mockValidateFolderName.mockReturnValue({
      isValid: false,
      errors: ['Folder name is required', 'Folder name is too long'],
    })

    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={jest.fn()}
      />
    )

    const nameInput = screen.getByPlaceholderText('Folder name')
    await user.type(nameInput, 'invalid')

    const createButton = screen.getByText('Create')
    await user.click(createButton)

    expect(screen.getByText('Folder name is required')).toBeInTheDocument()
    expect(screen.getByText('Folder name is too long')).toBeInTheDocument()
    expect(mockCreateFolder.mutateAsync).not.toHaveBeenCalled()
  })

  it('shows loading states', () => {
    mockUseFolderActions.mockReturnValue({
      createFolder: { ...mockCreateFolder, isPending: true },
      updateFolder: mockUpdateFolder,
      deleteFolder: mockDeleteFolder,
    })

    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={jest.fn()}
      />
    )

    expect(screen.getByText('Processing...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Folder name')).toBeDisabled()
  })

  it('disables submit button when name is empty', () => {
    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={jest.fn()}
      />
    )

    const createButton = screen.getByText('Create')
    expect(createButton).toBeDisabled()
  })

  it('enables submit button when name is provided', async () => {
    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={jest.fn()}
      />
    )

    const nameInput = screen.getByPlaceholderText('Folder name')
    await user.type(nameInput, 'New Folder')

    const createButton = screen.getByText('Create')
    expect(createButton).not.toBeDisabled()
  })

  it('handles cancel action', async () => {
    const mockOnClose = jest.fn()
    
    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={mockOnClose}
      />
    )

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalled()
  })

  it('resets form when dialog opens', () => {
    const { rerender } = render(
      <FolderDialog
        isOpen={false}
        operation="create"
        onClose={jest.fn()}
      />
    )

    rerender(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={jest.fn()}
      />
    )

    const nameInput = screen.getByPlaceholderText('Folder name')
    expect(nameInput).toHaveValue('')
  })

  it('handles API errors', async () => {
    const mockError = new Error('Folder already exists')
    mockCreateFolder.mutateAsync.mockRejectedValue(mockError)

    render(
      <FolderDialog
        isOpen={true}
        operation="create"
        onClose={jest.fn()}
      />
    )

    const nameInput = screen.getByPlaceholderText('Folder name')
    await user.type(nameInput, 'Existing Folder')

    const createButton = screen.getByText('Create')
    await user.click(createButton)

    await waitFor(() => {
      expect(screen.getByText('Folder already exists')).toBeInTheDocument()
    })
  })

  it('does not render when closed', () => {
    render(
      <FolderDialog
        isOpen={false}
        operation="create"
        onClose={jest.fn()}
      />
    )

    expect(screen.queryByText('Create New Folder')).not.toBeInTheDocument()
  })
})