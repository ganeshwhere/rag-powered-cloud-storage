import { useQuery } from '@tanstack/react-query'
import { documentApi } from '../api'

interface UseDocumentParams {
  documentId: string
  enabled?: boolean
}

export const useDocument = ({ documentId, enabled = true }: UseDocumentParams) => {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: () => documentApi.getDocument(documentId),
    enabled: enabled && !!documentId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (document not found)
      if (error?.message?.includes('not found') || 
          error?.message?.includes('404') || 
          error?.status === 404) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    // Add error handling to prevent console errors
    throwOnError: false,
  })
}