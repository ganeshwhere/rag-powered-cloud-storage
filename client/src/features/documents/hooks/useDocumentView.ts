/**
 * Hook for document viewing operations
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { documentViewService } from '../services/documentViewService'
import type { Document } from '@/shared/types/document'

export function useDocumentView() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openDocument = useCallback(async (documentId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await documentViewService.openDocument(documentId)
    } catch (err: any) {
      setError(err.message || 'Failed to open document')
    } finally {
      setLoading(false)
    }
  }, [])

  const downloadDocument = useCallback(async (documentId: string) => {
    setLoading(true)
    setError(null)
    
    try {
      await documentViewService.downloadDocument(documentId)
    } catch (err: any) {
      setError(err.message || 'Failed to download document')
    } finally {
      setLoading(false)
    }
  }, [])

  const navigateToDocument = useCallback((documentId: string) => {
    documentViewService.navigateToDocument(documentId, router)
  }, [router])

  const preloadDocument = useCallback(async (documentId: string) => {
    try {
      await documentViewService.preloadDocument(documentId)
    } catch (error) {
      // Silently fail for preloading
      console.warn('Failed to preload document:', error)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    openDocument,
    downloadDocument,
    navigateToDocument,
    preloadDocument,
    loading,
    error,
    clearError
  }
}

/**
 * Hook for getting document data with caching
 */
export function useDocument(documentId: string) {
  const router = useRouter()
  const [document, setDocument] = useState<Document | null>(
    documentViewService.getCachedDocument(documentId)
  )
  const [loading, setLoading] = useState(!documentViewService.isDocumentCached(documentId))
  const [error, setError] = useState<string | null>(null)

  const loadDocument = useCallback(async () => {
    if (!documentId) return

    setLoading(true)
    setError(null)
    
    try {
      const doc = await documentViewService.getDocument(documentId)
      setDocument(doc)
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load document'
      setError(errorMessage)
      
      // If document not found (404), redirect to documents list after a short delay
      if (errorMessage.includes('not found') || errorMessage.includes('deleted')) {
        setTimeout(() => {
          router.push('/documents')
        }, 2000) // 2 second delay to show the error message
      }
    } finally {
      setLoading(false)
    }
  }, [documentId, router])

  // Load document on mount if not cached
  useState(() => {
    if (documentId && !documentViewService.isDocumentCached(documentId)) {
      loadDocument()
    }
  })

  const refetch = useCallback(() => {
    documentViewService.clearDocumentCache(documentId)
    loadDocument()
  }, [documentId, loadDocument])

  return {
    document,
    loading,
    error,
    refetch
  }
}