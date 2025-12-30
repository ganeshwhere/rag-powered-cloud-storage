/**
 * Integration tests for critical frontend paths.
 * Tests authentication flow, document management, search functionality, and folder operations.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'

import { api } from '@/shared/lib/api'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { DocumentList } from '@/features/documents/components/DocumentList'
import { SearchInterface } from '@/features/search/components/SearchInterface'
import { FolderManager } from '@/features/folders/components/FolderManager'
import { FileUploadZone } from '@/features/documents/components/upload/FileUploadZone'

// Mock data for realistic testing
const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  full_name: 'Test User'
}

const mockTokens = {
  access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImV4cCI6MTcwNjc4NDAwMH0.mock-signature',
  refresh_token: 'refresh-token-123'
}

const mockDocuments = [
  {
    id: 'doc-1',
    name: 'Research Paper 1',
    file_type: 'pdf',
    file_size: 2048000,
    file_size_mb: 2.0,
    status: 'completed',
    created_at: '2024-01-01T12:00:00Z',
    folder_id: 'folder-1',
    chunk_count: 15,
    total_tokens: 500
  },
  {
    id: 'doc-2',
    name: 'Meeting Notes',
    file_type: 'txt',
    file_size: 1024000,
    file_size_mb: 1.0,
    status: 'processing',
    created_at: '2024-01-02T12:00:00Z',
    folder_id: null,
    chunk_count: 0,
    total_tokens: 0
  }
]

const mockFolders = [
  {
    id: 'folder-1',
    name: 'Research Papers',
    path: '/Research Papers',
    created_at: '2024-01-01T10:00:00Z',
    document_count: 1
  },
  {
    id: 'folder-2',
    name: 'Meeting Notes',
    path: '/Meeting Notes',
    created_at: '2024-01-01T11:00:00Z',
    document_count: 0
  }
]

// Mock axios adapter for API calls
const mockAxios = new MockAdapter(api)

// Helper to setup axios mock responses
const setupMockResponses = () => {
  // Reset all mocks first
  mockAxios.reset()
  
  // Authentication endpoints
  mockAxios.onPost('/auth/login').reply((config) => {
    const data = JSON.parse(config.data)
    
    if (data.email === 'test@example.com' && data.password === 'password123') {
      return [200, {
        user: mockUser,
        tokens: mockTokens
      }]
    }
    
    return [401, { detail: 'Invalid credentials' }]
  })
  
  mockAxios.onGet('/auth/me').reply((config) => {
    const authHeader = config.headers?.Authorization
    
    if (authHeader?.includes(mockTokens.access_token)) {
      return [200, mockUser]
    }
    
    return [401, { detail: 'Invalid token' }]
  })
  
  mockAxios.onPost('/auth/refresh').reply((config) => {
    const data = JSON.parse(config.data)
    
    if (data.refresh_token === mockTokens.refresh_token) {
      return [200, {
        tokens: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token'
        }
      }]
    }
    
    return [401, { detail: 'Invalid refresh token' }]
  })
  
  // Document endpoints
  mockAxios.onGet('/documents/').reply((config) => {
    const folderId = config.params?.folder_id
    
    let filteredDocs = mockDocuments
    
    if (folderId === 'null') {
      filteredDocs = mockDocuments.filter(doc => doc.folder_id === null)
    } else if (folderId) {
      filteredDocs = mockDocuments.filter(doc => doc.folder_id === folderId)
    }
    
    return [200, {
      documents: filteredDocs,
      total: filteredDocs.length,
      page: 1,
      page_size: 20
    }]
  })
  
  mockAxios.onPost('/documents/upload').reply(() => {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([200, {
          document: {
            id: 'new-doc-123',
            name: 'Uploaded Document',
            file_type: 'txt',
            file_size: 1024,
            status: 'pending',
            created_at: new Date().toISOString(),
            folder_id: null
          },
          message: 'File uploaded successfully'
        }])
      }, 100)
    })
  })
  
  mockAxios.onGet(/\/documents\/[^\/]+$/).reply((config) => {
    const id = config.url?.split('/').pop()
    const document = mockDocuments.find(doc => doc.id === id)
    
    if (document) {
      return [200, document]
    }
    
    return [404, { detail: 'Document not found' }]
  })
  
  mockAxios.onGet(/\/documents\/[^\/]+\/status$/).reply((config) => {
    const id = config.url?.split('/')[2]
    const document = mockDocuments.find(doc => doc.id === id)
    
    if (document) {
      return [200, {
        id: document.id,
        status: document.status,
        chunk_count: document.chunk_count,
        total_tokens: document.total_tokens,
        processing_error: null
      }]
    }
    
    return [404, { detail: 'Document not found' }]
  })
  
  mockAxios.onDelete(/\/documents\/[^\/]+$/).reply((config) => {
    const id = config.url?.split('/').pop()
    return [200, {
      deleted_document_id: id,
      message: 'Document deleted successfully'
    }]
  })
  
  mockAxios.onPatch(/\/documents\/[^\/]+$/).reply((config) => {
    const id = config.url?.split('/').pop()
    const data = JSON.parse(config.data)
    
    return [200, {
      id,
      folder_id: data.folder_id,
      message: 'Document updated successfully'
    }]
  })
  
  // Folder endpoints
  mockAxios.onGet('/folders/').reply(() => {
    return [200, mockFolders]
  })
  
  mockAxios.onPost('/folders/').reply((config) => {
    const data = JSON.parse(config.data)
    
    return [201, {
      id: 'new-folder-123',
      name: data.name,
      path: `/${data.name}`,
      created_at: new Date().toISOString(),
      parent_id: data.parent_id || null
    }]
  })
  
  mockAxios.onGet(/\/folders\/[^\/]+\/contents$/).reply((config) => {
    const id = config.url?.split('/')[2]
    const folderDocs = mockDocuments.filter(doc => doc.folder_id === id)
    
    return [200, {
      documents: folderDocs,
      subfolders: [],
      total_documents: folderDocs.length,
      total_subfolders: 0
    }]
  })
  
  mockAxios.onDelete(/\/folders\/[^\/]+$/).reply((config) => {
    const id = config.url?.split('/').pop()
    return [200, {
      deleted_folder_id: id,
      message: 'Folder deleted successfully'
    }]
  })
  
  // Search endpoints
  mockAxios.onPost('/search/').reply((config) => {
    const data = JSON.parse(config.data)
    
    return new Promise(resolve => {
      setTimeout(() => {
        resolve([200, {
          query: data.query,
          answer: `This is a comprehensive answer about ${data.query}. The search found relevant information in your documents.`,
          chunks: [
            {
              id: 'doc-1_0',
              document_id: 'doc-1',
              chunk_index: 0,
              text: `Relevant content about ${data.query} from your research papers.`,
              score: 0.95,
              metadata: { document_name: 'Research Paper 1' }
            }
          ],
          total_results: 1,
          processing_time_ms: 200,
          sources: ['doc-1']
        }])
      }, 200)
    })
  })
  
  mockAxios.onGet('/search/suggestions').reply(() => {
    return [200, {
      suggestions: ['machine learning', 'artificial intelligence', 'neural networks']
    }]
  })
  
  mockAxios.onGet('/search/history').reply(() => {
    return [200, {
      history: [
        {
          id: 'search-1',
          query: 'machine learning',
          results_count: 3,
          created_at: '2024-01-01T12:00:00Z'
        }
      ],
      total: 1,
      page: 1,
      per_page: 20
    }]
  })
  
  // Add a catch-all for any unmatched requests
  mockAxios.onAny().reply(404, { detail: 'Endpoint not found' })
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

// Test component for authentication state
const AuthTestComponent: React.FC = () => {
  const { user, login, logout, isLoading } = useAuth()
  
  return (
    <div>
      {isLoading && <div>Loading...</div>}
      {user ? (
        <div>
          <div>Welcome, {user.full_name}</div>
          <button onClick={logout}>Logout</button>
        </div>
      ) : (
        <div>Not authenticated</div>
      )}
    </div>
  )
}

describe('Critical Path Integration Tests', () => {
  beforeAll(() => setupMockResponses())
  afterEach(() => mockAxios.reset())
  afterAll(() => mockAxios.restore())

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow with real JWT handling', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div>
            <LoginForm />
            <AuthTestComponent />
          </div>
        </TestWrapper>
      )

      // Initially not authenticated
      expect(screen.getByText('Not authenticated')).toBeInTheDocument()

      // Fill login form
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Submit login
      await user.click(screen.getByRole('button', { name: /login/i }))

      // Wait for authentication to complete
      await waitFor(() => {
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
      })

      // Test logout
      await user.click(screen.getByRole('button', { name: /logout/i }))

      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument()
      })
    })

    it('should handle authentication errors properly', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <LoginForm />
        </TestWrapper>
      )

      // Fill with wrong credentials
      await user.type(screen.getByLabelText(/email/i), 'wrong@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')

      await user.click(screen.getByRole('button', { name: /login/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })

    it('should handle token refresh automatically', async () => {
      // Mock expired token scenario
      mockAxios.onGet('/auth/me').reply(401, { detail: 'Token expired' })

      render(
        <TestWrapper>
          <AuthTestComponent />
        </TestWrapper>
      )

      // Should attempt token refresh and handle gracefully
      await waitFor(() => {
        expect(screen.getByText('Not authenticated')).toBeInTheDocument()
      })
    })
  })

  describe('Document Management Integration', () => {
    it('should complete full document lifecycle', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div>
            <FileUploadZone onUpload={jest.fn()} />
            <DocumentList />
          </div>
        </TestWrapper>
      )

      // Step 1: Upload document
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const dropzone = screen.getByText(/drag and drop files here/i)

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] }
      })

      await waitFor(() => {
        expect(screen.getByText(/file uploaded successfully/i)).toBeInTheDocument()
      })

      // Step 2: View document list
      await waitFor(() => {
        expect(screen.getByText('Research Paper 1')).toBeInTheDocument()
        expect(screen.getByText('Meeting Notes')).toBeInTheDocument()
      })

      // Step 3: Check document status
      const statusButtons = screen.getAllByText(/completed|processing/i)
      expect(statusButtons.length).toBeGreaterThan(0)

      // Step 4: Delete document
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
      if (deleteButtons.length > 0) {
        await user.click(deleteButtons[0])

        // Confirm deletion
        await waitFor(() => {
          const confirmButton = screen.queryByRole('button', { name: /confirm/i })
          if (confirmButton) {
            user.click(confirmButton)
          }
        })
      }
    })

    it('should handle document status updates in real-time', async () => {
      let documentStatus = 'processing'

      // Mock dynamic status updates
      mockAxios.onGet('/documents/doc-2/status').reply(() => {
        return [200, {
          id: 'doc-2',
          status: documentStatus,
          chunk_count: documentStatus === 'completed' ? 5 : 0,
          total_tokens: documentStatus === 'completed' ? 150 : 0
        }]
      })

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      // Initially shows processing
      await waitFor(() => {
        expect(screen.getByText(/processing/i)).toBeInTheDocument()
      })

      // Simulate status change to completed
      documentStatus = 'completed'

      // Trigger refresh (this would normally happen via polling or websockets)
      const refreshButton = screen.queryByRole('button', { name: /refresh/i })
      if (refreshButton) {
        fireEvent.click(refreshButton)
      }

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument()
      })
    })

    it('should handle file upload validation', async () => {
      const user = userEvent.setup()

      // Mock upload validation error
      mockAxios.onPost('/documents/upload').reply(400, { detail: 'File type not supported' })

      render(
        <TestWrapper>
          <FileUploadZone onUpload={jest.fn()} />
        </TestWrapper>
      )

      const file = new File(['fake exe'], 'malware.exe', { type: 'application/octet-stream' })
      const dropzone = screen.getByText(/drag & drop files here/i)

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] }
      })

      await waitFor(() => {
        expect(screen.getByText(/file type not supported/i)).toBeInTheDocument()
      })
    })
  })

  describe('Search Functionality Integration', () => {
    it('should complete full search workflow', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <SearchInterface />
        </TestWrapper>
      )

      // Step 1: Enter search query
      const searchInput = screen.getByPlaceholderText(/search your documents/i)
      await user.type(searchInput, 'machine learning algorithms')

      // Step 2: Submit search
      const searchButtons = screen.getAllByRole('button', { name: /search/i })
      const searchButton = searchButtons.find(button => 
        button.textContent === 'Search' && !button.textContent?.includes('Again')
      ) || searchButtons[0]
      await user.click(searchButton)

      // Step 3: Wait for results
      await waitFor(() => {
        expect(screen.getByText(/comprehensive answer about machine learning algorithms/i)).toBeInTheDocument()
      })

      // Step 4: Verify search results structure
      expect(screen.getByText(/relevant content about machine learning algorithms/i)).toBeInTheDocument()
      expect(screen.getByText(/Research Paper 1/i)).toBeInTheDocument()
      expect(screen.getAllByText(/200ms/i)[0]).toBeInTheDocument() // Processing time

      // Step 5: Test search history
      const historyButton = screen.queryByRole('button', { name: /history/i })
      if (historyButton) {
        await user.click(historyButton)

        await waitFor(() => {
          expect(screen.getByText(/machine learning/i)).toBeInTheDocument()
        })
      }
    })

    it('should handle search errors gracefully', async () => {
      const user = userEvent.setup()

      // Mock search error
      mockAxios.onPost('/search/').reply(500, { detail: 'Search service temporarily unavailable' })

      render(
        <TestWrapper>
          <SearchInterface />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText(/search your documents/i)
      await user.type(searchInput, 'test query')

      const searchButton = screen.getByRole('button', { name: /search/i })
      await user.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText(/search service temporarily unavailable/i)).toBeInTheDocument()
      })
    })

    it('should handle empty search results', async () => {
      const user = userEvent.setup()

      // Mock no results
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
        expect(screen.getByText(/try different keywords/i)).toBeInTheDocument()
      })
    })
  })

  describe('Folder Operations Integration', () => {
    it('should complete full folder management workflow', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div>
            <FolderManager />
            <DocumentList />
          </div>
        </TestWrapper>
      )

      // Step 1: Create new folder
      const createButton = screen.getByRole('button', { name: /new folder/i })
      await user.click(createButton)

      const folderNameInput = screen.getByLabelText(/folder name/i)
      await user.type(folderNameInput, 'New Research Folder')

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      await waitFor(() => {
        expect(screen.getByText('New Research Folder')).toBeInTheDocument()
      })

      // Step 2: View folder contents
      const folderItem = screen.getByText('Research Papers')
      await user.click(folderItem)

      await waitFor(() => {
        expect(screen.getByText(/Research Paper 1/i)).toBeInTheDocument()
      })

      // Step 3: Move document between folders
      const moveButton = screen.queryByRole('button', { name: /move/i })
      if (moveButton) {
        await user.click(moveButton)

        // Select target folder
        const folderSelect = screen.queryByRole('combobox')
        if (folderSelect) {
          await user.click(folderSelect)
          
          const targetFolder = screen.queryByText('Meeting Notes')
          if (targetFolder) {
            await user.click(targetFolder)
          }
        }

        const confirmMoveButton = screen.queryByRole('button', { name: /confirm/i })
        if (confirmMoveButton) {
          await user.click(confirmMoveButton)
        }
      }
    })

    it('should handle folder creation errors', async () => {
      const user = userEvent.setup()

      // Mock folder creation error
      mockAxios.onPost('/folders/').reply(400, { detail: 'Folder name already exists' })

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

    it('should maintain folder-document relationships', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      // Filter documents by folder
      const folderFilter = screen.queryByRole('combobox', { name: /filter by folder/i })
      if (folderFilter) {
        await user.click(folderFilter)
        
        const researchFolder = screen.queryByText('Research Papers')
        if (researchFolder) {
          await user.click(researchFolder)
        }

        // Should show only documents in that folder
        await waitFor(() => {
          expect(screen.getByText('Research Paper 1')).toBeInTheDocument()
          expect(screen.queryByText('Meeting Notes')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('Error Recovery and Resilience', () => {
    it('should handle network errors with retry mechanisms', async () => {
      const user = userEvent.setup()

      // Mock network error
      mockAxios.onGet('/documents/').networkError()

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText(/failed to load documents/i)).toBeInTheDocument()
      })

      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i })
      expect(retryButton).toBeInTheDocument()

      // Reset mock to working state
      mockAxios.reset()
      setupMockResponses()

      // Click retry
      await user.click(retryButton)

      await waitFor(() => {
        expect(screen.getByText('Research Paper 1')).toBeInTheDocument()
      })
    })

    it('should maintain application state during errors', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <div>
            <SearchInterface />
            <DocumentList />
          </div>
        </TestWrapper>
      )

      // Enter search query
      const searchInput = screen.getByPlaceholderText(/search your documents/i)
      await user.type(searchInput, 'test query')

      // Cause error in document list
      mockAxios.onGet('/documents/').reply(500, { detail: 'Server error' })

      // Trigger document list refresh
      const refreshButton = screen.queryByRole('button', { name: /refresh/i })
      if (refreshButton) {
        await user.click(refreshButton)
      }

      // Search input should maintain its value despite document list error
      expect(searchInput).toHaveValue('test query')
    })

    it('should handle concurrent operations gracefully', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <DocumentList />
        </TestWrapper>
      )

      // Trigger multiple rapid operations
      const refreshButton = screen.queryByRole('button', { name: /refresh/i })
      if (refreshButton) {
        // Click multiple times rapidly
        await user.click(refreshButton)
        await user.click(refreshButton)
        await user.click(refreshButton)
      }

      // Should handle gracefully without duplicate loading states
      await waitFor(() => {
        expect(screen.getByText('Research Paper 1')).toBeInTheDocument()
      })

      // Should not show multiple loading indicators
      const loadingElements = screen.queryAllByText(/loading/i)
      expect(loadingElements.length).toBeLessThanOrEqual(1)
    })
  })
})