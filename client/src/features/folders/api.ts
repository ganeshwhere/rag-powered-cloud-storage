import { api, handleApiError } from '@/shared/lib/api'
import type {
  Folder,
  FolderCreateRequest,
  FolderUpdateRequest,
  FolderListResponse,
} from '@/shared/types/folder'

// Folder API functions
export const folderApi = {
  // Create a new folder
  async createFolder(data: FolderCreateRequest): Promise<Folder> {
    try {
      const response = await api.post<Folder>('/folders', data)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // List user folders
  async listFolders(params?: {
    parent_id?: string
    include_documents?: boolean
    page?: number
    page_size?: number
  }): Promise<FolderListResponse> {
    try {
      const response = await api.get<FolderListResponse>('/folders', { params })
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Get folder details
  async getFolder(folderId: string): Promise<Folder> {
    try {
      const response = await api.get<Folder>(`/folders/${folderId}`)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Update folder
  async updateFolder(folderId: string, data: FolderUpdateRequest): Promise<Folder> {
    try {
      const response = await api.patch<Folder>(`/folders/${folderId}`, data)
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Delete folder
  async deleteFolder(folderId: string, options?: {
    delete_documents?: boolean
  }): Promise<void> {
    try {
      await api.delete(`/folders/${folderId}`, {
        params: options,
      })
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Move folder to a new parent
  async moveFolder(folderId: string, newParentId?: string): Promise<Folder> {
    try {
      const response = await api.patch<Folder>(`/folders/${folderId}/move`, {
        parent_id: newParentId,
      })
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Get folder tree (hierarchical structure)
  async getFolderTree(rootId?: string): Promise<Folder[]> {
    try {
      // Use the list folders endpoint instead of a non-existent tree endpoint
      const params: Record<string, any> = {}
      if (rootId) {
        params.parent_id = rootId
      }
      
      const response = await api.get<FolderListResponse>('/folders', {
        params,
      })
      return response.data.folders
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Get folder breadcrumbs (path from root to folder)
  async getFolderBreadcrumbs(folderId: string): Promise<Folder[]> {
    try {
      // Since there's no breadcrumbs endpoint, we'll build it by getting the folder
      // and traversing up the hierarchy
      const breadcrumbs: Folder[] = []
      let currentFolderId: string | undefined = folderId
      
      while (currentFolderId) {
        const folder = await this.getFolder(currentFolderId)
        breadcrumbs.unshift(folder) // Add to beginning to maintain order
        currentFolderId = folder.parent_id
      }
      
      return breadcrumbs
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },

  // Bulk delete folders
  async bulkDeleteFolders(folderIds: string[], options?: {
    delete_documents?: boolean
  }): Promise<{
    deleted_count: number
    failed_count: number
    failed_folders: string[]
  }> {
    try {
      const response = await api.delete<{
        deleted_count: number
        failed_count: number
        failed_folders: string[]
      }>('/folders/bulk', {
        data: { 
          folder_ids: folderIds,
          ...options,
        }
      })
      return response.data
    } catch (error: any) {
      throw new Error(handleApiError(error))
    }
  },
}

export default folderApi