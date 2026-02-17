'use client'

import { useState } from 'react'
import { Code2, Sparkles } from 'lucide-react'
import {
  SearchInterface,
  SearchResults,
  SearchHistory,
  useSearch,
  useSearchHistory,
} from '@/features/search'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { MainLayout } from '@/shared/components/layout/main-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'

export default function SearchExamplesPage() {
  const [selectedExample, setSelectedExample] = useState<string>('full')

  const examples = [
    { id: 'full', name: 'Full Interface', description: 'Complete search experience' },
    { id: 'simple', name: 'Simple Search', description: 'Basic search with filters' },
    { id: 'filtered', name: 'Filtered Search', description: 'Search specific documents' },
    { id: 'components', name: 'Hook Components', description: 'Custom hook usage' },
  ]

  return (
    <ProtectedRoute>
      <MainLayout>
        <div className="w-full space-y-6 animate-rise-in">
          <section className="mesh-panel surface-border rounded-3xl p-6 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
              <Code2 className="h-3.5 w-3.5" />
              Search Playground
            </div>
            <h1 className="mt-4 font-display text-4xl font-semibold leading-tight">Search Component Examples</h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Explore integration patterns for search UI, filters, and hooks.
            </p>
          </section>

          <section className="surface-border rounded-2xl border-white/70 bg-white/82 p-5 sm:p-6">
            <div className="mb-6 flex flex-wrap gap-2">
              {examples.map((example) => (
                <Button
                  key={example.id}
                  variant={selectedExample === example.id ? 'default' : 'outline'}
                  onClick={() => setSelectedExample(example.id)}
                  className="rounded-full"
                >
                  {example.name}
                </Button>
              ))}
            </div>

            <div className="space-y-6">
              {selectedExample === 'full' && (
                <Card className="surface-border border-white/70 bg-white/88">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Full Search Interface</CardTitle>
                    <CardDescription>
                      Complete search experience with suggestions, history, and results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SearchInterface className="w-full" />
                  </CardContent>
                </Card>
              )}

              {selectedExample === 'simple' && (
                <Card className="surface-border border-white/70 bg-white/88">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Simple Search</CardTitle>
                    <CardDescription>Basic search with custom filters and limited results.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SearchInterface
                      className="w-full"
                      filters={{
                        top_k: 5,
                        min_score: 0.7,
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {selectedExample === 'filtered' && (
                <Card className="surface-border border-white/70 bg-white/88">
                  <CardHeader>
                    <CardTitle className="font-display text-2xl">Document-Filtered Search</CardTitle>
                    <CardDescription>Search within specific documents only.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SearchInterface
                      className="w-full"
                      filters={{
                        document_ids: ['doc-1', 'doc-2'],
                        top_k: 10,
                      }}
                    />
                  </CardContent>
                </Card>
              )}

              {selectedExample === 'components' && <IndividualComponentsExample />}
            </div>
          </section>
        </div>
      </MainLayout>
    </ProtectedRoute>
  )
}

function IndividualComponentsExample() {
  const { searchDocuments, isSearching, results, noResults, error } = useSearch()
  const { history } = useSearchHistory()

  const handleCustomSearch = async () => {
    await searchDocuments({
      query: 'What is machine learning?',
      top_k: 3,
    })
  }

  return (
    <div className="space-y-6">
      <Card className="surface-border border-white/70 bg-white/88">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Custom Search Hook Usage</CardTitle>
          <CardDescription>Using the search hook directly for custom implementations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCustomSearch} disabled={isSearching}>
            {isSearching ? 'Searching...' : 'Search: "What is machine learning?"'}
          </Button>

          {error && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {(results || noResults) && (
            <SearchResults results={results} noResults={noResults} query="What is machine learning?" />
          )}
        </CardContent>
      </Card>

      <Card className="surface-border border-white/70 bg-white/88">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Search History Component</CardTitle>
          <CardDescription>Standalone search history display.</CardDescription>
        </CardHeader>
        <CardContent>
          <SearchHistory
            history={history}
            onItemClick={(query) => {
              searchDocuments({ query })
            }}
          />
        </CardContent>
      </Card>

      <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        This route is intended as a component integration sandbox.
      </div>
    </div>
  )
}
