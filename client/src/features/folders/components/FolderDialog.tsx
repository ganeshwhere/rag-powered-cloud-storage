'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { useFolderActions } from '../hooks/useFolderActions'
import { validateFolderName } from '../types'
import type { Folder } from '@/shared/types/folder'
import type { FolderOperation } from '../types'

interface FolderDialogProps {
  isOpen: boolean
  operation: FolderOperation
  folder?: Folder
  parentId?: string
  onClose: () => void
  onSuccess?: (folder: Folder) => void
}

export const FolderDialog: React.FC<FolderDialogProps> = ({
  isOpen,
  operation,
  folder,
  parentId,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [deleteDocuments, setDeleteDocuments] = useState(false)

  const { createFolder, updateFolder, deleteFolder } = useFolderActions()

  useEffect(() => {
    if (isOpen) {
      if (operation === 'rename' && folder) {
        setName(folder.name)
      } else {
        setName('')
      }
      setErrors([])
      setDeleteDocuments(false)
    }
  }, [isOpen, operation, folder])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (operation === 'delete' && folder) {
      try {
        await deleteFolder.mutateAsync({ 
          folderId: folder.id, 
          options: { delete_documents: deleteDocuments }
        })
        onSuccess?.(folder)
        onClose()
      } catch (error: any) {
        console.error('Failed to delete folder:', error)
        // Show user-friendly error message
        const errorMessage = error.message || 'Failed to delete folder'
        if (errorMessage.includes('not found')) {
          setErrors(['Folder not found. It may have already been deleted.'])
        } else if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
          setErrors(['Unable to connect to server. Please check your connection and try again.'])
        } else {
          setErrors([errorMessage])
        }
      }
      return
    }

    // Validate folder name for create/rename operations
    const validation = validateFolderName(name)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    try {
      let result: Folder

      if (operation === 'create') {
        result = await createFolder.mutateAsync({
          name: name.trim(),
          parent_id: parentId,
        })
      } else if (operation === 'rename' && folder) {
        result = await updateFolder.mutateAsync({
          folderId: folder.id,
          data: { name: name.trim() },
        })
      } else {
        return
      }

      onSuccess?.(result)
      onClose()
    } catch (error: any) {
      const errorMessage = error.message || 'An error occurred'
      if (errorMessage.includes('Network Error') || errorMessage.includes('fetch')) {
        setErrors(['Unable to connect to server. Please check your connection and try again.'])
      } else {
        setErrors([errorMessage])
      }
    }
  }

  const getDialogTitle = () => {
    switch (operation) {
      case 'create':
        return 'Create New Folder'
      case 'rename':
        return 'Rename Folder'
      case 'delete':
        return 'Delete Folder'
      default:
        return 'Folder Operation'
    }
  }

  const getDialogDescription = () => {
    switch (operation) {
      case 'create':
        return 'Enter a name for the new folder.'
      case 'rename':
        return 'Enter a new name for the folder.'
      case 'delete':
        return `Are you sure you want to delete "${folder?.name}"? This action cannot be undone.`
      default:
        return ''
    }
  }

  const isLoading = createFolder.isPending || updateFolder.isPending || deleteFolder.isPending

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {(operation === 'create' || operation === 'rename') && (
              <div className="space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Folder name"
                  autoFocus
                  disabled={isLoading}
                />
                {errors.length > 0 && (
                  <div className="space-y-1">
                    {errors.map((error, index) => (
                      <p key={index} className="text-sm text-red-600">
                        {error}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {operation === 'delete' && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    This will permanently delete the folder and all its subfolders.
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="delete-documents"
                    checked={deleteDocuments}
                    onChange={(e) => setDeleteDocuments(e.target.checked)}
                    className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <label htmlFor="delete-documents" className="text-sm text-gray-700">
                    Also delete all documents in this folder
                  </label>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={operation === 'delete' ? 'destructive' : 'default'}
              disabled={isLoading || (operation !== 'delete' && !name.trim())}
            >
              {isLoading ? 'Processing...' : (
                operation === 'create' ? 'Create' :
                operation === 'rename' ? 'Rename' :
                operation === 'delete' ? 'Delete' : 'Submit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}