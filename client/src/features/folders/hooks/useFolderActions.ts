import { useMutation, useQueryClient } from '@tanstack/react-query'
import { folderApi } from '../api'
import type { FolderCreateRequest, FolderUpdateRequest } from '@/shared/types/folder'

export const useFolderActions = () => {
  const queryClient = useQueryClient()

  const createFolder = useMutation({
    mutationFn: (data: FolderCreateRequest) => folderApi.createFolder(data),
    onSuccess: (newFolder) => {
      // Add the new folder to the cache
      queryClient.setQueryData(['folder', newFolder.id], newFolder)
      
      // Invalidate folders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
    },
  })

  const updateFolder = useMutation({
    mutationFn: ({ folderId, data }: { 
      folderId: string
      data: FolderUpdateRequest
    }) => folderApi.updateFolder(folderId, data),
    onSuccess: (updatedFolder) => {
      // Update the folder in cache
      queryClient.setQueryData(['folder', updatedFolder.id], updatedFolder)
      
      // Invalidate folders list to reflect changes
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
      queryClient.invalidateQueries({ queryKey: ['folder-breadcrumbs'] })
    },
  })

  const deleteFolder = useMutation({
    mutationFn: ({ folderId, options }: { 
      folderId: string
      options?: { delete_documents?: boolean }
    }) => folderApi.deleteFolder(folderId, options),
    onSuccess: (_, { folderId }) => {
      // Remove folder from cache
      queryClient.removeQueries({ queryKey: ['folder', folderId] })
      
      // Remove breadcrumbs queries that include this folder
      queryClient.removeQueries({ queryKey: ['folder-breadcrumbs', folderId] })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
      queryClient.invalidateQueries({ queryKey: ['folder-breadcrumbs'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const moveFolder = useMutation({
    mutationFn: ({ folderId, newParentId }: { 
      folderId: string
      newParentId?: string
    }) => folderApi.moveFolder(folderId, newParentId),
    onSuccess: (movedFolder) => {
      // Update the folder in cache
      queryClient.setQueryData(['folder', movedFolder.id], movedFolder)
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
      queryClient.invalidateQueries({ queryKey: ['folder-breadcrumbs'] })
    },
  })

  const bulkDeleteFolders = useMutation({
    mutationFn: ({ folderIds, options }: { 
      folderIds: string[]
      options?: { delete_documents?: boolean }
    }) => folderApi.bulkDeleteFolders(folderIds, options),
    onSuccess: (result, { folderIds }) => {
      // Remove successfully deleted folders from cache
      const successfullyDeleted = folderIds.filter(
        id => !result.failed_folders.includes(id)
      )
      
      successfullyDeleted.forEach(folderId => {
        queryClient.removeQueries({ queryKey: ['folder', folderId] })
      })
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['folders'] })
      queryClient.invalidateQueries({ queryKey: ['folder-tree'] })
      queryClient.invalidateQueries({ queryKey: ['folder-breadcrumbs'] })
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  return {
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    bulkDeleteFolders,
  }
}