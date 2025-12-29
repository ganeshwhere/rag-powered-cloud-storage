import { QueryClient, DefaultOptions } from '@tanstack/react-query'

// Default query options
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: 5 minutes
    staleTime: 1000 * 60 * 5,
    // Cache time: 10 minutes
    gcTime: 1000 * 60 * 10,
    // Retry failed requests 3 times
    retry: 3,
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Refetch on window focus
    refetchOnWindowFocus: false,
    // Refetch on reconnect
    refetchOnReconnect: true,
  },
  mutations: {
    // Retry failed mutations once
    retry: 1,
    // Retry delay for mutations
    retryDelay: 1000,
  },
}

// Create query client instance
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
})

// Query keys factory for consistent key management
export const queryKeys = {
  // Auth queries
  auth: {
    user: ['auth', 'user'] as const,
  },
  
  // Document queries
  documents: {
    all: ['documents'] as const,
    lists: () => [...queryKeys.documents.all, 'list'] as const,
    list: (folderId?: string) => [...queryKeys.documents.lists(), { folderId }] as const,
    details: () => [...queryKeys.documents.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.documents.details(), id] as const,
    status: (id: string) => [...queryKeys.documents.all, 'status', id] as const,
  },

  // Folder queries
  folders: {
    all: ['folders'] as const,
    lists: () => [...queryKeys.folders.all, 'list'] as const,
    list: (parentId?: string) => [...queryKeys.folders.lists(), { parentId }] as const,
    details: () => [...queryKeys.folders.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.folders.details(), id] as const,
  },

  // Search queries
  search: {
    all: ['search'] as const,
    results: (query: string) => [...queryKeys.search.all, 'results', query] as const,
    history: ['search', 'history'] as const,
    performance: ['search', 'performance'] as const,
  },
} as const

// Mutation keys for consistent mutation management
export const mutationKeys = {
  // Auth mutations
  auth: {
    login: ['auth', 'login'] as const,
    register: ['auth', 'register'] as const,
    logout: ['auth', 'logout'] as const,
    refresh: ['auth', 'refresh'] as const,
  },

  // Document mutations
  documents: {
    upload: ['documents', 'upload'] as const,
    delete: ['documents', 'delete'] as const,
    update: ['documents', 'update'] as const,
  },

  // Folder mutations
  folders: {
    create: ['folders', 'create'] as const,
    update: ['folders', 'update'] as const,
    delete: ['folders', 'delete'] as const,
  },

  // Search mutations
  search: {
    query: ['search', 'query'] as const,
  },
} as const