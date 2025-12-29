'use client'

import React from 'react'
import { Trash2, CheckSquare, Square } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

interface DocumentListHeaderProps {
  totalDocuments: number
  selectedCount: number
  onSelectAll: (selected: boolean) => void
  onBulkDelete: () => void
  showBulkActions: boolean
  isDeleting: boolean
}

export const DocumentListHeader: React.FC<DocumentListHeaderProps> = ({
  totalDocuments,
  selectedCount,
  onSelectAll,
  onBulkDelete,
  showBulkActions,
  isDeleting,
}) => {
  const allSelected = selectedCount === totalDocuments && totalDocuments > 0
  const someSelected = selectedCount > 0 && selectedCount < totalDocuments

  return (
    <div className="flex items-center justify-between py-3 border-b">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSelectAll(!allSelected)}
            className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4" />
            ) : someSelected ? (
              <div className="w-4 h-4 border-2 border-blue-500 bg-blue-500 rounded-sm flex items-center justify-center">
                <div className="w-2 h-0.5 bg-white" />
              </div>
            ) : (
              <Square className="w-4 h-4" />
            )}
            <span>
              {selectedCount > 0 ? `${selectedCount} selected` : 'Select all'}
            </span>
          </button>
        </div>
        
        <div className="text-sm text-gray-500">
          {totalDocuments} document{totalDocuments !== 1 ? 's' : ''}
        </div>
      </div>

      {showBulkActions && (
        <div className="flex items-center space-x-2">
          <Button
            onClick={onBulkDelete}
            variant="destructive"
            size="sm"
            disabled={isDeleting}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {isDeleting ? 'Deleting...' : `Delete ${selectedCount}`}
          </Button>
        </div>
      )}
    </div>
  )
}