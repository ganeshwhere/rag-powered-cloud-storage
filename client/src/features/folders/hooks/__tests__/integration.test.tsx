/**
 * Integration tests for folder hooks
 * Tests folder hooks with CRUD operations and state updates
 */

import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFolderActions } from '../useFolderActions'
import { useFolders } from '../useFolders'
import { useFolder } from '../useFolder'
import { useFolderTree } from '../useFolderTree'
import { useFolderBreadcrumbs } from '../useFolderBreadcrumbs'
import { folderApi } from '../../api'
import type { FolderCreateRequest, FolderUpdateRequest } from '@/shared/types/folder'

// Mock the folder API
jest.mock('../../api')
const mockFolderApi = folderApi as jest.Mocked<typeof folderApi>

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('Folder Hooks Integration', () => {
  const mockFolder = {
    id: 'folder123',
    name: 'Test Folder',
    parent_id: null,
    path: '/Test Folder',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    document_count: 0,
    subfolder_count: 0
  }

  const mockSubfolder = {
    id: 'subfolder456',
    name: 'Sub Folder',
    parent_id: 'folder123',
    path: '/Test Folder/Sub Folder',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    document_count: 2,
    subfolder_count: 0
  }

  const mockFolders = [mockFolder, mockSubfolder]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Folder CRUD Integration', () => {
    it('integrates folder creation with folder list updates', async () => {
      // Mock initial empty folder list
      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: [],
        total: 0,
        page: 1,
        size: 50
      } as any)

      // Mock folder creation
      mockFolderApi.createFolder.mockResolvedValue(mockFolder)

      // Mock updated folder list after creation
      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: [mockFolder],
        total: 1,
        page: 1,
        size: 50
      } as any)

      const wrapper = createWrapper()

      const { result: foldersResult } = renderHook(() => useFolders(), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      // Wait for initial folder list to load
      await waitFor(() => {
        expect(foldersResult.current.isLoading).toBe(false)
      })

      expect(foldersResult.current.folders).toHaveLength(0)

      // Create a new folder
      const createRequest: FolderCreateRequest = {
        name: 'Test Folder',
        parent_id: null
      }

      await act(async () => {
        await actionsResult.current.createFolder.mutateAsync(createRequest)
      })

      expect(mockFolderApi.createFolder).toHaveBeenCalledWith(createRequest)

      // Folder list should be updated
      await waitFor(() => {
        expect(foldersResult.current.folders).toHaveLength(1)
      })

      expect(foldersResult.current.folders?.[0]).toEqual(mockFolder)
    })

    it('integrates folder update with individual folder and list updates', async () => {
      mockFolderApi.getFolder.mockResolvedValue(mockFolder)
      mockFolderApi.updateFolder.mockResolvedValue({
        ...mockFolder,
        name: 'Updated Folder'
      })
      mockFolderApi.listFolders.mockResolvedValue({
        folders: [{ ...mockFolder, name: 'Updated Folder' }],
        total: 1,
        page: 1,
        size: 50
      } as any)

      const wrapper = createWrapper()

      const { result: folderResult } = renderHook(() => useFolder('folder123'), { wrapper })
      const { result: foldersResult } = renderHook(() => useFolders(), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      // Wait for data to load
      await waitFor(() => {
        expect(folderResult.current.isLoading).toBe(false)
        expect(foldersResult.current.isLoading).toBe(false)
      })

      expect(folderResult.current.data?.name).toBe('Test Folder')

      // Update the folder
      const updateRequest: FolderUpdateRequest = {
        name: 'Updated Folder'
      }

      await act(async () => {
        await actionsResult.current.updateFolder.mutateAsync({
          folderId: 'folder123',
          data: updateRequest
        })
      })

      expect(mockFolderApi.updateFolder).toHaveBeenCalledWith('folder123', updateRequest)

      // Both individual folder and folder list should be updated
      await waitFor(() => {
        expect(folderResult.current.data?.name).toBe('Updated Folder')
        expect(foldersResult.current.folders?.[0]?.name).toBe('Updated Folder')
      })
    })

    it('integrates folder deletion with cache cleanup', async () => {
      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: mockFolders,
        total: 2,
        page: 1,
        size: 50
      } as any)

      mockFolderApi.deleteFolder.mockResolvedValue(undefined)

      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: [mockSubfolder], // Only subfolder remains
        total: 1,
        page: 1,
        size: 50
      } as any)

      const wrapper = createWrapper()

      const { result: foldersResult } = renderHook(() => useFolders(), { wrapper })
      const { result: folderResult } = renderHook(() => useFolder('folder123'), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      await waitFor(() => {
        expect(foldersResult.current.isLoading).toBe(false)
      })

      expect(foldersResult.current.folders).toHaveLength(2)

      // Delete folder
      await act(async () => {
        await actionsResult.current.deleteFolder.mutateAsync({
          folderId: 'folder123',
          options: { delete_documents: true }
        })
      })

      expect(mockFolderApi.deleteFolder).toHaveBeenCalledWith('folder123', {
        delete_documents: true
      })

      // Folder list should be updated
      await waitFor(() => {
        expect(foldersResult.current.folders).toHaveLength(1)
      })

      // Individual folder should be removed from cache
      expect(folderResult.current.data).toBeUndefined()
    })
  })

  describe('Folder Tree Integration', () => {
    it('integrates folder tree with CRUD operations', async () => {
      const mockTreeData = [mockFolder, mockSubfolder]

      mockFolderApi.listFolders.mockResolvedValue({
        folders: mockTreeData,
        total: 2,
        page: 1,
        size: 50
      } as any)

      mockFolderApi.createFolder.mockResolvedValue({
        id: 'newfolder789',
        name: 'New Subfolder',
        parent_id: 'folder123',
        path: '/Test Folder/New Subfolder',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        document_count: 0,
        subfolder_count: 0
      })

      const updatedTreeData = [
        mockFolder,
        mockSubfolder,
        {
          id: 'newfolder789',
          name: 'New Subfolder',
          parent_id: 'folder123',
          path: '/Test Folder/New Subfolder',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          document_count: 0,
          subfolder_count: 0
        }
      ]

      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: updatedTreeData,
        total: 3,
        page: 1,
        size: 50
      } as any)

      const wrapper = createWrapper()

      const { result: treeResult } = renderHook(() => useFolderTree(), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      await waitFor(() => {
        expect(treeResult.current.isLoading).toBe(false)
      })

      expect(treeResult.current.folders).toHaveLength(2)

      // Create a new subfolder
      await act(async () => {
        await actionsResult.current.createFolder.mutateAsync({
          name: 'New Subfolder',
          parent_id: 'folder123'
        })
      })

      // Tree should be updated
      await waitFor(() => {
        expect(treeResult.current.folders).toHaveLength(3)
      })
    })

    it('integrates folder move operations with tree updates', async () => {
      const initialTree = [
        mockFolder,
        mockSubfolder,
        {
          id: 'folder2',
          name: 'Another Folder',
          parent_id: null,
          path: '/Another Folder',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          document_count: 0,
          subfolder_count: 0
        }
      ]

      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: initialTree,
        total: 3,
        page: 1,
        size: 50
      } as any)

      mockFolderApi.moveFolder.mockResolvedValue({
        ...mockSubfolder,
        parent_id: 'folder2'
      })

      const updatedTree = [
        mockFolder,
        {
          ...mockSubfolder,
          parent_id: 'folder2'
        },
        {
          id: 'folder2',
          name: 'Another Folder',
          parent_id: null,
          path: '/Another Folder',
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z',
          document_count: 0,
          subfolder_count: 1
        }
      ]

      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: updatedTree,
        total: 3,
        page: 1,
        size: 50
      } as any)

      const wrapper = createWrapper()

      const { result: treeResult } = renderHook(() => useFolderTree(), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      await waitFor(() => {
        expect(treeResult.current.isLoading).toBe(false)
      })

      expect(treeResult.current.folders).toHaveLength(3)

      // Move subfolder to another parent
      await act(async () => {
        await actionsResult.current.moveFolder.mutateAsync({
          folderId: 'subfolder456',
          newParentId: 'folder2'
        })
      })

      // Tree structure should be updated
      await waitFor(() => {
        expect(treeResult.current.folders).toHaveLength(3)
      })
    })
  })

  describe('Folder Breadcrumbs Integration', () => {
    it('integrates breadcrumbs with folder navigation and updates', async () => {
      const mockBreadcrumbs = [
        { id: 'folder123', name: 'Test Folder', parent_id: null, path: '/Test Folder' },
        { id: 'subfolder456', name: 'Sub Folder', parent_id: 'folder123', path: '/Test Folder/Sub Folder' }
      ]

      mockFolderApi.getFolderBreadcrumbs.mockResolvedValue(mockBreadcrumbs)

      mockFolderApi.updateFolder.mockResolvedValue({
        ...mockSubfolder,
        name: 'Renamed Sub Folder'
      })

      const updatedBreadcrumbs = [
        { id: 'folder123', name: 'Test Folder', parent_id: null, path: '/Test Folder' },
        { id: 'subfolder456', name: 'Renamed Sub Folder', parent_id: 'folder123', path: '/Test Folder/Renamed Sub Folder' }
      ]

      mockFolderApi.getFolderBreadcrumbs.mockResolvedValueOnce(updatedBreadcrumbs)

      const wrapper = createWrapper()

      const { result: breadcrumbsResult } = renderHook(() => 
        useFolderBreadcrumbs({ folderId: 'subfolder456' }), { wrapper }
      )
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      await waitFor(() => {
        expect(breadcrumbsResult.current.isLoading).toBe(false)
      })

      expect(breadcrumbsResult.current.breadcrumbs).toHaveLength(2)
      expect(breadcrumbsResult.current.breadcrumbs?.[1].name).toBe('Sub Folder')

      // Update the current folder name
      await act(async () => {
        await actionsResult.current.updateFolder.mutateAsync({
          folderId: 'subfolder456',
          data: { name: 'Renamed Sub Folder' }
        })
      })

      // Breadcrumbs should be updated
      await waitFor(() => {
        expect(breadcrumbsResult.current.breadcrumbs?.[1].name).toBe('Renamed Sub Folder')
      })
    })
  })

  describe('Bulk Operations Integration', () => {
    it('integrates bulk delete with multiple hook updates', async () => {
      const foldersToDelete = ['folder1', 'folder2', 'folder3']
      const remainingFolders = [
        { ...mockFolder, id: 'folder4', name: 'Remaining Folder' }
      ]

      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: [
          { ...mockFolder, id: 'folder1', name: 'Folder 1' },
          { ...mockFolder, id: 'folder2', name: 'Folder 2' },
          { ...mockFolder, id: 'folder3', name: 'Folder 3' },
          ...remainingFolders
        ],
        total: 4,
        page: 1,
        size: 50
      } as any)

      mockFolderApi.bulkDeleteFolders.mockResolvedValue({
        deleted_count: 2,
        failed_count: 1,
        failed_folders: ['folder2']
      } as any)

      mockFolderApi.listFolders.mockResolvedValueOnce({
        folders: [
          { ...mockFolder, id: 'folder2', name: 'Folder 2' }, // Failed to delete
          ...remainingFolders
        ],
        total: 2,
        page: 1,
        size: 50
      } as any)

      const wrapper = createWrapper()

      const { result: foldersResult } = renderHook(() => useFolders(), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      await waitFor(() => {
        expect(foldersResult.current.isLoading).toBe(false)
      })

      expect(foldersResult.current.folders).toHaveLength(4)

      // Perform bulk delete
      await act(async () => {
        await actionsResult.current.bulkDeleteFolders.mutateAsync({
          folderIds: foldersToDelete,
          options: { delete_documents: false }
        })
      })

      expect(mockFolderApi.bulkDeleteFolders).toHaveBeenCalledWith(
        foldersToDelete,
        { delete_documents: false }
      )

      // Folder list should be updated to show only remaining folders
      await waitFor(() => {
        expect(foldersResult.current.folders).toHaveLength(2)
      })

      const folderIds = foldersResult.current.folders?.map(f => f.id) || []
      expect(folderIds).toContain('folder2') // Failed to delete
      expect(folderIds).toContain('folder4') // Wasn't targeted for deletion
      expect(folderIds).not.toContain('folder1') // Successfully deleted
      expect(folderIds).not.toContain('folder3') // Successfully deleted
    })
  })

  describe('Error Handling Integration', () => {
    it('handles folder operation errors across multiple hooks', async () => {
      const createError = new Error('Failed to create folder')
      mockFolderApi.createFolder.mockRejectedValue(createError)

      const fetchError = new Error('Failed to fetch folders')
      mockFolderApi.listFolders.mockRejectedValue(fetchError)

      const wrapper = createWrapper()

      const { result: foldersResult } = renderHook(() => useFolders(), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      // Wait for folder list error
      await waitFor(() => {
        expect(foldersResult.current.isLoading).toBe(false)
      })

      expect(foldersResult.current.isError).toBe(true)
      expect(foldersResult.current.error).toEqual(fetchError)

      // Try to create folder - should also fail
      await act(async () => {
        try {
          await actionsResult.current.createFolder.mutateAsync({
            name: 'Test Folder',
            parent_id: null
          })
        } catch (error) {
          // Expected to throw
        }
      })

      expect(actionsResult.current.createFolder.isError).toBe(true)
      expect(actionsResult.current.createFolder.error).toEqual(createError)
    })

    it('handles partial failures in bulk operations', async () => {
      mockFolderApi.bulkDeleteFolders.mockResolvedValue({
        deleted_count: 1,
        failed_count: 2,
        failed_folders: ['folder2', 'folder3']
      } as any)

      const wrapper = createWrapper()

      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      let bulkResult: any = null
      await act(async () => {
        bulkResult = await actionsResult.current.bulkDeleteFolders.mutateAsync({
          folderIds: ['folder1', 'folder2', 'folder3']
        })
      })

      expect(bulkResult.deleted_count).toBe(1)
      expect(bulkResult.failed_folders).toEqual(['folder2', 'folder3'])
      expect(actionsResult.current.bulkDeleteFolders.isSuccess).toBe(true)
    })
  })

  describe('State Consistency Integration', () => {
    it('maintains state consistency across multiple folder hooks', async () => {
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: { retry: false, gcTime: 0 },
          mutations: { retry: false },
        },
      })

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      )

      mockFolderApi.getFolder.mockResolvedValue(mockFolder)
      mockFolderApi.listFolders.mockResolvedValue({
        folders: [mockFolder],
        total: 1,
        page: 1,
        size: 50
      } as any)
      mockFolderApi.updateFolder.mockResolvedValue({
        ...mockFolder,
        name: 'Updated Name'
      })

      const { result: folderResult } = renderHook(() => useFolder('folder123'), { wrapper })
      const { result: foldersResult } = renderHook(() => useFolders(), { wrapper })
      const { result: actionsResult } = renderHook(() => useFolderActions(), { wrapper })

      // Wait for initial data
      await waitFor(() => {
        expect(folderResult.current.isLoading).toBe(false)
        expect(foldersResult.current.isLoading).toBe(false)
      })

      // Both hooks should have consistent data
      expect(folderResult.current.data?.name).toBe('Test Folder')
      expect(foldersResult.current.folders?.[0]?.name).toBe('Test Folder')

      // Update folder
      await act(async () => {
        await actionsResult.current.updateFolder.mutateAsync({
          folderId: 'folder123',
          data: { name: 'Updated Name' }
        })
      })

      // Both hooks should reflect the update consistently
      await waitFor(() => {
        expect(folderResult.current.data?.name).toBe('Updated Name')
        expect(foldersResult.current.folders?.[0]?.name).toBe('Updated Name')
      })
    })
  })
})