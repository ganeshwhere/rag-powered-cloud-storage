'use client'

import React, { useState, useCallback } from 'react'
import { Search, Clock, Loader2 } from 'lucide-react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { SearchResults } from './SearchResults'
import { SearchHistory } from './SearchHistory'
import { SearchSuggestions } from './SearchSuggestions'
import { useSearch } from '../hooks/useSearch'
import { useSearchHistory } from '../hooks/useSearchHistory'
import { useSearchSuggestions } from '../hooks/useSearchSuggestions'
import { SearchFilters } from '../types'

interface SearchInterfaceProps {
  className?: string
  filters?: SearchFilters
}

export function SearchInterface({ className, filters }: SearchInterfaceProps) {
  const [query, setQuery] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)

  const { 
    searchDocuments, 
    isSearching, 
    results, 
    noResults, 
    error,
    clearResults 
  } = useSearch()

  const { 
    history, 
    isLoading: isLoadingHistory,
    refetch: refetchHistory 
  } = useSearchHistory()

  const {
    suggestions,
    getSuggestions,
    isLoading: isLoadingSuggestions
  } = useSearchSuggestions()

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const queryToSearch = searchQuery || query.trim()
    if (!queryToSearch) return

    setShowHistory(false)
    setShowSuggestions(false)
    
    await searchDocuments({
      query: queryToSearch,
      ...filters
    })

    // Refresh history after search
    refetchHistory()
  }, [query, filters, searchDocuments, refetchHistory])

  const handleQueryChange = useCallback(async (value: string) => {
    setQuery(value)
    
    if (value.length > 2) {
      setShowSuggestions(true)
      await getSuggestions(value)
    } else {
      setShowSuggestions(false)
    }
  }, [getSuggestions])

  const handleHistoryItemClick = useCallback((historyQuery: string) => {
    setQuery(historyQuery)
    setShowHistory(false)
    handleSearch(historyQuery)
  }, [handleSearch])

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion)
    setShowSuggestions(false)
    handleSearch(suggestion)
  }, [handleSearch])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }, [handleSearch])

  const handleInputFocus = useCallback(() => {
    if (!query && history.length > 0) {
      setShowHistory(true)
    }
  }, [query, history.length])

  const handleInputBlur = useCallback(() => {
    // Delay hiding to allow clicks on suggestions/history
    setTimeout(() => {
      setShowHistory(false)
      setShowSuggestions(false)
    }, 200)
  }, [])

  const hasResults = results || noResults
  const showDropdown = (showHistory && history.length > 0) || (showSuggestions && suggestions.length > 0)

  return (
    <div className={`space-y-4 ${className ?? ''}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search your documents..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            onKeyPress={handleKeyPress}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            className="h-11 rounded-2xl border-white/70 bg-white/90 pl-11 pr-30 shadow-sm"
            disabled={isSearching}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {query && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setQuery('')
                  clearResults()
                  setShowHistory(false)
                  setShowSuggestions(false)
                }}
                className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
              >
                ×
              </Button>
            )}
            <Button
              onClick={() => handleSearch()}
              disabled={!query.trim() || isSearching}
              size="sm"
              className="h-8 rounded-xl px-3.5"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Search'
              )}
            </Button>
          </div>
        </div>

        {/* Search Dropdown */}
        {showDropdown && (
          <Card className="surface-border absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto border-white/75 bg-white/95 py-2 shadow-xl">
            {showHistory && history.length > 0 && (
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Recent Searches
                </div>
                <SearchHistory
                  history={history.slice(0, 5)}
                  onItemClick={handleHistoryItemClick}
                  compact
                />
              </div>
            )}
            
            {showSuggestions && suggestions.length > 0 && (
              <div className="p-2">
                <div className="px-2 py-1 text-sm font-medium text-muted-foreground">
                  Suggestions
                </div>
                <SearchSuggestions
                  suggestions={suggestions}
                  onSuggestionClick={handleSuggestionClick}
                  isLoading={isLoadingSuggestions}
                  compact
                />
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-destructive bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {/* Search Results */}
      {hasResults && (
        <div className="pt-2">
          <SearchResults
            results={results}
            noResults={noResults}
            query={query}
          />
        </div>
      )}

      {/* Search History (when not searching) */}
      {!hasResults && !isSearching && history.length > 0 && (
        <div className="pt-2">
          <h3 className="mb-4 font-display text-xl font-semibold">Recent Searches</h3>
          <SearchHistory
            history={history}
            onItemClick={handleHistoryItemClick}
            isLoading={isLoadingHistory}
          />
        </div>
      )}
    </div>
  )
}
