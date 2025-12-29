import { useQuery } from '@tanstack/react-query'
import { folderApi } from '../api'
import type { FolderBreadcrumb } from '../types'

interface UseFolderBreadcrumbsParams {
  folderId?: string
  enabled?: boolean
}

export const useFolderBreadcrumbs = (params: UseFolderBreadcrumbsParams = {}) => {
  const { folderId, enabled = true } = params

  const query = useQuery({
    queryKey: ['folder-breadcrumbs', folderId],
    queryFn: () => folderApi.getFolderBreadcrumbs(folderId!),
    enabled: enabled && !!folderId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 404 errors (folder not found)
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

  // Transform folder list into breadcrumb format
  const breadcrumbs: FolderBreadcrumb[] = query.data?.map(folder => ({
    id: folder.id,
    name: folder.name,
    path: folder.path,
  })) || []

  return {
    ...query,
    breadcrumbs,
  }
}