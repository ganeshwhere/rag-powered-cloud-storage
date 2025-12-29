/**
 * Hook for getting search suggestions.
 */

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { searchApi } from '../api'
import { queryKeys } from '@/shared/lib/react-query'

export function useSearchSuggestions() {
  const [currentQuery, setCurrentQuery] = useState<string>('')
  const [suggestions, setSuggestions] = useState<string[]>([])

  const suggestionsQuery = useQuery({
    queryKey: [...queryKeys.search.all, 'suggestions', currentQuery],
    queryFn: () => searchApi.getSearchSuggestions(currentQuery),
    enabled: false, // We'll trigger this manually
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  })

  const getSuggestions = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }

    setCurrentQuery(query)
    
    try {
      const result = await suggestionsQuery.refetch()
      if (result.data) {
        setSuggestions(result.data.suggestions)
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    }
  }, [suggestionsQuery])

  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setCurrentQuery('')
  }, [])

  return {
    suggestions,
    getSuggestions,
    clearSuggestions,
    isLoading: suggestionsQuery.isFetching,
    error: suggestionsQuery.error
  }
}