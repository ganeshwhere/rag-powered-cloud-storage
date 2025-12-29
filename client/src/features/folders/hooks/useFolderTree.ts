import { useQuery } from '@tanstack/react-query'
import { folderApi } from '../api'
import type { Folder } from '@/shared/types/folder'
import type { FolderTreeNode } from '../types'

interface UseFolderTreeParams {
  rootId?: string
  enabled?: boolean
}

export const useFolderTree = (params: UseFolderTreeParams = {}) => {
  const { rootId, enabled = true } = params

  const query = useQuery({
    queryKey: ['folder-tree', rootId],
    queryFn: async () => {
      // Get all folders recursively to build the complete tree
      const allFolders: Folder[] = []
      
      // Start with root folders
      const rootFolders = await folderApi.listFolders({ parent_id: rootId })
      allFolders.push(...rootFolders.folders)
      
      // For now, we'll just return the direct children
      // In a full implementation, you might want to recursively fetch all descendants
      return rootFolders.folders
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  // Transform flat folder list into hierarchical tree structure
  const buildFolderTree = (folders: Folder[]): FolderTreeNode[] => {
    return folders.map(folder => ({
      id: folder.id,
      name: folder.name,
      path: folder.path,
      parent_id: folder.parent_id,
      children: [], // We'll load children on demand
      document_count: folder.document_count,
      created_at: folder.created_at,
      updated_at: folder.updated_at,
    })).sort((a, b) => a.name.localeCompare(b.name))
  }

  return {
    ...query,
    folders: query.data || [],
    folderTree: query.data ? buildFolderTree(query.data) : [],
  }
}