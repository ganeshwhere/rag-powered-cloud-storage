import { useQuery, useQueryClient } from '@tanstack/react-query'
import { folderApi } from '../api'
import type { FolderListResponse } from '@/shared/types/folder'

interface UseFoldersParams {
  parent_id?: string
  include_documents?: boolean
  page?: number
  page_size?: number
  enabled?: boolean
}

export const useFolders = (params: UseFoldersParams = {}) => {
  const queryClient = useQueryClient()

  const {
    parent_id,
    include_documents = false,
    page = 1,
    page_size = 50,
    enabled = true,
  } = params

  const query = useQuery({
    queryKey: ['folders', { parent_id, include_documents, page, page_size }],
    queryFn: () => folderApi.listFolders({ parent_id, include_documents, page, page_size }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  const invalidateFolders = () => {
    queryClient.invalidateQueries({ queryKey: ['folders'] })
  }

  const prefetchNextPage = () => {
    if (query.data && query.data.folders.length === page_size) {
      queryClient.prefetchQuery({
        queryKey: ['folders', { parent_id, include_documents, page: page + 1, page_size }],
        queryFn: () => folderApi.listFolders({ parent_id, include_documents, page: page + 1, page_size }),
        staleTime: 5 * 60 * 1000,
      })
    }
  }

  return {
    ...query,
    folders: query.data?.folders || [],
    total: query.data?.total || 0,
    currentPage: query.data?.page || page,
    pageSize: query.data?.size || page_size,
    hasNextPage: query.data ? query.data.folders.length === page_size : false,
    invalidateFolders,
    prefetchNextPage,
  }
}