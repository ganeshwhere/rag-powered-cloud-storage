import { renderHook } from '@/test-utils'
import { useAuth } from '../useAuth'
import { useAuthStore } from '../../store'

// Mock the auth store
jest.mock('../../store')
const mockUseAuthStore = useAuthStore as jest.MockedFunction<typeof useAuthStore>

describe('useAuth', () => {
  const mockAuthStore = {
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
    mockUseAuthStore.mockReturnValue(mockAuthStore as any)
  })

  it('returns auth state and actions from store', () => {
    const { result } = renderHook(() => useAuth())

    expect(result.current).toEqual({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      login: mockAuthStore.login,
      register: mockAuthStore.register,
      logout: mockAuthStore.logout,
      checkAuth: mockAuthStore.checkAuth,
      clearError: mockAuthStore.clearError,
    })
  })

  it('returns updated state when store changes', () => {
    const mockUser = { id: '1', email: 'test@example.com', username: 'test' }
    
    mockUseAuthStore.mockReturnValue({
      ...mockAuthStore,
      user: mockUser,
      isAuthenticated: true,
    } as any)

    const { result } = renderHook(() => useAuth())

    expect(result.current.user).toEqual(mockUser)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('returns loading state correctly', () => {
    mockUseAuthStore.mockReturnValue({
      ...mockAuthStore,
      isLoading: true,
    } as any)

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
  })

  it('returns error state correctly', () => {
    const errorMessage = 'Authentication failed'
    
    mockUseAuthStore.mockReturnValue({
      ...mockAuthStore,
      error: errorMessage,
    } as any)

    const { result } = renderHook(() => useAuth())

    expect(result.current.error).toBe(errorMessage)
  })
})