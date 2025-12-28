'use client'

import React, { useCallback } from 'react'
import { useDocumentUpload, useDocuments } from '../hooks'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Progress } from '@/shared/components/ui/progress'

/**
 * Example component demonstrating the document upload hooks and API integration
 * This shows how to use both direct upload and presigned URL upload methods
 */
export const DocumentUploadExample: React.FC = () => {
  // Use the document upload hook with presigned URL support
  const {
    uploadFile,
    uploadFiles,
    uploadingFiles,
    removeFile,
    clearCompleted,
    isUploading,
    error,
  } = useDocumentUpload({
    usePresignedUrl: true, // Enable presigned URL uploads
    onUploadComplete: (documentId, file) => {
      console.log(`Upload completed for ${file.name}, document ID: ${documentId}`)
    },
    onUploadError: (error, file) => {
      console.error(`Upload failed for ${file.name}:`, error.message)
    },
    onUploadProgress: (progress) => {
      console.log(`Upload progress for ${progress.fileId}: ${progress.progress}%`)
    },
  })

  // Use the documents list hook to show uploaded documents
  const { documents, isLoading, error: documentsError } = useDocuments({
    page: 1,
    page_size: 10,
  })

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    if (files.length > 0) {
      uploadFiles(files)
    }
  }, [uploadFiles])

  const handleSingleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadFile(file)
    }
  }, [uploadFile])

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Upload Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Single file upload */}
          <div>
            <label htmlFor="single-file" className="block text-sm font-medium mb-2">
              Upload Single File (Presigned URL)
            </label>
            <input
              id="single-file"
              type="file"
              onChange={handleSingleFileUpload}
              accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.md"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Multiple file upload */}
          <div>
            <label htmlFor="multiple-files" className="block text-sm font-medium mb-2">
              Upload Multiple Files
            </label>
            <input
              id="multiple-files"
              type="file"
              multiple
              onChange={handleFileSelect}
              accept=".pdf,.docx,.doc,.txt,.csv,.xlsx,.xls,.md"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* Upload status */}
          {error && (
            <div className="text-red-600 text-sm">
              Upload Error: {error.message}
            </div>
          )}

          {/* Clear completed uploads */}
          {uploadingFiles.length > 0 && (
            <div className="flex gap-2">
              <Button onClick={clearCompleted} variant="outline" size="sm">
                Clear Completed
              </Button>
              <span className="text-sm text-gray-500">
                {uploadingFiles.length} file(s) in queue
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {uploadingFiles.map((file) => (
                <div key={file.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium truncate">
                      {file.file.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {file.status}
                      </span>
                      <Button
                        onClick={() => removeFile(file.id)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                  <Progress value={file.progress} className="h-2" />
                  {file.error && (
                    <div className="text-red-600 text-xs">
                      Error: {file.error}
                    </div>
                  )}
                  {file.documentId && (
                    <div className="text-green-600 text-xs">
                      Document ID: {file.documentId}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div>Loading documents...</div>
          ) : documentsError ? (
            <div className="text-red-600">
              Error loading documents: {documentsError.message}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-gray-500">No documents uploaded yet.</div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{doc.name}</div>
                    <div className="text-sm text-gray-500">
                      {doc.file_type} • {(doc.file_size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                    <div className="text-xs text-gray-400">
                      Status: {doc.status} • Created: {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      {doc.chunk_count} chunks
                    </div>
                    <div className="text-xs text-gray-500">
                      {doc.total_tokens} tokens
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DocumentUploadExample