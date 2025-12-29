'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { useAuth } from '@/features/auth/context'
import type { RegisterFormData } from '@/features/auth/types'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error, isAuthenticated } = useAuth()

  const handleRegister = async (data: Omit<RegisterFormData, 'confirmPassword'>) => {
    try {
      await register(data)
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
        <RegisterForm 
          onSubmit={handleRegister}
          isLoading={isLoading}
          error={error}
        />
      </div>
    </div>
  )
}