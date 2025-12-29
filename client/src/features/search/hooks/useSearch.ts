/**
 * Hook for performing document searches using RAG with performance optimizations.
 */

import { useState, useCallback, useMemo } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { searchApi } from '../api'
import { queryKeys, mutationKeys } from '@/shared/lib/react-query'
import { SearchRequest, SearchResponse, NoResultsResponse } from '../types'

export function useSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [noResults, setNoResults] = useState<NoResultsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastSearchTime, setLastSearchTime] = useState<number | null>(null)
  
  const queryClient = useQueryClient()

  const searchMutation = useMutation({
    mutationKey: mutationKeys.search.query,
    mutationFn: searchApi.searchDocuments,
    onSuccess: (data) => {
      setError(null)
      setLastSearchTime(Date.now())
      
      if ('answer' in data) {
        // It's a SearchResponse
        setResults(data as SearchResponse)
        setNoResults(null)
        
        // Cache the search result with longer TTL for good results
        queryClient.setQueryData(
          queryKeys.search.results(data.query),
          data
        )
      } else {
        // It's a NoResultsResponse
        setResults(null)
        setNoResults(data as NoResultsResponse)
        
        // Cache no results with shorter TTL
        queryClient.setQueryData(
          queryKeys.search.results(data.query),
          data
        )
      }
      
      // Invalidate search history to refresh it (async, don't wait)
      queryClient.invalidateQueries({
        queryKey: queryKeys.search.history
      })
    },
    onError: (error: any) => {
      setResults(null)
      setNoResults(null)
      setError(error.response?.data?.detail || 'An error occurred while searching')
      setLastSearchTime(Date.now())
    },
    // Add retry logic for failed searches
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false
      }
      // Retry up to 2 times for 5xx errors or network issues
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000) // Exponential backoff
  })

  const searchDocuments = useCallback(async (request: SearchRequest) => {
    setError(null)
    
    // Check if we have a cached result first
    const cachedResult = queryClient.getQueryData(queryKeys.search.results(request.query))
    if (cachedResult && typeof cachedResult === 'object') {
      // Use cached result immediately
      if ('answer' in cachedResult) {
        setResults(cachedResult as SearchResponse)
        setNoResults(null)
      } else {
        setResults(null)
        setNoResults(cachedResult as NoResultsResponse)
      }
      return cachedResult
    }
    
    return searchMutation.mutateAsync(request)
  }, [searchMutation, queryClient])

  const clearResults = useCallback(() => {
    setResults(null)
    setNoResults(null)
    setError(null)
    setLastSearchTime(null)
  }, [])

  // Performance metrics
  const performanceMetrics = useMemo(() => {
    if (!results) return null
    
    return {
      processingTime: results.processing_time_ms,
      totalResults: results.total_results,
      chunksReturned: results.chunks.length,
      searchTime: lastSearchTime,
      isFastSearch: results.processing_time_ms < 2000, // Under 2 seconds is considered fast
      cacheHit: results.processing_time_ms < 500 // Under 500ms likely indicates cache hit
    }
  }, [results, lastSearchTime])

  return {
    searchDocuments,
    isSearching: searchMutation.isPending,
    results,
    noResults,
    error,
    clearResults,
    performanceMetrics
  }
}