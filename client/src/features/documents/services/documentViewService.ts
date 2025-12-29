/**
 * Document View Service - Centralized document viewing and access logic
 */

import { documentApi } from '../api'
import type { Document } from '@/shared/types/document'

export class DocumentViewService {
  private static instance: DocumentViewService
  private documentCache = new Map<string, Document>()
  private downloadUrlCache = new Map<string, { url: string; expires: number }>()

  static getInstance(): DocumentViewService {
    if (!DocumentViewService.instance) {
      DocumentViewService.instance = new DocumentViewService()
    }
    return DocumentViewService.instance
  }

  /**
   * Get document details with caching
   */
  async getDocument(documentId: string): Promise<Document> {
    // Check cache first
    if (this.documentCache.has(documentId)) {
      return this.documentCache.get(documentId)!
    }

    // Fetch from API
    const document = await documentApi.getDocument(documentId)
    
    // Cache the result
    this.documentCache.set(documentId, document)
    
    return document
  }

  /**
   * Get download URL with caching and expiration handling
   */
  async getDownloadUrl(documentId: string): Promise<string> {
    const now = Date.now()
    
    // Check if we have a valid cached URL
    const cached = this.downloadUrlCache.get(documentId)
    if (cached && cached.expires > now) {
      return cached.url
    }

    // Fetch new download URL
    const downloadData = await documentApi.getDownloadUrl(documentId)
    
    // Cache with expiration (subtract 5 minutes for safety)
    const expiresAt = now + (downloadData.expires_in * 1000) - (5 * 60 * 1000)
    this.downloadUrlCache.set(documentId, {
      url: downloadData.download_url,
      expires: expiresAt
    })
    
    return downloadData.download_url
  }

  /**
   * Open document in new tab
   */
  async openDocument(documentId: string): Promise<void> {
    try {
      const downloadUrl = await this.getDownloadUrl(documentId)
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error('Failed to open document:', error)
      throw new Error('Failed to open document. Please try again.')
    }
  }

  /**
   * Download document to user's device
   */
  async downloadDocument(documentId: string): Promise<void> {
    try {
      const doc = await this.getDocument(documentId)
      const downloadUrl = await this.getDownloadUrl(documentId)
      
      // Create temporary link for download
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = doc.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Failed to download document:', error)
      throw new Error('Failed to download document. Please try again.')
    }
  }

  /**
   * Navigate to document view page
   */
  navigateToDocument(documentId: string, router: any): void {
    router.push(`/documents/${documentId}`)
  }

  /**
   * Clear cache for a specific document
   */
  clearDocumentCache(documentId: string): void {
    this.documentCache.delete(documentId)
    this.downloadUrlCache.delete(documentId)
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.documentCache.clear()
    this.downloadUrlCache.clear()
  }

  /**
   * Preload document data for faster access
   */
  async preloadDocument(documentId: string): Promise<void> {
    try {
      await Promise.all([
        this.getDocument(documentId),
        this.getDownloadUrl(documentId)
      ])
    } catch (error) {
      console.warn('Failed to preload document:', error)
    }
  }

  /**
   * Get cached document if available
   */
  getCachedDocument(documentId: string): Document | null {
    return this.documentCache.get(documentId) || null
  }

  /**
   * Check if document is cached
   */
  isDocumentCached(documentId: string): boolean {
    return this.documentCache.has(documentId)
  }
}

// Export singleton instance
export const documentViewService = DocumentViewService.getInstance()