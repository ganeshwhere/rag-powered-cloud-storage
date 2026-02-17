'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Lock, Mail, User, UserRound } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import type { RegisterFormData, AuthFormErrors } from '../types'

interface RegisterFormProps {
  onSubmit: (data: Omit<RegisterFormData, 'confirmPassword'>) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export function RegisterForm({ onSubmit, isLoading = false, error }: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    full_name: '',
  })
  const [errors, setErrors] = useState<AuthFormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: AuthFormErrors = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.username) {
      newErrors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters long'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      const { confirmPassword, ...submitData } = formData
      await onSubmit(submitData)
    } catch (err) {
      // Error handling is done by the parent component
    }
  }

  const handleInputChange = (field: keyof RegisterFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [field]: e.target.value,
    }))

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: undefined,
      }))
    }
  }

  return (
    <Card className="surface-border w-full max-w-md border-white/70 bg-white/88 py-5 backdrop-blur-xl">
      <CardHeader className="gap-2">
        <CardTitle className="font-display text-2xl">Create Account</CardTitle>
        <CardDescription>Sign up to start managing your documents</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email')}
                placeholder="Enter your email"
                disabled={isLoading}
                aria-invalid={!!errors.email}
                className="h-10 rounded-xl border-white/65 bg-white/82 pl-10"
              />
            </div>
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="username" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Username
            </label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="username"
                type="text"
                value={formData.username}
                onChange={handleInputChange('username')}
                placeholder="Choose a username"
                disabled={isLoading}
                aria-invalid={!!errors.username}
                className="h-10 rounded-xl border-white/65 bg-white/82 pl-10"
              />
            </div>
            {errors.username && <p className="text-sm text-destructive">{errors.username}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="full_name" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Full Name (Optional)
            </label>
            <div className="relative">
              <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={handleInputChange('full_name')}
                placeholder="Enter your full name"
                disabled={isLoading}
                className="h-10 rounded-xl border-white/65 bg-white/82 pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password')}
                placeholder="Create a password"
                disabled={isLoading}
                aria-invalid={!!errors.password}
                className="h-10 rounded-xl border-white/65 bg-white/82 pl-10"
              />
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"
            >
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange('confirmPassword')}
                placeholder="Confirm your password"
                disabled={isLoading}
                aria-invalid={!!errors.confirmPassword}
                className="h-10 rounded-xl border-white/65 bg-white/82 pl-10"
              />
            </div>
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
          </div>

          {error && <div className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

          <Button type="submit" className="h-10 w-full rounded-xl" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-primary transition-colors hover:text-primary/80">
              Sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
