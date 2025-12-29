'use client'

import React from 'react'
import { ChevronRight, Home, AlertCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useFolderBreadcrumbs } from '../hooks'

interface FolderBreadcrumbsProps {
  folderId?: string
  onNavigate?: (folderId?: string) => void
  className?: string
}

export const FolderBreadcrumbs: React.FC<FolderBreadcrumbsProps> = ({
  folderId,
  onNavigate,
  className,
}) => {
  const { breadcrumbs, isLoading, isError, error } = useFolderBreadcrumbs({ folderId })

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
      </div>
    )
  }

  // Handle errors gracefully - show home button only
  if (isError) {
    return (
      <nav className={`flex items-center space-x-1 text-sm ${className}`}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate?.()}
          className="h-auto p-1 text-gray-600 hover:text-gray-900"
          aria-label="Home"
        >
          <Home className="w-4 h-4" />
        </Button>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <div className="flex items-center gap-1 text-gray-500">
          <AlertCircle className="w-4 h-4" />
          <span className="text-xs">Unable to load path</span>
        </div>
      </nav>
    )
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onNavigate?.()}
        className="h-auto p-1 text-gray-600 hover:text-gray-900"
        aria-label="Home"
      >
        <Home className="w-4 h-4" />
      </Button>

      {breadcrumbs.map((breadcrumb, index) => (
        <React.Fragment key={breadcrumb.id}>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate?.(breadcrumb.id)}
            className={`
              h-auto p-1 font-normal
              ${index === breadcrumbs.length - 1 
                ? 'text-gray-900 cursor-default' 
                : 'text-gray-600 hover:text-gray-900'
              }
            `}
            disabled={index === breadcrumbs.length - 1}
          >
            {breadcrumb.name}
          </Button>
        </React.Fragment>
      ))}
    </nav>
  )
}