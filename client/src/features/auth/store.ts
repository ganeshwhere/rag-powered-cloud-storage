import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, LoginRequest, RegisterRequest } from '@/shared/types/auth'
import type { AuthState } from './types'
import { authApi } from './api'

interface AuthStore extends AuthState {
  // Actions
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
  setLoading: (loading: boolean) => void
  // Add initialization state
  isInitialized: boolean
  setInitialized: (initialized: boolean) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading true to prevent premature redirects
      error: null,
      isInitialized: false,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.login(credentials)
          
          // Store tokens in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', response.access_token)
            localStorage.setItem('refresh_token', response.refresh_token)
          }
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login failed',
            isInitialized: true,
          })
          throw error
        }
      },

      register: async (userData: RegisterRequest) => {
        set({ isLoading: true, error: null })
        
        try {
          const response = await authApi.register(userData)
          
          // Store tokens in localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('access_token', response.access_token)
            localStorage.setItem('refresh_token', response.refresh_token)
          }
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        } catch (error) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Registration failed',
            isInitialized: true,
          })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        
        try {
          await authApi.logout()
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        } catch (error) {
          // Even if logout fails, clear local state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        }
      },

      checkAuth: async () => {
        // Don't check auth if already loading or if we're already initialized and authenticated
        const currentState = get()
        if (currentState.isLoading && currentState.isInitialized) return
        
        const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
        
        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
          return
        }

        set({ isLoading: true })
        
        try {
          const user = await authApi.getCurrentUser()
          
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        } catch (error) {
          // Token is invalid, clear everything
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
          }
          
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            isInitialized: true,
          })
        }
      },

      clearError: () => {
        set({ error: null })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },

      setInitialized: (initialized: boolean) => {
        set({ isInitialized: initialized })
      },
    }),
    {
      name: 'auth-store',
      // Only persist user and authentication status, not loading/error states
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Add onRehydrateStorage to handle initialization after persistence restore
      onRehydrateStorage: () => (state) => {
        if (state) {
          // After rehydration, check if we have a token and validate it
          const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null
          if (token && state.isAuthenticated) {
            // We have a token and were previously authenticated, validate it
            state.checkAuth()
          } else {
            // No token or not previously authenticated, mark as initialized
            state.setInitialized(true)
            state.setLoading(false)
          }
        }
      },
    }
  )
)