"""
Pinecone vector store client for embedding storage and similarity search.
"""
import logging
import uuid
import time
from typing import List, Dict, Any, Optional, Tuple
import asyncio
from concurrent.futures import ThreadPoolExecutor

from pinecone import Pinecone
from app.core.config import settings

logger = logging.getLogger(__name__)


class PineconeClient:
    """
    Pinecone vector database client for storing and querying document embeddings.
    """
    
    def __init__(self):
        if not settings.pinecone_api_key:
            raise ValueError("Pinecone API key is required")
        
        self.pc = Pinecone(api_key=settings.pinecone_api_key)
        self.index_name = settings.pinecone_index_name
        self.dimension = 1536  # OpenAI text-embedding-3-small dimension
        self._index = None
        self._executor = ThreadPoolExecutor(max_workers=4)
    
    @property
    def index(self):
        """Get or create Pinecone index."""
        if self._index is None:
            try:
                # Check if index exists
                existing_indexes = self.pc.list_indexes()
                index_names = [idx.name for idx in existing_indexes.indexes]
                
                if self.index_name not in index_names:
                    logger.info(f"Creating Pinecone index: {self.index_name}")
                    from pinecone import ServerlessSpec
                    self.pc.create_index(
                        name=self.index_name,
                        dimension=self.dimension,
                        metric="cosine",
                        spec=ServerlessSpec(
                            cloud="aws",
                            region=settings.pinecone_environment
                        )
                    )
                    # Wait for index to be ready
                    import time
                    time.sleep(10)
                
                self._index = self.pc.Index(self.index_name)
                logger.info(f"Connected to Pinecone index: {self.index_name}")
                
            except Exception as e:
                logger.error(f"Error connecting to Pinecone index: {str(e)}")
                raise
        
        return self._index
    
    async def upsert_embeddings(
        self,
        embeddings: List[List[float]],
        chunks: List[str],
        document_id: str,
        user_id: str,
        chunk_indices: List[int],
        metadata_list: Optional[List[Dict[str, Any]]] = None
    ) -> List[str]:
        """
        Upsert embeddings to Pinecone with associated metadata.
        
        Args:
            embeddings: List of embedding vectors
            chunks: List of text chunks
            document_id: Document UUID
            user_id: User UUID
            chunk_indices: List of chunk indices
            metadata_list: Optional list of additional metadata for each chunk
            
        Returns:
            List of vector IDs that were upserted
        """
        try:
            if len(embeddings) != len(chunks) or len(embeddings) != len(chunk_indices):
                raise ValueError("Embeddings, chunks, and chunk_indices must have the same length")
            
            # Prepare vectors for upsert
            vectors = []
            vector_ids = []
            
            for i, (embedding, chunk, chunk_idx) in enumerate(zip(embeddings, chunks, chunk_indices)):
                vector_id = f"{document_id}_{chunk_idx}"
                vector_ids.append(vector_id)
                
                # Base metadata
                metadata = {
                    "document_id": document_id,
                    "user_id": user_id,
                    "chunk_index": chunk_idx,
                    "text": chunk[:1000],  # Limit text size in metadata
                    "text_length": len(chunk)
                }
                
                # Add additional metadata if provided
                if metadata_list and i < len(metadata_list):
                    metadata.update(metadata_list[i])
                
                vectors.append({
                    "id": vector_id,
                    "values": embedding,
                    "metadata": metadata
                })
            
            # Upsert in batches to avoid size limits
            batch_size = 100
            for i in range(0, len(vectors), batch_size):
                batch = vectors[i:i + batch_size]
                await self._upsert_batch(batch)
                logger.debug(f"Upserted batch {i//batch_size + 1} with {len(batch)} vectors")
            
            logger.info(f"Successfully upserted {len(vectors)} embeddings for document {document_id}")
            return vector_ids
            
        except Exception as e:
            logger.error(f"Error upserting embeddings: {str(e)}")
            raise
    
    async def _upsert_batch(self, vectors: List[Dict[str, Any]]) -> None:
        """
        Upsert a batch of vectors to Pinecone.
        
        Args:
            vectors: List of vector dictionaries
        """
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            self._executor,
            lambda: self.index.upsert(vectors=vectors)
        )
    
    async def query_similar(
        self,
        query_embedding: List[float],
        user_id: str,
        top_k: int = 10,
        document_ids: Optional[List[str]] = None,
        min_score: float = 0.0
    ) -> List[Dict[str, Any]]:
        """
        Query for similar embeddings.
        
        Args:
            query_embedding: Query vector
            user_id: User ID to filter results
            top_k: Number of results to return
            document_ids: Optional list of document IDs to filter by
            min_score: Minimum similarity score threshold
            
        Returns:
            List of similar chunks with metadata and scores
        """
        try:
            # Build filter for user-specific results
            filter_dict = {"user_id": {"$eq": user_id}}
            
            # Add document filter if specified
            if document_ids:
                filter_dict["document_id"] = {"$in": document_ids}
            
            # Query Pinecone
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self._executor,
                lambda: self.index.query(
                    vector=query_embedding,
                    top_k=top_k,
                    include_metadata=True,
                    filter=filter_dict
                )
            )
            
            # Process results
            results = []
            for match in response.matches:
                if match.score >= min_score:
                    results.append({
                        "id": match.id,
                        "score": match.score,
                        "metadata": match.metadata,
                        "text": match.metadata.get("text", ""),
                        "document_id": match.metadata.get("document_id"),
                        "chunk_index": match.metadata.get("chunk_index")
                    })
            
            logger.info(f"Found {len(results)} similar chunks for user {user_id}")
            return results
            
        except Exception as e:
            logger.error(f"Error querying similar embeddings: {str(e)}")
            raise
    
    async def delete_document_embeddings(self, document_id: str) -> bool:
        """
        Delete all embeddings for a specific document.
        
        Args:
            document_id: Document UUID
            
        Returns:
            True if successful
        """
        try:
            # Query to get all vector IDs for the document
            filter_dict = {"document_id": {"$eq": document_id}}
            
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                self._executor,
                lambda: self.index.query(
                    vector=[0.0] * self.dimension,  # Dummy vector for metadata query
                    top_k=10000,  # Large number to get all chunks
                    include_metadata=False,
                    filter=filter_dict
                )
            )
            
            # Extract vector IDs
            vector_ids = [match.id for match in response.matches]
            
            if vector_ids:
                # Delete vectors in batches
                batch_size = 1000
                for i in range(0, len(vector_ids), batch_size):
                    batch = vector_ids[i:i + batch_size]
                    await loop.run_in_executor(
                        self._executor,
                        lambda: self.index.delete(ids=batch)
                    )
                
                logger.info(f"Deleted {len(vector_ids)} embeddings for document {document_id}")
            else:
                logger.info(f"No embeddings found for document {document_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error deleting document embeddings: {str(e)}")
            return False
    
    async def get_index_stats(self) -> Dict[str, Any]:
        """
        Get Pinecone index statistics.
        
        Returns:
            Index statistics
        """
        try:
            loop = asyncio.get_event_loop()
            stats = await loop.run_in_executor(
                self._executor,
                lambda: self.index.describe_index_stats()
            )
            return stats
        except Exception as e:
            logger.error(f"Error getting index stats: {str(e)}")
            return {}
    
    def __del__(self):
        """Clean up thread pool executor."""
        if hasattr(self, '_executor'):
            self._executor.shutdown(wait=False)