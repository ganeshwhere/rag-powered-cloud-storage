/**
 * Hook for managing search result caching.
 */

import { useCallback } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { searchApi } from '../api'
import { queryKeys } from '@/shared/lib/react-query'

export function useSearchCache() {
  const queryClient = useQueryClient()

  const clearCacheMutation = useMutation({
    mutationFn: searchApi.clearSearchCache,
    onSuccess: () => {
      // Clear all search-related queries from React Query cache
      queryClient.removeQueries({
        queryKey: queryKeys.search.all
      })
    }
  })

  const clearCache = useCallback(async () => {
    return clearCacheMutation.mutateAsync()
  }, [clearCacheMutation])

  const getCachedResult = useCallback((query: string) => {
    return queryClient.getQueryData(queryKeys.search.results(query))
  }, [queryClient])

  const setCachedResult = useCallback((query: string, data: any) => {
    queryClient.setQueryData(queryKeys.search.results(query), data)
  }, [queryClient])

  const invalidateSearchCache = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.search.all
    })
  }, [queryClient])

  return {
    clearCache,
    getCachedResult,
    setCachedResult,
    invalidateSearchCache,
    isClearingCache: clearCacheMutation.isPending,
    clearCacheError: clearCacheMutation.error
  }
}