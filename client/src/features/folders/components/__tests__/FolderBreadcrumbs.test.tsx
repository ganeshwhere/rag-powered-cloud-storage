import { render, screen, fireEvent, waitFor } from '@/test-utils'
import userEvent from '@testing-library/user-event'
import { FolderBreadcrumbs } from '../FolderBreadcrumbs'

// Mock the hooks
jest.mock('../hooks', () => ({
  useFolderBreadcrumbs: jest.fn(),
}))
const mockUseFolderBreadcrumbs = require('../hooks').useFolderBreadcrumbs as jest.Mock

describe('FolderBreadcrumbs', () => {
  const mockBreadcrumbs = [
    { id: 'folder-1', name: 'Documents' },
    { id: 'folder-2', name: 'Projects' },
    { id: 'folder-3', name: 'Current Folder' },
  ]

  const user = userEvent.setup()

  beforeEach(() => {
    mockUseFolderBreadcrumbs.mockReturnValue({
      breadcrumbs: mockBreadcrumbs,
      isLoading: false,
    })
  })

  it('renders breadcrumbs with home button', () => {
    render(<FolderBreadcrumbs folderId="folder-3" />)

    // Home button should be present
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument()
    
    // All breadcrumb items should be present
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Current Folder')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    mockUseFolderBreadcrumbs.mockReturnValue({
      breadcrumbs: [],
      isLoading: true,
    })

    render(<FolderBreadcrumbs folderId="folder-1" />)

    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(2)
  })

  it('handles home navigation', async () => {
    const mockOnNavigate = jest.fn()
    
    render(
      <FolderBreadcrumbs 
        folderId="folder-3" 
        onNavigate={mockOnNavigate}
      />
    )

    const homeButton = screen.getByRole('button', { name: /home/i })
    await user.click(homeButton)

    expect(mockOnNavigate).toHaveBeenCalledWith()
  })

  it('handles breadcrumb navigation', async () => {
    const mockOnNavigate = jest.fn()
    
    render(
      <FolderBreadcrumbs 
        folderId="folder-3" 
        onNavigate={mockOnNavigate}
      />
    )

    const documentsButton = screen.getByText('Documents')
    await user.click(documentsButton)

    expect(mockOnNavigate).toHaveBeenCalledWith('folder-1')
  })

  it('disables last breadcrumb item', () => {
    render(<FolderBreadcrumbs folderId="folder-3" />)

    const currentFolderButton = screen.getByText('Current Folder')
    expect(currentFolderButton).toBeDisabled()
  })

  it('enables non-last breadcrumb items', () => {
    render(<FolderBreadcrumbs folderId="folder-3" />)

    const documentsButton = screen.getByText('Documents')
    const projectsButton = screen.getByText('Projects')
    
    expect(documentsButton).not.toBeDisabled()
    expect(projectsButton).not.toBeDisabled()
  })

  it('shows chevron separators', () => {
    render(<FolderBreadcrumbs folderId="folder-3" />)

    // Should have chevrons between home and first item, and between each breadcrumb
    const chevrons = document.querySelectorAll('.lucide-chevron-right')
    expect(chevrons).toHaveLength(3) // Home -> Documents -> Projects -> Current
  })

  it('applies custom className', () => {
    const { container } = render(
      <FolderBreadcrumbs 
        folderId="folder-1" 
        className="custom-class" 
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('handles empty breadcrumbs', () => {
    mockUseFolderBreadcrumbs.mockReturnValue({
      breadcrumbs: [],
      isLoading: false,
    })

    render(<FolderBreadcrumbs folderId="folder-1" />)

    // Should still show home button
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument()
    
    // Should not show any breadcrumb items
    expect(screen.queryByText('Documents')).not.toBeInTheDocument()
  })

  it('handles single breadcrumb item', () => {
    mockUseFolderBreadcrumbs.mockReturnValue({
      breadcrumbs: [{ id: 'folder-1', name: 'Single Folder' }],
      isLoading: false,
    })

    render(<FolderBreadcrumbs folderId="folder-1" />)

    expect(screen.getByText('Single Folder')).toBeInTheDocument()
    expect(screen.getByText('Single Folder')).toBeDisabled()
  })

  it('calls useFolderBreadcrumbs with correct parameters', () => {
    render(<FolderBreadcrumbs folderId="folder-123" />)

    expect(mockUseFolderBreadcrumbs).toHaveBeenCalledWith({
      folderId: 'folder-123',
    })
  })

  it('handles navigation for middle breadcrumb items', async () => {
    const mockOnNavigate = jest.fn()
    
    render(
      <FolderBreadcrumbs 
        folderId="folder-3" 
        onNavigate={mockOnNavigate}
      />
    )

    const projectsButton = screen.getByText('Projects')
    await user.click(projectsButton)

    expect(mockOnNavigate).toHaveBeenCalledWith('folder-2')
  })

  it('renders without onNavigate callback', () => {
    render(<FolderBreadcrumbs folderId="folder-3" />)

    // Should render without errors
    expect(screen.getByText('Documents')).toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Current Folder')).toBeInTheDocument()
  })

  it('handles undefined folderId', () => {
    render(<FolderBreadcrumbs />)

    expect(mockUseFolderBreadcrumbs).toHaveBeenCalledWith({
      folderId: undefined,
    })
  })
})