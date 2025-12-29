/**
 * Hook for monitoring search performance and system health.
 */

import { useQuery } from '@tanstack/react-query'
import { searchApi } from '../api'
import { queryKeys } from '@/shared/lib/react-query'

export function useSearchPerformance() {
  const {
    data: performanceStats,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.search.performance,
    queryFn: searchApi.getPerformanceStats,
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    gcTime: 2 * 60 * 1000, // Cache for 2 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    retry: 2
  })

  const isHealthy = performanceStats?.redis_connected && 
                   performanceStats?.optimization_features?.async_operations

  const embeddingCacheEfficiency = performanceStats?.embedding_cache?.usage_percentage || 0

  const performanceSummary = {
    isHealthy,
    embeddingCacheEfficiency,
    optimizationsActive: performanceStats?.optimization_features ? 
      Object.values(performanceStats.optimization_features).filter(Boolean).length : 0,
    totalOptimizations: 6, // Total number of optimization features
    redisConnected: performanceStats?.redis_connected || false,
    embeddingCacheSize: performanceStats?.embedding_cache?.current_size || 0,
    maxEmbeddingCache: performanceStats?.embedding_cache?.max_size || 100
  }

  return {
    performanceStats,
    performanceSummary,
    isLoading,
    error,
    refetch
  }
}