export interface SearchRequest {
  query: string
  folder_id?: string
  limit?: number
}

export interface SearchResult {
  document_id: string
  document_name: string
  chunk_content: string
  similarity_score: number
  metadata: Record<string, any>
}

export interface SearchResponse {
  query: string
  answer: string
  sources: SearchResult[]
  total_results: number
  processing_time: number
}

export interface SearchHistory {
  id: string
  user_id: string
  query: string
  results_count: number
  created_at: string
}

export interface SearchHistoryResponse {
  history: SearchHistory[]
  total: number
  page: number
  size: number
}