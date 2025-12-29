/**
 * Search API functions for the RAG document search system.
 */

import { api } from '@/shared/lib/api'
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
   * Clear user's search cache
   */
  clearSearchCache: async (): Promise<{ message: string }> => {
    const response = await api.delete('/search/cache')
    return response.data
  },

  /**
   * Get search suggestions based on partial query
   */
  getSearchSuggestions: async (query: string): Promise<SearchSuggestionsResponse> => {
    const response = await api.get('/search/suggestions', {
      params: { query }
    })
    return response.data
  }
}