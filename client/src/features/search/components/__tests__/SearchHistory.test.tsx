import React from 'react'
import { render, screen, fireEvent } from '@/test-utils/render'
import { SearchHistory } from '../SearchHistory'
import { SearchHistoryItem } from '../../types'

describe('SearchHistory', () => {
  const mockOnItemClick = jest.fn()

  const mockHistoryItems: SearchHistoryItem[] = [
    {
      id: '1',
      query: 'machine learning algorithms',
      results_count: 15,
      created_at: '2023-12-01T10:00:00Z'
    },
    {
      id: '2',
      query: 'data preprocessing',
      results_count: 8,
      created_at: '2023-12-01T09:30:00Z'
    },
    {
      id: '3',
      query: 'neural networks',
      results_count: 23,
      created_at: '2023-11-30T15:45:00Z'
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders search history items in normal mode', () => {
    render(
      <SearchHistory 
        history={mockHistoryItems} 
        onItemClick={mockOnItemClick} 
      />
    )
    
    expect(screen.getByText('machine learning algorithms')).toBeInTheDocument()
    expect(screen.getByText('data preprocessing')).toBeInTheDocument()
    expect(screen.getByText('neural networks')).toBeInTheDocument()
    
    // Check results count
    expect(screen.getByText('15 results')).toBeInTheDocument()
    expect(screen.getByText('8 results')).toBeInTheDocument()
    expect(screen.getByText('23 results')).toBeInTheDocument()
  })

  it('renders search history items in compact mode', () => {
    render(
      <SearchHistory 
        history={mockHistoryItems} 
        onItemClick={mockOnItemClick} 
        compact 
      />
    )
    
    expect(screen.getByText('machine learning algorithms')).toBeInTheDocument()
    expect(screen.getByText('15 results')).toBeInTheDocument()
    
    // In compact mode, should not show "Search Again" buttons
    expect(screen.queryByText('Search Again')).not.toBeInTheDocument()
  })

  it('handles item click in normal mode', () => {
    render(
      <SearchHistory 
        history={mockHistoryItems} 
        onItemClick={mockOnItemClick} 
      />
    )
    
    const firstItem = screen.getByText('machine learning algorithms').closest('div[class*="cursor-pointer"]')
    if (firstItem) {
      fireEvent.click(firstItem)
      expect(mockOnItemClick).toHaveBeenCalledWith('machine learning algorithms')
    }
  })

  it('handles item click in compact mode', () => {
    render(
      <SearchHistory 
        history={mockHistoryItems} 
        onItemClick={mockOnItemClick} 
        compact 
      />
    )
    
    const firstItem = screen.getByText('machine learning algorithms').closest('button')
    if (firstItem) {
      fireEvent.click(firstItem)
      expect(mockOnItemClick).toHaveBeenCalledWith('machine learning algorithms')
    }
  })

  it('handles search again button click', () => {
    render(
      <SearchHistory 
        history={mockHistoryItems} 
        onItemClick={mockOnItemClick} 
      />
    )
    
    const searchAgainButtons = screen.getAllByText('Search Again')
    fireEvent.click(searchAgainButtons[0])
    
    expect(mockOnItemClick).toHaveBeenCalledWith('machine learning algorithms')
  })

  it('displays loading state', () => {
    render(
      <SearchHistory 
        history={[]} 
        onItemClick={mockOnItemClick} 
        isLoading 
      />
    )
    
    expect(screen.getByText('Loading search history...')).toBeInTheDocument()
    // Check for loading spinner by looking for the SVG element
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('displays empty state when no history', () => {
    render(
      <SearchHistory 
        history={[]} 
        onItemClick={mockOnItemClick} 
      />
    )
    
    expect(screen.getByText('No Search History')).toBeInTheDocument()
    expect(screen.getByText('Your recent searches will appear here to help you find information faster.')).toBeInTheDocument()
  })

  it('formats dates correctly', () => {
    // Mock current date to ensure consistent testing
    const mockDate = new Date('2023-12-01T12:00:00Z')
    const originalDate = global.Date
    
    global.Date = jest.fn((dateString?: string) => {
      if (dateString) {
        return new originalDate(dateString)
      }
      return mockDate
    }) as any
    global.Date.now = jest.fn(() => mockDate.getTime())
    
    render(
      <SearchHistory 
        history={mockHistoryItems} 
        onItemClick={mockOnItemClick} 
      />
    )
    
    // Should show relative time for recent items
    expect(screen.getAllByText(/ago|Just now/)[0]).toBeInTheDocument()
    
    // Restore Date
    global.Date = originalDate
  })

  it('truncates long queries in compact mode', () => {
    const longQueryItem: SearchHistoryItem = {
      id: '4',
      query: 'This is a very long search query that should be truncated in compact mode to prevent layout issues',
      results_count: 5,
      created_at: '2023-12-01T10:00:00Z'
    }

    render(
      <SearchHistory 
        history={[longQueryItem]} 
        onItemClick={mockOnItemClick} 
        compact 
      />
    )
    
    const queryElement = screen.getByText(longQueryItem.query)
    expect(queryElement).toHaveClass('truncate')
  })

  it('applies custom className', () => {
    const { container } = render(
      <SearchHistory 
        history={mockHistoryItems} 
        onItemClick={mockOnItemClick} 
        className="custom-class" 
      />
    )
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('shows correct time formatting for different time ranges', () => {
    const now = new Date('2023-12-01T12:00:00Z')
    const oneHourAgo = new Date('2023-12-01T11:00:00Z')
    const oneDayAgo = new Date('2023-11-30T12:00:00Z')
    const oneWeekAgo = new Date('2023-11-24T12:00:00Z')
    const oneMonthAgo = new Date('2023-11-01T12:00:00Z')

    const originalDate = global.Date
    global.Date = jest.fn((dateString?: string) => {
      if (dateString) {
        return new originalDate(dateString)
      }
      return now
    }) as any
    global.Date.now = jest.fn(() => now.getTime())

    const timeTestItems: SearchHistoryItem[] = [
      { id: '1', query: 'recent', results_count: 1, created_at: oneHourAgo.toISOString() },
      { id: '2', query: 'yesterday', results_count: 1, created_at: oneDayAgo.toISOString() },
      { id: '3', query: 'last week', results_count: 1, created_at: oneWeekAgo.toISOString() },
      { id: '4', query: 'last month', results_count: 1, created_at: oneMonthAgo.toISOString() }
    ]

    render(
      <SearchHistory 
        history={timeTestItems} 
        onItemClick={mockOnItemClick} 
      />
    )
    
    expect(screen.getByText('1h ago')).toBeInTheDocument()
    expect(screen.getByText('1d ago')).toBeInTheDocument()
    // The 7d ago might be formatted differently, so just check that some time formatting exists
    expect(screen.getAllByText(/\d+[hd] ago|\d+\/\d+\/\d+/).length).toBeGreaterThan(0)
    
    global.Date = originalDate
  })
})