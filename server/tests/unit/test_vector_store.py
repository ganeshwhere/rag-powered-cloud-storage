"""
Unit tests for PineconeClient class.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from typing import List, Dict, Any

from app.core.vector_store import PineconeClient


class TestPineconeClient:
    """Test cases for PineconeClient."""
    
    @pytest.fixture
    def mock_pinecone(self):
        """Mock Pinecone client."""
        with patch('app.core.vector_store.Pinecone') as mock_pc:
            mock_instance = Mock()
            mock_pc.return_value = mock_instance
            
            # Mock list_indexes
            mock_indexes = Mock()
            mock_indexes.indexes = [Mock(name="existing-index")]
            mock_instance.list_indexes.return_value = mock_indexes
            
            # Mock index
            mock_index = Mock()
            mock_instance.Index.return_value = mock_index
            
            yield mock_instance, mock_index
    
    @pytest.fixture
    def vector_client(self, mock_pinecone):
        """Create PineconeClient instance for testing."""
        with patch('app.core.vector_store.settings') as mock_settings:
            mock_settings.pinecone_api_key = "test-api-key"
            mock_settings.pinecone_index_name = "test-index"
            mock_settings.pinecone_environment = "us-east-1-aws"
            
            client = PineconeClient()
            return client
    
    def test_init_without_api_key(self):
        """Test initialization without API key raises error."""
        with patch('app.core.vector_store.settings') as mock_settings:
            mock_settings.pinecone_api_key = None
            
            with pytest.raises(ValueError, match="Pinecone API key is required"):
                PineconeClient()
    
    def test_index_property_existing_index(self, vector_client, mock_pinecone):
        """Test index property with existing index."""
        mock_pc, mock_index = mock_pinecone
        
        # Mock existing index
        mock_indexes = Mock()
        mock_indexes.indexes = [Mock(name="test-index")]
        mock_pc.list_indexes.return_value = mock_indexes
        
        index = vector_client.index
        
        assert index == mock_index
        mock_pc.Index.assert_called_with("test-index")
    
    def test_index_property_create_new_index(self, vector_client, mock_pinecone):
        """Test index property creates new index when it doesn't exist."""
        mock_pc, mock_index = mock_pinecone
        
        # Mock no existing indexes
        mock_indexes = Mock()
        mock_indexes.indexes = []
        mock_pc.list_indexes.return_value = mock_indexes
        
        with patch('app.core.vector_store.time.sleep'):  # Mock sleep
            index = vector_client.index
        
        assert index == mock_index
        mock_pc.create_index.assert_called_once()
        mock_pc.Index.assert_called_with("test-index")
    
    @pytest.mark.asyncio
    async def test_upsert_embeddings_success(self, vector_client, mock_pinecone):
        """Test successful embedding upsert."""
        mock_pc, mock_index = mock_pinecone
        
        embeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        chunks = ["First chunk", "Second chunk"]
        chunk_indices = [0, 1]
        
        vector_ids = await vector_client.upsert_embeddings(
            embeddings=embeddings,
            chunks=chunks,
            document_id="doc-123",
            user_id="user-456",
            chunk_indices=chunk_indices
        )
        
        assert len(vector_ids) == 2
        assert vector_ids == ["doc-123_0", "doc-123_1"]
        
        # Verify upsert was called
        mock_index.upsert.assert_called_once()
        call_args = mock_index.upsert.call_args[1]
        vectors = call_args['vectors']
        
        assert len(vectors) == 2
        assert vectors[0]['id'] == "doc-123_0"
        assert vectors[0]['values'] == [0.1, 0.2, 0.3]
        assert vectors[0]['metadata']['document_id'] == "doc-123"
        assert vectors[0]['metadata']['user_id'] == "user-456"
        assert vectors[0]['metadata']['chunk_index'] == 0
    
    @pytest.mark.asyncio
    async def test_upsert_embeddings_with_metadata(self, vector_client, mock_pinecone):
        """Test embedding upsert with additional metadata."""
        mock_pc, mock_index = mock_pinecone
        
        embeddings = [[0.1, 0.2, 0.3]]
        chunks = ["Test chunk"]
        chunk_indices = [0]
        metadata_list = [{"custom_field": "custom_value"}]
        
        await vector_client.upsert_embeddings(
            embeddings=embeddings,
            chunks=chunks,
            document_id="doc-123",
            user_id="user-456",
            chunk_indices=chunk_indices,
            metadata_list=metadata_list
        )
        
        call_args = mock_index.upsert.call_args[1]
        vectors = call_args['vectors']
        
        assert vectors[0]['metadata']['custom_field'] == "custom_value"
    
    @pytest.mark.asyncio
    async def test_upsert_embeddings_large_batch(self, vector_client, mock_pinecone):
        """Test embedding upsert with large batch (tests batching)."""
        mock_pc, mock_index = mock_pinecone
        
        # Create 150 embeddings to test batching (batch size is 100)
        embeddings = [[0.1, 0.2, 0.3] for _ in range(150)]
        chunks = [f"Chunk {i}" for i in range(150)]
        chunk_indices = list(range(150))
        
        await vector_client.upsert_embeddings(
            embeddings=embeddings,
            chunks=chunks,
            document_id="doc-123",
            user_id="user-456",
            chunk_indices=chunk_indices
        )
        
        # Should be called twice due to batching
        assert mock_index.upsert.call_count == 2
    
    @pytest.mark.asyncio
    async def test_upsert_embeddings_mismatched_lengths(self, vector_client):
        """Test error handling for mismatched input lengths."""
        embeddings = [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]
        chunks = ["Only one chunk"]  # Mismatched length
        chunk_indices = [0, 1]
        
        with pytest.raises(ValueError, match="must have the same length"):
            await vector_client.upsert_embeddings(
                embeddings=embeddings,
                chunks=chunks,
                document_id="doc-123",
                user_id="user-456",
                chunk_indices=chunk_indices
            )
    
    @pytest.mark.asyncio
    async def test_query_similar_success(self, vector_client, mock_pinecone):
        """Test successful similarity query."""
        mock_pc, mock_index = mock_pinecone
        
        # Mock query response
        mock_match1 = Mock()
        mock_match1.id = "doc-123_0"
        mock_match1.score = 0.95
        mock_match1.metadata = {
            "document_id": "doc-123",
            "user_id": "user-456",
            "chunk_index": 0,
            "text": "First chunk text"
        }
        
        mock_match2 = Mock()
        mock_match2.id = "doc-123_1"
        mock_match2.score = 0.85
        mock_match2.metadata = {
            "document_id": "doc-123",
            "user_id": "user-456",
            "chunk_index": 1,
            "text": "Second chunk text"
        }
        
        mock_response = Mock()
        mock_response.matches = [mock_match1, mock_match2]
        mock_index.query.return_value = mock_response
        
        query_embedding = [0.1, 0.2, 0.3]
        results = await vector_client.query_similar(
            query_embedding=query_embedding,
            user_id="user-456",
            top_k=5
        )
        
        assert len(results) == 2
        assert results[0]['id'] == "doc-123_0"
        assert results[0]['score'] == 0.95
        assert results[0]['text'] == "First chunk text"
        assert results[0]['document_id'] == "doc-123"
        
        # Verify query was called with correct parameters
        mock_index.query.assert_called_once()
        call_args = mock_index.query.call_args[1]
        assert call_args['vector'] == query_embedding
        assert call_args['top_k'] == 5
        assert call_args['include_metadata'] is True
        assert call_args['filter']['user_id']['$eq'] == "user-456"
    
    @pytest.mark.asyncio
    async def test_query_similar_with_document_filter(self, vector_client, mock_pinecone):
        """Test similarity query with document ID filter."""
        mock_pc, mock_index = mock_pinecone
        
        mock_response = Mock()
        mock_response.matches = []
        mock_index.query.return_value = mock_response
        
        query_embedding = [0.1, 0.2, 0.3]
        await vector_client.query_similar(
            query_embedding=query_embedding,
            user_id="user-456",
            document_ids=["doc-123", "doc-456"]
        )
        
        call_args = mock_index.query.call_args[1]
        filter_dict = call_args['filter']
        
        assert filter_dict['user_id']['$eq'] == "user-456"
        assert filter_dict['document_id']['$in'] == ["doc-123", "doc-456"]
    
    @pytest.mark.asyncio
    async def test_query_similar_with_min_score(self, vector_client, mock_pinecone):
        """Test similarity query with minimum score threshold."""
        mock_pc, mock_index = mock_pinecone
        
        # Mock matches with different scores
        mock_match1 = Mock()
        mock_match1.id = "doc-123_0"
        mock_match1.score = 0.95  # Above threshold
        mock_match1.metadata = {"text": "High score match"}
        
        mock_match2 = Mock()
        mock_match2.id = "doc-123_1"
        mock_match2.score = 0.3   # Below threshold
        mock_match2.metadata = {"text": "Low score match"}
        
        mock_response = Mock()
        mock_response.matches = [mock_match1, mock_match2]
        mock_index.query.return_value = mock_response
        
        query_embedding = [0.1, 0.2, 0.3]
        results = await vector_client.query_similar(
            query_embedding=query_embedding,
            user_id="user-456",
            min_score=0.5
        )
        
        # Should only return the high score match
        assert len(results) == 1
        assert results[0]['score'] == 0.95
    
    @pytest.mark.asyncio
    async def test_delete_document_embeddings_success(self, vector_client, mock_pinecone):
        """Test successful document embedding deletion."""
        mock_pc, mock_index = mock_pinecone
        
        # Mock query response for finding vector IDs
        mock_match1 = Mock()
        mock_match1.id = "doc-123_0"
        mock_match2 = Mock()
        mock_match2.id = "doc-123_1"
        
        mock_response = Mock()
        mock_response.matches = [mock_match1, mock_match2]
        mock_index.query.return_value = mock_response
        
        result = await vector_client.delete_document_embeddings("doc-123")
        
        assert result is True
        
        # Verify query was called to find vectors
        mock_index.query.assert_called_once()
        call_args = mock_index.query.call_args[1]
        assert call_args['filter']['document_id']['$eq'] == "doc-123"
        
        # Verify delete was called
        mock_index.delete.assert_called_once_with(ids=["doc-123_0", "doc-123_1"])
    
    @pytest.mark.asyncio
    async def test_delete_document_embeddings_no_vectors(self, vector_client, mock_pinecone):
        """Test document deletion when no vectors exist."""
        mock_pc, mock_index = mock_pinecone
        
        # Mock empty query response
        mock_response = Mock()
        mock_response.matches = []
        mock_index.query.return_value = mock_response
        
        result = await vector_client.delete_document_embeddings("doc-123")
        
        assert result is True
        # Delete should not be called if no vectors found
        mock_index.delete.assert_not_called()
    
    @pytest.mark.asyncio
    async def test_delete_document_embeddings_large_batch(self, vector_client, mock_pinecone):
        """Test document deletion with large number of vectors (tests batching)."""
        mock_pc, mock_index = mock_pinecone
        
        # Mock 1500 vectors to test batching (batch size is 1000)
        mock_matches = [Mock(id=f"doc-123_{i}") for i in range(1500)]
        mock_response = Mock()
        mock_response.matches = mock_matches
        mock_index.query.return_value = mock_response
        
        result = await vector_client.delete_document_embeddings("doc-123")
        
        assert result is True
        # Should be called twice due to batching
        assert mock_index.delete.call_count == 2
    
    @pytest.mark.asyncio
    async def test_delete_document_embeddings_error(self, vector_client, mock_pinecone):
        """Test error handling in document deletion."""
        mock_pc, mock_index = mock_pinecone
        
        mock_index.query.side_effect = Exception("Query failed")
        
        result = await vector_client.delete_document_embeddings("doc-123")
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_index_stats_success(self, vector_client, mock_pinecone):
        """Test successful index statistics retrieval."""
        mock_pc, mock_index = mock_pinecone
        
        mock_stats = {
            "dimension": 1536,
            "index_fullness": 0.1,
            "namespaces": {
                "": {
                    "vector_count": 1000
                }
            }
        }
        mock_index.describe_index_stats.return_value = mock_stats
        
        stats = await vector_client.get_index_stats()
        
        assert stats == mock_stats
        mock_index.describe_index_stats.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_index_stats_error(self, vector_client, mock_pinecone):
        """Test error handling in index statistics retrieval."""
        mock_pc, mock_index = mock_pinecone
        
        mock_index.describe_index_stats.side_effect = Exception("Stats failed")
        
        stats = await vector_client.get_index_stats()
        
        assert stats == {}
    
    def test_destructor_cleanup(self, vector_client):
        """Test that destructor properly cleans up thread pool."""
        # Access the executor to ensure it's created
        _ = vector_client._executor
        
        # Call destructor
        vector_client.__del__()
        
        # Should not raise any exceptions
        assert True