import { renderHook } from '@/test-utils'
import { useAuthGuard, useGuestGuard } from '../useAuthGuard'
import { useAuth } from '../useAuth'

// Mock the useAuth hook
jest.mock('../useAuth')
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('useAuthGuard', () => {
  const mockAuthReturn = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
    clearError: jest.fn(),
  }

  beforeEach(() => {
    mockPush.mockClear()
    mockUseAuth.mockReturnValue(mockAuthReturn)
  })

  it('calls checkAuth on mount', () => {
    renderHook(() => useAuthGuard())

    expect(mockAuthReturn.checkAuth).toHaveBeenCalled()
  })

  it('returns authentication state', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: true,
      isLoading: false,
    })

    const { result } = renderHook(() => useAuthGuard())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
  })

  it('redirects to default login path when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: false,
      isLoading: false,
    })

    renderHook(() => useAuthGuard())

    expect(mockPush).toHaveBeenCalledWith('/auth/login')
  })

  it('redirects to custom path when provided', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: false,
      isLoading: false,
    })

    renderHook(() => useAuthGuard('/custom-login'))

    expect(mockPush).toHaveBeenCalledWith('/custom-login')
  })

  it('does not redirect when loading', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: false,
      isLoading: true,
    })

    renderHook(() => useAuthGuard())

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not redirect when authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: true,
      isLoading: false,
    })

    renderHook(() => useAuthGuard())

    expect(mockPush).not.toHaveBeenCalled()
  })
})

describe('useGuestGuard', () => {
  const mockAuthReturn = {
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    login: jest.fn(),
    register: jest.fn(),
    logout: jest.fn(),
    checkAuth: jest.fn(),
    clearError: jest.fn(),
  }

  beforeEach(() => {
    mockPush.mockClear()
    mockUseAuth.mockReturnValue(mockAuthReturn)
  })

  it('calls checkAuth on mount', () => {
    renderHook(() => useGuestGuard())

    expect(mockAuthReturn.checkAuth).toHaveBeenCalled()
  })

  it('returns authentication state', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: false,
      isLoading: false,
    })

    const { result } = renderHook(() => useGuestGuard())

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('redirects to default home path when authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: true,
      isLoading: false,
    })

    renderHook(() => useGuestGuard())

    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('redirects to custom path when provided', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: true,
      isLoading: false,
    })

    renderHook(() => useGuestGuard('/dashboard'))

    expect(mockPush).toHaveBeenCalledWith('/dashboard')
  })

  it('does not redirect when loading', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: true,
      isLoading: true,
    })

    renderHook(() => useGuestGuard())

    expect(mockPush).not.toHaveBeenCalled()
  })

  it('does not redirect when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      ...mockAuthReturn,
      isAuthenticated: false,
      isLoading: false,
    })

    renderHook(() => useGuestGuard())

    expect(mockPush).not.toHaveBeenCalled()
  })
})