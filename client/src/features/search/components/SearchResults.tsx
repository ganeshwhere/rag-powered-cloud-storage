'use client'

import React from 'react'
import { FileText, Clock, ExternalLink } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { SearchResponse, NoResultsResponse, SearchChunk } from '../types'

interface SearchResultsProps {
  results: SearchResponse | null
  noResults: NoResultsResponse | null
  query: string
}

interface SearchChunkCardProps {
  chunk: SearchChunk
  onViewDocument?: (documentId: string) => void
}

function SearchChunkCard({ chunk, onViewDocument }: SearchChunkCardProps) {
  const handleViewDocument = () => {
    if (onViewDocument) {
      onViewDocument(chunk.document_id)
    }
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium text-muted-foreground">
              Document {chunk.document_id.slice(0, 8)}...
            </span>
            <span className="text-xs text-muted-foreground">
              Chunk {chunk.chunk_index + 1}
            </span>
            <span className="text-xs text-muted-foreground">
              Score: {(chunk.score * 100).toFixed(1)}%
            </span>
          </div>
          
          <p className="text-sm text-foreground leading-relaxed line-clamp-4">
            {chunk.text}
          </p>
          
          {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {Object.entries(chunk.metadata).map(([key, value]) => (
                <span key={key} className="mr-3">
                  {key}: {String(value)}
                </span>
              ))}
            </div>
          )}
        </div>
        
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={handleViewDocument}
          className="flex-shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}

function NoResultsCard({ noResults }: { noResults: NoResultsResponse }) {
  return (
    <Card className="p-8 text-center">
      <div className="max-w-md mx-auto">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
        <p className="text-muted-foreground mb-4">{noResults.message}</p>
        
        {noResults.suggestions.length > 0 && (
          <div className="text-left">
            <p className="text-sm font-medium mb-2">Try these suggestions:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {noResults.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-muted-foreground rounded-full flex-shrink-0" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  )
}

export function SearchResults({ results, noResults, query }: SearchResultsProps) {
  if (noResults) {
    return <NoResultsCard noResults={noResults} />
  }

  if (!results) {
    return null
  }

  const handleViewDocument = (documentId: string) => {
    // TODO: Navigate to document view
    console.log('View document:', documentId)
  }

  return (
    <div className="space-y-6">
      {/* Search Summary */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Search Results</h2>
          <p className="text-sm text-muted-foreground">
            Found {results.total_results} results for "{query}" in {results.processing_time_ms}ms
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {results.processing_time_ms}ms
        </div>
      </div>

      {/* Generated Answer */}
      {results.answer && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="text-lg font-semibold mb-3 text-primary">AI Answer</h3>
          <div className="prose prose-sm max-w-none">
            <p className="text-foreground leading-relaxed whitespace-pre-wrap">
              {results.answer}
            </p>
          </div>
          
          {results.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-primary/20">
              <p className="text-sm font-medium text-primary mb-2">Sources:</p>
              <div className="flex flex-wrap gap-2">
                {results.sources.map((sourceId, index) => (
                  <Button
                    key={sourceId}
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewDocument(sourceId)}
                    className="text-xs"
                  >
                    Document {sourceId.slice(0, 8)}...
                  </Button>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Source Chunks */}
      {results.chunks.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Source Chunks</h3>
          <div className="space-y-3">
            {results.chunks.map((chunk) => (
              <SearchChunkCard
                key={chunk.id}
                chunk={chunk}
                onViewDocument={handleViewDocument}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}