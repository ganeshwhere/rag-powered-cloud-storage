/**
 * Unit tests for document API functions
 */

import { documentApi } from '../api'
import { api } from '@/shared/lib/api'

// Mock the shared API
jest.mock('@/shared/lib/api')
const mockApi = api as jest.Mocked<typeof api>

describe('documentApi', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('deleteDocument', () => {
    it('should succeed when document is deleted successfully', async () => {
      mockApi.delete.mockResolvedValue({} as any)

      await expect(documentApi.deleteDocument('doc123')).resolves.toBeUndefined()
      expect(mockApi.delete).toHaveBeenCalledWith('/documents/doc123')
    })

    it('should succeed when document is already deleted (404)', async () => {
      const notFoundError = new Error('Document not found')
      ;(notFoundError as any).response = { status: 404 }
      mockApi.delete.mockRejectedValue(notFoundError)

      // Should not throw error - 404 is treated as success
      await expect(documentApi.deleteDocument('doc123')).resolves.toBeUndefined()
      expect(mockApi.delete).toHaveBeenCalledWith('/documents/doc123')
    })

    it('should succeed when document not found message is returned', async () => {
      const notFoundError = new Error('Document not found or access denied')
      mockApi.delete.mockRejectedValue(notFoundError)

      // Should not throw error - "not found" message is treated as success
      await expect(documentApi.deleteDocument('doc123')).resolves.toBeUndefined()
      expect(mockApi.delete).toHaveBeenCalledWith('/documents/doc123')
    })

    it('should throw error for other types of errors', async () => {
      const serverError = new Error('Internal server error')
      ;(serverError as any).response = { status: 500 }
      mockApi.delete.mockRejectedValue(serverError)

      await expect(documentApi.deleteDocument('doc123')).rejects.toThrow()
      expect(mockApi.delete).toHaveBeenCalledWith('/documents/doc123')
    })
  })
})