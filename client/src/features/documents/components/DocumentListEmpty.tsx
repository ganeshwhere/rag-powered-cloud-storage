'use client'

import React from 'react'
import { FileText, Upload } from 'lucide-react'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'

interface DocumentListEmptyProps {
  folderId?: string
  className?: string
  onUploadClick?: () => void
}

export const DocumentListEmpty: React.FC<DocumentListEmptyProps> = ({
  folderId,
  className,
  onUploadClick,
}) => {
  return (
    <Card className={className}>
      <CardContent className="p-12">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {folderId ? 'No documents in this folder' : 'No documents yet'}
          </h3>
          
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {folderId 
              ? 'This folder is empty. Upload some documents to get started.'
              : 'Get started by uploading your first document. Supported formats include PDF, Word, text files, and more.'
            }
          </p>
          
          <Button onClick={onUploadClick} className="inline-flex items-center">
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}