'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LockKeyhole, Sparkles } from 'lucide-react'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { useAuth } from '@/features/auth/context'
import { APP_CONFIG } from '@/shared/lib/config'
import type { LoginFormData } from '@/features/auth/types'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, error, isAuthenticated } = useAuth()

  const handleLogin = async (data: LoginFormData) => {
    try {
      await login(data.email, data.password)
    } catch (err) {
      // Error is handled by context and displayed in the form
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/documents')
    }
  }, [isAuthenticated, router])

  if (isAuthenticated) return null

  const appName = APP_CONFIG.name ?? 'Document RAG'
  const appTagline = APP_CONFIG.tagline ?? 'Ask better questions across every document.'

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="app-page-width grid min-h-[calc(100vh-3rem)] items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="mesh-panel surface-border hidden rounded-3xl p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Secure Access
            </span>
            <h1 className="font-display text-4xl font-semibold leading-tight">
              Welcome back to {appName}
            </h1>
            <p className="max-w-md text-base text-muted-foreground">{appTagline}</p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/80 p-5">
            <p className="text-sm font-semibold">What you can do after sign in</p>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>Upload documents and process them for retrieval.</li>
              <li>Search with natural language and inspect source chunks.</li>
              <li>Track activity from your dashboard and folders.</li>
            </ul>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="lg:hidden">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                <LockKeyhole className="h-3.5 w-3.5" />
                Sign In
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold">Welcome back</h1>
              <p className="text-sm text-muted-foreground">Access your workspace and continue where you left off.</p>
            </div>
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} error={error} />
          </div>
        </section>
      </div>
    </div>
  )
}
