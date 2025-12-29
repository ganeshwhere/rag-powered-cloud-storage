/**
 * Search feature types for the RAG document search system.
 * These types align with the backend API schemas.
 */

export interface SearchRequest {
  query: string
  document_ids?: string[]
  top_k?: number
  min_score?: number
}

export interface SearchChunk {
  id: string
  document_id: string
  chunk_index: number
  text: string
  score: number
  metadata: Record<string, any>
}

export interface SearchResponse {
  query: string
  answer: string
  chunks: SearchChunk[]
  total_results: number
  processing_time_ms: number
  sources: string[]
}

export interface SearchHistoryItem {
  id: string
  query: string
  results_count: number
  created_at: string
}

export interface SearchHistoryResponse {
  history: SearchHistoryItem[]
  total: number
  page: number
  per_page: number
}

export interface NoResultsResponse {
  query: string
  message: string
  suggestions: string[]
}

export interface SearchSuggestionsResponse {
  query: string
  suggestions: string[]
}

export interface SearchState {
  query: string
  isSearching: boolean
  results: SearchResponse | null
  noResults: NoResultsResponse | null
  error: string | null
  history: SearchHistoryItem[]
  suggestions: string[]
}

export interface SearchFilters {
  document_ids?: string[]
  min_score?: number
  top_k?: number
}