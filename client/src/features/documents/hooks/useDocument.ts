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
  })
}