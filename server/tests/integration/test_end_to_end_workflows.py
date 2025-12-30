"""
End-to-end integration tests for complete user workflows.
Tests complete user journeys from registration to document search.
"""
import pytest
import asyncio
import uuid
import io
from httpx import AsyncClient
from fastapi import status
from unittest.mock import patch, Mock, AsyncMock


@pytest.mark.integration
@pytest.mark.e2e
class TestEndToEndWorkflows:
    """End-to-end test suite for complete user workflows."""
    
    @pytest.mark.asyncio
    async def test_complete_user_registration_workflow(self, client: AsyncClient):
        """Test complete user registration and authentication workflow."""
        # Step 1: Register new user
        registration_data = {
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "securepassword123",
            "full_name": "New User"
        }
        
        register_response = await client.post("/api/v1/auth/register", json=registration_data)
        assert register_response.status_code == status.HTTP_201_CREATED
        
        register_result = register_response.json()
        assert register_result["user"]["email"] == "newuser@example.com"
        assert register_result["user"]["username"] == "newuser"
        assert "tokens" in register_result
        
        # Step 2: Login with new credentials
        login_data = {
            "email": "newuser@example.com",
            "password": "securepassword123"
        }
        
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == status.HTTP_200_OK
        
        login_result = login_response.json()
        assert "tokens" in login_result
        assert "access_token" in login_result["tokens"]
        assert "refresh_token" in login_result["tokens"]
        
        # Step 3: Use access token to access protected endpoint
        auth_headers = {"Authorization": f"Bearer {login_result['tokens']['access_token']}"}
        
        profile_response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert profile_response.status_code == status.HTTP_200_OK
        
        profile_data = profile_response.json()
        assert profile_data["email"] == "newuser@example.com"
        assert profile_data["username"] == "newuser"
        
        # Step 4: Test token refresh
        refresh_data = {"refresh_token": login_result["tokens"]["refresh_token"]}
        
        refresh_response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        assert refresh_response.status_code == status.HTTP_200_OK
        
        refresh_result = refresh_response.json()
        assert "tokens" in refresh_result
        assert refresh_result["tokens"]["access_token"] != login_result["tokens"]["access_token"]
    
    @pytest.mark.asyncio
    async def test_complete_document_upload_and_processing_workflow(self, client: AsyncClient, auth_headers):
        """Test complete document upload, processing, and management workflow."""
        # Step 1: Upload document
        test_content = """# Test Document for E2E Testing

This is a comprehensive test document that contains multiple sections and various types of content.

## Introduction
This document will be processed by the RAG system to test the complete workflow from upload to search.

## Technical Content
- API endpoints and REST services
- Database operations and queries
- Machine learning and AI processing
- Vector embeddings and similarity search

## Code Examples
```python
def process_document(content):
    chunks = split_text(content)
    embeddings = generate_embeddings(chunks)
    return store_embeddings(embeddings)
```

## Conclusion
This document provides comprehensive content for testing the document processing pipeline.
"""
        
        files = {"file": ("test-document.md", io.BytesIO(test_content.encode('utf-8')), "text/markdown")}
        data = {"name": "E2E Test Document"}
        
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert upload_response.status_code == status.HTTP_200_OK
        
        upload_result = upload_response.json()
        document_id = upload_result["document"]["id"]
        assert upload_result["document"]["name"] == "E2E Test Document"
        assert upload_result["document"]["status"] == "pending"
        
        # Step 2: Check document status (should be pending initially)
        status_response = await client.get(
            f"/api/v1/documents/{document_id}/status",
            headers=auth_headers
        )
        assert status_response.status_code == status.HTTP_200_OK
        
        status_data = status_response.json()
        assert status_data["id"] == document_id
        assert status_data["status"] in ["pending", "processing", "completed"]
        
        # Step 3: Get document details
        details_response = await client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers
        )
        assert details_response.status_code == status.HTTP_200_OK
        
        details_data = details_response.json()
        assert details_data["id"] == document_id
        assert details_data["file_type"] == "md"
        assert details_data["file_size"] > 0
        
        # Step 4: List documents (should include our uploaded document)
        list_response = await client.get("/api/v1/documents/", headers=auth_headers)
        assert list_response.status_code == status.HTTP_200_OK
        
        list_data = list_response.json()
        assert list_data["total"] >= 1
        
        # Find our document in the list
        uploaded_doc = None
        for doc in list_data["documents"]:
            if doc["id"] == document_id:
                uploaded_doc = doc
                break
        
        assert uploaded_doc is not None
        assert uploaded_doc["name"] == "E2E Test Document"
        
        # Step 5: Generate download URL
        download_response = await client.get(
            f"/api/v1/documents/{document_id}/download",
            headers=auth_headers
        )
        assert download_response.status_code == status.HTTP_200_OK
        
        download_data = download_response.json()
        assert "download_url" in download_data
        assert "expires_in" in download_data
        
        return document_id
    
    @pytest.mark.asyncio
    async def test_complete_search_workflow_with_mocked_processing(self, client: AsyncClient, auth_headers):
        """Test complete search workflow with mocked document processing."""
        # First upload and "process" a document (mocked)
        test_content = """Machine Learning and Artificial Intelligence

Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.

Key concepts include:
- Supervised learning with labeled datasets
- Unsupervised learning for pattern discovery
- Neural networks and deep learning architectures
- Natural language processing and text analysis

Applications of machine learning include:
- Recommendation systems
- Image recognition and computer vision
- Speech recognition and synthesis
- Predictive analytics and forecasting
"""
        
        files = {"file": ("ml-guide.txt", io.BytesIO(test_content.encode('utf-8')), "text/plain")}
        data = {"name": "Machine Learning Guide"}
        
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        document_id = upload_response.json()["document"]["id"]
        
        # Mock search service for testing search workflow
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            
            # Mock successful search response
            from app.features.search.schemas import SearchResponse, SearchChunk
            
            mock_chunks = [
                SearchChunk(
                    id=f"{document_id}_0",
                    document_id=document_id,
                    chunk_index=0,
                    text="Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models.",
                    score=0.92,
                    metadata={"document_name": "Machine Learning Guide"}
                ),
                SearchChunk(
                    id=f"{document_id}_1",
                    document_id=document_id,
                    chunk_index=1,
                    text="Key concepts include supervised learning, unsupervised learning, neural networks, and natural language processing.",
                    score=0.88,
                    metadata={"document_name": "Machine Learning Guide"}
                )
            ]
            
            mock_response = SearchResponse(
                query="What is machine learning?",
                answer="Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models. It includes key concepts like supervised learning with labeled datasets, unsupervised learning for pattern discovery, neural networks and deep learning architectures, and natural language processing.",
                chunks=mock_chunks,
                total_results=2,
                processing_time_ms=245,
                sources=[document_id]
            )
            
            mock_service.search_documents.return_value = mock_response
            
            # Step 1: Perform search
            search_data = {
                "query": "What is machine learning?",
                "top_k": 10,
                "min_score": 0.0
            }
            
            search_response = await client.post(
                "/api/v1/search/",
                json=search_data,
                headers=auth_headers
            )
            assert search_response.status_code == status.HTTP_200_OK
            
            search_result = search_response.json()
            assert search_result["query"] == "What is machine learning?"
            assert "machine learning" in search_result["answer"].lower()
            assert len(search_result["chunks"]) == 2
            assert search_result["total_results"] == 2
            assert len(search_result["sources"]) == 1
            
            # Verify chunks contain expected content
            for chunk in search_result["chunks"]:
                assert chunk["document_id"] == document_id
                assert chunk["score"] > 0.8
                assert "machine learning" in chunk["text"].lower()
            
            # Step 2: Check search history
            mock_service.get_search_history.return_value = ([
                {
                    "id": str(uuid.uuid4()),
                    "query": "What is machine learning?",
                    "results_count": 2,
                    "created_at": "2024-01-01T12:00:00Z"
                }
            ], 1)
            
            history_response = await client.get(
                "/api/v1/search/history",
                headers=auth_headers
            )
            assert history_response.status_code == status.HTTP_200_OK
            
            history_data = history_response.json()
            assert history_data["total"] == 1
            assert len(history_data["history"]) == 1
            assert history_data["history"][0]["query"] == "What is machine learning?"
            
            # Step 3: Test search suggestions
            mock_service._generate_search_suggestions.return_value = [
                "machine learning algorithms",
                "artificial intelligence",
                "neural networks"
            ]
            
            suggestions_response = await client.get(
                "/api/v1/search/suggestions?query=machine",
                headers=auth_headers
            )
            assert suggestions_response.status_code == status.HTTP_200_OK
            
            suggestions_data = suggestions_response.json()
            assert suggestions_data["query"] == "machine"
            assert len(suggestions_data["suggestions"]) == 3
            assert "machine learning algorithms" in suggestions_data["suggestions"]
    
    @pytest.mark.asyncio
    async def test_folder_management_workflow(self, client: AsyncClient, auth_headers):
        """Test complete folder management workflow."""
        # Step 1: Create root folder
        folder_data = {"name": "Research Papers"}
        
        create_response = await client.post(
            "/api/v1/folders/",
            json=folder_data,
            headers=auth_headers
        )
        assert create_response.status_code == status.HTTP_201_CREATED
        
        folder_result = create_response.json()
        root_folder_id = folder_result["id"]
        assert folder_result["name"] == "Research Papers"
        assert folder_result["path"] == "/Research Papers"
        
        # Step 2: Create subfolder
        subfolder_data = {
            "name": "Machine Learning",
            "parent_id": root_folder_id
        }
        
        subfolder_response = await client.post(
            "/api/v1/folders/",
            json=subfolder_data,
            headers=auth_headers
        )
        assert subfolder_response.status_code == status.HTTP_201_CREATED
        
        subfolder_result = subfolder_response.json()
        subfolder_id = subfolder_result["id"]
        assert subfolder_result["name"] == "Machine Learning"
        assert subfolder_result["path"] == "/Research Papers/Machine Learning"
        
        # Step 3: Upload document to subfolder
        test_content = "This is a research paper about machine learning algorithms."
        files = {"file": ("ml-paper.txt", io.BytesIO(test_content.encode('utf-8')), "text/plain")}
        data = {
            "name": "ML Research Paper",
            "folder_id": subfolder_id
        }
        
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert upload_response.status_code == status.HTTP_200_OK
        
        document_result = upload_response.json()
        document_id = document_result["document"]["id"]
        assert document_result["document"]["folder_id"] == subfolder_id
        
        # Step 4: List folder contents
        contents_response = await client.get(
            f"/api/v1/folders/{subfolder_id}/contents",
            headers=auth_headers
        )
        assert contents_response.status_code == status.HTTP_200_OK
        
        contents_data = contents_response.json()
        assert len(contents_data["documents"]) == 1
        assert contents_data["documents"][0]["id"] == document_id
        
        # Step 5: Move document to root folder
        move_data = {"folder_id": root_folder_id}
        
        move_response = await client.patch(
            f"/api/v1/documents/{document_id}",
            json=move_data,
            headers=auth_headers
        )
        assert move_response.status_code == status.HTTP_200_OK
        
        # Verify document moved
        moved_doc_response = await client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers
        )
        moved_doc_data = moved_doc_response.json()
        assert moved_doc_data["folder_id"] == root_folder_id
        
        # Step 6: Rename folder
        rename_data = {"name": "AI Research"}
        
        rename_response = await client.patch(
            f"/api/v1/folders/{root_folder_id}",
            json=rename_data,
            headers=auth_headers
        )
        assert rename_response.status_code == status.HTTP_200_OK
        
        renamed_folder = rename_response.json()
        assert renamed_folder["name"] == "AI Research"
        assert renamed_folder["path"] == "/AI Research"
        
        # Step 7: Delete empty subfolder
        delete_response = await client.delete(
            f"/api/v1/folders/{subfolder_id}",
            headers=auth_headers
        )
        assert delete_response.status_code == status.HTTP_200_OK
        
        # Verify subfolder is deleted
        get_deleted_response = await client.get(
            f"/api/v1/folders/{subfolder_id}",
            headers=auth_headers
        )
        assert get_deleted_response.status_code == status.HTTP_404_NOT_FOUND
    
    @pytest.mark.asyncio
    async def test_error_recovery_workflow(self, client: AsyncClient, auth_headers):
        """Test error scenarios and recovery mechanisms."""
        # Test 1: Invalid file upload
        invalid_files = {"file": ("malware.exe", io.BytesIO(b"fake executable"), "application/octet-stream")}
        
        invalid_upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=invalid_files
        )
        assert invalid_upload_response.status_code == status.HTTP_400_BAD_REQUEST
        
        error_data = invalid_upload_response.json()
        assert "not supported" in error_data["detail"]
        
        # Test 2: Access non-existent document
        fake_doc_id = str(uuid.uuid4())
        
        not_found_response = await client.get(
            f"/api/v1/documents/{fake_doc_id}",
            headers=auth_headers
        )
        assert not_found_response.status_code == status.HTTP_404_NOT_FOUND
        
        # Test 3: Invalid search query
        invalid_search_data = {"query": "", "top_k": 10}
        
        invalid_search_response = await client.post(
            "/api/v1/search/",
            json=invalid_search_data,
            headers=auth_headers
        )
        assert invalid_search_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test 4: Unauthorized access (no auth headers)
        unauth_response = await client.get("/api/v1/documents/")
        assert unauth_response.status_code == status.HTTP_401_UNAUTHORIZED
        
        # Test 5: Invalid token
        invalid_headers = {"Authorization": "Bearer invalid-token"}
        
        invalid_token_response = await client.get(
            "/api/v1/documents/",
            headers=invalid_headers
        )
        assert invalid_token_response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_concurrent_operations_workflow(self, client: AsyncClient, auth_headers):
        """Test concurrent operations to verify system stability."""
        # Upload multiple documents concurrently
        upload_tasks = []
        
        for i in range(5):
            content = f"This is test document number {i} for concurrent testing."
            files = {"file": (f"test-{i}.txt", io.BytesIO(content.encode('utf-8')), "text/plain")}
            data = {"name": f"Concurrent Test Doc {i}"}
            
            task = client.post(
                "/api/v1/documents/upload",
                headers=auth_headers,
                files=files,
                data=data
            )
            upload_tasks.append(task)
        
        # Execute all uploads concurrently
        upload_responses = await asyncio.gather(*upload_tasks)
        
        # Verify all uploads succeeded
        document_ids = []
        for response in upload_responses:
            assert response.status_code == status.HTTP_200_OK
            result = response.json()
            document_ids.append(result["document"]["id"])
        
        assert len(document_ids) == 5
        assert len(set(document_ids)) == 5  # All IDs should be unique
        
        # Perform concurrent document operations
        operation_tasks = []
        
        for doc_id in document_ids:
            # Get document details
            operation_tasks.append(client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers))
            # Get document status
            operation_tasks.append(client.get(f"/api/v1/documents/{doc_id}/status", headers=auth_headers))
        
        operation_responses = await asyncio.gather(*operation_tasks)
        
        # Verify all operations succeeded
        for response in operation_responses:
            assert response.status_code == status.HTTP_200_OK
        
        # Clean up - delete all test documents
        delete_tasks = []
        for doc_id in document_ids:
            delete_tasks.append(client.delete(f"/api/v1/documents/{doc_id}", headers=auth_headers))
        
        delete_responses = await asyncio.gather(*delete_tasks)
        
        # Verify all deletions succeeded
        for response in delete_responses:
            assert response.status_code == status.HTTP_200_OK
    
    @pytest.mark.asyncio
    async def test_data_consistency_workflow(self, client: AsyncClient, auth_headers):
        """Test data consistency across operations."""
        # Step 1: Create folder and upload document
        folder_data = {"name": "Consistency Test"}
        folder_response = await client.post("/api/v1/folders/", json=folder_data, headers=auth_headers)
        folder_id = folder_response.json()["id"]
        
        content = "This document tests data consistency across operations."
        files = {"file": ("consistency.txt", io.BytesIO(content.encode('utf-8')), "text/plain")}
        data = {"name": "Consistency Test Doc", "folder_id": folder_id}
        
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        document_id = upload_response.json()["document"]["id"]
        
        # Step 2: Verify document appears in folder contents
        contents_response = await client.get(f"/api/v1/folders/{folder_id}/contents", headers=auth_headers)
        contents_data = contents_response.json()
        
        assert len(contents_data["documents"]) == 1
        assert contents_data["documents"][0]["id"] == document_id
        
        # Step 3: Verify document appears in user's document list
        list_response = await client.get("/api/v1/documents/", headers=auth_headers)
        list_data = list_response.json()
        
        found_document = None
        for doc in list_data["documents"]:
            if doc["id"] == document_id:
                found_document = doc
                break
        
        assert found_document is not None
        assert found_document["folder_id"] == folder_id
        
        # Step 4: Move document out of folder
        move_data = {"folder_id": None}
        move_response = await client.patch(f"/api/v1/documents/{document_id}", json=move_data, headers=auth_headers)
        assert move_response.status_code == status.HTTP_200_OK
        
        # Step 5: Verify document no longer in folder contents
        updated_contents_response = await client.get(f"/api/v1/folders/{folder_id}/contents", headers=auth_headers)
        updated_contents_data = updated_contents_response.json()
        
        assert len(updated_contents_data["documents"]) == 0
        
        # Step 6: Verify document still in user's document list but without folder
        updated_list_response = await client.get("/api/v1/documents/", headers=auth_headers)
        updated_list_data = updated_list_response.json()
        
        updated_document = None
        for doc in updated_list_data["documents"]:
            if doc["id"] == document_id:
                updated_document = doc
                break
        
        assert updated_document is not None
        assert updated_document["folder_id"] is None
        
        # Step 7: Delete document and verify cleanup
        delete_response = await client.delete(f"/api/v1/documents/{document_id}", headers=auth_headers)
        assert delete_response.status_code == status.HTTP_200_OK
        
        # Verify document is completely removed
        final_list_response = await client.get("/api/v1/documents/", headers=auth_headers)
        final_list_data = final_list_response.json()
        
        for doc in final_list_data["documents"]:
            assert doc["id"] != document_id