import { useAuthStore } from '../store'

/**
 * Hook to access authentication state and actions
 */
export function useAuth() {
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,
    login,
    register,
    logout,
    checkAuth,
    clearError,
  } = useAuthStore()

  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    error,
    isInitialized,
    
    // Actions
    login,
    register,
    logout,
    checkAuth,
    clearError,
  }
}