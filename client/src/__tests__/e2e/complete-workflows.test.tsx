/**
 * End-to-end integration tests for complete user workflows.
 * Tests complete user journeys from authentication to document management and search.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'

import { api } from '@/shared/lib/api'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { SearchInterface } from '@/features/search/components/SearchInterface'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { FileUploadZone } from '@/features/documents/components/upload/FileUploadZone'
import { FolderManager } from '@/features/folders/components/FolderManager'

// Mock API responses
const mockApiResponses = {
  register: {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User'
    },
    tokens: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    }
  },
  login: {
    user: {
      id: 'user-123',
      email: 'test@example.com',
      username: 'testuser',
      full_name: 'Test User'
    },
    tokens: {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token'
    }
  },
  documents: {
    documents: [
      {
        id: 'doc-1',
        name: 'Test Document 1',
        file_type: 'pdf',
        file_size: 1024000,
        file_size_mb: 1.0,
        status: 'completed',
        created_at: '2024-01-01T12:00:00Z',
        folder_id: null
      },
      {
        id: 'doc-2',
        name: 'Test Document 2',
        file_type: 'txt',
        file_size: 512000,
        file_size_mb: 0.5,
        status: 'processing',
        created_at: '2024-01-02T12:00:00Z',
        folder_id: 'folder-1'
      }
    ],
    total: 2,
    page: 1,
    page_size: 20
  },
  folders: [
    {
      id: 'folder-1',
      name: 'Research Papers',
      path: '/Research Papers',
      created_at: '2024-01-01T10:00:00Z'
    }
  ],
  searchResults: {
    query: 'machine learning',
    answer: 'Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.',
    chunks: [
      {
        id: 'doc-1_0',
        document_id: 'doc-1',
        chunk_index: 0,
        text: 'Machine learning is a subset of artificial intelligence...',
        score: 0.95,
        metadata: { document_name: 'ML Guide' }
      }
    ],
    total_results: 1,
    processing_time_ms: 150,
    sources: ['doc-1']
  }
}

// Mock axios adapter for API calls
const mockAxios = new MockAdapter(api)

// Helper to setup axios mock responses
const setupMockResponses = () => {
  // Authentication endpoints
  mockAxios.onPost('/auth/register').reply(201, mockApiResponses.register)
  mockAxios.onPost('/auth/login').reply(200, mockApiResponses.login)
  mockAxios.onGet('/auth/me').reply(200, mockApiResponses.login.user)
  
  // Document endpoints
  mockAxios.onGet('/documents/').reply(200, mockApiResponses.documents)
  mockAxios.onPost('/documents/upload').reply(200, {
    document: {
      id: 'new-doc-123',
      name: 'Uploaded Document',
      file_type: 'txt',
      file_size: 1024,
      status: 'pending'
    },
    message: 'File uploaded successfully'
  })
  
  // Folder endpoints
  mockAxios.onGet('/folders/').reply(200, mockApiResponses.folders)
  mockAxios.onPost('/folders/').reply(201, {
    id: 'new-folder-123',
    name: 'New Folder',
    path: '/New Folder',
    created_at: '2024-01-01T12:00:00Z'
  })
  
  // Search endpoints
  mockAxios.onPost('/search/').reply(200, mockApiResponses.searchResults)
  mockAxios.onGet('/search/history').reply(200, {
    history: [
      {
        id: 'search-1',
        query: 'machine learning',
        results_count: 1,
        created_at: '2024-01-01T12:00:00Z'
      }
    ],
    total: 1,
    page: 1,
    per_page: 20
  })
}

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('End-to-End Workflows', () => {
  beforeAll(() => setupMockResponses())
  afterEach(() => mockAxios.reset())
  afterAll(() => mockAxios.restore())

  describe('Complete Authentication Workflow', () => {
    it('should complete user registration and login flow', async () => {
      const user = userEvent.setup()

      // Step 1: Register new user
      render(
        <TestWrapper>
          <RegisterForm />
        </TestWrapper>
      )

      // Fill registration form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/username/i), 'testuser')
      await user.type(screen.getByLabelText(/password/i), 'securepassword123')
      await user.type(screen.getByLabelText(/full name/i), 'Test User')

      // Submit registration
      await user.click(screen.getByRole('button', { name: /register/i }))

      // Wait for success message
      await waitFor(() => {
        expect(screen.getByText(/registration successful/i)).toBeInTheDocument()
      })

      // Step 2: Login with new credentials
      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'securepassword123')

      await user.click(screen.getByRole('button', { name: /login/i }))

      // Wait for successful login
      await waitFor(() => {
        expect(screen.getByText(/login successful/i)).toBeInTheDocument()
      })
    })

    it('should handle authentication errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock failed login
      mockAxios.onPost('/auth/login').reply(401, {
        detail: 'Invalid credentials'
      })

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /login/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })
  })

  describe('Complete Document Management Workflow', () => {
    it('should complete document upload, view, and delete workflow', async () => {
      const user = userEvent.setup()

      // Step 1: Upload document
      render(
        <TestWrapper>
          <FileUploadZone onUpload={jest.fn()} />
        </TestWrapper>
      )

      // Create mock file
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })

      // Upload file via drag and drop
      const dropzone = screen.getByText(/drag and drop files here/i)
      
      // Simulate file drop
      Object.defineProperty(dropzone, 'files', {
        value: [file],
        writable: false
      })

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/test.txt/)).toBeInTheDocument()
      })

      // Step 2: View document list
      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Test Document 1')).toBeInTheDocument()
        expect(screen.getByText('Test Document 2')).toBeInTheDocument()
      })

      // Verify document statuses
      expect(screen.getByText(/completed/i)).toBeInTheDocument()
      expect(screen.getByText(/processing/i)).toBeInTheDocument()

      // Step 3: Delete document
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0]
      await user.click(deleteButton)

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText(/confirm deletion/i)).toBeInTheDocument()
      })

      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/document deleted successfully/i)).toBeInTheDocument()
      })
    })

    it('should handle file upload validation errors', async () => {
      const user = userEvent.setup()

      // Mock upload error
      mockAxios.onPost('/documents/upload').reply(400, {
        detail: 'File type not supported'
      })

      render(
        <TestWrapper>
          <FileUploadZone onUpload={jest.fn()} />
        </TestWrapper>
      )

      const file = new File(['fake exe'], 'malware.exe', { type: 'application/octet-stream' })
      const dropzone = screen.getByText(/drag and drop files here/i)

      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [file]
        }
      })

      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
      })
    })
  })

  describe('Complete Search Workflow', () => {
    it('should complete search query and results workflow', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <SearchInterface />
        </TestWrapper>
      )

      // Step 1: Enter search query
      const searchInput = screen.getByPlaceholderText(/search your documents/i)
      await user.type(searchInput, 'machine learning')

      // Step 2: Submit search
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      // Step 3: Verify search results
      await waitFor(() => {
        expect(screen.getByText(/machine learning is a subset/i)).toBeInTheDocument()
      })

      // Verify answer is displayed
      expect(screen.getByText(/Machine learning is a subset of artificial intelligence/i)).toBeInTheDocument()

      // Verify source chunks are displayed
      expect(screen.getByText(/ML Guide/i)).toBeInTheDocument()

      // Verify processing time is shown
      expect(screen.getByText(/150ms/i)).toBeInTheDocument()

      // Step 4: Test search suggestions
      await user.clear(searchInput)
      await user.type(searchInput, 'AI')

      // Should show suggestions as user types
      await waitFor(() => {
        expect(screen.getByText(/artificial intelligence/i)).toBeInTheDocument()
      })
    })

    it('should handle no search results gracefully', async () => {
      const user = userEvent.setup()

      // Mock no results response
      mockAxios.onPost('/search/').reply(200, {
        query: 'nonexistent topic',
        message: 'No relevant documents found for your query.',
        suggestions: ['try', 'different', 'keywords']
      })

      render(
        <TestWrapper>
          <SearchInterface />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText(/search your documents/i)
      await user.type(searchInput, 'nonexistent topic')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/no relevant documents found/i)).toBeInTheDocument()
      })

      // Verify suggestions are shown
      expect(screen.getByText(/try different keywords/i)).toBeInTheDocument()
    })
  })

  describe('Complete Folder Management Workflow', () => {
    it('should complete folder creation and document organization workflow', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <FolderManager />
        </TestWrapper>
      )

      // Step 1: Create new folder
      const createButton = screen.getByRole('button', { name: /create folder/i })
      await user.click(createButton)

      // Fill folder name
      const folderNameInput = screen.getByLabelText(/folder name/i)
      await user.type(folderNameInput, 'Research Papers')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('Research Papers')).toBeInTheDocument()
      })

      // Step 2: Move document to folder
      const documentItem = screen.getByText('Test Document 1')
      const moveButton = screen.getByRole('button', { name: /move to folder/i })
      
      await user.click(moveButton)

      // Select folder from dropdown
      const folderSelect = screen.getByRole('combobox', { name: /select folder/i })
      await user.click(folderSelect)
      await user.click(screen.getByText('Research Papers'))

      const confirmMoveButton = screen.getByRole('button', { name: /move/i })
      await user.click(confirmMoveButton)

      await waitFor(() => {
        expect(screen.getByText(/document moved successfully/i)).toBeInTheDocument()
      })

      // Step 3: View folder contents
      const folderItem = screen.getByText('Research Papers')
      await user.click(folderItem)

      await waitFor(() => {
        expect(screen.getByText(/folder contents/i)).toBeInTheDocument()
      })
    })

    it('should handle folder creation errors', async () => {
      const user = userEvent.setup()

      // Mock folder creation error
      mockAxios.onPost('/folders/').reply(400, {
        detail: 'Folder name already exists'
      })

      render(
        <TestWrapper>
          <FolderManager />
        </TestWrapper>
      )

      const createButton = screen.getByRole('button', { name: /new folder/i })
      await user.click(createButton)

      const folderNameInput = screen.getByLabelText(/folder name/i)
      await user.type(folderNameInput, 'Existing Folder')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText(/folder name already exists/i)).toBeInTheDocument()
      })
    })
  })

  describe('Error Recovery and Edge Cases', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock network error
      mockAxios.onGet('/documents/').networkError()

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Should show retry button
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('should handle concurrent operations', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      // Simulate multiple rapid clicks
      const refreshButton = screen.getByRole('button', { name: /refresh/i })
      
      await user.click(refreshButton)
      await user.click(refreshButton)
      await user.click(refreshButton)

      // Should handle concurrent requests gracefully
      await waitFor(() => {
        expect(screen.getByText('Test Document 1')).toBeInTheDocument()
      })

      // Should not show duplicate loading states
      expect(screen.queryAllByText(/loading/i)).toHaveLength(0)
    })

    it('should maintain state consistency across operations', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div>
            <DocumentList />
            <SearchInterface />
          </div>
        </TestWrapper>
      )

      // Perform search
      const searchInput = screen.getByPlaceholderText(/search your documents/i)
      await user.type(searchInput, 'test query')
      
      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      // Navigate to documents while search is active
      const documentsTab = screen.getByRole('tab', { name: /documents/i })
      await user.click(documentsTab)

      // Both components should maintain their state
      await waitFor(() => {
        expect(screen.getByText('Test Document 1')).toBeInTheDocument()
        expect(searchInput).toHaveValue('test query')
      })
    })
  })

  describe('Performance and User Experience', () => {
    it('should show loading states during operations', async () => {
      const user = userEvent.setup()

      // Mock delayed response
      mockAxios.onGet('/documents/').reply(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve([200, mockApiResponses.documents])
          }, 1000)
        })
      })

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      // Should show loading state immediately
      expect(screen.getByText(/loading/i)).toBeInTheDocument()

      // Should show content after loading
      await waitFor(() => {
        expect(screen.getByText('Test Document 1')).toBeInTheDocument()
      }, { timeout: 2000 })

      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument()
    })

    it('should provide user feedback for all actions', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      // Delete action should show confirmation
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0]
      await user.click(deleteButton)

      expect(screen.getByText(/are you sure/i)).toBeInTheDocument()

      // Success action should show feedback
      const confirmButton = screen.getByRole('button', { name: /confirm/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(screen.getByText(/document deleted successfully/i)).toBeInTheDocument()
      })
    })
  })
})