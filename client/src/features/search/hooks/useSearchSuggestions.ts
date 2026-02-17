/**
 * Hook for getting search suggestions.
 */

import { useState, useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { searchApi } from '../api'
import { queryKeys } from '@/shared/lib/react-query'
import type { SearchSuggestionsResponse } from '../types'

export function useSearchSuggestions() {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const queryClient = useQueryClient()
  const requestIdRef = useRef(0)

  const getSuggestions = useCallback(async (query: string) => {
    const normalizedQuery = query.trim()
    const currentRequestId = ++requestIdRef.current

    // Backend accepts 1-100 chars, but we only show suggestions for useful input.
    if (normalizedQuery.length < 3 || normalizedQuery.length > 100) {
      setSuggestions([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await queryClient.fetchQuery<SearchSuggestionsResponse>({
        queryKey: [...queryKeys.search.all, 'suggestions', normalizedQuery],
        queryFn: () => searchApi.getSearchSuggestions(normalizedQuery),
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 10, // 10 minutes
      })

      // Ignore stale responses from older requests.
      if (currentRequestId !== requestIdRef.current) {
        return
      }

      setSuggestions(result.suggestions)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        setSuggestions([])
        setError(null)
        return
      }

      const parsedError = err instanceof Error ? err : new Error('Failed to fetch suggestions')
      setError(parsedError)
      setSuggestions([])
      console.error('Error fetching suggestions:', err)
    } finally {
      // Only clear loading if this is the latest request.
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [queryClient])

  const clearSuggestions = useCallback(() => {
    requestIdRef.current += 1
    setSuggestions([])
    setIsLoading(false)
    setError(null)
  }, [])

  return {
    suggestions,
    getSuggestions,
    clearSuggestions,
    isLoading,
    error,
  }
}
