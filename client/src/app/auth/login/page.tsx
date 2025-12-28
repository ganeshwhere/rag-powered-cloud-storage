'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useGuestGuard } from '@/features/auth/hooks/useAuthGuard'
import type { LoginFormData } from '@/features/auth/types'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error } = useAuth()
  
  // Redirect authenticated users away from login page
  const { isAuthenticated, isLoading: authLoading } = useGuestGuard('/')

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data)
      router.push('/')
    } catch (err) {
      // Error is handled by the store and displayed in the form
    }
  }

  // Show loading while checking auth status
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Don't render if already authenticated (will be redirected)
  if (isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <LoginForm 
          onSubmit={handleLogin}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}