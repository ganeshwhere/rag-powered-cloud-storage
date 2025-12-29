import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { FolderTree } from '../FolderTree'
import type { FolderTreeNode } from '../../types'

// Mock the hooks
jest.mock('../hooks', () => ({
  useFolderTree: jest.fn(),
}))
const mockUseFolderTree = require('../hooks').useFolderTree as jest.Mock

describe('FolderTree', () => {
  const mockFolders: FolderTreeNode[] = [
    {
      id: 'folder-1',
      name: 'Documents',
      parent_id: null,
      path: '/Documents',
      document_count: 5,
      children: [],
    },
    {
      id: 'folder-2',
      name: 'Projects',
      parent_id: null,
      path: '/Projects',
      document_count: 3,
      children: [],
    },
  ]

  const user = userEvent.setup()

  beforeEach(() => {
    mockUseFolderTree.mockReturnValue({
      folderTree: mockFolders,
      isLoading: false,
      error: null,
    })
  })

  it('renders folder tree with folders', () => {
    render(<FolderTree />)

    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument() // document count
    expect(screen.getByText('3')).toBeInTheDocument() // document count
  })

  it('shows loading state', () => {
    mockUseFolderTree.mockReturnValue({
      folderTree: [],
      isLoading: true,
      error: null,
    })

    render(<FolderTree />)

    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(5)
  })

  it('shows error state', () => {
    const mockError = new Error('Failed to load folders')
    
    mockUseFolderTree.mockReturnValue({
      folderTree: [],
      isLoading: false,
      error: mockError,
    })

    render(<FolderTree />)

    expect(screen.getByText('Failed to load folders')).toBeInTheDocument()
    expect(screen.getByText('Failed to load folders')).toBeInTheDocument()
  })

  it('shows empty state with create button', () => {
    mockUseFolderTree.mockReturnValue({
      folderTree: [],
      isLoading: false,
      error: null,
    })

    const mockOnCreateFolder = jest.fn()
    render(<FolderTree onCreateFolder={mockOnCreateFolder} />)

    expect(screen.getByText('No folders yet')).toBeInTheDocument()
    
    const createButton = screen.getByText('Create Folder')
    expect(createButton).toBeInTheDocument()
  })

  it('handles folder selection', async () => {
    const mockOnFolderSelect = jest.fn()
    
    render(<FolderTree onFolderSelect={mockOnFolderSelect} />)

    const folderButton = screen.getByText('Documents').closest('div')
    await user.click(folderButton!)

    expect(mockOnFolderSelect).toHaveBeenCalledWith('folder-1')
  })

  it('highlights selected folder', () => {
    render(<FolderTree selectedFolderId="folder-1" />)

    const selectedFolder = screen.getByText('Documents').closest('div')
    expect(selectedFolder).toHaveClass('bg-blue-100', 'text-blue-700')
  })

  it('shows dropdown menu on hover', async () => {
    render(<FolderTree />)

    const folderRow = screen.getByText('Documents').closest('div')
    await user.hover(folderRow!)

    // The dropdown trigger should become visible
    const moreButton = screen.getByRole('button', { name: /more/i })
    expect(moreButton).toBeInTheDocument()
  })

  it('handles create subfolder action', async () => {
    const mockOnCreateFolder = jest.fn()
    
    render(<FolderTree onCreateFolder={mockOnCreateFolder} />)

    const folderRow = screen.getByText('Documents').closest('div')
    await user.hover(folderRow!)

    const moreButton = screen.getByRole('button', { name: /more/i })
    await user.click(moreButton)

    const newFolderButton = screen.getByText('New Folder')
    await user.click(newFolderButton)

    expect(mockOnCreateFolder).toHaveBeenCalledWith('folder-1')
  })

  it('handles rename folder action', async () => {
    const mockOnRenameFolder = jest.fn()
    
    render(<FolderTree onRenameFolder={mockOnRenameFolder} />)

    const folderRow = screen.getByText('Documents').closest('div')
    await user.hover(folderRow!)

    const moreButton = screen.getByRole('button', { name: /more/i })
    await user.click(moreButton)

    const renameButton = screen.getByText('Rename')
    await user.click(renameButton)

    expect(mockOnRenameFolder).toHaveBeenCalledWith(mockFolders[0])
  })

  it('handles delete folder action', async () => {
    const mockOnDeleteFolder = jest.fn()
    
    render(<FolderTree onDeleteFolder={mockOnDeleteFolder} />)

    const folderRow = screen.getByText('Documents').closest('div')
    await user.hover(folderRow!)

    const moreButton = screen.getByRole('button', { name: /more/i })
    await user.click(moreButton)

    const deleteButton = screen.getByText('Delete')
    await user.click(deleteButton)

    expect(mockOnDeleteFolder).toHaveBeenCalledWith(mockFolders[0])
  })

  it('prevents event propagation on dropdown actions', async () => {
    const mockOnFolderSelect = jest.fn()
    
    render(<FolderTree onFolderSelect={mockOnFolderSelect} />)

    const folderRow = screen.getByText('Documents').closest('div')
    await user.hover(folderRow!)

    const moreButton = screen.getByRole('button', { name: /more/i })
    await user.click(moreButton)

    // Folder selection should not be called when clicking dropdown
    expect(mockOnFolderSelect).not.toHaveBeenCalled()
  })

  it('handles create folder from empty state', async () => {
    mockUseFolderTree.mockReturnValue({
      folderTree: [],
      isLoading: false,
      error: null,
    })

    const mockOnCreateFolder = jest.fn()
    render(<FolderTree onCreateFolder={mockOnCreateFolder} />)

    const createButton = screen.getByText('Create Folder')
    await user.click(createButton)

    expect(mockOnCreateFolder).toHaveBeenCalledWith()
  })

  it('applies custom className', () => {
    const { container } = render(<FolderTree className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows document count when available', () => {
    render(<FolderTree />)

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('handles folders without document count', () => {
    const foldersWithoutCount = mockFolders.map(folder => ({
      ...folder,
      document_count: undefined,
    }))

    mockUseFolderTree.mockReturnValue({
      folderTree: foldersWithoutCount,
      isLoading: false,
      error: null,
    })

    render(<FolderTree />)

    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    // Document counts should not be displayed
    expect(screen.queryByText('5')).not.toBeInTheDocument()
    expect(screen.queryByText('3')).not.toBeInTheDocument()
  })
})