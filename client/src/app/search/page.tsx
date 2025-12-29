'use client'

import { SearchInterface } from '@/features/search/components/SearchInterface'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Documents</h1>
          <p className="text-muted-foreground">
            Ask questions about your documents and get AI-powered answers with source references.
          </p>
        </div>
        
        <SearchInterface className="w-full" />
      </div>
    </ProtectedRoute>
  )
}