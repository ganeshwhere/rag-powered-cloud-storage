import { render, screen, waitFor } from '@/test-utils'
import { ProtectedRoute } from '../ProtectedRoute'
import { useAuthStore } from '@/features/auth/store'

// Mock the auth store
jest.mock('@/features/auth/store')
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('ProtectedRoute', () => {
  const TestComponent = () => <div>Protected Content</div>

  beforeEach(() => {
    mockPush.mockClear()
    mockUseAuthStore.mockClear()
  })

  it('shows loading spinner when authentication is loading', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      checkAuth: jest.fn(),
    } as any)

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
    // Check for the loading spinner by class or other attributes
    const loadingElement = document.querySelector('.animate-spin')
    expect(loadingElement).toBeInTheDocument()
  })

  it('renders children when user is authenticated', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      checkAuth: jest.fn(),
    } as any)

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  it('redirects to login when user is not authenticated', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      checkAuth: jest.fn(),
    } as any)

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('redirects to custom redirect path when provided', async () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      checkAuth: jest.fn(),
    } as any)

    render(
      <ProtectedRoute redirectTo="/custom-login">
        <TestComponent />
      </ProtectedRoute>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/custom-login')
    })
  })

  it('calls checkAuth on mount', () => {
    const mockCheckAuth = jest.fn()
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      checkAuth: mockCheckAuth,
    } as any)

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(mockCheckAuth).toHaveBeenCalled()
  })

  it('does not redirect when loading', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: true,
      checkAuth: jest.fn(),
    } as any)

    render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('returns null when not authenticated and not loading', () => {
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      checkAuth: jest.fn(),
    } as any)

    const { container } = render(
      <ProtectedRoute>
        <TestComponent />
      </ProtectedRoute>
    )

    // The component should render nothing (null)
    expect(container.firstChild).toBeNull()
  })
})