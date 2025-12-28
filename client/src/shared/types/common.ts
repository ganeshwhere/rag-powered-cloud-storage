// Common API response wrapper
export interface ApiResponse<T = any> {
  data: T
  message?: string
  success: boolean
}

// Error response structure
export interface ApiError {
  message: string
  detail?: string
  errors?: Record<string, string[]>
}

// Pagination parameters
export interface PaginationParams {
  page?: number
  size?: number
}

// Pagination response metadata
export interface PaginationMeta {
  total: number
  page: number
  size: number
  pages: number
}

// Generic paginated response
export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

// File upload progress
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

// Generic loading state
export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

// Form validation error
export interface ValidationError {
  field: string
  message: string
}