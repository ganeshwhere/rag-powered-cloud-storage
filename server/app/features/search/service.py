"""
Search service for RAG-based document search and answer generation.
"""
import logging
import time
import uuid
import asyncio
from typing import List, Optional, Dict, Any, Tuple, Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from openai import AsyncOpenAI

from app.core.config import settings
from app.core.vector_store import PineconeClient
from app.core.redis_client import redis_client
from app.core.models.search import SearchHistory
from app.core.models.document import Document
from app.features.search.schemas import (
    SearchRequest, 
    SearchResponse, 
    SearchChunk, 
    SearchHistoryItem,
    NoResultsResponse
)

logger = logging.getLogger(__name__)


class SearchService:
    """Service for handling RAG-based document search operations."""
    
    def __init__(self):
        if not settings.openai_api_key:
            raise ValueError("OpenAI API key is required for search functionality")
        
        self.openai_client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            max_retries=2,  # Reduce retries for faster failures
            timeout=30.0    # Overall timeout for OpenAI requests
        )
        self.vector_store = PineconeClient()
        self.embedding_model = settings.embedding_model
        self.llm_model = settings.openai_model
        
        # Cache for common embeddings to avoid repeated API calls
        self._embedding_cache = {}
        self._cache_max_size = 100
    
    async def search_documents(
        self, 
        request: SearchRequest, 
        user_id: str, 
        db: AsyncSession
    ) -> Union[SearchResponse, NoResultsResponse]:
        """
        Perform RAG-based search on user documents with caching and performance optimizations.
        
        Args:
            request: Search request parameters
            user_id: User ID for filtering results
            db: Database session
            
        Returns:
            Search response with answer and source chunks or no results response
        """
        start_time = time.time()
        
        try:
            # Check cache first (with faster key generation)
            cache_key = self._generate_fast_cache_key(user_id, request)
            try:
                cached_result = await redis_client.get(cache_key)
                if cached_result:
                    logger.info(f"Returning cached search results for user {user_id}")
                    # Update processing time for cached result
                    cached_result["processing_time_ms"] = int((time.time() - start_time) * 1000)
                    
                    # Record search in history (async, don't wait)
                    asyncio.create_task(self._record_search_history(
                        db=db,
                        user_id=user_id,
                        query=request.query,
                        results_count=cached_result.get("total_results", 0)
                    ))
                    
                    return SearchResponse(**cached_result)
            except Exception as e:
                logger.warning(f"Cache retrieval failed: {str(e)}")
            
            # Optimize query preprocessing
            processed_query = self._preprocess_query(request.query)
            
            # Generate query embedding with timeout
            embedding_task = asyncio.create_task(
                asyncio.wait_for(
                    self._generate_query_embedding(processed_query), 
                    timeout=10.0  # 10 second timeout
                )
            )
            
            try:
                query_embedding = await embedding_task
            except asyncio.TimeoutError:
                logger.error("Query embedding generation timed out")
                raise Exception("Search request timed out. Please try again.")
            
            # Search for similar chunks with optimized parameters
            similar_chunks = await self.vector_store.query_similar_optimized(
                query_embedding=query_embedding,
                user_id=user_id,
                top_k=min(request.top_k, 20),  # Limit to max 20 for performance
                document_ids=request.document_ids,
                min_score=max(request.min_score, 0.3)  # Minimum threshold for relevance
            )
            
            if not similar_chunks:
                # Record search in history (async, don't wait)
                asyncio.create_task(self._record_search_history(
                    db=db,
                    user_id=user_id,
                    query=request.query,
                    results_count=0
                ))
                
                no_results_response = NoResultsResponse(
                    query=request.query,
                    message="No relevant documents found for your query.",
                    suggestions=self._generate_fast_suggestions(request.query)
                )
                
                # Cache no results response (async, don't wait)
                asyncio.create_task(redis_client.set_with_expiry(
                    cache_key, 
                    no_results_response.model_dump(), 
                    300  # 5 minutes for no results
                ))
                
                return no_results_response
            
            # Convert to SearchChunk objects (optimized)
            search_chunks = [
                SearchChunk(
                    id=chunk["id"],
                    document_id=chunk["document_id"],
                    chunk_index=chunk["chunk_index"],
                    text=chunk["text"],
                    score=chunk["score"],
                    metadata=chunk.get("metadata", {})
                )
                for chunk in similar_chunks
            ]
            
            # Generate answer with timeout and optimization
            answer_task = asyncio.create_task(
                asyncio.wait_for(
                    self._generate_answer_optimized(processed_query, similar_chunks[:5]),  # Use top 5 only
                    timeout=15.0  # 15 second timeout
                )
            )
            
            try:
                answer = await answer_task
            except asyncio.TimeoutError:
                logger.warning("Answer generation timed out, using fallback")
                answer = self._create_fallback_summary(similar_chunks[:3])
            
            # Get unique source document IDs
            sources = list(set(chunk["document_id"] for chunk in similar_chunks))
            
            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)
            
            # Create response
            response = SearchResponse(
                query=request.query,
                answer=answer,
                chunks=search_chunks,
                total_results=len(similar_chunks),
                processing_time_ms=processing_time_ms,
                sources=sources
            )
            
            # Cache the results (async, don't wait)
            asyncio.create_task(redis_client.set_with_expiry(
                cache_key, 
                response.model_dump(), 
                settings.search_cache_ttl_seconds
            ))
            
            # Record search in history (async, don't wait)
            asyncio.create_task(self._record_search_history(
                db=db,
                user_id=user_id,
                query=request.query,
                results_count=len(similar_chunks)
            ))
            
            return response
            
        except Exception as e:
            logger.error(f"Error performing search for user {user_id}: {str(e)}")
            raise
    
    async def _generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for search query with caching.
        
        Args:
            query: Search query text
            
        Returns:
            Query embedding vector
        """
        # Check cache first for common queries
        query_key = query.lower().strip()
        if query_key in self._embedding_cache:
            logger.debug(f"Using cached embedding for query: {query_key[:50]}...")
            return self._embedding_cache[query_key]
        
        try:
            response = await self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=query
            )
            embedding = response.data[0].embedding
            
            # Cache the embedding if cache isn't full
            if len(self._embedding_cache) < self._cache_max_size:
                self._embedding_cache[query_key] = embedding
            
            return embedding
            
        except Exception as e:
            logger.error(f"Error generating query embedding: {str(e)}")
            raise
    
    async def _generate_answer(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        """
        Generate answer using retrieved chunks and LLM with enhanced context building.
        
        Args:
            query: Original search query
            chunks: Retrieved document chunks
            
        Returns:
            Generated answer text with source attribution
        """
        try:
            # Build enhanced context from chunks with document information
            context_parts = []
            document_sources = {}
            
            for i, chunk in enumerate(chunks[:5]):  # Use top 5 chunks for context
                doc_id = chunk.get('document_id', 'Unknown')
                chunk_idx = chunk.get('chunk_index', 0)
                score = chunk.get('score', 0.0)
                
                # Track document sources for attribution
                if doc_id not in document_sources:
                    document_sources[doc_id] = i + 1
                
                source_num = document_sources[doc_id]
                
                # Enhanced context with metadata
                context_parts.append(
                    f"[Source {source_num} - Chunk {chunk_idx} - Relevance: {score:.2f}]:\n{chunk['text']}"
                )
            
            context = "\n\n".join(context_parts)
            
            # Enhanced system prompt for better answer generation
            system_prompt = """You are an expert research assistant that provides comprehensive answers based on document context.

INSTRUCTIONS:
1. Use ONLY the information from the provided sources to answer the question
2. Synthesize information from multiple sources when relevant
3. Always cite sources using [Source X] notation when referencing specific information
4. If the context doesn't contain sufficient information, clearly state what's missing
5. Provide a structured, well-organized response
6. Include relevant details and examples from the sources
7. If sources contradict each other, acknowledge the discrepancy

RESPONSE FORMAT:
- Start with a direct answer to the question
- Provide supporting details with source citations
- End with a brief summary if the answer is complex"""
            
            user_prompt = f"""Based on the following document excerpts, please answer this question: {query}

DOCUMENT CONTEXT:
{context}

Please provide a comprehensive, well-structured answer with proper source citations."""
            
            # Generate answer with enhanced parameters
            response = await self.openai_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Low temperature for factual accuracy
                max_tokens=1200,  # Increased for more comprehensive answers
                presence_penalty=0.1,  # Slight penalty to avoid repetition
                frequency_penalty=0.1   # Slight penalty for varied language
            )
            
            answer = response.choices[0].message.content.strip()
            
            # Enhance answer with document source mapping
            if document_sources:
                source_mapping = "\n\n**Document Sources:**\n"
                for doc_id, source_num in document_sources.items():
                    source_mapping += f"- Source {source_num}: Document {doc_id[:8]}...\n"
                answer += source_mapping
            
            return answer
            
        except Exception as e:
            logger.error(f"Error generating answer: {str(e)}")
            # Enhanced fallback response with more context
            return f"""I found {len(chunks)} relevant document sections related to your query: "{query}"

However, I encountered an error while generating a comprehensive answer. Here's what I found:

{self._create_fallback_summary(chunks[:3])}

Please review the detailed source chunks below for complete information."""
    
    def _create_fallback_summary(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Create a fallback summary when LLM generation fails.
        
        Args:
            chunks: Retrieved document chunks
            
        Returns:
            Simple summary of found content
        """
        if not chunks:
            return "No relevant content found."
        
        summary_parts = []
        for i, chunk in enumerate(chunks):
            text_preview = chunk.get('text', '')[:200] + "..." if len(chunk.get('text', '')) > 200 else chunk.get('text', '')
            summary_parts.append(f"• From document {chunk.get('document_id', 'Unknown')[:8]}...: {text_preview}")
        
        return "\n".join(summary_parts)
    
    async def _generate_search_suggestions(self, query: str) -> List[str]:
        """
        Generate search suggestions for queries with no results.
        
        Args:
            query: Original search query
            
        Returns:
            List of suggested search terms
        """
        # Simple suggestions based on common patterns
        suggestions = []
        
        # Suggest shorter versions
        words = query.split()
        if len(words) > 2:
            suggestions.append(" ".join(words[:2]))
        
        # Suggest individual keywords
        if len(words) > 1:
            suggestions.extend(words[:3])
        
        # Add generic suggestions
        suggestions.extend([
            "summary",
            "overview", 
            "key points",
            "main topics"
        ])
        
        return suggestions[:5]  # Return top 5 suggestions
    
    async def _record_search_history(
        self, 
        db: AsyncSession, 
        user_id: str, 
        query: str, 
        results_count: int
    ) -> None:
        """
        Record search in user's search history.
        
        Args:
            db: Database session
            user_id: User ID
            query: Search query
            results_count: Number of results returned
        """
        try:
            search_record = SearchHistory(
                user_id=uuid.UUID(user_id),
                query=query,
                results_count=results_count
            )
            
            db.add(search_record)
            await db.commit()
            
            logger.debug(f"Recorded search history for user {user_id}: {query}")
            
        except Exception as e:
            logger.error(f"Error recording search history: {str(e)}")
            await db.rollback()
    
    async def get_search_history(
        self, 
        user_id: str, 
        db: AsyncSession,
        page: int = 1,
        per_page: int = 20
    ) -> Tuple[List[SearchHistoryItem], int]:
        """
        Get user's search history.
        
        Args:
            user_id: User ID
            db: Database session
            page: Page number (1-based)
            per_page: Items per page
            
        Returns:
            Tuple of (search history items, total count)
        """
        try:
            # Calculate offset
            offset = (page - 1) * per_page
            
            # Query search history
            query = (
                select(SearchHistory)
                .where(SearchHistory.user_id == uuid.UUID(user_id))
                .order_by(desc(SearchHistory.created_at))
                .offset(offset)
                .limit(per_page)
            )
            
            result = await db.execute(query)
            history_records = result.scalars().all()
            
            # Get total count
            count_query = (
                select(SearchHistory)
                .where(SearchHistory.user_id == uuid.UUID(user_id))
            )
            count_result = await db.execute(count_query)
            total_count = len(count_result.scalars().all())
            
            # Convert to response objects
            history_items = [
                SearchHistoryItem(
                    id=record.id,
                    query=record.query,
                    results_count=record.results_count,
                    created_at=record.created_at
                )
                for record in history_records
            ]
            
            return history_items, total_count
            
        except Exception as e:
            logger.error(f"Error getting search history for user {user_id}: {str(e)}")
            raise
    
    async def invalidate_user_search_cache(self, user_id: str) -> bool:
        """
        Invalidate all cached search results for a user.
        This should be called when user's documents are updated.
        
        Args:
            user_id: User ID
            
        Returns:
            True if cache was invalidated successfully
        """
        try:
            # Invalidate search cache
            deleted_count = await redis_client.invalidate_user_cache(user_id, "search*")
            
            if deleted_count > 0:
                logger.info(f"Invalidated {deleted_count} search cache entries for user {user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error invalidating search cache for user {user_id}: {str(e)}")
            return False
    
    def _generate_fast_cache_key(self, user_id: str, request: SearchRequest) -> str:
        """Generate a fast cache key without complex hashing."""
        query_hash = hash(request.query.lower().strip()) % 1000000
        doc_hash = hash(str(sorted(request.document_ids or []))) % 1000 if request.document_ids else 0
        return f"search:{user_id}:{query_hash}:{doc_hash}:{request.top_k}:{int(request.min_score*100)}"
    
    def _preprocess_query(self, query: str) -> str:
        """Preprocess query for better performance and results."""
        # Basic preprocessing - can be enhanced
        processed = query.strip().lower()
        
        # Remove extra whitespace
        processed = ' '.join(processed.split())
        
        # Remove common stop words that don't add value (only for longer queries)
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were'}
        words = processed.split()
        if len(words) > 4:  # Only remove stop words for longer queries
            words = [w for w in words if w not in stop_words or len(w) > 3]  # Keep longer stop words
            processed = ' '.join(words)
        
        return processed
    
    def clear_embedding_cache(self) -> int:
        """Clear the embedding cache and return number of items cleared."""
        count = len(self._embedding_cache)
        self._embedding_cache.clear()
        logger.info(f"Cleared {count} cached embeddings")
        return count
    
    def _generate_fast_suggestions(self, query: str) -> List[str]:
        """Generate fast suggestions without complex processing."""
        words = query.split()
        suggestions = []
        
        # Suggest shorter versions
        if len(words) > 2:
            suggestions.append(" ".join(words[:2]))
        
        # Suggest individual keywords
        if len(words) > 1:
            suggestions.extend(words[:2])
        
        # Add generic suggestions
        suggestions.extend(["summary", "overview", "key points"])
        
        return suggestions[:5]
    
    async def _generate_answer_optimized(self, query: str, chunks: List[Dict[str, Any]]) -> str:
        """
        Generate answer with optimized parameters for speed.
        
        Args:
            query: Original search query
            chunks: Retrieved document chunks (limited to top 5)
            
        Returns:
            Generated answer text
        """
        try:
            # Build concise context from chunks
            context_parts = []
            
            for i, chunk in enumerate(chunks[:3]):  # Use only top 3 chunks for speed
                doc_id = chunk.get('document_id', 'Unknown')
                text = chunk['text'][:500]  # Limit text length for speed
                context_parts.append(f"[Source {i+1}]: {text}")
            
            context = "\n\n".join(context_parts)
            
            # Optimized system prompt for speed
            system_prompt = """You are a helpful assistant. Provide a concise, accurate answer based on the given context. Always cite sources using [Source X] notation."""
            
            user_prompt = f"""Question: {query}
            
Context:
{context}

Provide a brief, accurate answer with source citations."""
            
            # Generate answer with optimized parameters for speed
            response = await self.openai_client.chat.completions.create(
                model=self.llm_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,  # Deterministic for caching
                max_tokens=400,   # Reduced for speed
                presence_penalty=0.0,
                frequency_penalty=0.0
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Error generating optimized answer: {str(e)}")
            return self._create_fallback_summary(chunks[:3])