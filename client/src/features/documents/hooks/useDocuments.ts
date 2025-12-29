import { useQuery, useQueryClient } from '@tanstack/react-query'
import { documentApi } from '../api'
import type { DocumentListResponse } from '@/shared/types/document'

interface UseDocumentsParams {
  folder_id?: string
  page?: number
  page_size?: number
  enabled?: boolean
}

export const useDocuments = (params: UseDocumentsParams = {}) => {
  const queryClient = useQueryClient()

  const {
    folder_id,
    page = 1,
    page_size = 50,
    enabled = true,
  } = params

  const query = useQuery({
    queryKey: ['documents', { folder_id, page, page_size }],
    queryFn: () => documentApi.listDocuments({ folder_id, page, page_size }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchInterval: (query) => {
      // Auto-refresh if any documents are still processing
      const hasProcessingDocs = query.state.data?.documents?.some(
        doc => doc.status === 'processing' || doc.status === 'pending'
      )
      return hasProcessingDocs ? 5000 : false // 5 seconds if processing, otherwise no polling
    },
  })

  const invalidateDocuments = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
  }

  const prefetchNextPage = () => {
    if (query.data && query.data.documents.length === page_size) {
      queryClient.prefetchQuery({
        queryKey: ['documents', { folder_id, page: page + 1, page_size }],
        queryFn: () => documentApi.listDocuments({ folder_id, page: page + 1, page_size }),
        staleTime: 5 * 60 * 1000,
      })
    }
  }

  return {
    ...query,
    documents: query.data?.documents || [],
    total: query.data?.total || 0,
    currentPage: query.data?.page || page,
    pageSize: query.data?.size || page_size,
    hasNextPage: query.data ? query.data.documents.length === page_size : false,
    invalidateDocuments,
    prefetchNextPage,
  }
}