'use client'

import { useState } from 'react'
import { SearchInterface, SearchResults, SearchHistory, useSearch, useSearchHistory } from '@/features/search'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'

export default function SearchExamplesPage() {
  const [selectedExample, setSelectedExample] = useState<string>('full')

  const examples = [
    { id: 'full', name: 'Full Interface', description: 'Complete search experience' },
    { id: 'simple', name: 'Simple Search', description: 'Basic search with filters' },
    { id: 'filtered', name: 'Filtered Search', description: 'Search specific documents' },
    { id: 'components', name: 'Individual Components', description: 'Custom hook usage' }
  ]

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Search Component Examples</h1>
          <p className="text-muted-foreground">
            Different ways to use the search interface in your application.
          </p>
        </div>

        {/* Example Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {examples.map((example) => (
            <Button
              key={example.id}
              variant={selectedExample === example.id ? 'default' : 'outline'}
              onClick={() => setSelectedExample(example.id)}
            >
              {example.name}
            </Button>
          ))}
        </div>

        {/* Example Content */}
        <div className="space-y-6">
          {selectedExample === 'full' && (
            <Card>
              <CardHeader>
                <CardTitle>Full Search Interface</CardTitle>
                <CardDescription>
                  Complete search experience with suggestions, history, and results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SearchInterface className="w-full" />
              </CardContent>
            </Card>
          )}

          {selectedExample === 'simple' && (
            <Card>
              <CardHeader>
                <CardTitle>Simple Search</CardTitle>
                <CardDescription>
                  Basic search with custom filters and limited results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SearchInterface 
                  className="w-full"
                  filters={{
                    top_k: 5,
                    min_score: 0.7
                  }}
                />
              </CardContent>
            </Card>
          )}

          {selectedExample === 'filtered' && (
            <Card>
              <CardHeader>
                <CardTitle>Document-Filtered Search</CardTitle>
                <CardDescription>
                  Search within specific documents only
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SearchInterface 
                  className="w-full"
                  filters={{
                    document_ids: ['doc-1', 'doc-2'], // Replace with actual document IDs
                    top_k: 10
                  }}
                />
              </CardContent>
            </Card>
          )}

          {selectedExample === 'components' && <IndividualComponentsExample />}
        </div>
      </div>
    </ProtectedRoute>
  )
}

function IndividualComponentsExample() {
  const { searchDocuments, isSearching, results, noResults, error } = useSearch()
  const { history } = useSearchHistory()

  const handleCustomSearch = async () => {
    await searchDocuments({
      query: "What is machine learning?",
      top_k: 3
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Search Hook Usage</CardTitle>
          <CardDescription>
            Using the search hook directly for custom implementations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={handleCustomSearch}
            disabled={isSearching}
          >
            {isSearching ? 'Searching...' : 'Search: "What is machine learning?"'}
          </Button>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {(results || noResults) && (
            <SearchResults 
              results={results}
              noResults={noResults}
              query="What is machine learning?"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Search History Component</CardTitle>
          <CardDescription>
            Standalone search history display
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchHistory 
            history={history}
            onItemClick={(query) => {
              console.log('Clicked history item:', query)
              searchDocuments({ query })
            }}
          />
        </CardContent>
      </Card>
    </div>
  )
}