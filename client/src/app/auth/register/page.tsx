'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Sparkles } from 'lucide-react'
import { RegisterForm } from '@/features/auth/components/RegisterForm'
import { useAuth } from '@/features/auth/context'
import { APP_CONFIG } from '@/shared/lib/config'
import type { RegisterFormData } from '@/features/auth/types'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading, error, isAuthenticated } = useAuth()

  const handleRegister = async (data: Omit<RegisterFormData, 'confirmPassword'>) => {
    try {
      await register(data)
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

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8">
      <div className="app-page-width grid min-h-[calc(100vh-3rem)] items-stretch gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="mesh-panel surface-border hidden rounded-3xl p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              New Workspace
            </span>
            <h1 className="font-display text-4xl font-semibold leading-tight">
              Create your {appName} account
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              Set up your profile and start building a searchable document knowledge base.
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/80 p-5">
            <p className="text-sm font-semibold">Your first workflow</p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Create folders for your projects.</li>
              <li>2. Upload PDFs, docs, and notes.</li>
              <li>3. Ask questions and validate source-backed answers.</li>
            </ol>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="lg:hidden">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                <ShieldCheck className="h-3.5 w-3.5" />
                Register
              </div>
              <h1 className="mt-3 font-display text-3xl font-semibold">Create account</h1>
              <p className="text-sm text-muted-foreground">Start indexing and searching your documents in minutes.</p>
            </div>
            <RegisterForm onSubmit={handleRegister} isLoading={isLoading} error={error} />
          </div>
        </section>
      </div>
    </div>
  )
}
