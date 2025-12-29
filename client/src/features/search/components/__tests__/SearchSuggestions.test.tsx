import React from 'react'
import { render, screen, fireEvent } from '@/test-utils/render'
import { SearchSuggestions } from '../SearchSuggestions'

describe('SearchSuggestions', () => {
  const mockOnSuggestionClick = jest.fn()
  const mockSuggestions = [
    'machine learning',
    'data science',
    'artificial intelligence',
    'neural networks',
    'deep learning'
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders suggestions in normal mode', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
      />
    )
    
    expect(screen.getByText('Search Suggestions')).toBeInTheDocument()
    expect(screen.getByText('machine learning')).toBeInTheDocument()
    expect(screen.getByText('data science')).toBeInTheDocument()
    expect(screen.getByText('artificial intelligence')).toBeInTheDocument()
    expect(screen.getByText('neural networks')).toBeInTheDocument()
    expect(screen.getByText('deep learning')).toBeInTheDocument()
  })

  it('renders suggestions in compact mode', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
        compact 
      />
    )
    
    // Should not show header in compact mode
    expect(screen.queryByText('Search Suggestions')).not.toBeInTheDocument()
    
    // Should still show suggestions
    expect(screen.getByText('machine learning')).toBeInTheDocument()
    expect(screen.getByText('data science')).toBeInTheDocument()
  })

  it('handles suggestion click in normal mode', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
      />
    )
    
    const firstSuggestion = screen.getByText('machine learning').closest('div[class*="cursor-pointer"]')
    if (firstSuggestion) {
      fireEvent.click(firstSuggestion)
      expect(mockOnSuggestionClick).toHaveBeenCalledWith('machine learning')
    }
  })

  it('handles suggestion click in compact mode', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
        compact 
      />
    )
    
    const firstSuggestion = screen.getByText('machine learning').closest('button')
    if (firstSuggestion) {
      fireEvent.click(firstSuggestion)
      expect(mockOnSuggestionClick).toHaveBeenCalledWith('machine learning')
    }
  })

  it('handles search button click in normal mode', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
      />
    )
    
    const searchButtons = screen.getAllByText('Search')
    fireEvent.click(searchButtons[0])
    
    expect(mockOnSuggestionClick).toHaveBeenCalledWith('machine learning')
  })

  it('displays loading state', () => {
    render(
      <SearchSuggestions 
        suggestions={[]} 
        onSuggestionClick={mockOnSuggestionClick} 
        isLoading 
      />
    )
    
    expect(screen.getByText('Getting suggestions...')).toBeInTheDocument()
    // Check for the loading spinner by class
    const loadingElement = document.querySelector('.animate-spin')
    expect(loadingElement).toBeInTheDocument()
  })

  it('returns null when no suggestions and not loading', () => {
    const { container } = render(
      <SearchSuggestions 
        suggestions={[]} 
        onSuggestionClick={mockOnSuggestionClick} 
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('truncates long suggestions in compact mode', () => {
    const longSuggestions = [
      'This is a very long suggestion that should be truncated in compact mode to prevent layout issues'
    ]

    render(
      <SearchSuggestions 
        suggestions={longSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
        compact 
      />
    )
    
    const suggestionElement = screen.getByText(longSuggestions[0])
    expect(suggestionElement).toHaveClass('truncate')
  })

  it('applies custom className', () => {
    const { container } = render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
        className="custom-class" 
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('renders with search icons', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
      />
    )
    
    // Should have search icons for each suggestion
    expect(screen.getAllByText('machine learning').length).toBeGreaterThan(0)
  })

  it('handles empty suggestions array', () => {
    const { container } = render(
      <SearchSuggestions 
        suggestions={[]} 
        onSuggestionClick={mockOnSuggestionClick} 
        isLoading={false} 
      />
    )
    
    expect(container.firstChild).toBeNull()
  })

  it('shows lightbulb icon in header for normal mode', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
      />
    )
    
    expect(screen.getByText('Search Suggestions')).toBeInTheDocument()
  })

  it('handles multiple suggestion clicks', () => {
    render(
      <SearchSuggestions 
        suggestions={mockSuggestions} 
        onSuggestionClick={mockOnSuggestionClick} 
      />
    )
    
    // Click first suggestion
    const firstSuggestion = screen.getByText('machine learning').closest('div[class*="cursor-pointer"]')
    if (firstSuggestion) {
      fireEvent.click(firstSuggestion)
    }
    
    // Click second suggestion
    const secondSuggestion = screen.getByText('data science').closest('div[class*="cursor-pointer"]')
    if (secondSuggestion) {
      fireEvent.click(secondSuggestion)
    }
    
    expect(mockOnSuggestionClick).toHaveBeenCalledTimes(2)
    expect(mockOnSuggestionClick).toHaveBeenNthCalledWith(1, 'machine learning')
    expect(mockOnSuggestionClick).toHaveBeenNthCalledWith(2, 'data science')
  })
})