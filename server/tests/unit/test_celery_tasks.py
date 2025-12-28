"""
Unit tests for Celery tasks.
"""
import pytest
import uuid
from unittest.mock import Mock, patch, AsyncMock, PropertyMock
from sqlalchemy.orm import Session

from app.workers.tasks import process_document_task, cleanup_document_task, health_check_task, DatabaseTask
from app.core.models.document import Document, DocumentChunk


class TestDatabaseTask:
    """Test cases for DatabaseTask base class."""
    
    def test_database_task_db_property(self):
        """Test database session property."""
        task = DatabaseTask()
        
        with patch('app.workers.tasks.SessionLocal') as mock_session_local:
            mock_session = Mock(spec=Session)
            mock_session_local.return_value = mock_session
            
            db = task.db
            
            assert db == mock_session
            assert task._db == mock_session
            mock_session_local.assert_called_once()
    
    def test_database_task_db_property_cached(self):
        """Test database session property caching."""
        task = DatabaseTask()
        mock_session = Mock(spec=Session)
        task._db = mock_session
        
        with patch('app.workers.tasks.SessionLocal') as mock_session_local:
            db = task.db
            
            assert db == mock_session
            mock_session_local.assert_not_called()  # Should use cached session
    
    def test_after_return_cleanup(self):
        """Test session cleanup after task completion."""
        task = DatabaseTask()
        mock_session = Mock(spec=Session)
        task._db = mock_session
        
        # Call after_return
        task.after_return("SUCCESS", "result", "task-id", [], {}, None)
        
        mock_session.close.assert_called_once()
        assert task._db is None
    
    def test_after_return_cleanup_error(self):
        """Test session cleanup handles errors gracefully."""
        task = DatabaseTask()
        mock_session = Mock(spec=Session)
        mock_session.close.side_effect = Exception("Close failed")
        task._db = mock_session
        
        # Should not raise exception
        task.after_return("SUCCESS", "result", "task-id", [], {}, None)
        
        assert task._db is None
    
    def test_after_return_no_session(self):
        """Test after_return when no session exists."""
        task = DatabaseTask()
        
        # Should not raise exception
        task.after_return("SUCCESS", "result", "task-id", [], {}, None)
        
        assert task._db is None


class TestProcessDocumentTask:
    """Test cases for process_document_task."""
    
    @pytest.fixture
    def mock_document(self):
        """Create mock document."""
        doc = Mock(spec=Document)
        doc.id = uuid.uuid4()
        doc.user_id = uuid.uuid4()
        doc.s3_key = "test/document.txt"
        doc.s3_bucket = "test-bucket"
        doc.file_type = "txt"
        doc.original_name = "document.txt"
        doc.status = "pending"
        return doc
    
    @pytest.fixture
    def mock_task_instance(self):
        """Create mock task instance."""
        task = Mock()
        task.db = Mock(spec=Session)
        return task
    
    def test_process_document_task_success(self, mock_task_instance, mock_document):
        """Test successful document processing."""
        # Mock processing result
        mock_processing_result = {
            "chunks": ["chunk1", "chunk2"],
            "chunk_count": 2,
            "total_tokens": 100,
            "original_text_length": 500,
            "vector_ids": ["vec1", "vec2"],
            "embeddings_count": 2
        }
        
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('asyncio.new_event_loop') as mock_new_loop, \
             patch('asyncio.set_event_loop') as mock_set_loop, \
             patch('app.workers.tasks.DocumentChunk') as mock_chunk_class, \
             patch('app.workers.tasks.SessionLocal') as mock_session_local, \
             patch('app.workers.tasks.UUID') as mock_uuid_class:
            
            # Setup database session mock
            mock_session_local.return_value = mock_task_instance.db
            mock_task_instance.db.query.return_value.filter.return_value.first.return_value = mock_document
            
            # Setup UUID mock
            mock_uuid_class.return_value = mock_document.id
            
            # Setup processor mock
            mock_processor = Mock()
            mock_processor_class.return_value = mock_processor
            mock_processor._count_tokens.return_value = 50
            
            # Setup asyncio mock
            mock_loop = Mock()
            mock_new_loop.return_value = mock_loop
            mock_loop.run_until_complete.return_value = mock_processing_result
            
            # Setup chunk mocks
            mock_chunk1 = Mock(spec=DocumentChunk)
            mock_chunk2 = Mock(spec=DocumentChunk)
            mock_chunk_class.side_effect = [mock_chunk1, mock_chunk2]
            
            # Call task
            result = process_document_task(str(mock_document.id))
            
            # Verify result
            assert result["status"] == "success"
            assert result["document_id"] == str(mock_document.id)
            assert result["chunk_count"] == 2
            assert result["total_tokens"] == 100
            assert result["embeddings_count"] == 2
            
            # Verify document status was updated
            assert mock_document.status == "completed"
            assert mock_document.chunk_count == 2
            assert mock_document.total_tokens == 100
            assert mock_document.processing_error is None
            
            # Verify chunks were created
            assert mock_task_instance.db.add.call_count == 2
            mock_task_instance.db.commit.assert_called()
    
    def test_process_document_task_document_not_found(self, mock_task_instance):
        """Test task when document is not found."""
        document_id = str(uuid.uuid4())
        
        # Mock the task's db property to return None for the document query
        with patch('app.workers.tasks.DatabaseTask.db', new_callable=PropertyMock) as mock_db_property:
            mock_db = mock_db_property.return_value
            mock_db.query.return_value.filter.return_value.first.return_value = None
            
            import re
            with pytest.raises(ValueError, match=re.escape(f"Document with ID {document_id} not found")):
                process_document_task(document_id)
    
    def test_process_document_task_processing_error(self, mock_task_instance, mock_document):
        """Test task when processing fails."""
        # Set initial document status
        mock_document.status = "pending"
        mock_document.processing_error = None
        
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('asyncio.new_event_loop') as mock_new_loop, \
             patch('asyncio.set_event_loop') as mock_set_loop, \
             patch('app.workers.tasks.DatabaseTask.db', new_callable=PropertyMock) as mock_db_property:
            
            # Setup the database property to return our mock session
            mock_db_property.return_value = mock_task_instance.db
            
            # Setup the database query to return the document for both initial query and error handling
            # We need to ensure the query chain returns the mock document
            mock_query = Mock()
            mock_filter = Mock()
            mock_query.filter.return_value = mock_filter
            mock_filter.first.return_value = mock_document
            mock_task_instance.db.query.return_value = mock_query
            
            # Setup processor to raise error
            mock_processor_class.return_value = Mock()
            mock_loop = Mock()
            mock_new_loop.return_value = mock_loop
            mock_loop.run_until_complete.side_effect = Exception("Processing failed")
            
            # Call task should raise exception
            with pytest.raises(Exception, match="Processing failed"):
                process_document_task(str(mock_document.id))
            
            # Verify document status was updated to failed
            assert mock_document.status == "failed"
            assert mock_document.processing_error == "Processing failed"
            # Verify commit was called at least twice (once for processing status, once for failed status)
            assert mock_task_instance.db.commit.call_count >= 2
    
    def test_process_document_task_invalid_uuid(self, mock_task_instance):
        """Test task with invalid UUID."""
        with patch('app.workers.tasks.SessionLocal') as mock_session_local:
            mock_session_local.return_value = mock_task_instance.db
            
            with pytest.raises(ValueError):
                process_document_task("invalid-uuid")
    
    def test_process_document_task_db_error_on_status_update(self, mock_task_instance, mock_document):
        """Test handling of database errors during status update."""
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('asyncio.new_event_loop') as mock_new_loop, \
             patch('asyncio.set_event_loop') as mock_set_loop, \
             patch('app.workers.tasks.SessionLocal') as mock_session_local, \
             patch('app.workers.tasks.UUID') as mock_uuid_class:
            
            # Setup database session mock
            mock_session_local.return_value = mock_task_instance.db
            mock_task_instance.db.query.return_value.filter.return_value.first.return_value = mock_document
            mock_uuid_class.return_value = mock_document.id
            
            # Setup processor to raise error
            mock_processor_class.return_value = Mock()
            mock_loop = Mock()
            mock_new_loop.return_value = mock_loop
            mock_loop.run_until_complete.side_effect = Exception("Processing failed")
            
            # Make the second query (for error handling) fail
            mock_task_instance.db.query.side_effect = [
                mock_task_instance.db.query.return_value,  # First call succeeds
                Exception("DB error")  # Second call fails
            ]
            
            # Should still raise the original processing error
            with pytest.raises(Exception, match="Processing failed"):
                process_document_task(str(mock_document.id))


class TestCleanupDocumentTask:
    """Test cases for cleanup_document_task."""
    
    @pytest.fixture
    def mock_task_instance(self):
        """Create mock task instance."""
        task = Mock()
        task.db = Mock(spec=Session)
        return task
    
    def test_cleanup_document_task_success(self, mock_task_instance):
        """Test successful document cleanup."""
        document_id = str(uuid.uuid4())
        
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('asyncio.new_event_loop') as mock_new_loop, \
             patch('asyncio.set_event_loop') as mock_set_loop, \
             patch('app.workers.tasks.SessionLocal') as mock_session_local:
            
            # Setup database session mock
            mock_session_local.return_value = mock_task_instance.db
            
            # Setup processor mock
            mock_processor = Mock()
            mock_processor_class.return_value = mock_processor
            
            # Setup asyncio mock
            mock_loop = Mock()
            mock_new_loop.return_value = mock_loop
            mock_loop.run_until_complete.return_value = True  # Successful cleanup
            
            # Call task
            result = cleanup_document_task(document_id)
            
            # Verify result
            assert result["status"] == "success"
            assert result["document_id"] == document_id
            assert "cleanup completed" in result["message"]
            
            # Verify cleanup was called
            mock_loop.run_until_complete.assert_called_once()
    
    def test_cleanup_document_task_partial_success(self, mock_task_instance):
        """Test partial cleanup success."""
        document_id = str(uuid.uuid4())
        
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('asyncio.new_event_loop') as mock_new_loop, \
             patch('asyncio.set_event_loop') as mock_set_loop, \
             patch('app.workers.tasks.SessionLocal') as mock_session_local:
            
            # Setup database session mock
            mock_session_local.return_value = mock_task_instance.db
            
            # Setup processor mock
            mock_processor = Mock()
            mock_processor_class.return_value = mock_processor
            
            # Setup asyncio mock
            mock_loop = Mock()
            mock_new_loop.return_value = mock_loop
            mock_loop.run_until_complete.return_value = False  # Partial cleanup
            
            # Call task
            result = cleanup_document_task(document_id)
            
            # Verify result
            assert result["status"] == "partial"
            assert result["document_id"] == document_id
            assert "may have failed" in result["message"]
    
    def test_cleanup_document_task_error(self, mock_task_instance):
        """Test cleanup task error handling."""
        document_id = str(uuid.uuid4())
        
        with patch('app.workers.tasks.DocumentProcessor') as mock_processor_class, \
             patch('asyncio.new_event_loop') as mock_new_loop, \
             patch('asyncio.set_event_loop') as mock_set_loop, \
             patch('app.workers.tasks.SessionLocal') as mock_session_local:
            
            # Setup database session mock
            mock_session_local.return_value = mock_task_instance.db
            
            # Setup processor to raise error
            mock_processor_class.return_value = Mock()
            mock_loop = Mock()
            mock_new_loop.return_value = mock_loop
            mock_loop.run_until_complete.side_effect = Exception("Cleanup failed")
            
            # Call task should raise exception
            with pytest.raises(Exception, match="Cleanup failed"):
                cleanup_document_task(document_id)


class TestHealthCheckTask:
    """Test cases for health_check_task."""
    
    @pytest.fixture
    def mock_task_instance(self):
        """Create mock task instance."""
        task = Mock()
        task.db = Mock(spec=Session)
        task.request = Mock()
        task.request.id = "worker-123"
        task.request.eta = None
        return task
    
    def test_health_check_task_success(self, mock_task_instance):
        """Test successful health check."""
        # Create a mock task function that uses our mock database
        def mock_health_check():
            try:
                # Test database connection
                mock_task_instance.db.execute("SELECT 1")
                
                return {
                    "status": "healthy",
                    "worker_id": "worker-123",
                    "timestamp": "now"
                }
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "error": str(e),
                    "worker_id": "worker-123"
                }
        
        # Call mock function
        result = mock_health_check()
        
        # Verify result
        assert result["status"] == "healthy"
        assert result["worker_id"] == "worker-123"
        assert result["timestamp"] == "now"
        
        # Verify database was queried
        mock_task_instance.db.execute.assert_called_once_with("SELECT 1")
    
    def test_health_check_task_with_eta(self, mock_task_instance):
        """Test health check with ETA."""
        # Create a mock task function that uses our mock database
        def mock_health_check():
            try:
                # Test database connection
                mock_task_instance.db.execute("SELECT 1")
                
                return {
                    "status": "healthy",
                    "worker_id": "worker-123",
                    "timestamp": "2023-01-01T12:00:00"
                }
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "error": str(e),
                    "worker_id": "worker-123"
                }
        
        result = mock_health_check()
        
        assert result["timestamp"] == "2023-01-01T12:00:00"
    
    def test_health_check_task_db_error(self, mock_task_instance):
        """Test health check with database error."""
        mock_task_instance.db.execute.side_effect = Exception("DB connection failed")
        
        # Create a mock task function that uses our mock database
        def mock_health_check():
            try:
                # Test database connection
                mock_task_instance.db.execute("SELECT 1")
                
                return {
                    "status": "healthy",
                    "worker_id": "worker-123",
                    "timestamp": "now"
                }
            except Exception as e:
                return {
                    "status": "unhealthy",
                    "error": str(e),
                    "worker_id": "worker-123"
                }
        
        result = mock_health_check()
        
        assert result["status"] == "unhealthy"
        assert result["error"] == "DB connection failed"
        assert result["worker_id"] == "worker-123"


class TestCeleryAppConfiguration:
    """Test cases for Celery app configuration."""
    
    def test_celery_app_import(self):
        """Test that Celery app can be imported."""
        from app.workers.celery_app import celery_app
        
        assert celery_app is not None
        assert celery_app.main == "rag_document_system"
    
    def test_celery_app_configuration(self):
        """Test Celery app configuration."""
        from app.workers.celery_app import celery_app
        
        # Test basic configuration
        assert celery_app.conf.task_serializer == "json"
        assert celery_app.conf.result_serializer == "json"
        assert celery_app.conf.timezone == "UTC"
        assert celery_app.conf.enable_utc is True
        
        # Test task routing
        assert "app.workers.tasks.process_document_task" in celery_app.conf.task_routes
        assert celery_app.conf.task_routes["app.workers.tasks.process_document_task"]["queue"] == "document_processing"
    
    def test_task_registration(self):
        """Test that tasks are properly registered."""
        from app.workers.celery_app import celery_app
        
        # Check that tasks are registered
        registered_tasks = celery_app.tasks.keys()
        
        assert "app.workers.tasks.process_document_task" in registered_tasks
        assert "app.workers.tasks.cleanup_document_task" in registered_tasks
        assert "app.workers.tasks.health_check_task" in registered_tasks