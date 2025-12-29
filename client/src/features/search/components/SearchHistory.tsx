'use client'

import React from 'react'
import { Clock, Search, Loader2 } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { SearchHistoryItem } from '../types'

interface SearchHistoryProps {
  history: SearchHistoryItem[]
  onItemClick: (query: string) => void
  isLoading?: boolean
  compact?: boolean
  className?: string
}

interface SearchHistoryItemCardProps {
  item: SearchHistoryItem
  onItemClick: (query: string) => void
  compact?: boolean
}

function SearchHistoryItemCard({ item, onItemClick, compact }: SearchHistoryItemCardProps) {
  const handleClick = () => {
    onItemClick(item.query)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (compact) {
    return (
      <Button
        variant="ghost"
        onClick={handleClick}
        className="w-full justify-start p-2 h-auto text-left"
      >
        <div className="flex items-center gap-3 w-full">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{item.query}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{item.results_count} results</span>
              <span>•</span>
              <span>{formatDate(item.created_at)}</span>
            </div>
          </div>
        </div>
      </Button>
    )
  }

  return (
    <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate">{item.query}</span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>{item.results_count} results</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(item.created_at)}</span>
            </div>
          </div>
        </div>
        
        <Button variant="ghost" size="sm">
          Search Again
        </Button>
      </div>
    </Card>
  )
}

export function SearchHistory({ 
  history, 
  onItemClick, 
  isLoading, 
  compact = false,
  className 
}: SearchHistoryProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading search history...</span>
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Search History</h3>
        <p className="text-muted-foreground">
          Your recent searches will appear here to help you find information faster.
        </p>
      </Card>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {history.map((item) => (
        <SearchHistoryItemCard
          key={item.id}
          item={item}
          onItemClick={onItemClick}
          compact={compact}
        />
      ))}
    </div>
  )
}