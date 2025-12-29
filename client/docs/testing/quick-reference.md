# Testing Quick Reference

## Essential Commands

```bash
# Basic test commands
npm test                           # Run all tests once
npm run test:watch                 # Run tests in watch mode
npm run test:coverage              # Run tests with coverage report

# Targeted testing
npm test -- ComponentName.test    # Run specific test file
npm test -- --testPathPattern="search"  # Run tests matching pattern
npm test -- --testNamePattern="handles" # Run tests with name pattern

# Debugging
npm test -- --verbose             # Detailed output
npm test -- --no-cache            # Clear cache and run
npm test -- --onlyFailures        # Run only failed tests
```

## Test File Structure

```typescript
import { render, screen, fireEvent, waitFor } from '@/test-utils/render'
import userEvent from '@testing-library/user-event'

describe('ComponentName', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should test behavior', async () => {
    render(<Component />)
    
    // Find elements
    const button = screen.getByRole('button', { name: /click me/i })
    
    // Interact
    await user.click(button)
    
    // Assert
    expect(mockFunction).toHaveBeenCalled()
  })
})
```

## Common Queries

```typescript
// Finding elements (prefer these)
screen.getByRole('button', { name: /search/i })
screen.getByLabelText('Email')
screen.getByPlaceholderText('Enter email')
screen.getByTestId('custom-element')

// Async queries
await screen.findByText('Async content')
await waitFor(() => expect(element).toBeInTheDocument())

// Multiple elements
screen.getAllByRole('listitem')
screen.queryByText('Optional element') // Returns null if not found
```

## Mocking Patterns

```typescript
// Mock hooks
jest.mock('../hooks/useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

mockUseAuth.mockReturnValue({
  user: null,
  isLoading: false,
  error: null
})

// Mock API calls
jest.mock('../api')
const mockApi = api as jest.Mocked<typeof api>

mockApi.login.mockResolvedValue({ user: mockUser })
mockApi.login.mockRejectedValue(new Error('Login failed'))
```

## User Interactions

```typescript
const user = userEvent.setup()

// Form interactions
await user.type(input, 'text to type')
await user.click(button)
await user.selectOptions(select, 'option-value')
await user.upload(fileInput, file)

// Keyboard
await user.keyboard('{Enter}')
await user.keyboard('{Escape}')

// Mouse
await user.hover(element)
await user.unhover(element)
```

## Assertions

```typescript
// Element presence
expect(element).toBeInTheDocument()
expect(element).not.toBeInTheDocument()

// Element state
expect(input).toHaveValue('expected value')
expect(button).toBeDisabled()
expect(checkbox).toBeChecked()

// Function calls
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith(expectedArgs)
expect(mockFn).toHaveBeenCalledTimes(2)

// Text content
expect(element).toHaveTextContent('Expected text')
```

## Debugging Tips

```typescript
// Debug current DOM
screen.debug()

// Debug specific element
screen.debug(screen.getByRole('button'))

// Log all available queries
screen.logTestingPlaygroundURL()

// Check what's rendered
console.log(container.innerHTML)
```

## Common Patterns

### Form Testing
```typescript
it('submits form with valid data', async () => {
  const mockSubmit = jest.fn()
  render(<Form onSubmit={mockSubmit} />)
  
  await user.type(screen.getByLabelText(/email/i), 'test@example.com')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  await waitFor(() => {
    expect(mockSubmit).toHaveBeenCalledWith({ email: 'test@example.com' })
  })
})
```

### Async Operations
```typescript
it('handles async loading', async () => {
  mockApi.getData.mockResolvedValue(mockData)
  
  render(<Component />)
  
  expect(screen.getByText('Loading...')).toBeInTheDocument()
  
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### Error Handling
```typescript
it('displays error message', async () => {
  mockApi.getData.mockRejectedValue(new Error('Failed to load'))
  
  render(<Component />)
  
  await waitFor(() => {
    expect(screen.getByText('Failed to load')).toBeInTheDocument()
  })
})
```

## Coverage Commands

```bash
# Generate coverage report
npm run test:coverage

# Coverage for specific files
npm run test:coverage -- --collectCoverageFrom="**/ComponentName.tsx"

# View coverage report
open coverage/lcov-report/index.html
```

## Troubleshooting

| Error | Solution |
|-------|----------|
| Element not found | Use `screen.debug()` to see DOM |
| Test timeout | Add `await waitFor()` for async operations |
| Mock not working | Ensure mock is setup before component renders |
| Multiple elements found | Use more specific queries or `getAllBy*` |
| TypeScript errors | Ensure all mock properties match interface |

## File Locations

- **Test files**: `src/**/__tests__/*.test.tsx`
- **Test utilities**: `src/test-utils/`
- **Jest config**: `jest.config.js`
- **Coverage reports**: `coverage/`

## Useful Links

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [User Event](https://testing-library.com/docs/user-event/intro)
- [Jest Matchers](https://jestjs.io/docs/expect)