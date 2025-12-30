import { QueryClient, DefaultOptions } from '@tanstack/react-query'

// Performance-optimized query options
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: 5 minutes for most queries
    staleTime: 1000 * 60 * 5,
    // Cache time: 30 minutes (increased for better performance)
    gcTime: 1000 * 60 * 30,
    // Retry failed requests 3 times with exponential backoff
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 3;
    },
    // Retry delay with exponential backoff and jitter
    retryDelay: (attemptIndex) => {
      const baseDelay = Math.min(1000 * 2 ** attemptIndex, 30000);
      // Add jitter to prevent thundering herd
      return baseDelay + Math.random() * 1000;
    },
    // Disable refetch on window focus for better performance
    refetchOnWindowFocus: false,
    // Refetch on reconnect
    refetchOnReconnect: true,
    // Refetch on mount only if data is stale
    refetchOnMount: true,
    // Network mode for better offline handling
    networkMode: 'online',
  },
  mutations: {
    // Retry failed mutations once
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
    // Retry delay for mutations
    retryDelay: 1000,
    // Network mode for mutations
    networkMode: 'online',
  },
}

// Create query client instance with performance optimizations
export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
  // Enable query deduplication
  queryCache: undefined, // Use default cache
  mutationCache: undefined, // Use default cache
})

// Performance-specific query configurations
export const queryConfigs = {
  // Fast queries (user interactions)
  fast: {
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  },
  
  // Medium queries (document lists)
  medium: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  },
  
  // Slow queries (search results, heavy computations)
  slow: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
  },
  
  // Static data (rarely changes)
  static: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
  },
  
  // Real-time data (frequently updated)
  realtime: {
    staleTime: 0, // Always stale
    gcTime: 1000 * 60, // 1 minute
    refetchInterval: 1000 * 30, // 30 seconds
  },
} as const;

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

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidate all document-related queries
  invalidateDocuments: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.all });
  },
  
  // Invalidate all folder-related queries
  invalidateFolders: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.folders.all });
  },
  
  // Invalidate search queries
  invalidateSearch: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
  },
  
  // Clear all caches (use sparingly)
  clearAll: () => {
    queryClient.clear();
  },
  
  // Prefetch common queries
  prefetchDocuments: (folderId?: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.documents.list(folderId),
      staleTime: queryConfigs.medium.staleTime,
    });
  },
  
  // Remove specific query from cache
  removeQuery: (queryKey: readonly unknown[]) => {
    queryClient.removeQueries({ queryKey });
  },
};