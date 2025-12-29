'use client'

import React from 'react'
import { Search, Loader2, Lightbulb } from 'lucide-react'
import { Card } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'

interface SearchSuggestionsProps {
  suggestions: string[]
  onSuggestionClick: (suggestion: string) => void
  isLoading?: boolean
  compact?: boolean
  className?: string
}

interface SuggestionItemProps {
  suggestion: string
  onSuggestionClick: (suggestion: string) => void
  compact?: boolean
}

function SuggestionItem({ suggestion, onSuggestionClick, compact }: SuggestionItemProps) {
  const handleClick = () => {
    onSuggestionClick(suggestion)
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
          <span className="text-sm truncate">{suggestion}</span>
        </div>
      </Button>
    )
  }

  return (
    <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
      <div className="flex items-center gap-3">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <span className="text-sm flex-1">{suggestion}</span>
        <Button variant="ghost" size="sm">
          Search
        </Button>
      </div>
    </Card>
  )
}

export function SearchSuggestions({ 
  suggestions, 
  onSuggestionClick, 
  isLoading, 
  compact = false,
  className 
}: SearchSuggestionsProps) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Getting suggestions...</span>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {!compact && (
        <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          Search Suggestions
        </div>
      )}
      
      {suggestions.map((suggestion, index) => (
        <SuggestionItem
          key={index}
          suggestion={suggestion}
          onSuggestionClick={onSuggestionClick}
          compact={compact}
        />
      ))}
    </div>
  )
}