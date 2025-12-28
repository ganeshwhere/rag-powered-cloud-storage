import { useMutation, useQueryClient } from '@tanstack/react-query'
import { documentApi } from '../api'

export const useDocumentActions = () => {
  const queryClient = useQueryClient()

  const updateDocument = useMutation({
    mutationFn: ({ documentId, data }: { 
      documentId: string
      data: { name?: string; folder_id?: string | null }
    }) => documentApi.updateDocument(documentId, data),
    onSuccess: (updatedDocument) => {
      // Update the document in cache
      queryClient.setQueryData(['document', updatedDocument.id], updatedDocument)
      
      // Invalidate documents list to reflect changes
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const deleteDocument = useMutation({
    mutationFn: (documentId: string) => documentApi.deleteDocument(documentId),
    onSuccess: (_, documentId) => {
      // Remove document from cache
      queryClient.removeQueries({ queryKey: ['document', documentId] })
      queryClient.removeQueries({ queryKey: ['document-status', documentId] })
      
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const bulkDeleteDocuments = useMutation({
    mutationFn: (documentIds: string[]) => documentApi.bulkDeleteDocuments(documentIds),
    onSuccess: (result, documentIds) => {
      // Remove successfully deleted documents from cache
      const successfullyDeleted = documentIds.filter(
        id => !result.failed_documents.includes(id)
      )
      
      successfullyDeleted.forEach(documentId => {
        queryClient.removeQueries({ queryKey: ['document', documentId] })
        queryClient.removeQueries({ queryKey: ['document-status', documentId] })
      })
      
      // Invalidate documents list
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })

  const getDownloadUrl = useMutation({
    mutationFn: (documentId: string) => documentApi.getDownloadUrl(documentId),
    onSuccess: (data) => {
      // Automatically trigger download
      const link = document.createElement('a')
      link.href = data.download_url
      link.download = data.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
  })

  return {
    updateDocument,
    deleteDocument,
    bulkDeleteDocuments,
    getDownloadUrl,
  }
}