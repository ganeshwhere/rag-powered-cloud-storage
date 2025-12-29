"""
Search API endpoints for RAG-based document search.
"""
import logging
from typing import Union
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.models.user import User
from app.core.config import settings
from app.core.redis_client import redis_client
from app.features.search.service import SearchService
from app.features.search.schemas import (
    SearchRequest,
    SearchResponse,
    SearchHistoryResponse,
    SearchHistoryItem,
    NoResultsResponse
)

logger = logging.getLogger(__name__)

# IMPORTANT: Do not add prefix here to avoid double prefixes
# The prefix is added in main.py: app.include_router(search_router, prefix="/api/v1/search")
# This creates the final URL: /api/v1/search/
router = APIRouter(tags=["search"])


@router.post("/", response_model=Union[SearchResponse, NoResultsResponse])
async def search_documents(
    request: SearchRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform RAG-based search on user documents.
    
    This endpoint allows users to search through their uploaded documents using natural language queries.
    The system uses vector similarity search to find relevant document chunks and generates
    contextual answers using AI.
    
    Args:
        request: Search request containing query and optional filters
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Search response with generated answer and source chunks, or no results response
        
    Raises:
        HTTPException: If search fails or user is not authenticated
    """
    try:
        search_service = SearchService()
        
        result = await search_service.search_documents(
            request=request,
            user_id=str(current_user.id),
            db=db
        )
        
        logger.info(f"Search completed for user {current_user.id}: {request.query[:50]}...")
        return result
        
    except ValueError as e:
        logger.error(f"Search validation error for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Search error for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while searching documents"
        )


@router.get("/history", response_model=SearchHistoryResponse)
async def get_search_history(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's search history with pagination.
    
    Returns a paginated list of the user's previous search queries along with
    metadata about the results.
    
    Args:
        page: Page number (1-based)
        per_page: Number of items per page (max 100)
        current_user: Current authenticated user
        db: Database session
        
    Returns:
        Paginated search history response
        
    Raises:
        HTTPException: If retrieval fails or user is not authenticated
    """
    try:
        search_service = SearchService()
        
        history_items, total_count = await search_service.get_search_history(
            user_id=str(current_user.id),
            db=db,
            page=page,
            per_page=per_page
        )
        
        return SearchHistoryResponse(
            history=history_items,
            total=total_count,
            page=page,
            per_page=per_page
        )
        
    except Exception as e:
        logger.error(f"Error retrieving search history for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving search history"
        )


@router.delete("/cache")
async def clear_search_cache(
    current_user: User = Depends(get_current_active_user)
):
    """
    Clear user's search cache and embedding cache.
    
    This endpoint allows users to clear their cached search results and embeddings, 
    which can be useful after uploading new documents or when they want fresh search results.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Success message with cache clearing details
        
    Raises:
        HTTPException: If cache clearing fails or user is not authenticated
    """
    try:
        search_service = SearchService()
        
        # Clear search cache
        search_cache_success = await search_service.invalidate_user_search_cache(str(current_user.id))
        
        # Clear embedding cache
        embedding_count = search_service.clear_embedding_cache()
        
        if search_cache_success:
            logger.info(f"Search cache and {embedding_count} embeddings cleared for user {current_user.id}")
            return {
                "message": "Search cache cleared successfully",
                "embeddings_cleared": embedding_count,
                "search_cache_cleared": True
            }
        else:
            logger.warning(f"Failed to clear search cache for user {current_user.id}")
            return {
                "message": "Cache clearing completed (search cache may not have been active)",
                "embeddings_cleared": embedding_count,
                "search_cache_cleared": False
            }
        
    except Exception as e:
        logger.error(f"Error clearing search cache for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while clearing search cache"
        )


@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=1, max_length=100, description="Partial query for suggestions"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Get search suggestions based on partial query.
    
    This endpoint provides search suggestions to help users formulate better queries.
    Currently returns basic suggestions, but could be enhanced with ML-based suggestions
    in the future.
    
    Args:
        query: Partial search query
        current_user: Current authenticated user
        
    Returns:
        List of search suggestions
        
    Raises:
        HTTPException: If suggestion generation fails or user is not authenticated
    """
    try:
        search_service = SearchService()
        
        suggestions = search_service._generate_fast_suggestions(query)
        
        return {
            "query": query,
            "suggestions": suggestions
        }
        
    except Exception as e:
        logger.error(f"Error generating search suggestions for user {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while generating search suggestions"
        )


@router.get("/performance")
async def get_search_performance_stats(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get search performance statistics for debugging and monitoring.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Comprehensive performance statistics
        
    Raises:
        HTTPException: If retrieval fails or user is not authenticated
    """
    try:
        search_service = SearchService()
        
        # Get vector store stats
        vector_stats = await search_service.vector_store.get_index_stats()
        
        # Get Redis health
        redis_health = await redis_client.health_check()
        
        # Get embedding cache stats
        embedding_cache_size = len(search_service._embedding_cache)
        embedding_cache_max = search_service._cache_max_size
        
        return {
            "vector_store_stats": vector_stats,
            "redis_connected": redis_health,
            "embedding_cache": {
                "current_size": embedding_cache_size,
                "max_size": embedding_cache_max,
                "usage_percentage": round((embedding_cache_size / embedding_cache_max) * 100, 2)
            },
            "performance_settings": {
                "search_timeout": settings.search_timeout_seconds,
                "embedding_timeout": settings.embedding_timeout_seconds,
                "llm_timeout": settings.llm_timeout_seconds,
                "max_results": settings.max_search_results,
                "min_score": settings.min_search_score,
                "cache_ttl": settings.search_cache_ttl_seconds
            },
            "optimization_features": {
                "async_operations": True,
                "embedding_caching": True,
                "query_preprocessing": True,
                "result_limiting": True,
                "timeout_handling": True,
                "fallback_responses": True
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting performance stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while retrieving performance statistics"
        )