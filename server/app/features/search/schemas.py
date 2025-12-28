"""
Search feature schemas for request/response validation.
"""
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Schema for search requests."""
    
    query: str = Field(..., min_length=1, max_length=1000, description="Search query text")
    document_ids: Optional[List[str]] = Field(
        default=None, 
        description="Optional list of document IDs to search within"
    )
    top_k: int = Field(
        default=10, 
        ge=1, 
        le=50, 
        description="Number of results to return"
    )
    min_score: float = Field(
        default=0.0, 
        ge=0.0, 
        le=1.0, 
        description="Minimum similarity score threshold"
    )


class SearchChunk(BaseModel):
    """Schema for individual search result chunks."""
    
    id: str = Field(..., description="Vector ID")
    document_id: str = Field(..., description="Document UUID")
    chunk_index: int = Field(..., description="Chunk index within document")
    text: str = Field(..., description="Chunk text content")
    score: float = Field(..., description="Similarity score")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class SearchResponse(BaseModel):
    """Schema for search responses."""
    
    query: str = Field(..., description="Original search query")
    answer: str = Field(..., description="Generated answer based on retrieved chunks")
    chunks: List[SearchChunk] = Field(..., description="Retrieved document chunks")
    total_results: int = Field(..., description="Total number of results found")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")
    sources: List[str] = Field(..., description="List of source document IDs")


class SearchHistoryItem(BaseModel):
    """Schema for search history items."""
    
    id: uuid.UUID = Field(..., description="Search history ID")
    query: str = Field(..., description="Search query")
    results_count: int = Field(..., description="Number of results returned")
    created_at: datetime = Field(..., description="When the search was performed")


class SearchHistoryResponse(BaseModel):
    """Schema for search history responses."""
    
    history: List[SearchHistoryItem] = Field(..., description="List of search history items")
    total: int = Field(..., description="Total number of history items")
    page: int = Field(..., description="Current page number")
    per_page: int = Field(..., description="Items per page")


class NoResultsResponse(BaseModel):
    """Schema for no results responses."""
    
    query: str = Field(..., description="Original search query")
    message: str = Field(..., description="No results message")
    suggestions: List[str] = Field(default_factory=list, description="Search suggestions")