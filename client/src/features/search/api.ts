/**
 * Search API functions for the RAG document search system.
 */

import { api } from '@/shared/lib/api'
import axios from 'axios'
import { 
  SearchRequest, 
  SearchResponse, 
  SearchHistoryResponse,
  NoResultsResponse,
  SearchSuggestionsResponse
} from './types'

export const searchApi = {
  /**
   * Perform a search query on user documents
   */
  searchDocuments: async (request: SearchRequest): Promise<SearchResponse | NoResultsResponse> => {
    const response = await api.post('/search/', request)
    return response.data
  },

  /**
   * Get user's search history with pagination
   */
  getSearchHistory: async (page = 1, perPage = 20): Promise<SearchHistoryResponse> => {
    const response = await api.get('/search/history', {
      params: {
        page,
        per_page: perPage
      }
    })
    return response.data
  },

  /**
   * Clear user's search cache and embedding cache
   */
  clearSearchCache: async (): Promise<{ 
    message: string
    embeddings_cleared: number
    search_cache_cleared: boolean
  }> => {
    const response = await api.delete('/search/cache')
    return response.data
  },

  /**
   * Get search suggestions based on partial query
   */
  getSearchSuggestions: async (query: string): Promise<SearchSuggestionsResponse> => {
    const normalizedQuery = query.trim()

    if (!normalizedQuery || normalizedQuery.length > 100) {
      return {
        query: normalizedQuery,
        suggestions: [],
      }
    }

    try {
      const response = await api.get('/search/suggestions', {
        params: { query: normalizedQuery },
      })
      return response.data
    } catch (error) {
      // Treat validation edge cases as "no suggestions" to avoid noisy UX.
      if (axios.isAxiosError(error) && error.response?.status === 422) {
        return {
          query: normalizedQuery,
          suggestions: [],
        }
      }
      throw error
    }
  },

  /**
   * Get search performance statistics for monitoring and debugging
   */
  getPerformanceStats: async (): Promise<{
    vector_store_stats: any
    redis_connected: boolean
    embedding_cache: {
      current_size: number
      max_size: number
      usage_percentage: number
    }
    performance_settings: {
      search_timeout: number
      embedding_timeout: number
      llm_timeout: number
      max_results: number
      min_score: number
      cache_ttl: number
    }
    optimization_features: {
      async_operations: boolean
      embedding_caching: boolean
      query_preprocessing: boolean
      result_limiting: boolean
      timeout_handling: boolean
      fallback_responses: boolean
    }
  }> => {
    const response = await api.get('/search/performance')
    return response.data
  }
}
