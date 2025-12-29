# Testing Best Practices

## General Principles

### 1. Test User Behavior, Not Implementation
```typescript
// Good - Tests what users actually do
it('allows user to search for documents', async () => {
  render(<SearchInterface />)
  
  await user.type(screen.getByPlaceholderText('Search documents...'), 'test query')
  await user.click(screen.getByRole('button', { name: /search/i }))
  
  expect(mockSearchApi).toHaveBeenCalledWith({ query: 'test query' })
})

// Bad - Tests implementation details
it('updates state when search input changes', () => {
  const wrapper = shallow(<SearchInterface />)
  wrapper.find('input').simulate('change', { target: { value: 'test' } })
  expect(wrapper.state('query')).toBe('test')
})
```

### 2. Use Semantic Queries
```typescript
// Good - Accessible and semantic
screen.getByRole('button', { name: /submit/i })
screen.getByLabelText('Email address')
screen.getByPlaceholderText('Enter your email')

// Acceptable - When semantic queries aren't enough
screen.getByTestId('complex-component')

// Avoid - Fragile and not accessible
screen.getByClassName('btn-primary')
screen.getByText('Submit') // Too generic
```

### 3. Write Descriptive Test Names
```typescript
// Good - Clear and specific
it('displays error message when login fails with invalid credentials', () => {})
it('disables submit button while form is being submitted', () => {})
it('redirects to dashboard after successful login', () => {})

// Bad - Vague and unclear
it('works correctly', () => {})
it('handles error', () => {})
it('tests login', () => {})
```

## Component Testing

### 1. Test Component Contract
```typescript
describe('DocumentCard', () => {
  const mockDocument = {
    id: 'doc-1',
    name: 'Test Document.pdf',
    status: 'completed'
  }

  it('displays document information', () => {
    render(<DocumentCard document={mockDocument} />)
    
    expect(screen.getByText('Test Document.pdf')).toBeInTheDocument()
    expect(screen.getByText('completed')).toBeInTheDocument()
  })

  it('calls onSelect when document is selected', async () => {
    const mockOnSelect = jest.fn()
    render(<DocumentCard document={mockDocument} onSelect={mockOnSelect} />)
    
    await user.click(screen.getByRole('checkbox'))
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockDocument.id)
  })
})
```

### 2. Test Different States
```typescript
describe('LoginForm', () => {
  it('shows loading state during submission', async () => {
    mockAuthApi.login.mockImplementation(() => new Promise(() => {})) // Never resolves
    
    render(<LoginForm />)
    
    await user.click(screen.getByRole('button', { name: /login/i }))
    
    expect(screen.getByText('Logging in...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeDisabled()
  })

  it('shows error state when login fails', async () => {
    mockAuthApi.login.mockRejectedValue(new Error('Invalid credentials'))
    
    render(<LoginForm />)
    
    await user.click(screen.getByRole('button', { name: /login/i }))
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })
})
```

## Hook Testing

### 1. Test Hook Logic in Isolation
```typescript
describe('useDocumentUpload', () => {
  it('tracks upload progress correctly', async () => {
    const { result } = renderHook(() => useDocumentUpload())
    
    const mockFile = new File(['content'], 'test.pdf')
    
    act(() => {
      result.current.uploadFile(mockFile)
    })
    
    expect(result.current.uploadingFiles).toHaveLength(1)
    expect(result.current.uploadingFiles[0].status).toBe('pending')
  })
})
```

### 2. Test Hook Integration
```typescript
describe('useSearch integration', () => {
  it('updates search results when query changes', async () => {
    mockSearchApi.searchDocuments.mockResolvedValue(mockResults)
    
    const { result } = renderHook(() => useSearch())
    
    await act(async () => {
      await result.current.searchDocuments({ query: 'test' })
    })
    
    expect(result.current.results).toEqual(mockResults)
    expect(result.current.isSearching).toBe(false)
  })
})
```

## Mocking Strategies

### 1. Mock External Dependencies
```typescript
// Mock API modules
jest.mock('../api/documentApi')
const mockDocumentApi = documentApi as jest.Mocked<typeof documentApi>

// Mock custom hooks
jest.mock('../hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}))
```

### 2. Create Realistic Mock Data
```typescript
const createMockDocument = (overrides = {}) => ({
  id: 'doc-123',
  name: 'Test Document.pdf',
  status: 'completed',
  created_at: '2023-01-01T00:00:00Z',
  file_size: 1024000,
  ...overrides
})

const createMockUser = (overrides = {}) => ({
  id: 'user-123',
  email: 'test@example.com',
  username: 'testuser',
  ...overrides
})
```

### 3. Mock Implementation, Not Just Return Values
```typescript
// Good - Mocks the actual behavior
mockDocumentApi.uploadDocument.mockImplementation(async (file) => {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('File too large')
  }
  return { id: 'doc-123', status: 'uploaded' }
})

// Less flexible - Only handles success case
mockDocumentApi.uploadDocument.mockResolvedValue({ id: 'doc-123' })
```

## Async Testing

### 1. Use waitFor for Async Operations
```typescript
it('displays search results after API call', async () => {
  mockSearchApi.searchDocuments.mockResolvedValue(mockResults)
  
  render(<SearchInterface />)
  
  await user.type(screen.getByPlaceholderText('Search...'), 'test')
  await user.click(screen.getByRole('button', { name: /search/i }))
  
  await waitFor(() => {
    expect(screen.getByText('Search Results')).toBeInTheDocument()
  })
})
```

### 2. Use findBy Queries for Async Elements
```typescript
it('shows loading spinner during search', async () => {
  mockSearchApi.searchDocuments.mockImplementation(
    () => new Promise(resolve => setTimeout(resolve, 100))
  )
  
  render(<SearchInterface />)
  
  await user.click(screen.getByRole('button', { name: /search/i }))
  
  // findBy automatically waits for element to appear
  expect(await screen.findByText('Searching...')).toBeInTheDocument()
})
```

## Error Testing

### 1. Test Error Boundaries
```typescript
it('displays error boundary when component throws', () => {
  const ThrowError = () => {
    throw new Error('Test error')
  }
  
  render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  )
  
  expect(screen.getByText('Something went wrong')).toBeInTheDocument()
})
```

### 2. Test API Error Handling
```typescript
it('displays error message when API call fails', async () => {
  mockDocumentApi.getDocuments.mockRejectedValue(
    new Error('Failed to fetch documents')
  )
  
  render(<DocumentList />)
  
  await waitFor(() => {
    expect(screen.getByText('Failed to fetch documents')).toBeInTheDocument()
  })
})
```

## Performance Testing

### 1. Test Component Re-renders
```typescript
it('does not re-render unnecessarily', () => {
  const renderSpy = jest.fn()
  
  const TestComponent = React.memo(() => {
    renderSpy()
    return <div>Test</div>
  })
  
  const { rerender } = render(<TestComponent />)
  
  expect(renderSpy).toHaveBeenCalledTimes(1)
  
  // Re-render with same props
  rerender(<TestComponent />)
  
  expect(renderSpy).toHaveBeenCalledTimes(1) // Should not re-render
})
```

### 2. Test Debounced Operations
```typescript
it('debounces search input', async () => {
  jest.useFakeTimers()
  
  render(<SearchInterface />)
  
  const input = screen.getByPlaceholderText('Search...')
  
  await user.type(input, 'test')
  
  expect(mockSearchApi.searchDocuments).not.toHaveBeenCalled()
  
  act(() => {
    jest.advanceTimersByTime(500) // Advance past debounce delay
  })
  
  expect(mockSearchApi.searchDocuments).toHaveBeenCalledWith({ query: 'test' })
  
  jest.useRealTimers()
})
```

## Accessibility Testing

### 1. Test Keyboard Navigation
```typescript
it('supports keyboard navigation', async () => {
  render(<DocumentList documents={mockDocuments} />)
  
  const firstDocument = screen.getAllByRole('button')[0]
  firstDocument.focus()
  
  await user.keyboard('{ArrowDown}')
  
  const secondDocument = screen.getAllByRole('button')[1]
  expect(secondDocument).toHaveFocus()
})
```

### 2. Test Screen Reader Support
```typescript
it('provides proper ARIA labels', () => {
  render(<DocumentCard document={mockDocument} />)
  
  expect(screen.getByRole('button')).toHaveAttribute(
    'aria-label',
    'View document: Test Document.pdf'
  )
})
```

## Test Organization

### 1. Group Related Tests
```typescript
describe('DocumentUpload', () => {
  describe('file validation', () => {
    it('accepts valid file types', () => {})
    it('rejects invalid file types', () => {})
    it('rejects files that are too large', () => {})
  })

  describe('upload progress', () => {
    it('shows progress during upload', () => {})
    it('shows completion message when done', () => {})
    it('shows error message on failure', () => {})
  })
})
```

### 2. Use Setup and Teardown
```typescript
describe('SearchInterface', () => {
  let mockSearchApi: jest.Mocked<typeof searchApi>
  
  beforeEach(() => {
    mockSearchApi = searchApi as jest.Mocked<typeof searchApi>
    mockSearchApi.searchDocuments.mockResolvedValue(mockResults)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })
})
```

## Common Anti-Patterns

### Don't Test Implementation Details
```typescript
// Bad - Testing internal state
expect(wrapper.state('isLoading')).toBe(true)

// Good - Testing user-visible behavior
expect(screen.getByText('Loading...')).toBeInTheDocument()
```

### Don't Use Shallow Rendering
```typescript
// Bad - Doesn't test real component behavior
const wrapper = shallow(<Component />)

// Good - Tests full component tree
render(<Component />)
```

### Don't Test Third-Party Libraries
```typescript
// Bad - Testing React Query behavior
expect(queryClient.getQueryData).toHaveBeenCalled()

// Good - Testing your component's behavior
expect(screen.getByText('Data loaded')).toBeInTheDocument()
```

### Don't Write Overly Complex Tests
```typescript
// Bad - Too much setup, unclear what's being tested
it('handles complex user workflow', async () => {
  // 50 lines of setup and interactions
})

// Good - Focused, single responsibility
it('displays error when login fails', async () => {
  // Clear, focused test
})
```

## Code Coverage Guidelines

### 1. Aim for Meaningful Coverage
- Focus on critical paths and edge cases
- Don't chase 100% coverage for its own sake
- Prioritize testing user-facing functionality

### 2. Coverage Targets
- **Branches**: 70-80% (test different code paths)
- **Functions**: 80-90% (test all public functions)
- **Lines**: 70-80% (reasonable line coverage)
- **Statements**: 70-80% (similar to lines)

### 3. What Not to Test
- Third-party library code
- Simple getters/setters
- Trivial utility functions
- Auto-generated code