"""
Integration tests for search API endpoints.
"""
import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import AsyncClient


class TestSearchAPI:
    """Integration tests for search API endpoints."""
    
    @pytest.fixture
    def mock_search_service(self):
        """Mock search service for API tests."""
        mock_service = AsyncMock()
        
        # Mock successful search response
        from app.features.search.schemas import SearchResponse, SearchChunk
        
        mock_chunks = [
            SearchChunk(
                id="doc1_0",
                document_id="doc1",
                chunk_index=0,
                text="This is test content from the document.",
                score=0.95,
                metadata={"document_name": "test.txt"}
            )
        ]
        
        mock_response = SearchResponse(
            query="test query",
            answer="This is a test answer based on the document content.",
            chunks=mock_chunks,
            total_results=1,
            processing_time_ms=150,
            sources=["doc1"]
        )
        
        mock_service.search_documents.return_value = mock_response
        mock_service.get_search_history.return_value = ([], 0)
        mock_service.invalidate_user_search_cache.return_value = True
        mock_service._generate_search_suggestions.return_value = ["test", "query", "document"]
        
        return mock_service
    
    @pytest.mark.asyncio
    async def test_search_documents_success(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test successful document search via API."""
        search_data = {
            "query": "What is the main topic?",
            "top_k": 10,
            "min_score": 0.0
        }
        
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.post(
                "/api/v1/search/",
                json=search_data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["query"] == "test query"
        assert result["answer"] == "This is a test answer based on the document content."
        assert len(result["chunks"]) == 1
        assert result["total_results"] == 1
        assert len(result["sources"]) == 1
        assert result["processing_time_ms"] == 150
        
        # Verify chunk structure
        chunk = result["chunks"][0]
        assert chunk["id"] == "doc1_0"
        assert chunk["document_id"] == "doc1"
        assert chunk["score"] == 0.95
        assert "test content" in chunk["text"]
    
    @pytest.mark.asyncio
    async def test_search_documents_no_results(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test search with no results via API."""
        from app.features.search.schemas import NoResultsResponse
        
        # Mock no results response
        no_results_response = NoResultsResponse(
            query="nonexistent query",
            message="No relevant documents found for your query.",
            suggestions=["try", "different", "keywords"]
        )
        mock_search_service.search_documents.return_value = no_results_response
        
        search_data = {
            "query": "nonexistent query",
            "top_k": 10
        }
        
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.post(
                "/api/v1/search/",
                json=search_data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["query"] == "nonexistent query"
        assert result["message"] == "No relevant documents found for your query."
        assert len(result["suggestions"]) == 3
        assert "try" in result["suggestions"]
    
    @pytest.mark.asyncio
    async def test_search_documents_with_filters(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test search with document ID filters."""
        search_data = {
            "query": "filtered search",
            "document_ids": ["doc1", "doc2"],
            "top_k": 5,
            "min_score": 0.7
        }
        
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.post(
                "/api/v1/search/",
                json=search_data,
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        # Verify service was called with correct parameters
        mock_search_service.search_documents.assert_called_once()
        call_args = mock_search_service.search_documents.call_args[1]
        
        request = call_args["request"]
        assert request.query == "filtered search"
        assert request.document_ids == ["doc1", "doc2"]
        assert request.top_k == 5
        assert request.min_score == 0.7
    
    @pytest.mark.asyncio
    async def test_search_documents_validation_error(self, client: AsyncClient, auth_headers):
        """Test search with invalid request data."""
        # Empty query should fail validation
        search_data = {
            "query": "",
            "top_k": 10
        }
        
        response = await client.post(
            "/api/v1/search/",
            json=search_data,
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error
        
        error_detail = response.json()
        assert "detail" in error_detail
    
    @pytest.mark.asyncio
    async def test_search_documents_unauthorized(self, client: AsyncClient):
        """Test search without authentication."""
        search_data = {
            "query": "test query",
            "top_k": 10
        }
        
        response = await client.post("/api/v1/search/", json=search_data)
        
        assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_get_search_history_success(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test getting search history via API."""
        from app.features.search.schemas import SearchHistoryItem
        from datetime import datetime
        
        # Mock history items
        history_items = [
            SearchHistoryItem(
                id=uuid.uuid4(),
                query="previous search",
                results_count=3,
                created_at=datetime.now()
            )
        ]
        mock_search_service.get_search_history.return_value = (history_items, 1)
        
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.get(
                "/api/v1/search/history?page=1&per_page=20",
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["total"] == 1
        assert result["page"] == 1
        assert result["per_page"] == 20
        assert len(result["history"]) == 1
        assert result["history"][0]["query"] == "previous search"
        assert result["history"][0]["results_count"] == 3
    
    @pytest.mark.asyncio
    async def test_get_search_history_pagination(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test search history pagination."""
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.get(
                "/api/v1/search/history?page=2&per_page=10",
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        # Verify service was called with correct pagination
        mock_search_service.get_search_history.assert_called_once()
        call_args = mock_search_service.get_search_history.call_args[1]
        assert call_args["page"] == 2
        assert call_args["per_page"] == 10
    
    @pytest.mark.asyncio
    async def test_get_search_history_validation(self, client: AsyncClient, auth_headers):
        """Test search history with invalid pagination parameters."""
        # Invalid page number
        response = await client.get(
            "/api/v1/search/history?page=0&per_page=20",
            headers=auth_headers
        )
        
        assert response.status_code == 422
        
        # Invalid per_page (too large)
        response = await client.get(
            "/api/v1/search/history?page=1&per_page=200",
            headers=auth_headers
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_clear_search_cache_success(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test clearing search cache via API."""
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.delete(
                "/api/v1/search/cache",
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        result = response.json()
        assert "message" in result
        assert "cleared successfully" in result["message"]
        
        # Verify service method was called
        mock_search_service.invalidate_user_search_cache.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_clear_search_cache_partial_success(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test clearing search cache when cache is not active."""
        mock_search_service.invalidate_user_search_cache.return_value = False
        
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.delete(
                "/api/v1/search/cache",
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        result = response.json()
        assert "cache may not have been active" in result["message"]
    
    @pytest.mark.asyncio
    async def test_get_search_suggestions_success(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test getting search suggestions via API."""
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.get(
                "/api/v1/search/suggestions?query=machine",
                headers=auth_headers
            )
        
        assert response.status_code == 200
        
        result = response.json()
        assert result["query"] == "machine"
        assert "suggestions" in result
        assert len(result["suggestions"]) == 3
        assert "test" in result["suggestions"]
    
    @pytest.mark.asyncio
    async def test_get_search_suggestions_validation(self, client: AsyncClient, auth_headers):
        """Test search suggestions with invalid query."""
        # Empty query
        response = await client.get(
            "/api/v1/search/suggestions?query=",
            headers=auth_headers
        )
        
        assert response.status_code == 422
        
        # Query too long
        long_query = "a" * 101
        response = await client.get(
            f"/api/v1/search/suggestions?query={long_query}",
            headers=auth_headers
        )
        
        assert response.status_code == 422
    
    @pytest.mark.asyncio
    async def test_search_service_error_handling(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test API error handling when search service fails."""
        # Mock service to raise an exception
        mock_search_service.search_documents.side_effect = Exception("Service error")
        
        search_data = {
            "query": "test query",
            "top_k": 10
        }
        
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.post(
                "/api/v1/search/",
                json=search_data,
                headers=auth_headers
            )
        
        assert response.status_code == 500
        
        result = response.json()
        assert "detail" in result
        assert "error occurred while searching" in result["detail"]
    
    @pytest.mark.asyncio
    async def test_search_service_value_error_handling(self, client: AsyncClient, auth_headers, mock_search_service):
        """Test API handling of validation errors from search service."""
        # Mock service to raise a ValueError
        mock_search_service.search_documents.side_effect = ValueError("Invalid query format")
        
        search_data = {
            "query": "test query",
            "top_k": 10
        }
        
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service_class.return_value = mock_search_service
            
            response = await client.post(
                "/api/v1/search/",
                json=search_data,
                headers=auth_headers
            )
        
        assert response.status_code == 400
        
        result = response.json()
        assert result["detail"] == "Invalid query format"