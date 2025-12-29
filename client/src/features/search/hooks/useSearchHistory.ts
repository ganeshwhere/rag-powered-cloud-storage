/**
 * Hook for managing search history.
 */

import { useQuery } from '@tanstack/react-query'
import { searchApi } from '../api'
import { queryKeys } from '@/shared/lib/react-query'
import { SearchHistoryItem } from '../types'

interface UseSearchHistoryOptions {
  page?: number
  perPage?: number
  enabled?: boolean
}

export function useSearchHistory(options: UseSearchHistoryOptions = {}) {
  const { page = 1, perPage = 20, enabled = true } = options

  const query = useQuery({
    queryKey: [...queryKeys.search.history, { page, perPage }],
    queryFn: () => searchApi.getSearchHistory(page, perPage),
    enabled,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes
  })

  const history: SearchHistoryItem[] = query.data?.history || []
  const total = query.data?.total || 0
  const currentPage = query.data?.page || page
  const itemsPerPage = query.data?.per_page || perPage

  return {
    history,
    total,
    currentPage,
    itemsPerPage,
    hasNextPage: currentPage * itemsPerPage < total,
    hasPreviousPage: currentPage > 1,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching
  }
}