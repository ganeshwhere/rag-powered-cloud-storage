import { useQuery } from '@tanstack/react-query'
import { documentApi } from '../api'

interface UseDocumentStatusParams {
  documentId: string
  enabled?: boolean
  refetchInterval?: number
}

export const useDocumentStatus = ({ 
  documentId, 
  enabled = true,
  refetchInterval 
}: UseDocumentStatusParams) => {
  return useQuery({
    queryKey: ['document-status', documentId],
    queryFn: () => documentApi.getDocumentStatus(documentId),
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
  })
}