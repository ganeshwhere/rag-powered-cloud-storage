"""
Unit tests for DocumentProcessor class.
"""
import pytest
import tempfile
import os
from unittest.mock import Mock, patch, AsyncMock
from typing import List

from app.core.processors.document_processor import DocumentProcessor


class TestDocumentProcessor:
    """Test cases for DocumentProcessor."""
    
    @pytest.fixture
    def processor(self):
        """Create DocumentProcessor instance for testing."""
        with patch('app.core.processors.document_processor.S3Client'), \
             patch('app.core.processors.document_processor.PineconeClient'), \
             patch('app.core.processors.document_processor.openai.AsyncOpenAI'):
            return DocumentProcessor()
    
    @pytest.fixture
    def sample_text_content(self):
        """Sample text content for testing."""
        return """This is a test document with multiple paragraphs.

This is the second paragraph with some more content to test text chunking functionality.

This is the third paragraph that should be processed correctly by the document processor.

The document processor should be able to handle various types of content and extract meaningful chunks from them."""
    
    def test_count_tokens(self, processor):
        """Test token counting functionality."""
        text = "This is a test sentence."
        token_count = processor._count_tokens(text)
        
        assert isinstance(token_count, int)
        assert token_count > 0
        assert token_count < 100  # Should be reasonable for short text
    
    def test_count_tokens_empty_string(self, processor):
        """Test token counting with empty string."""
        token_count = processor._count_tokens("")
        assert token_count == 0
    
    def test_count_tokens_long_text(self, processor):
        """Test token counting with longer text."""
        long_text = "This is a test sentence. " * 100
        token_count = processor._count_tokens(long_text)
        
        assert isinstance(token_count, int)
        assert token_count > 100  # Should be substantial for long text
    
    @pytest.mark.asyncio
    async def test_create_chunks(self, processor, sample_text_content):
        """Test text chunking functionality."""
        chunks = await processor._create_chunks(sample_text_content)
        
        assert isinstance(chunks, list)
        assert len(chunks) > 0
        assert all(isinstance(chunk, str) for chunk in chunks)
        assert all(len(chunk.strip()) >= 50 for chunk in chunks)  # Minimum chunk size
    
    @pytest.mark.asyncio
    async def test_create_chunks_short_text(self, processor):
        """Test chunking with very short text."""
        short_text = "Short text."
        chunks = await processor._create_chunks(short_text)
        
        # Should return original text as single chunk if too short
        assert len(chunks) == 1
        assert chunks[0].strip() == short_text
    
    @pytest.mark.asyncio
    async def test_create_chunks_empty_text(self, processor):
        """Test chunking with empty text."""
        chunks = await processor._create_chunks("")
        
        # Should return empty text as single chunk
        assert len(chunks) == 1
        assert chunks[0].strip() == ""
    
    @pytest.mark.asyncio
    async def test_extract_text_txt_file(self, processor):
        """Test text extraction from TXT file."""
        test_content = "This is test content for TXT file."
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write(test_content)
            temp_path = f.name
        
        try:
            with patch('app.core.processors.document_processor.partition_text') as mock_partition:
                # Mock the partition_text function
                mock_element = Mock()
                mock_element.text = test_content
                mock_partition.return_value = [mock_element]
                
                extracted_text = await processor._extract_text(temp_path, 'txt')
                
                assert extracted_text == test_content
                mock_partition.assert_called_once_with(filename=temp_path)
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_extract_text_fallback_to_auto(self, processor):
        """Test text extraction fallback to auto-detection."""
        test_content = "This is test content."
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.unknown', delete=False) as f:
            f.write(test_content)
            temp_path = f.name
        
        try:
            with patch('app.core.processors.document_processor.partition') as mock_partition:
                # Mock the partition function
                mock_element = Mock()
                mock_element.text = test_content
                mock_partition.return_value = [mock_element]
                
                extracted_text = await processor._extract_text(temp_path, 'unknown')
                
                assert extracted_text == test_content
                mock_partition.assert_called_once_with(filename=temp_path)
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_extract_text_multiple_elements(self, processor):
        """Test text extraction with multiple elements."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("test content")
            temp_path = f.name
        
        try:
            with patch('app.core.processors.document_processor.partition_text') as mock_partition:
                # Mock multiple elements
                mock_element1 = Mock()
                mock_element1.text = "First paragraph."
                mock_element2 = Mock()
                mock_element2.text = "Second paragraph."
                mock_partition.return_value = [mock_element1, mock_element2]
                
                extracted_text = await processor._extract_text(temp_path, 'txt')
                
                assert extracted_text == "First paragraph.\n\nSecond paragraph."
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_extract_text_error_handling(self, processor):
        """Test error handling in text extraction."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
            f.write("test content")
            temp_path = f.name
        
        try:
            with patch('app.core.processors.document_processor.partition_text', side_effect=Exception("Extraction failed")):
                with pytest.raises(ValueError, match="Failed to extract text from file"):
                    await processor._extract_text(temp_path, 'txt')
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_generate_embeddings(self, processor):
        """Test embedding generation."""
        texts = ["First text chunk.", "Second text chunk.", "Third text chunk."]
        
        # Mock OpenAI client
        mock_response = Mock()
        mock_response.data = [
            Mock(embedding=[0.1, 0.2, 0.3] * 512),  # 1536 dimensions
            Mock(embedding=[0.4, 0.5, 0.6] * 512),
            Mock(embedding=[0.7, 0.8, 0.9] * 512),
        ]
        
        processor.openai_client.embeddings.create = AsyncMock(return_value=mock_response)
        
        embeddings = await processor._generate_embeddings(texts)
        
        assert len(embeddings) == 3
        assert all(len(emb) == 1536 for emb in embeddings)
        assert all(isinstance(val, float) for emb in embeddings for val in emb)
    
    @pytest.mark.asyncio
    async def test_generate_embeddings_batching(self, processor):
        """Test embedding generation with batching."""
        # Create more texts than batch size to test batching
        texts = [f"Text chunk {i}" for i in range(150)]  # More than batch size of 100
        
        # Mock OpenAI client to return correct number of embeddings per batch
        def mock_create_embeddings(model, input):
            # Return embeddings matching the input size
            return Mock(data=[Mock(embedding=[0.1] * 1536) for _ in range(len(input))])
        
        processor.openai_client.embeddings.create = AsyncMock(side_effect=mock_create_embeddings)
        
        embeddings = await processor._generate_embeddings(texts)
        
        assert len(embeddings) == 150
        # Should be called twice due to batching (100 + 50)
        assert processor.openai_client.embeddings.create.call_count == 2
    
    @pytest.mark.asyncio
    async def test_generate_query_embedding(self, processor):
        """Test query embedding generation."""
        query = "What is the main topic of the document?"
        
        # Mock OpenAI client
        mock_response = Mock()
        mock_response.data = [Mock(embedding=[0.1, 0.2, 0.3] * 512)]
        
        processor.openai_client.embeddings.create = AsyncMock(return_value=mock_response)
        
        embedding = await processor.generate_query_embedding(query)
        
        assert len(embedding) == 1536
        assert all(isinstance(val, float) for val in embedding)
    
    @pytest.mark.asyncio
    async def test_process_document_complete_flow(self, processor, sample_text_content):
        """Test complete document processing flow."""
        # Mock S3 client to return bytes
        processor.s3_client.download_file = AsyncMock(return_value=sample_text_content.encode('utf-8'))
        
        # Mock text extraction
        with patch.object(processor, '_extract_text', return_value=sample_text_content):
            result = await processor.process_document(
                s3_key="test/document.txt",
                s3_bucket="test-bucket",
                file_type="txt",
                original_name="document.txt"
            )
        
        assert "chunks" in result
        assert "chunk_count" in result
        assert "total_tokens" in result
        assert "original_text_length" in result
        
        assert isinstance(result["chunks"], list)
        assert len(result["chunks"]) > 0
        assert result["chunk_count"] == len(result["chunks"])
        assert result["total_tokens"] > 0
        assert result["original_text_length"] == len(sample_text_content)
    
    @pytest.mark.asyncio
    async def test_process_and_store_embeddings(self, processor, sample_text_content):
        """Test complete processing pipeline with embedding storage."""
        # Mock dependencies
        processor.s3_client.download_file = AsyncMock(return_value=sample_text_content.encode('utf-8'))
        processor.vector_store.upsert_embeddings = AsyncMock(return_value=["vec1", "vec2"])
        
        # Mock text extraction and embedding generation
        with patch.object(processor, '_extract_text', return_value=sample_text_content), \
             patch.object(processor, '_generate_embeddings', return_value=[[0.1] * 1536, [0.2] * 1536]):
            
            result = await processor.process_and_store_embeddings(
                s3_key="test/document.txt",
                s3_bucket="test-bucket",
                file_type="txt",
                original_name="document.txt",
                document_id="doc-123",
                user_id="user-456"
            )
        
        assert "chunks" in result
        assert "vector_ids" in result
        assert "embeddings_count" in result
        
        assert len(result["vector_ids"]) == 2
        assert result["embeddings_count"] == 2
        
        # Verify vector store was called
        processor.vector_store.upsert_embeddings.assert_called_once()
    
    def test_validate_file_type(self, processor):
        """Test file type validation."""
        # Mock settings
        with patch('app.core.processors.document_processor.settings') as mock_settings:
            mock_settings.supported_file_types = ['pdf', 'txt', 'docx']
            
            assert processor.validate_file_type('pdf') is True
            assert processor.validate_file_type('PDF') is True  # Case insensitive
            assert processor.validate_file_type('txt') is True
            assert processor.validate_file_type('exe') is False
            assert processor.validate_file_type('unknown') is False
    
    def test_get_supported_file_types(self, processor):
        """Test getting supported file types."""
        with patch('app.core.processors.document_processor.settings') as mock_settings:
            mock_settings.supported_file_types = ['pdf', 'txt', 'docx']
            
            supported_types = processor.get_supported_file_types()
            
            assert supported_types == ['pdf', 'txt', 'docx']
            # Should return a copy, not the original list
            supported_types.append('new_type')
            assert 'new_type' not in processor.get_supported_file_types()
    
    @pytest.mark.asyncio
    async def test_delete_document_from_vector_store(self, processor):
        """Test document deletion from vector store."""
        processor.vector_store.delete_document_embeddings = AsyncMock(return_value=True)
        
        result = await processor.delete_document_from_vector_store("doc-123")
        
        assert result is True
        processor.vector_store.delete_document_embeddings.assert_called_once_with("doc-123")
    
    @pytest.mark.asyncio
    async def test_process_document_no_text_extracted(self, processor):
        """Test handling when no text is extracted."""
        processor.s3_client.download_file = AsyncMock(return_value=b"   ")  # Only whitespace as bytes
        
        with patch.object(processor, '_extract_text', return_value="   "):  # Only whitespace
            with pytest.raises(ValueError, match="No text content could be extracted"):
                await processor.process_document(
                    s3_key="test/empty.txt",
                    s3_bucket="test-bucket",
                    file_type="txt",
                    original_name="empty.txt"
                )
    
    @pytest.mark.asyncio
    async def test_process_document_s3_download_error(self, processor):
        """Test handling S3 download errors."""
        processor.s3_client.download_file = AsyncMock(side_effect=Exception("S3 download failed"))
        
        with pytest.raises(Exception, match="S3 download failed"):
            await processor.process_document(
                s3_key="test/document.txt",
                s3_bucket="test-bucket",
                file_type="txt",
                original_name="document.txt"
            )