# Frontend Testing Guide

This guide covers how to run and write tests for the RAG Document System frontend.

## Quick Start

```bash
# Navigate to client directory
cd doc-rag-system/client

# Run all tests once
npm test

# Run tests in watch mode (recommended for development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Commands

### Basic Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Targeted Testing
```bash
# Run specific test file
npm test -- SearchResults.test.tsx

# Run tests matching a pattern
npm test -- --testPathPattern="search.*test"

# Run tests with specific name pattern
npm test -- --testNamePattern="handles search"

# Run tests for specific feature
npm test -- --testPathPattern="auth"
npm test -- --testPathPattern="documents"
npm test -- --testPathPattern="folders"
```

### Advanced Options
```bash
# Run tests with verbose output
npm test -- --verbose

# Run only failed tests from last run
npm test -- --onlyFailures

# Run tests without cache
npm test -- --no-cache

# Run tests and update snapshots
npm test -- --updateSnapshot

# Run tests with debugging info
npm test -- --debug
```

## Test Structure

### Test File Organization
```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   └── __tests__/
│   │   │       ├── LoginForm.test.tsx
│   │   │       └── RegisterForm.test.tsx
│   │   └── hooks/
│   │       └── __tests__/
│   │           ├── useAuth.test.ts
│   │           └── useAuthGuard.test.ts
│   ├── documents/
│   │   ├── components/
│   │   │   └── __tests__/
│   │   └── hooks/
│   │       └── __tests__/
│   └── search/
│       ├── components/
│       │   └── __tests__/
│       └── hooks/
│           └── __tests__/
└── test-utils/
    ├── setup.ts
    └── render.tsx
```

### Test Categories

#### 1. Component Tests
Test React components with user interactions:
```typescript
// Example: Button click test
fireEvent.click(screen.getByRole('button', { name: /search/i }))
expect(mockFunction).toHaveBeenCalled()
```

#### 2. Hook Tests
Test custom React hooks:
```typescript
// Example: Hook state test
const { result } = renderHook(() => useSearch())
expect(result.current.isSearching).toBe(false)
```

#### 3. Integration Tests
Test component + hook interactions:
```typescript
// Example: Form submission test
await user.type(emailInput, 'test@example.com')
await user.click(submitButton)
expect(mockSubmit).toHaveBeenCalledWith({ email: 'test@example.com' })
```

## Writing Tests

### Test File Template
```typescript
import { render, screen, fireEvent, waitFor } from '@/test-utils/render'
import userEvent from '@testing-library/user-event'
import { ComponentName } from '../ComponentName'

// Mock external dependencies
jest.mock('../hooks/useHook')
const mockUseHook = useHook as jest.MockedFunction<typeof useHook>

describe('ComponentName', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks()
  })

  it('should render correctly', () => {
    render(<ComponentName />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    render(<ComponentName />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(mockFunction).toHaveBeenCalled()
  })
})
```

### Best Practices

#### 1. Use Semantic Queries
```typescript
// Good - semantic and accessible
screen.getByRole('button', { name: /search/i })
screen.getByLabelText('Email')
screen.getByPlaceholderText('Enter your email')

// Avoid - fragile and not accessible
screen.getByClassName('search-button')
screen.getByText('Search')
```

#### 2. Test User Behavior
```typescript
// Good - tests what users do
await user.type(input, 'test@example.com')
await user.click(submitButton)
expect(mockSubmit).toHaveBeenCalledWith({ email: 'test@example.com' })

// Avoid - tests implementation details
expect(component.state.email).toBe('test@example.com')
```

#### 3. Mock External Dependencies
```typescript
// Mock API calls
jest.mock('../api')
const mockApi = api as jest.Mocked<typeof api>

// Mock hooks
jest.mock('../hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock Next.js router
jest.mock('next/navigation')
const mockRouter = { push: jest.fn() }
```

#### 4. Use Data Test IDs for Complex Elements
```typescript
// In component
<div data-testid="search-results">...</div>

// In test
screen.getByTestId('search-results')
```

## Common Testing Patterns

### Form Testing
```typescript
it('validates and submits form', async () => {
  const mockSubmit = jest.fn()
  render(<LoginForm onSubmit={mockSubmit} />)
  
  // Fill form
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.type(screen.getByLabelText(/password/i), 'password123')
  
  // Submit
  await user.click(screen.getByRole('button', { name: /login/i }))
  
  // Verify
  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })
})
```

### Async Operations
```typescript
it('handles async operations', async () => {
  mockApi.searchDocuments.mockResolvedValue(mockResults)
  
  render(<SearchInterface />)
  
  await user.type(screen.getByPlaceholderText('Search...'), 'test query')
  await user.click(screen.getByRole('button', { name: /search/i }))
  
  await waitFor(() => {
    expect(screen.getByText('Search Results')).toBeInTheDocument()
  })
})
```

### Error Handling
```typescript
it('displays error messages', async () => {
  mockApi.login.mockRejectedValue(new Error('Invalid credentials'))
  
  render(<LoginForm />)
  
  await user.click(screen.getByRole('button', { name: /login/i }))
  
  await waitFor(() => {
    expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
  })
})
```

### Loading States
```typescript
it('shows loading state', () => {
  mockUseAuth.mockReturnValue({
    isLoading: true,
    user: null,
    error: null
  })
  
  render(<Dashboard />)
  
  expect(screen.getByText('Loading...')).toBeInTheDocument()
})
```

## Debugging Tests

### Common Issues

#### 1. Element Not Found
```bash
# Error: Unable to find element
# Solution: Check if element exists, use screen.debug()
screen.debug() // Shows current DOM
```

#### 2. Async Issues
```bash
# Error: Test finishes before async operation
# Solution: Use waitFor or findBy queries
await waitFor(() => expect(element).toBeInTheDocument())
await screen.findByText('Async content')
```

#### 3. Mock Issues
```bash
# Error: Mock not working
# Solution: Ensure mock is set up before component renders
beforeEach(() => {
  mockFunction.mockReturnValue(expectedValue)
})
```

### Debug Commands
```bash
# Run single test with debug info
npm test -- --testNamePattern="specific test" --verbose

# Run tests without coverage (faster)
npm test -- --no-coverage

# Clear Jest cache
npm test -- --clearCache
```

## Coverage Reports

### Viewing Coverage
```bash
# Generate and view coverage
npm run test:coverage

# Coverage files are in coverage/ directory
open coverage/lcov-report/index.html
```

### Coverage Thresholds
Current thresholds (in `jest.config.js`):
- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### Improving Coverage
1. Add tests for uncovered branches
2. Test error conditions
3. Test edge cases
4. Add integration tests

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run Tests
  run: |
    cd doc-rag-system/client
    npm test -- --coverage --watchAll=false
    
- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./doc-rag-system/client/coverage/lcov.info
```

## Troubleshooting

### Common Fixes

#### TypeScript Errors
```typescript
// Fix: Add missing mock properties
mockUseHook.mockReturnValue({
  // Include ALL properties from hook return type
  property1: mockValue1,
  property2: mockValue2,
  // ...
})
```

#### Import Errors
```typescript
// Fix: Update import paths in jest.config.js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1'
}
```

#### Test Timeout
```typescript
// Fix: Increase timeout for slow tests
jest.setTimeout(10000) // 10 seconds
```

### Getting Help

1. Check Jest documentation: https://jestjs.io/
2. Check Testing Library docs: https://testing-library.com/
3. Run tests with `--verbose` for more details
4. Use `screen.debug()` to inspect DOM
5. Check console for error messages

## Quick Reference

### Essential Commands
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # With coverage
npm test -- --verbose      # Detailed output
npm test -- ComponentName  # Specific test
```

### Key Testing Libraries
- **Jest**: Test runner and assertion library
- **React Testing Library**: React component testing utilities
- **User Event**: Simulate user interactions
- **MSW**: Mock Service Worker for API mocking

### Useful Queries
```typescript
// Finding elements
screen.getByRole('button')
screen.getByLabelText('Email')
screen.getByPlaceholderText('Search...')
screen.getByTestId('custom-element')

// Async queries
await screen.findByText('Async content')
await waitFor(() => expect(element).toBeInTheDocument())

// Assertions
expect(element).toBeInTheDocument()
expect(element).toHaveValue('expected')
expect(mockFn).toHaveBeenCalledWith(expectedArgs)
```