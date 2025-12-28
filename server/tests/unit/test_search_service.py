"""
Unit tests for the search service functionality.
"""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.search.service import SearchService
from app.features.search.schemas import SearchRequest, SearchResponse, NoResultsResponse
from app.core.models.search import SearchHistory


class TestSearchService:
    """Test cases for SearchService."""
    
    @pytest.fixture
    def mock_openai_client(self):
        """Mock OpenAI client."""
        mock_client = AsyncMock()
        
        # Mock embedding response
        mock_embedding_response = MagicMock()
        mock_embedding_response.data = [MagicMock()]
        mock_embedding_response.data[0].embedding = [0.1] * 1536
        mock_client.embeddings.create.return_value = mock_embedding_response
        
        # Mock chat completion response
        mock_chat_response = MagicMock()
        mock_chat_response.choices = [MagicMock()]
        mock_chat_response.choices[0].message.content = "This is a test answer based on the provided context."
        mock_client.chat.completions.create.return_value = mock_chat_response
        
        return mock_client
    
    @pytest.fixture
    def mock_vector_store(self):
        """Mock vector store."""
        mock_store = AsyncMock()
        
        # Mock query response
        mock_chunks = [
            {
                "id": "doc1_0",
                "document_id": "doc1",
                "chunk_index": 0,
                "text": "This is the first chunk of text content.",
                "score": 0.95,
                "metadata": {"document_name": "test_doc.txt"}
            },
            {
                "id": "doc1_1", 
                "document_id": "doc1",
                "chunk_index": 1,
                "text": "This is the second chunk with more information.",
                "score": 0.87,
                "metadata": {"document_name": "test_doc.txt"}
            }
        ]
        mock_store.query_similar.return_value = mock_chunks
        
        return mock_store
    
    @pytest.fixture
    def search_service(self, mock_openai_client, mock_vector_store):
        """Create SearchService with mocked dependencies."""
        with patch('app.features.search.service.AsyncOpenAI') as mock_openai_class:
            mock_openai_class.return_value = mock_openai_client
            
            service = SearchService()
            service.vector_store = mock_vector_store
            
            return service
    
    @pytest.fixture
    def sample_search_request(self):
        """Sample search request."""
        return SearchRequest(
            query="What is the main topic of the document?",
            top_k=10,
            min_score=0.0
        )
    
    @pytest.fixture
    async def mock_db_session(self):
        """Mock database session."""
        mock_session = AsyncMock(spec=AsyncSession)
        mock_session.commit = AsyncMock()
        mock_session.rollback = AsyncMock()
        mock_session.add = MagicMock()
        return mock_session
    
    @pytest.mark.asyncio
    async def test_search_documents_success(
        self, 
        search_service, 
        sample_search_request, 
        mock_db_session
    ):
        """Test successful document search."""
        user_id = str(uuid.uuid4())
        
        with patch('app.features.search.service.redis_client') as mock_redis:
            # Mock cache miss
            mock_redis.get_cached_search_results.return_value = None
            mock_redis.cache_search_results.return_value = True
            
            result = await search_service.search_documents(
                request=sample_search_request,
                user_id=user_id,
                db=mock_db_session
            )
        
        # Verify result type and content
        assert isinstance(result, SearchResponse)
        assert result.query == sample_search_request.query
        assert result.answer == "This is a test answer based on the provided context."
        assert len(result.chunks) == 2
        assert result.total_results == 2
        assert len(result.sources) == 1
        assert result.sources[0] == "doc1"
        
        # Verify chunks
        assert result.chunks[0].id == "doc1_0"
        assert result.chunks[0].score == 0.95
        assert result.chunks[1].id == "doc1_1"
        assert result.chunks[1].score == 0.87
        
        # Verify search history was recorded
        mock_db_session.add.assert_called_once()
        added_item = mock_db_session.add.call_args[0][0]
        assert isinstance(added_item, SearchHistory)
        assert added_item.query == sample_search_request.query
        assert added_item.results_count == 2
    
    @pytest.mark.asyncio
    async def test_search_documents_no_results(
        self, 
        search_service, 
        sample_search_request, 
        mock_db_session
    ):
        """Test search with no results."""
        user_id = str(uuid.uuid4())
        
        # Mock empty results
        search_service.vector_store.query_similar.return_value = []
        
        with patch('app.features.search.service.redis_client') as mock_redis:
            mock_redis.get_cached_search_results.return_value = None
            mock_redis.cache_search_results.return_value = True
            
            result = await search_service.search_documents(
                request=sample_search_request,
                user_id=user_id,
                db=mock_db_session
            )
        
        # Verify no results response
        assert isinstance(result, NoResultsResponse)
        assert result.query == sample_search_request.query
        assert result.message == "No relevant documents found for your query."
        assert len(result.suggestions) > 0
        
        # Verify search history was recorded with 0 results
        mock_db_session.add.assert_called_once()
        added_item = mock_db_session.add.call_args[0][0]
        assert isinstance(added_item, SearchHistory)
        assert added_item.results_count == 0
    
    @pytest.mark.asyncio
    async def test_search_documents_cached_result(
        self, 
        search_service, 
        sample_search_request, 
        mock_db_session
    ):
        """Test search with cached results."""
        user_id = str(uuid.uuid4())
        
        # Mock cached result
        cached_response = {
            "query": sample_search_request.query,
            "answer": "Cached answer",
            "chunks": [],
            "total_results": 0,
            "processing_time_ms": 50,
            "sources": []
        }
        
        with patch('app.features.search.service.redis_client') as mock_redis:
            mock_redis.get_cached_search_results.return_value = cached_response
            
            result = await search_service.search_documents(
                request=sample_search_request,
                user_id=user_id,
                db=mock_db_session
            )
        
        # Verify cached result was returned
        assert isinstance(result, SearchResponse)
        assert result.answer == "Cached answer"
        
        # Verify vector store was not called
        search_service.vector_store.query_similar.assert_not_called()
        
        # Verify search history was still recorded
        mock_db_session.add.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_generate_query_embedding(self, search_service):
        """Test query embedding generation."""
        query = "Test query"
        
        embedding = await search_service._generate_query_embedding(query)
        
        assert len(embedding) == 1536
        assert all(isinstance(x, float) for x in embedding)
        
        # Verify OpenAI was called correctly
        search_service.openai_client.embeddings.create.assert_called_once_with(
            model=search_service.embedding_model,
            input=query
        )
    
    @pytest.mark.asyncio
    async def test_generate_answer(self, search_service):
        """Test answer generation."""
        query = "What is this about?"
        chunks = [
            {
                "document_id": "doc1",
                "chunk_index": 0,
                "text": "This is about testing.",
                "score": 0.9,
                "metadata": {}
            }
        ]
        
        answer = await search_service._generate_answer(query, chunks)
        
        assert answer == "This is a test answer based on the provided context."
        
        # Verify OpenAI chat completion was called
        search_service.openai_client.chat.completions.create.assert_called_once()
        call_args = search_service.openai_client.chat.completions.create.call_args
        
        # Check that the call included the query and context
        messages = call_args[1]["messages"]
        assert len(messages) == 2
        assert "system" in messages[0]["role"]
        assert "user" in messages[1]["role"]
        assert query in messages[1]["content"]
        assert chunks[0]["text"] in messages[1]["content"]
    
    @pytest.mark.asyncio
    async def test_generate_search_suggestions(self, search_service):
        """Test search suggestion generation."""
        query = "machine learning algorithms for data analysis"
        
        suggestions = await search_service._generate_search_suggestions(query)
        
        assert isinstance(suggestions, list)
        assert len(suggestions) <= 5
        assert len(suggestions) > 0
        
        # Should include shorter versions and individual keywords
        assert "machine learning" in suggestions
        assert "machine" in suggestions or "learning" in suggestions
    
    @pytest.mark.asyncio
    async def test_record_search_history(self, search_service, mock_db_session):
        """Test search history recording."""
        user_id = str(uuid.uuid4())
        query = "test query"
        results_count = 5
        
        await search_service._record_search_history(
            db=mock_db_session,
            user_id=user_id,
            query=query,
            results_count=results_count
        )
        
        # Verify search history was added
        mock_db_session.add.assert_called_once()
        added_item = mock_db_session.add.call_args[0][0]
        
        assert isinstance(added_item, SearchHistory)
        assert str(added_item.user_id) == user_id
        assert added_item.query == query
        assert added_item.results_count == results_count
        
        # Verify commit was called
        mock_db_session.commit.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_search_history(self, search_service, mock_db_session):
        """Test search history retrieval."""
        user_id = str(uuid.uuid4())
        
        # Mock database query results
        mock_history_record = MagicMock()
        mock_history_record.id = uuid.uuid4()
        mock_history_record.query = "test query"
        mock_history_record.results_count = 3
        mock_history_record.created_at = "2024-01-01T00:00:00"
        
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [mock_history_record]
        mock_db_session.execute.return_value = mock_result
        
        history_items, total_count = await search_service.get_search_history(
            user_id=user_id,
            db=mock_db_session,
            page=1,
            per_page=20
        )
        
        assert len(history_items) == 1
        assert history_items[0].query == "test query"
        assert history_items[0].results_count == 3
        assert total_count == 1
    
    @pytest.mark.asyncio
    async def test_invalidate_user_search_cache(self, search_service):
        """Test search cache invalidation."""
        user_id = str(uuid.uuid4())
        
        with patch('app.features.search.service.redis_client') as mock_redis:
            mock_redis.invalidate_user_cache.return_value = 5
            
            result = await search_service.invalidate_user_search_cache(user_id)
            
            assert result is True
            mock_redis.invalidate_user_cache.assert_called_once_with(user_id, "search*")
    
    @pytest.mark.asyncio
    async def test_search_with_document_filter(
        self, 
        search_service, 
        mock_db_session
    ):
        """Test search with document ID filter."""
        user_id = str(uuid.uuid4())
        document_ids = ["doc1", "doc2"]
        
        request = SearchRequest(
            query="test query",
            document_ids=document_ids,
            top_k=5
        )
        
        with patch('app.features.search.service.redis_client') as mock_redis:
            mock_redis.get_cached_search_results.return_value = None
            mock_redis.cache_search_results.return_value = True
            
            await search_service.search_documents(
                request=request,
                user_id=user_id,
                db=mock_db_session
            )
        
        # Verify vector store was called with document filter
        search_service.vector_store.query_similar.assert_called_once()
        call_args = search_service.vector_store.query_similar.call_args[1]
        assert call_args["document_ids"] == document_ids
        assert call_args["top_k"] == 5
    
    @pytest.mark.asyncio
    async def test_search_service_initialization_error(self):
        """Test SearchService initialization without OpenAI API key."""
        with patch('app.features.search.service.settings') as mock_settings:
            mock_settings.openai_api_key = None
            
            with pytest.raises(ValueError, match="OpenAI API key is required"):
                SearchService()