"""
Integration tests for background processing workflow.
"""
import pytest
import uuid
import tempfile
import os
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.models.document import Document, DocumentChunk
from app.core.models.user import User
from app.workers.tasks import process_document_task, cleanup_document_task
from app.core.processors.document_processor import DocumentProcessor
from app.core.vector_store import PineconeClient


@pytest.mark.integration
class TestBackgroundProcessingIntegration:
    """Integration tests for the complete background processing workflow."""
    
    @pytest.fixture
    async def test_document(self, db_session, test_user) -> Document:
        """Create a test document in the database."""
        document = Document(
            id=uuid.uuid4(),
            user_id=uuid.UUID(test_user["id"]),
            name="Test Document",
            original_name="test-document.txt",
            file_type="txt",
            file_size=1024,
            mime_type="text/plain",
            s3_key="test/document.txt",
            s3_bucket="test-bucket",
            status="pending"
        )
        
        db_session.add(document)
        await db_session.commit()
        await db_session.refresh(document)
        
        return document
    
    @pytest.mark.asyncio
    async def test_document_processor_integration(self):
        """Test DocumentProcessor with real text processing."""
        processor = DocumentProcessor()
        
        # Create a temporary text file
        test_content = """This is a test document for integration testing.

It contains multiple paragraphs to test the text chunking functionality.

The document processor should be able to extract this text and create appropriate chunks for embedding generation.

This paragraph contains some technical terms like API, database, and machine learning to test the tokenization process."""
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(test_content)
            temp_path = f.name
        
        try:
            # Mock S3 download to use local file
            with patch.object(processor.s3_client, 'download_file') as mock_download:
                mock_download.return_value = None  # Just copy the file
                
                # Mock the actual file operations to use our temp file
                with patch('tempfile.NamedTemporaryFile') as mock_temp:
                    mock_temp.return_value.__enter__.return_value.name = temp_path
                    
                    result = await processor.process_document(
                        s3_key="test/document.txt",
                        s3_bucket="test-bucket",
                        file_type="txt",
                        original_name="test-document.txt"
                    )
            
            # Verify processing results
            assert "chunks" in result
            assert "chunk_count" in result
            assert "total_tokens" in result
            assert "original_text_length" in result
            
            assert isinstance(result["chunks"], list)
            assert len(result["chunks"]) > 0
            assert result["chunk_count"] == len(result["chunks"])
            assert result["total_tokens"] > 0
            assert result["original_text_length"] == len(test_content)
            
            # Verify chunks are reasonable
            for chunk in result["chunks"]:
                assert isinstance(chunk, str)
                assert len(chunk.strip()) > 0
                
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_vector_store_integration(self):
        """Test PineconeClient with mocked Pinecone operations."""
        with patch('app.core.vector_store.settings') as mock_settings:
            mock_settings.pinecone_api_key = "test-api-key"
            mock_settings.pinecone_index_name = "test-index"
            mock_settings.pinecone_environment = "us-east-1-aws"
            
            with patch('app.core.vector_store.Pinecone') as mock_pinecone_class:
                # Setup mock Pinecone client
                mock_pc = Mock()
                mock_pinecone_class.return_value = mock_pc
                
                # Mock index operations
                mock_indexes = Mock()
                mock_indexes.indexes = [Mock(name="test-index")]
                mock_pc.list_indexes.return_value = mock_indexes
                
                mock_index = Mock()
                mock_pc.Index.return_value = mock_index
                
                # Create vector store client
                vector_store = PineconeClient()
                
                # Test embedding upsert
                embeddings = [[0.1, 0.2] * 768, [0.3, 0.4] * 768]  # 1536 dimensions each
                chunks = ["First test chunk", "Second test chunk"]
                chunk_indices = [0, 1]
                
                vector_ids = await vector_store.upsert_embeddings(
                    embeddings=embeddings,
                    chunks=chunks,
                    document_id="doc-123",
                    user_id="user-456",
                    chunk_indices=chunk_indices
                )
                
                # Verify results
                assert len(vector_ids) == 2
                assert vector_ids == ["doc-123_0", "doc-123_1"]
                
                # Verify upsert was called
                mock_index.upsert.assert_called_once()
                
                # Test similarity query
                mock_match = Mock()
                mock_match.id = "doc-123_0"
                mock_match.score = 0.95
                mock_match.metadata = {
                    "document_id": "doc-123",
                    "user_id": "user-456",
                    "chunk_index": 0,
                    "text": "First test chunk"
                }
                
                mock_response = Mock()
                mock_response.matches = [mock_match]
                mock_index.query.return_value = mock_response
                
                query_embedding = [0.5, 0.6] * 768
                results = await vector_store.query_similar(
                    query_embedding=query_embedding,
                    user_id="user-456"
                )
                
                assert len(results) == 1
                assert results[0]["id"] == "doc-123_0"
                assert results[0]["score"] == 0.95
                
                # Test document deletion
                await vector_store.delete_document_embeddings("doc-123")
                
                # Verify delete operations
                assert mock_index.query.call_count >= 2  # Called for both query and delete
                mock_index.delete.assert_called()
    
    @pytest.mark.asyncio
    async def test_complete_processing_workflow_mocked(self, db_session, test_document):
        """Test complete document processing workflow with mocked external services."""
        # Mock external dependencies
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('app.workers.tasks.asyncio') as mock_asyncio:
            
            # Setup processor mock
            mock_processor = Mock()
            mock_processor_class.return_value = mock_processor
            mock_processor._count_tokens.return_value = 50
            
            # Mock processing result
            mock_processing_result = {
                "chunks": ["First chunk content", "Second chunk content"],
                "chunk_count": 2,
                "total_tokens": 100,
                "original_text_length": 500,
                "vector_ids": ["doc_0", "doc_1"],
                "embeddings_count": 2
            }
            
            # Setup asyncio mock
            mock_loop = Mock()
            mock_asyncio.new_event_loop.return_value = mock_loop
            mock_loop.run_until_complete.return_value = mock_processing_result
            
            # Create task instance with database session
            from app.workers.tasks import DatabaseTask
            task_instance = DatabaseTask()
            
            # Mock the database session to use our test session
            with patch.object(task_instance, 'db') as mock_db:
                # Setup database mocks
                mock_db.query.return_value.filter.return_value.first.return_value = test_document
                mock_db.query.return_value.filter.return_value.delete.return_value = None
                
                # Execute the task
                result = process_document_task(task_instance, str(test_document.id))
                
                # Verify task result
                assert result["status"] == "success"
                assert result["document_id"] == str(test_document.id)
                assert result["chunk_count"] == 2
                assert result["total_tokens"] == 100
                assert result["embeddings_count"] == 2
                
                # Verify document status was updated
                assert test_document.status == "completed"
                assert test_document.chunk_count == 2
                assert test_document.total_tokens == 100
                assert test_document.processing_error is None
                
                # Verify chunks were added to database
                assert mock_db.add.call_count == 2
                mock_db.commit.assert_called()
    
    @pytest.mark.asyncio
    async def test_processing_error_handling(self, db_session, test_document):
        """Test error handling in document processing workflow."""
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('app.workers.tasks.asyncio') as mock_asyncio:
            
            # Setup processor to fail
            mock_processor_class.return_value = Mock()
            mock_loop = Mock()
            mock_asyncio.new_event_loop.return_value = mock_loop
            mock_loop.run_until_complete.side_effect = Exception("Processing failed")
            
            # Create task instance
            from app.workers.tasks import DatabaseTask
            task_instance = DatabaseTask()
            
            with patch.object(task_instance, 'db') as mock_db:
                # Setup database mocks
                mock_db.query.return_value.filter.return_value.first.return_value = test_document
                
                # Execute the task - should raise exception
                with pytest.raises(Exception, match="Processing failed"):
                    process_document_task(task_instance, str(test_document.id))
                
                # Verify document status was updated to failed
                assert test_document.status == "failed"
                assert test_document.processing_error == "Processing failed"
    
    @pytest.mark.asyncio
    async def test_cleanup_workflow(self):
        """Test document cleanup workflow."""
        document_id = str(uuid.uuid4())
        
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('app.workers.tasks.asyncio') as mock_asyncio:
            
            # Setup processor mock
            mock_processor = Mock()
            mock_processor_class.return_value = mock_processor
            
            # Setup asyncio mock for successful cleanup
            mock_loop = Mock()
            mock_asyncio.new_event_loop.return_value = mock_loop
            mock_loop.run_until_complete.return_value = True
            
            # Create task instance
            from app.workers.tasks import DatabaseTask
            task_instance = DatabaseTask()
            
            with patch.object(task_instance, 'db'):
                # Execute cleanup task
                result = cleanup_document_task(task_instance, document_id)
                
                # Verify result
                assert result["status"] == "success"
                assert result["document_id"] == document_id
                assert "cleanup completed" in result["message"]
    
    @pytest.mark.asyncio
    async def test_document_service_task_integration(self, db_session, test_user):
        """Test integration between document service and background tasks."""
        from app.features.documents.service import DocumentService
        
        # Create document service
        service = DocumentService(db_session)
        
        # Mock Celery task
        with patch('app.features.documents.service.process_document_task') as mock_task:
            mock_task.delay = Mock()
            
            # Mock S3 operations
            with patch('app.features.documents.service.s3_client') as mock_s3:
                mock_s3.generate_s3_key.return_value = "test/doc.txt"
                mock_s3.upload_file.return_value = True
                
                # Create mock file
                from io import BytesIO
                mock_file = Mock()
                mock_file.filename = "test.txt"
                mock_file.content_type = "text/plain"
                mock_file.file = BytesIO(b"test content")
                mock_file.size = 12
                
                # Upload file
                result = await service.upload_file(
                    user_id=uuid.UUID(test_user["id"]),
                    file=mock_file
                )
                
                # Verify document was created
                assert result.name == "test.txt"
                assert result.status == "pending"
                
                # Verify task was queued
                mock_task.delay.assert_called_once()
                call_args = mock_task.delay.call_args[0]
                assert len(call_args) == 1  # Document ID
    
    @pytest.mark.asyncio
    async def test_document_deletion_cleanup_integration(self, db_session, test_user):
        """Test integration between document deletion and cleanup tasks."""
        from app.features.documents.service import DocumentService
        
        # Create document service
        service = DocumentService(db_session)
        
        # Create a document directly in database
        document = Document(
            id=uuid.uuid4(),
            user_id=uuid.UUID(test_user["id"]),
            name="Test Document",
            original_name="test.txt",
            file_type="txt",
            file_size=100,
            s3_key="test/doc.txt",
            s3_bucket="test-bucket",
            status="completed"
        )
        
        db_session.add(document)
        await db_session.commit()
        await db_session.refresh(document)
        
        # Mock Celery cleanup task
        with patch('app.features.documents.service.cleanup_document_task') as mock_cleanup_task:
            mock_cleanup_task.delay = Mock()
            
            # Mock S3 operations
            with patch('app.features.documents.service.s3_client') as mock_s3:
                mock_s3.delete_file.return_value = True
                
                # Delete document
                result = await service.delete_document(
                    user_id=uuid.UUID(test_user["id"]),
                    document_id=document.id
                )
                
                # Verify deletion was successful
                assert result is True
                
                # Verify cleanup task was queued
                mock_cleanup_task.delay.assert_called_once()
                call_args = mock_cleanup_task.delay.call_args[0]
                assert call_args[0] == str(document.id)
    
    def test_celery_configuration_integration(self):
        """Test that Celery configuration is properly set up."""
        from app.workers.celery_app import celery_app
        from app.core.config import settings
        
        # Verify broker and backend URLs
        assert celery_app.conf.broker_url == settings.CELERY_BROKER_URL
        assert celery_app.conf.result_backend == settings.CELERY_RESULT_BACKEND
        
        # Verify task routing
        task_routes = celery_app.conf.task_routes
        assert "app.workers.tasks.process_document_task" in task_routes
        assert task_routes["app.workers.tasks.process_document_task"]["queue"] == "document_processing"
        
        # Verify retry configuration
        assert celery_app.conf.task_acks_late is True
        assert celery_app.conf.task_reject_on_worker_lost is True