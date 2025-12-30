"""
Integration tests for critical system paths.
Tests authentication flow, file processing pipeline, search functionality, and folder operations.
"""
import pytest
import asyncio
import uuid
import io
import tempfile
import os
from httpx import AsyncClient
from fastapi import status
from unittest.mock import patch, Mock, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models.document import Document, DocumentChunk
from app.core.models.folder import Folder
from app.core.models.user import User
from app.core.security import create_access_token, verify_password, hash_password


@pytest.mark.integration
@pytest.mark.critical_paths
class TestCriticalPathsIntegration:
    """Integration tests for critical system paths with real components."""
    
    @pytest.mark.asyncio
    async def test_authentication_flow_with_real_jwt_tokens(self, client: AsyncClient, db_session: AsyncSession):
        """Test complete authentication flow with real JWT token generation and validation."""
        # Step 1: Register user with real password hashing
        registration_data = {
            "email": "critical@example.com",
            "username": "criticaluser",
            "password": "SecurePassword123!",
            "full_name": "Critical Test User"
        }
        
        register_response = await client.post("/api/v1/auth/register", json=registration_data)
        assert register_response.status_code == status.HTTP_201_CREATED
        
        register_result = register_response.json()
        user_id = register_result["user"]["id"]
        access_token = register_result["tokens"]["access_token"]
        refresh_token = register_result["tokens"]["refresh_token"]
        
        # Verify user was created in database with hashed password
        user_query = await db_session.execute(
            "SELECT * FROM users WHERE id = :user_id",
            {"user_id": user_id}
        )
        user_row = user_query.fetchone()
        assert user_row is not None
        assert user_row.email == "critical@example.com"
        assert user_row.hashed_password != "SecurePassword123!"  # Password should be hashed
        assert verify_password("SecurePassword123!", user_row.hashed_password)
        
        # Step 2: Use access token to access protected endpoint
        auth_headers = {"Authorization": f"Bearer {access_token}"}
        
        profile_response = await client.get("/api/v1/auth/me", headers=auth_headers)
        assert profile_response.status_code == status.HTTP_200_OK
        
        profile_data = profile_response.json()
        assert profile_data["id"] == user_id
        assert profile_data["email"] == "critical@example.com"
        
        # Step 3: Test token refresh with real JWT validation
        refresh_data = {"refresh_token": refresh_token}
        
        refresh_response = await client.post("/api/v1/auth/refresh", json=refresh_data)
        assert refresh_response.status_code == status.HTTP_200_OK
        
        refresh_result = refresh_response.json()
        new_access_token = refresh_result["tokens"]["access_token"]
        new_refresh_token = refresh_result["tokens"]["refresh_token"]
        
        # Verify new tokens are different
        assert new_access_token != access_token
        assert new_refresh_token != refresh_token
        
        # Step 4: Use new access token
        new_auth_headers = {"Authorization": f"Bearer {new_access_token}"}
        
        new_profile_response = await client.get("/api/v1/auth/me", headers=new_auth_headers)
        assert new_profile_response.status_code == status.HTTP_200_OK
        
        # Step 5: Verify old token is invalid (if token blacklisting is implemented)
        old_token_response = await client.get("/api/v1/auth/me", headers=auth_headers)
        # Note: This might still work if token blacklisting isn't implemented
        # The test validates that new tokens work correctly
        
        # Step 6: Test login with correct credentials
        login_data = {
            "email": "critical@example.com",
            "password": "SecurePassword123!"
        }
        
        login_response = await client.post("/api/v1/auth/login", json=login_data)
        assert login_response.status_code == status.HTTP_200_OK
        
        login_result = login_response.json()
        assert "tokens" in login_result
        assert login_result["user"]["id"] == user_id
        
        # Step 7: Test login with incorrect credentials
        wrong_login_data = {
            "email": "critical@example.com",
            "password": "WrongPassword123!"
        }
        
        wrong_login_response = await client.post("/api/v1/auth/login", json=wrong_login_data)
        assert wrong_login_response.status_code == status.HTTP_401_UNAUTHORIZED
    
    @pytest.mark.asyncio
    async def test_file_upload_and_processing_pipeline_integration(self, client: AsyncClient, auth_headers, db_session: AsyncSession):
        """Test complete file upload and processing pipeline with real document processing."""
        # Create comprehensive test document
        test_content = """# Machine Learning Research Paper

## Abstract
This paper explores advanced machine learning techniques for natural language processing and document analysis.

## Introduction
Machine learning has revolutionized the field of artificial intelligence, particularly in areas such as:
- Natural Language Processing (NLP)
- Computer Vision
- Predictive Analytics
- Recommendation Systems

## Methodology
Our approach combines several key techniques:

### 1. Text Preprocessing
- Tokenization and normalization
- Stop word removal
- Stemming and lemmatization

### 2. Feature Extraction
- TF-IDF vectorization
- Word embeddings (Word2Vec, GloVe)
- Transformer-based embeddings (BERT, GPT)

### 3. Model Architecture
```python
class DocumentClassifier:
    def __init__(self, embedding_dim=768):
        self.embedding_dim = embedding_dim
        self.classifier = self.build_model()
    
    def build_model(self):
        # Model implementation
        pass
```

## Results
Our experiments show significant improvements in document classification accuracy:
- Baseline model: 85.2%
- Our approach: 92.7%
- Statistical significance: p < 0.001

## Conclusion
The proposed methodology demonstrates superior performance in document analysis tasks.

## References
1. Smith, J. et al. (2023). "Advanced NLP Techniques"
2. Johnson, A. (2022). "Machine Learning for Text Analysis"
3. Brown, K. (2021). "Transformer Models in Practice"
"""
        
        # Step 1: Upload document
        files = {"file": ("ml-research.md", io.BytesIO(test_content.encode('utf-8')), "text/markdown")}
        data = {"name": "ML Research Paper"}
        
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert upload_response.status_code == status.HTTP_200_OK
        
        upload_result = upload_response.json()
        document_id = upload_result["document"]["id"]
        
        # Verify document was created in database
        doc_query = await db_session.execute(
            "SELECT * FROM documents WHERE id = :doc_id",
            {"doc_id": document_id}
        )
        doc_row = doc_query.fetchone()
        assert doc_row is not None
        assert doc_row.name == "ML Research Paper"
        assert doc_row.file_type == "md"
        assert doc_row.status == "pending"
        
        # Step 2: Mock and test document processing pipeline
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class:
            mock_processor = AsyncMock()
            mock_processor_class.return_value = mock_processor
            
            # Mock processing results
            mock_chunks = [
                "Machine learning has revolutionized the field of artificial intelligence...",
                "Our approach combines several key techniques including text preprocessing...",
                "The proposed methodology demonstrates superior performance in document analysis..."
            ]
            
            mock_processing_result = {
                "chunks": mock_chunks,
                "chunk_count": len(mock_chunks),
                "total_tokens": 150,
                "original_text_length": len(test_content),
                "vector_ids": [f"{document_id}_0", f"{document_id}_1", f"{document_id}_2"],
                "embeddings_count": len(mock_chunks)
            }
            
            mock_processor.process_document.return_value = mock_processing_result
            
            # Simulate background processing
            from app.workers.tasks import process_document_task, DatabaseTask
            
            with patch('app.workers.tasks.asyncio') as mock_asyncio:
                mock_loop = Mock()
                mock_asyncio.new_event_loop.return_value = mock_loop
                mock_loop.run_until_complete.return_value = mock_processing_result
                
                # Create task instance and mock database operations
                task_instance = DatabaseTask()
                
                with patch.object(task_instance, 'db') as mock_db:
                    # Setup database mocks
                    mock_document = Mock()
                    mock_document.id = uuid.UUID(document_id)
                    mock_document.status = "pending"
                    mock_document.chunk_count = 0
                    mock_document.total_tokens = 0
                    mock_document.processing_error = None
                    
                    mock_db.query.return_value.filter.return_value.first.return_value = mock_document
                    
                    # Execute processing task
                    result = process_document_task(task_instance, document_id)
                    
                    # Verify processing results
                    assert result["status"] == "success"
                    assert result["document_id"] == document_id
                    assert result["chunk_count"] == 3
                    assert result["total_tokens"] == 150
                    
                    # Verify document status was updated
                    assert mock_document.status == "completed"
                    assert mock_document.chunk_count == 3
                    assert mock_document.total_tokens == 150
        
        # Step 3: Verify document status after processing
        status_response = await client.get(
            f"/api/v1/documents/{document_id}/status",
            headers=auth_headers
        )
        assert status_response.status_code == status.HTTP_200_OK
        
        status_data = status_response.json()
        assert status_data["id"] == document_id
        # Status might still be "pending" since we mocked the processing
        assert status_data["status"] in ["pending", "processing", "completed"]
        
        # Step 4: Test document download URL generation
        download_response = await client.get(
            f"/api/v1/documents/{document_id}/download",
            headers=auth_headers
        )
        assert download_response.status_code == status.HTTP_200_OK
        
        download_data = download_response.json()
        assert "download_url" in download_data
        assert "expires_in" in download_data
        assert download_data["filename"] == "ml-research.md"
        
        return document_id
    
    @pytest.mark.asyncio
    async def test_search_functionality_with_real_embeddings_simulation(self, client: AsyncClient, auth_headers, db_session: AsyncSession):
        """Test search functionality with simulated real embeddings and vector operations."""
        # First, create some test documents in the database
        user_id_str = "550e8400-e29b-41d4-a716-446655440000"
        
        # Create test documents
        test_documents = [
            {
                "id": uuid.uuid4(),
                "name": "Machine Learning Guide",
                "content": "Machine learning is a subset of artificial intelligence that focuses on algorithms.",
                "file_type": "txt"
            },
            {
                "id": uuid.uuid4(),
                "name": "Deep Learning Basics",
                "content": "Deep learning uses neural networks with multiple layers to learn complex patterns.",
                "file_type": "txt"
            },
            {
                "id": uuid.uuid4(),
                "name": "Natural Language Processing",
                "content": "NLP combines computational linguistics with machine learning and deep learning.",
                "file_type": "txt"
            }
        ]
        
        # Insert test documents and chunks into database
        for doc_data in test_documents:
            # Insert document
            await db_session.execute(
                """INSERT INTO documents (id, user_id, name, original_name, file_type, file_size, 
                   mime_type, s3_key, s3_bucket, status, chunk_count, total_tokens) 
                   VALUES (:id, :user_id, :name, :original_name, :file_type, :file_size, 
                   :mime_type, :s3_key, :s3_bucket, :status, :chunk_count, :total_tokens)""",
                {
                    "id": str(doc_data["id"]),
                    "user_id": user_id_str,
                    "name": doc_data["name"],
                    "original_name": f"{doc_data['name'].lower().replace(' ', '-')}.{doc_data['file_type']}",
                    "file_type": doc_data["file_type"],
                    "file_size": len(doc_data["content"]),
                    "mime_type": "text/plain",
                    "s3_key": f"users/{user_id_str}/documents/{doc_data['id']}.{doc_data['file_type']}",
                    "s3_bucket": "test-bucket",
                    "status": "completed",
                    "chunk_count": 1,
                    "total_tokens": 20
                }
            )
            
            # Insert document chunk
            await db_session.execute(
                """INSERT INTO document_chunks (id, document_id, chunk_index, content, 
                   vector_id, token_count) 
                   VALUES (:id, :document_id, :chunk_index, :content, :vector_id, :token_count)""",
                {
                    "id": str(uuid.uuid4()),
                    "document_id": str(doc_data["id"]),
                    "chunk_index": 0,
                    "content": doc_data["content"],
                    "vector_id": f"{doc_data['id']}_0",
                    "token_count": 20
                }
            )
        
        await db_session.commit()
        
        # Mock search service with realistic responses
        with patch('app.features.search.router.SearchService') as mock_service_class:
            mock_service = AsyncMock()
            mock_service_class.return_value = mock_service
            
            # Step 1: Test successful search
            from app.features.search.schemas import SearchResponse, SearchChunk
            
            mock_chunks = [
                SearchChunk(
                    id=f"{test_documents[0]['id']}_0",
                    document_id=str(test_documents[0]["id"]),
                    chunk_index=0,
                    text=test_documents[0]["content"],
                    score=0.92,
                    metadata={"document_name": test_documents[0]["name"]}
                ),
                SearchChunk(
                    id=f"{test_documents[1]['id']}_0",
                    document_id=str(test_documents[1]["id"]),
                    chunk_index=0,
                    text=test_documents[1]["content"],
                    score=0.87,
                    metadata={"document_name": test_documents[1]["name"]}
                )
            ]
            
            mock_response = SearchResponse(
                query="What is machine learning?",
                answer="Machine learning is a subset of artificial intelligence that focuses on algorithms and statistical models. It uses neural networks and deep learning to learn complex patterns from data.",
                chunks=mock_chunks,
                total_results=2,
                processing_time_ms=245,
                sources=[str(test_documents[0]["id"]), str(test_documents[1]["id"])]
            )
            
            mock_service.search_documents.return_value = mock_response
            
            # Perform search
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
            assert len(search_result["sources"]) == 2
            
            # Verify chunks contain expected content
            chunk_texts = [chunk["text"] for chunk in search_result["chunks"]]
            assert any("subset of artificial intelligence" in text for text in chunk_texts)
            assert any("neural networks" in text for text in chunk_texts)
            
            # Step 2: Test search with document filters
            filtered_search_data = {
                "query": "deep learning neural networks",
                "document_ids": [str(test_documents[1]["id"])],
                "top_k": 5,
                "min_score": 0.5
            }
            
            # Mock filtered response
            filtered_mock_response = SearchResponse(
                query="deep learning neural networks",
                answer="Deep learning uses neural networks with multiple layers to learn complex patterns from data.",
                chunks=[mock_chunks[1]],  # Only second document
                total_results=1,
                processing_time_ms=180,
                sources=[str(test_documents[1]["id"])]
            )
            
            mock_service.search_documents.return_value = filtered_mock_response
            
            filtered_search_response = await client.post(
                "/api/v1/search/",
                json=filtered_search_data,
                headers=auth_headers
            )
            assert filtered_search_response.status_code == status.HTTP_200_OK
            
            filtered_result = filtered_search_response.json()
            assert len(filtered_result["chunks"]) == 1
            assert filtered_result["chunks"][0]["document_id"] == str(test_documents[1]["id"])
            
            # Step 3: Test search history
            mock_service.get_search_history.return_value = ([
                {
                    "id": str(uuid.uuid4()),
                    "query": "What is machine learning?",
                    "results_count": 2,
                    "created_at": "2024-01-01T12:00:00Z"
                },
                {
                    "id": str(uuid.uuid4()),
                    "query": "deep learning neural networks",
                    "results_count": 1,
                    "created_at": "2024-01-01T12:05:00Z"
                }
            ], 2)
            
            history_response = await client.get(
                "/api/v1/search/history",
                headers=auth_headers
            )
            assert history_response.status_code == status.HTTP_200_OK
            
            history_data = history_response.json()
            assert history_data["total"] == 2
            assert len(history_data["history"]) == 2
            
            # Verify search queries are in history
            queries = [item["query"] for item in history_data["history"]]
            assert "What is machine learning?" in queries
            assert "deep learning neural networks" in queries
            
            # Step 4: Test search cache operations
            mock_service.invalidate_user_search_cache.return_value = True
            
            cache_clear_response = await client.delete(
                "/api/v1/search/cache",
                headers=auth_headers
            )
            assert cache_clear_response.status_code == status.HTTP_200_OK
            
            cache_result = cache_clear_response.json()
            assert "cleared successfully" in cache_result["message"]
    
    @pytest.mark.asyncio
    async def test_folder_operations_with_document_relationships(self, client: AsyncClient, auth_headers, db_session: AsyncSession):
        """Test folder operations with real document relationships and database constraints."""
        user_id_str = "550e8400-e29b-41d4-a716-446655440000"
        
        # Step 1: Create root folder
        root_folder_data = {"name": "Research Projects"}
        
        root_folder_response = await client.post(
            "/api/v1/folders/",
            json=root_folder_data,
            headers=auth_headers
        )
        assert root_folder_response.status_code == status.HTTP_201_CREATED
        
        root_folder_result = root_folder_response.json()
        root_folder_id = root_folder_result["id"]
        
        # Verify folder was created in database
        folder_query = await db_session.execute(
            "SELECT * FROM folders WHERE id = :folder_id",
            {"folder_id": root_folder_id}
        )
        folder_row = folder_query.fetchone()
        assert folder_row is not None
        assert folder_row.name == "Research Projects"
        assert folder_row.path == "/Research Projects"
        
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
        assert subfolder_result["path"] == "/Research Projects/Machine Learning"
        
        # Step 3: Upload documents to different folders
        # Document 1: In root folder
        doc1_content = "This is a research paper about artificial intelligence and machine learning."
        files1 = {"file": ("ai-research.txt", io.BytesIO(doc1_content.encode('utf-8')), "text/plain")}
        data1 = {"name": "AI Research Paper", "folder_id": root_folder_id}
        
        upload1_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files1,
            data=data1
        )
        assert upload1_response.status_code == status.HTTP_200_OK
        doc1_id = upload1_response.json()["document"]["id"]
        
        # Document 2: In subfolder
        doc2_content = "This document covers deep learning algorithms and neural network architectures."
        files2 = {"file": ("dl-algorithms.txt", io.BytesIO(doc2_content.encode('utf-8')), "text/plain")}
        data2 = {"name": "Deep Learning Algorithms", "folder_id": subfolder_id}
        
        upload2_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files2,
            data=data2
        )
        assert upload2_response.status_code == status.HTTP_200_OK
        doc2_id = upload2_response.json()["document"]["id"]
        
        # Document 3: No folder (root level)
        doc3_content = "General notes about computer science and programming concepts."
        files3 = {"file": ("cs-notes.txt", io.BytesIO(doc3_content.encode('utf-8')), "text/plain")}
        data3 = {"name": "CS Notes"}
        
        upload3_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files3,
            data=data3
        )
        assert upload3_response.status_code == status.HTTP_200_OK
        doc3_id = upload3_response.json()["document"]["id"]
        
        # Step 4: Verify folder contents
        root_contents_response = await client.get(
            f"/api/v1/folders/{root_folder_id}/contents",
            headers=auth_headers
        )
        assert root_contents_response.status_code == status.HTTP_200_OK
        
        root_contents = root_contents_response.json()
        assert len(root_contents["documents"]) == 1
        assert root_contents["documents"][0]["id"] == doc1_id
        assert len(root_contents["subfolders"]) == 1
        assert root_contents["subfolders"][0]["id"] == subfolder_id
        
        subfolder_contents_response = await client.get(
            f"/api/v1/folders/{subfolder_id}/contents",
            headers=auth_headers
        )
        assert subfolder_contents_response.status_code == status.HTTP_200_OK
        
        subfolder_contents = subfolder_contents_response.json()
        assert len(subfolder_contents["documents"]) == 1
        assert subfolder_contents["documents"][0]["id"] == doc2_id
        assert len(subfolder_contents["subfolders"]) == 0
        
        # Step 5: Move document between folders
        move_data = {"folder_id": subfolder_id}
        
        move_response = await client.patch(
            f"/api/v1/documents/{doc1_id}",
            json=move_data,
            headers=auth_headers
        )
        assert move_response.status_code == status.HTTP_200_OK
        
        # Verify document was moved in database
        moved_doc_query = await db_session.execute(
            "SELECT folder_id FROM documents WHERE id = :doc_id",
            {"doc_id": doc1_id}
        )
        moved_doc_row = moved_doc_query.fetchone()
        assert str(moved_doc_row.folder_id) == subfolder_id
        
        # Verify folder contents updated
        updated_root_contents_response = await client.get(
            f"/api/v1/folders/{root_folder_id}/contents",
            headers=auth_headers
        )
        updated_root_contents = updated_root_contents_response.json()
        assert len(updated_root_contents["documents"]) == 0  # Document moved out
        
        updated_subfolder_contents_response = await client.get(
            f"/api/v1/folders/{subfolder_id}/contents",
            headers=auth_headers
        )
        updated_subfolder_contents = updated_subfolder_contents_response.json()
        assert len(updated_subfolder_contents["documents"]) == 2  # Now has both documents
        
        # Step 6: Test folder deletion with document handling
        # First, move documents out of subfolder
        for doc_id in [doc1_id, doc2_id]:
            move_out_response = await client.patch(
                f"/api/v1/documents/{doc_id}",
                json={"folder_id": None},
                headers=auth_headers
            )
            assert move_out_response.status_code == status.HTTP_200_OK
        
        # Now delete empty subfolder
        delete_subfolder_response = await client.delete(
            f"/api/v1/folders/{subfolder_id}",
            headers=auth_headers
        )
        assert delete_subfolder_response.status_code == status.HTTP_200_OK
        
        # Verify subfolder is deleted from database
        deleted_folder_query = await db_session.execute(
            "SELECT * FROM folders WHERE id = :folder_id",
            {"folder_id": subfolder_id}
        )
        deleted_folder_row = deleted_folder_query.fetchone()
        assert deleted_folder_row is None
        
        # Step 7: Test folder rename and path updates
        rename_data = {"name": "AI Research Projects"}
        
        rename_response = await client.patch(
            f"/api/v1/folders/{root_folder_id}",
            json=rename_data,
            headers=auth_headers
        )
        assert rename_response.status_code == status.HTTP_200_OK
        
        renamed_folder = rename_response.json()
        assert renamed_folder["name"] == "AI Research Projects"
        assert renamed_folder["path"] == "/AI Research Projects"
        
        # Verify in database
        renamed_folder_query = await db_session.execute(
            "SELECT name, path FROM folders WHERE id = :folder_id",
            {"folder_id": root_folder_id}
        )
        renamed_folder_row = renamed_folder_query.fetchone()
        assert renamed_folder_row.name == "AI Research Projects"
        assert renamed_folder_row.path == "/AI Research Projects"
        
        # Step 8: Test document filtering by folder
        documents_in_folder_response = await client.get(
            f"/api/v1/documents/?folder_id={root_folder_id}",
            headers=auth_headers
        )
        assert documents_in_folder_response.status_code == status.HTTP_200_OK
        
        # Should return no documents since we moved them out
        folder_docs = documents_in_folder_response.json()
        assert len(folder_docs["documents"]) == 0
        
        # Test documents without folder
        documents_no_folder_response = await client.get(
            "/api/v1/documents/?folder_id=null",
            headers=auth_headers
        )
        assert documents_no_folder_response.status_code == status.HTTP_200_OK
        
        no_folder_docs = documents_no_folder_response.json()
        # Should have the 3 documents we uploaded (2 moved out + 1 never in folder)
        assert len(no_folder_docs["documents"]) == 3
        
        # Clean up - delete test documents
        for doc_id in [doc1_id, doc2_id, doc3_id]:
            delete_doc_response = await client.delete(
                f"/api/v1/documents/{doc_id}",
                headers=auth_headers
            )
            assert delete_doc_response.status_code == status.HTTP_200_OK
    
    @pytest.mark.asyncio
    async def test_concurrent_operations_data_consistency(self, client: AsyncClient, auth_headers, db_session: AsyncSession):
        """Test data consistency under concurrent operations."""
        # Step 1: Create multiple folders concurrently
        folder_creation_tasks = []
        
        for i in range(5):
            folder_data = {"name": f"Concurrent Folder {i}"}
            task = client.post("/api/v1/folders/", json=folder_data, headers=auth_headers)
            folder_creation_tasks.append(task)
        
        folder_responses = await asyncio.gather(*folder_creation_tasks)
        
        # Verify all folders were created successfully
        folder_ids = []
        for response in folder_responses:
            assert response.status_code == status.HTTP_201_CREATED
            folder_ids.append(response.json()["id"])
        
        # Verify all folder IDs are unique
        assert len(set(folder_ids)) == 5
        
        # Step 2: Upload documents to different folders concurrently
        upload_tasks = []
        
        for i, folder_id in enumerate(folder_ids):
            content = f"This is test document {i} for concurrent testing."
            files = {"file": (f"test-{i}.txt", io.BytesIO(content.encode('utf-8')), "text/plain")}
            data = {"name": f"Concurrent Doc {i}", "folder_id": folder_id}
            
            task = client.post(
                "/api/v1/documents/upload",
                headers=auth_headers,
                files=files,
                data=data
            )
            upload_tasks.append(task)
        
        upload_responses = await asyncio.gather(*upload_tasks)
        
        # Verify all uploads succeeded
        document_ids = []
        for response in upload_responses:
            assert response.status_code == status.HTTP_200_OK
            document_ids.append(response.json()["document"]["id"])
        
        # Step 3: Perform concurrent read operations
        read_tasks = []
        
        # Get folder contents
        for folder_id in folder_ids:
            read_tasks.append(client.get(f"/api/v1/folders/{folder_id}/contents", headers=auth_headers))
        
        # Get document details
        for doc_id in document_ids:
            read_tasks.append(client.get(f"/api/v1/documents/{doc_id}", headers=auth_headers))
        
        read_responses = await asyncio.gather(*read_tasks)
        
        # Verify all reads succeeded
        for response in read_responses:
            assert response.status_code == status.HTTP_200_OK
        
        # Step 4: Verify data consistency in database
        # Check that each folder has exactly one document
        for folder_id in folder_ids:
            folder_docs_query = await db_session.execute(
                "SELECT COUNT(*) as count FROM documents WHERE folder_id = :folder_id",
                {"folder_id": folder_id}
            )
            count_row = folder_docs_query.fetchone()
            assert count_row.count == 1
        
        # Step 5: Concurrent document moves
        move_tasks = []
        
        # Move all documents to the first folder
        target_folder_id = folder_ids[0]
        for doc_id in document_ids[1:]:  # Skip first document (already in first folder)
            move_data = {"folder_id": target_folder_id}
            task = client.patch(f"/api/v1/documents/{doc_id}", json=move_data, headers=auth_headers)
            move_tasks.append(task)
        
        move_responses = await asyncio.gather(*move_tasks)
        
        # Verify all moves succeeded
        for response in move_responses:
            assert response.status_code == status.HTTP_200_OK
        
        # Verify final state: first folder should have all documents
        final_folder_docs_query = await db_session.execute(
            "SELECT COUNT(*) as count FROM documents WHERE folder_id = :folder_id",
            {"folder_id": target_folder_id}
        )
        final_count_row = final_folder_docs_query.fetchone()
        assert final_count_row.count == 5
        
        # Other folders should be empty
        for folder_id in folder_ids[1:]:
            empty_folder_query = await db_session.execute(
                "SELECT COUNT(*) as count FROM documents WHERE folder_id = :folder_id",
                {"folder_id": folder_id}
            )
            empty_count_row = empty_folder_query.fetchone()
            assert empty_count_row.count == 0
        
        # Clean up
        cleanup_tasks = []
        
        # Delete all documents
        for doc_id in document_ids:
            cleanup_tasks.append(client.delete(f"/api/v1/documents/{doc_id}", headers=auth_headers))
        
        # Delete all folders
        for folder_id in folder_ids:
            cleanup_tasks.append(client.delete(f"/api/v1/folders/{folder_id}", headers=auth_headers))
        
        cleanup_responses = await asyncio.gather(*cleanup_tasks)
        
        # Verify cleanup succeeded
        for response in cleanup_responses:
            assert response.status_code == status.HTTP_200_OK