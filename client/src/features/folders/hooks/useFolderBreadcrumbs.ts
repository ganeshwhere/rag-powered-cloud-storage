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