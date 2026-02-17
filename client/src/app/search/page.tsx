'use client'

import { Search } from 'lucide-react'
import { MainLayout } from '@/shared/components/layout/main-layout'
import { SearchInterface } from '@/features/search/components/SearchInterface'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { APP_CONFIG } from '@/shared/lib/config'

export default function SearchPage() {
  const appTagline = APP_CONFIG.tagline ?? 'reliable retrieval and source-grounded answers.'

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="w-full space-y-6 animate-rise-in">
          <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Search className="h-3.5 w-3.5" />
              Semantic Search
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">Search Documents</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Ask questions about your documents and get {appTagline}
            </p>
          </section>

          <section className="surface-border rounded-2xl border-white/70 bg-white/82 p-5 sm:p-6">
            <SearchInterface className="w-full" />
          </section>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}
