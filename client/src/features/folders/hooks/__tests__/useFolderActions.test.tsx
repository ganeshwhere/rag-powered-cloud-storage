import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFolderActions } from '../useFolderActions'
import { folderApi } from '../../api'
import type { FolderCreateRequest, FolderUpdateRequest } from '@/shared/types/folder'

// Mock the folder API
jest.mock('../../api')
const mockFolderApi = folderApi as jest.Mocked<typeof folderApi>

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

describe('useFolderActions', () => {
  const mockFolder = {
    id: 'folder123',
    name: 'Test Folder',
    user_id: 'user123',
    parent_id: undefined,
    path: '/Test Folder',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    document_count: 0,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('creates a folder successfully', async () => {
    mockFolderApi.createFolder.mockResolvedValue(mockFolder)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    const createRequest: FolderCreateRequest = {
      name: 'Test Folder',
      parent_id: undefined
    }

    await act(async () => {
      await result.current.createFolder.mutateAsync(createRequest)
    })

    await waitFor(() => {
      expect(result.current.createFolder.isSuccess).toBe(true)
    })

    expect(mockFolderApi.createFolder).toHaveBeenCalledWith(createRequest)
    expect(result.current.createFolder.data).toEqual(mockFolder)
  })

  it('updates a folder successfully', async () => {
    const updatedFolder = { ...mockFolder, name: 'Updated Folder' }
    mockFolderApi.updateFolder.mockResolvedValue(updatedFolder)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    const updateRequest: FolderUpdateRequest = {
      name: 'Updated Folder'
    }

    await act(async () => {
      await result.current.updateFolder.mutateAsync({
        folderId: 'folder123',
        data: updateRequest
      })
    })

    await waitFor(() => {
      expect(result.current.updateFolder.isSuccess).toBe(true)
    })

    expect(mockFolderApi.updateFolder).toHaveBeenCalledWith('folder123', updateRequest)
    expect(result.current.updateFolder.data).toEqual(updatedFolder)
  })

  it('deletes a folder successfully', async () => {
    mockFolderApi.deleteFolder.mockResolvedValue(undefined)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.deleteFolder.mutateAsync({
        folderId: 'folder123',
        options: { delete_documents: true }
      })
    })

    await waitFor(() => {
      expect(result.current.deleteFolder.isSuccess).toBe(true)
    })

    expect(mockFolderApi.deleteFolder).toHaveBeenCalledWith('folder123', {
      delete_documents: true
    })
  })

  it('moves a folder successfully', async () => {
    const movedFolder = { ...mockFolder, parent_id: 'parent123', path: '/parent/Test Folder' }
    mockFolderApi.moveFolder.mockResolvedValue(movedFolder)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.moveFolder.mutateAsync({
        folderId: 'folder123',
        newParentId: 'parent123'
      })
    })

    await waitFor(() => {
      expect(result.current.moveFolder.isSuccess).toBe(true)
    })

    expect(mockFolderApi.moveFolder).toHaveBeenCalledWith('folder123', 'parent123')
    expect(result.current.moveFolder.data).toEqual(movedFolder)
  })

  it('bulk deletes folders successfully', async () => {
    const bulkDeleteResult = {
      deleted_count: 2,
      failed_count: 1,
      failed_folders: ['folder3']
    }
    mockFolderApi.bulkDeleteFolders.mockResolvedValue(bulkDeleteResult)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      await result.current.bulkDeleteFolders.mutateAsync({
        folderIds: ['folder1', 'folder2', 'folder3'],
        options: { delete_documents: false }
      })
    })

    await waitFor(() => {
      expect(result.current.bulkDeleteFolders.isSuccess).toBe(true)
    })

    expect(mockFolderApi.bulkDeleteFolders).toHaveBeenCalledWith(
      ['folder1', 'folder2', 'folder3'],
      { delete_documents: false }
    )
    expect(result.current.bulkDeleteFolders.data).toEqual(bulkDeleteResult)
  })

  it('handles create folder error', async () => {
    const error = new Error('Failed to create folder')
    mockFolderApi.createFolder.mockRejectedValue(error)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.createFolder.mutateAsync({
          name: 'Test Folder',
          parent_id: undefined
        })
      } catch (e) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.createFolder.isError).toBe(true)
    })

    expect(result.current.createFolder.error).toEqual(error)
  })

  it('handles update folder error', async () => {
    const error = new Error('Failed to update folder')
    mockFolderApi.updateFolder.mockRejectedValue(error)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.updateFolder.mutateAsync({
          folderId: 'folder123',
          data: { name: 'Updated Name' }
        })
      } catch (e) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.updateFolder.isError).toBe(true)
    })

    expect(result.current.updateFolder.error).toEqual(error)
  })

  it('handles delete folder error', async () => {
    const error = new Error('Failed to delete folder')
    mockFolderApi.deleteFolder.mockRejectedValue(error)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.deleteFolder.mutateAsync({
          folderId: 'folder123'
        })
      } catch (e) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.deleteFolder.isError).toBe(true)
    })

    expect(result.current.deleteFolder.error).toEqual(error)
  })

  it('handles move folder error', async () => {
    const error = new Error('Failed to move folder')
    mockFolderApi.moveFolder.mockRejectedValue(error)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    await act(async () => {
      try {
        await result.current.moveFolder.mutateAsync({
          folderId: 'folder123',
          newParentId: 'parent123'
        })
      } catch (e) {
        // Expected to throw
      }
    })

    await waitFor(() => {
      expect(result.current.moveFolder.isError).toBe(true)
    })

    expect(result.current.moveFolder.error).toEqual(error)
  })

  it('tracks loading states correctly', async () => {
    let resolveCreate: (value: any) => void
    const createPromise = new Promise<typeof mockFolder>(resolve => {
      resolveCreate = resolve
    })
    mockFolderApi.createFolder.mockReturnValue(createPromise)

    const { result } = renderHook(() => useFolderActions(), {
      wrapper: createWrapper(),
    })

    // Start create operation
    act(() => {
      result.current.createFolder.mutate({
        name: 'Test Folder',
        parent_id: undefined
      })
    })

    await waitFor(() => {
      expect(result.current.createFolder.isPending).toBe(true)
    })

    // Resolve operation
    await act(async () => {
      resolveCreate!(mockFolder)
      await createPromise
    })

    await waitFor(() => {
      expect(result.current.createFolder.isPending).toBe(false)
      expect(result.current.createFolder.isSuccess).toBe(true)
    })
  })

  it('invalidates cache after successful operations', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')
    const setQueryDataSpy = jest.spyOn(queryClient, 'setQueryData')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    mockFolderApi.createFolder.mockResolvedValue(mockFolder)

    const { result } = renderHook(() => useFolderActions(), { wrapper })

    await act(async () => {
      await result.current.createFolder.mutateAsync({
        name: 'Test Folder',
        parent_id: undefined
      })
    })

    // Should set the new folder in cache
    expect(setQueryDataSpy).toHaveBeenCalledWith(['folder', 'folder123'], mockFolder)

    // Should invalidate related queries
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['folders'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['folder-tree'] })
  })

  it('removes folder from cache after successful deletion', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const removeQueriesSpy = jest.spyOn(queryClient, 'removeQueries')
    const invalidateQueriesSpy = jest.spyOn(queryClient, 'invalidateQueries')

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )

    mockFolderApi.deleteFolder.mockResolvedValue(undefined)

    const { result } = renderHook(() => useFolderActions(), { wrapper })

    await act(async () => {
      await result.current.deleteFolder.mutateAsync({
        folderId: 'folder123'
      })
    })

    // Should remove folder from cache
    expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ['folder', 'folder123'] })

    // Should invalidate related queries
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['folders'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['folder-tree'] })
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({ queryKey: ['documents'] })
  })
})