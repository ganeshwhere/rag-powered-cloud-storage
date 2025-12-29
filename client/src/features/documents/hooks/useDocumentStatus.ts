import { useQuery } from '@tanstack/react-query'
import { documentApi } from '../api'

export const useDocumentStatus = (
  documentId: string | null | undefined,
  options: { enabled?: boolean; refetchInterval?: number } = {}
) => {
  const { enabled = true, refetchInterval } = options
  
  const query = useQuery({
    queryKey: ['document-status', documentId],
    queryFn: () => documentApi.getDocumentStatus(documentId!),
    enabled: enabled && !!documentId,
    refetchInterval: (query) => {
      // Auto-refresh if document is still processing
      if (query.state.data?.status === 'processing' || query.state.data?.status === 'pending') {
        return refetchInterval || 3000 // 3 seconds
      }
      return false
    },
    staleTime: 1000, // 1 second - keep fresh for processing status
    gcTime: 2 * 60 * 1000, // 2 minutes
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

  const status = query.data
  
  return {
    ...query,
    status,
    isProcessing: status?.status === 'processing',
    isCompleted: status?.status === 'completed',
    isFailed: status?.status === 'failed',
    progress: undefined, // No progress property in DocumentStatusResponse
  }
}