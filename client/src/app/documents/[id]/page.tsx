'use client'

import React from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Download, ExternalLink, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { ProtectedRoute } from '@/shared/components/ProtectedRoute'
import { useDocument, useDocumentView } from '@/features/documents/hooks/useDocumentView'

export default function DocumentViewPage() {
  const params = useParams()
  const router = useRouter()
  const documentId = params.id as string

  const { document, loading, error } = useDocument(documentId)
  const { 
    openDocument, 
    downloadDocument, 
    loading: actionLoading, 
    error: actionError 
  } = useDocumentView()

  const handleView = () => openDocument(documentId)
  const handleDownload = () => downloadDocument(documentId)

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading document...</span>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !document) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </div>
            
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h1 className="text-2xl font-semibold mb-2">Document Not Found</h1>
              <p className="text-muted-foreground mb-4">
                {error || 'The requested document could not be found.'}
              </p>
              <Button onClick={() => router.push('/documents')}>
                Go to Documents
              </Button>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{document.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Size: {(document.file_size / 1024 / 1024).toFixed(2)} MB</span>
                  <span>Type: {document.file_type.toUpperCase()}</span>
                  <span>Uploaded: {new Date(document.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleView}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  View
                </Button>
                
                <Button
                  onClick={handleDownload}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Download
                </Button>
              </div>
            </div>

            {actionError && (
              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">{actionError}</p>
              </div>
            )}
          </div>

          {/* Document Info */}
          <div className="grid gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Document Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Filename</label>
                  <p className="text-sm">{document.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Original Name</label>
                  <p className="text-sm">{document.original_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">File Type</label>
                  <p className="text-sm">{document.file_type.toUpperCase()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">File Size</label>
                  <p className="text-sm">{(document.file_size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Processing Status</label>
                  <p className="text-sm capitalize">{document.status}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{new Date(document.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{new Date(document.updated_at).toLocaleString()}</p>
                </div>
              </div>
            </Card>

            {/* Document Preview/Actions */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Document Actions</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">View Document</p>
                      <p className="text-sm text-muted-foreground">
                        Open the document in a new tab for viewing
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleView}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Open
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Download className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Download Document</p>
                      <p className="text-sm text-muted-foreground">
                        Download the original document to your device
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleDownload}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}