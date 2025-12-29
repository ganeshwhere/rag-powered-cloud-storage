import { useQuery } from '@tanstack/react-query'
import { folderApi } from '../api'

interface UseFolderParams {
  folderId: string
  enabled?: boolean
}

export const useFolder = ({ folderId, enabled = true }: UseFolderParams) => {
  return useQuery({
    queryKey: ['folder', folderId],
    queryFn: () => folderApi.getFolder(folderId),
    enabled: enabled && !!folderId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}