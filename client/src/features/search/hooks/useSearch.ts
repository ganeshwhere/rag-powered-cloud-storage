/**
 * Hook for performing document searches using RAG.
 */

import { useState, useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { searchApi } from '../api'
import { queryKeys, mutationKeys } from '@/shared/lib/react-query'
import { SearchRequest, SearchResponse, NoResultsResponse } from '../types'

export function useSearch() {
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [noResults, setNoResults] = useState<NoResultsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const queryClient = useQueryClient()

  const searchMutation = useMutation({
    mutationKey: mutationKeys.search.query,
    mutationFn: searchApi.searchDocuments,
    onSuccess: (data) => {
      setError(null)
      
      if ('answer' in data) {
        // It's a SearchResponse
        setResults(data as SearchResponse)
        setNoResults(null)
        
        // Cache the search result
        queryClient.setQueryData(
          queryKeys.search.results(data.query),
          data
        )
      } else {
        // It's a NoResultsResponse
        setResults(null)
        setNoResults(data as NoResultsResponse)
      }
      
      // Invalidate search history to refresh it
      queryClient.invalidateQueries({
        queryKey: queryKeys.search.history
      })
    },
    onError: (error: any) => {
      setResults(null)
      setNoResults(null)
      setError(error.response?.data?.detail || 'An error occurred while searching')
    }
  })

  const searchDocuments = useCallback(async (request: SearchRequest) => {
    setError(null)
    return searchMutation.mutateAsync(request)
  }, [searchMutation])

  const clearResults = useCallback(() => {
    setResults(null)
    setNoResults(null)
    setError(null)
  }, [])

  return {
    searchDocuments,
    isSearching: searchMutation.isPending,
    results,
    noResults,
    error,
    clearResults
  }
}