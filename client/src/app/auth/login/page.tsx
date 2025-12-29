'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuth } from '@/features/auth/context'
import type { LoginFormData } from '@/features/auth/types'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, isAuthenticated } = useAuth()

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
      // Navigation is handled by the AuthProvider
    } catch (err) {
      // Error is handled by the context and displayed in the form
    }
  }

  // Redirect if already authenticated
  if (isAuthenticated) {
    router.push('/documents')
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