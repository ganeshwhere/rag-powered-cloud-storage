"""
Additional pytest fixtures specifically for background processing tests.
"""
import pytest
import tempfile
import os
from unittest.mock import Mock, patch
from typing import Dict, Any

from app.core.processors.document_processor import DocumentProcessor
from app.core.vector_store import PineconeClient


@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client for testing."""
    mock_client = Mock()
    
    # Mock embeddings response
    mock_embedding_response = Mock()
    mock_embedding_response.data = [
        Mock(embedding=[0.1, 0.2, 0.3] * 512)  # 1536 dimensions
    ]
    mock_client.embeddings.create.return_value = mock_embedding_response
    
    return mock_client


@pytest.fixture
def mock_s3_client():
    """Mock S3 client for testing."""
    mock_client = Mock()
    mock_client.download_file.return_value = None
    mock_client.upload_file.return_value = True
    mock_client.delete_file.return_value = True
    mock_client.generate_s3_key.return_value = "test/document.txt"
    mock_client.generate_presigned_upload_url.return_value = {
        "url": "https://test-bucket.s3.amazonaws.com/upload",
        "fields": {"key": "test/document.txt"}
    }
    mock_client.generate_presigned_download_url.return_value = "https://test-bucket.s3.amazonaws.com/download"
    
    return mock_client


@pytest.fixture
def mock_pinecone_client():
    """Mock Pinecone client for testing."""
    mock_client = Mock()
    
    # Mock upsert response
    mock_client.upsert_embeddings.return_value = ["vec1", "vec2", "vec3"]
    
    # Mock query response
    mock_client.query_similar.return_value = [
        {
            "id": "doc-123_0",
            "score": 0.95,
            "metadata": {"text": "Test chunk", "document_id": "doc-123"},
            "text": "Test chunk",
            "document_id": "doc-123",
            "chunk_index": 0
        }
    ]
    
    # Mock deletion
    mock_client.delete_document_embeddings.return_value = True
    
    # Mock stats
    mock_client.get_index_stats.return_value = {
        "dimension": 1536,
        "index_fullness": 0.1,
        "namespaces": {"": {"vector_count": 100}}
    }
    
    return mock_client


@pytest.fixture
def document_processor_with_mocks(mock_s3_client, mock_pinecone_client, mock_openai_client):
    """Create DocumentProcessor with mocked dependencies."""
    with patch('app.core.processors.document_processor.S3Client', return_value=mock_s3_client), \
         patch('app.core.processors.document_processor.PineconeClient', return_value=mock_pinecone_client), \
         patch('app.core.processors.document_processor.openai.AsyncOpenAI', return_value=mock_openai_client):
        
        processor = DocumentProcessor()
        processor.s3_client = mock_s3_client
        processor.vector_store = mock_pinecone_client
        processor.openai_client = mock_openai_client
        
        return processor


@pytest.fixture
def sample_document_content():
    """Sample document content for testing."""
    return {
        "short_text": "This is a short test document.",
        "medium_text": """This is a medium-length test document for testing text processing.

It contains multiple paragraphs to test chunking functionality.

The document processor should handle this content appropriately.""",
        "long_text": """This is a comprehensive test document designed to test various aspects of document processing.

## Introduction

This document contains multiple sections and formatting to test the robustness of the text extraction and chunking process.

## Technical Content

The system should be able to handle technical terms like:
- API endpoints
- Database queries
- Machine learning algorithms
- Vector embeddings
- Natural language processing

## Code Examples

```python
def process_document(content):
    chunks = split_text(content)
    embeddings = generate_embeddings(chunks)
    return embeddings
```

## Conclusion

This document provides a comprehensive test case for the document processing pipeline, ensuring that various types of content are handled correctly.

The processor should create appropriate chunks from this content while maintaining semantic coherence."""
    }


@pytest.fixture
def temp_test_files(sample_document_content):
    """Create temporary test files with different content types."""
    files = {}
    
    for content_type, content in sample_document_content.items():
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(content)
            files[content_type] = f.name
    
    yield files
    
    # Cleanup
    for file_path in files.values():
        if os.path.exists(file_path):
            os.unlink(file_path)


@pytest.fixture
def mock_celery_task():
    """Mock Celery task for testing."""
    mock_task = Mock()
    mock_task.delay = Mock()
    mock_task.apply_async = Mock()
    mock_task.retry = Mock()
    
    return mock_task


@pytest.fixture
def mock_database_session():
    """Mock database session for Celery tasks."""
    mock_session = Mock()
    mock_session.query.return_value.filter.return_value.first.return_value = None
    mock_session.query.return_value.filter.return_value.delete.return_value = None
    mock_session.add = Mock()
    mock_session.commit = Mock()
    mock_session.rollback = Mock()
    mock_session.close = Mock()
    
    return mock_session


@pytest.fixture
def processing_test_data():
    """Test data for processing workflows."""
    return {
        "document_id": "550e8400-e29b-41d4-a716-446655440000",
        "user_id": "550e8400-e29b-41d4-a716-446655440001",
        "s3_key": "users/550e8400-e29b-41d4-a716-446655440001/documents/test.txt",
        "s3_bucket": "test-rag-documents",
        "file_type": "txt",
        "original_name": "test-document.txt",
        "expected_chunks": [
            "This is the first chunk of the document.",
            "This is the second chunk with more content.",
            "This is the final chunk of the test document."
        ],
        "expected_embeddings": [
            [0.1, 0.2, 0.3] * 512,  # 1536 dimensions
            [0.4, 0.5, 0.6] * 512,
            [0.7, 0.8, 0.9] * 512
        ],
        "expected_vector_ids": [
            "550e8400-e29b-41d4-a716-446655440000_0",
            "550e8400-e29b-41d4-a716-446655440000_1",
            "550e8400-e29b-41d4-a716-446655440000_2"
        ]
    }


@pytest.fixture
def error_scenarios():
    """Common error scenarios for testing."""
    return {
        "s3_download_error": Exception("Failed to download file from S3"),
        "text_extraction_error": Exception("Failed to extract text from document"),
        "embedding_generation_error": Exception("Failed to generate embeddings"),
        "vector_store_error": Exception("Failed to store embeddings in vector database"),
        "database_error": Exception("Database connection failed"),
        "processing_timeout": Exception("Document processing timed out")
    }


# Performance testing fixtures
@pytest.fixture
def large_document_content():
    """Generate large document content for performance testing."""
    base_paragraph = """This is a test paragraph that will be repeated many times to create a large document for performance testing. It contains various words and phrases that should be processed correctly by the document processing pipeline. The paragraph includes technical terms, common words, and punctuation to simulate real document content."""
    
    # Create a document with ~100KB of content
    large_content = "\n\n".join([f"## Section {i}\n\n{base_paragraph}" for i in range(200)])
    
    return large_content


@pytest.fixture
def performance_test_config():
    """Configuration for performance tests."""
    return {
        "max_processing_time": 30.0,  # seconds
        "max_chunk_count": 1000,
        "max_embedding_generation_time": 10.0,
        "max_vector_store_time": 5.0
    }