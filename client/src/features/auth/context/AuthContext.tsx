'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@/shared/types/auth'
import { authApi } from '../api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (userData: any) => Promise<void>
  logout: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Start with loading
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Computed state
  const isAuthenticated = !!user

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('access_token')
      
      if (!token) {
        setIsLoading(false)
        return
      }

      try {
        const userData = await authApi.getCurrentUser()
        setUser(userData)
      } catch (error) {
        // Token is invalid, clean up
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [])

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authApi.login({ email, password })
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      
      setUser(response.user)
      router.push('/documents') // Redirect to main app
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (userData: any) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await authApi.register(userData)
      
      // Store tokens
      localStorage.setItem('access_token', response.access_token)
      localStorage.setItem('refresh_token', response.refresh_token)
      
      setUser(response.user)
      router.push('/documents') // Redirect to main app
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed'
      setError(errorMessage)
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    setIsLoading(true)

    try {
      await authApi.logout()
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error)
    } finally {
      // Always clear local state
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      setUser(null)
      setError(null)
      setIsLoading(false)
      router.push('/auth/login')
    }
  }

  const clearError = () => {
    setError(null)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}