"""
Unit tests for DocumentService.
Tests individual service methods in isolation.
"""
import pytest
import uuid
from unittest.mock import Mock, AsyncMock, patch
from fastapi import HTTPException

from app.features.documents.service import DocumentService
from app.features.documents.schemas import DocumentResponse
from app.core.models.document import Document


@pytest.mark.unit
class TestDocumentService:
    """Unit tests for DocumentService class."""
    
    @pytest.fixture
    def mock_db_session(self):
        """Mock database session."""
        session = AsyncMock()
        return session
    
    @pytest.fixture
    def document_service(self, mock_db_session):
        """Create DocumentService instance with mocked dependencies."""
        return DocumentService(mock_db_session)
    
    @pytest.fixture
    def sample_document(self):
        """Create a sample document for testing."""
        from datetime import datetime
        return Document(
            id=uuid.uuid4(),
            user_id=uuid.uuid4(),
            name="test-document.txt",
            original_name="test-document.txt",
            file_type="txt",
            file_size=1024,
            mime_type="text/plain",
            s3_key="users/user-id/documents/doc-id/test-document.txt",
            s3_bucket="test-bucket",
            status="pending",
            chunk_count=0,
            total_tokens=0,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    @pytest.mark.asyncio
    async def test_validate_file_upload_valid_file(self, document_service):
        """Test file upload validation with valid file."""
        mock_file = Mock()
        mock_file.filename = "test.txt"
        mock_file.size = 1024
        
        file_type, error = document_service.validate_file_upload(mock_file)
        
        assert file_type == "txt"
        assert error == ""
    
    @pytest.mark.asyncio
    async def test_validate_file_upload_no_file(self, document_service):
        """Test file upload validation with no file."""
        with pytest.raises(HTTPException) as exc_info:
            document_service.validate_file_upload(None)
        
        assert exc_info.value.status_code == 400
        assert "No file provided" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_validate_file_upload_no_extension(self, document_service):
        """Test file upload validation with file without extension."""
        mock_file = Mock()
        mock_file.filename = "testfile"
        
        with pytest.raises(HTTPException) as exc_info:
            document_service.validate_file_upload(mock_file)
        
        assert exc_info.value.status_code == 400
        assert "must have an extension" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_validate_file_upload_unsupported_type(self, document_service):
        """Test file upload validation with unsupported file type."""
        mock_file = Mock()
        mock_file.filename = "test.exe"
        
        with pytest.raises(HTTPException) as exc_info:
            document_service.validate_file_upload(mock_file)
        
        assert exc_info.value.status_code == 400
        assert "not supported" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_validate_file_upload_oversized_file(self, document_service):
        """Test file upload validation with oversized file."""
        mock_file = Mock()
        mock_file.filename = "test.txt"
        mock_file.size = 200 * 1024 * 1024  # 200MB (over limit)
        
        with pytest.raises(HTTPException) as exc_info:
            document_service.validate_file_upload(mock_file)
        
        assert exc_info.value.status_code == 413
        assert "exceeds maximum limit" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_validate_folder_access_no_folder(self, document_service):
        """Test folder access validation with no folder ID."""
        result = await document_service.validate_folder_access(uuid.uuid4(), None)
        assert result is None
    
    @pytest.mark.asyncio
    async def test_validate_folder_access_valid_folder(self, document_service, mock_db_session):
        """Test folder access validation with valid folder."""
        user_id = uuid.uuid4()
        folder_id = uuid.uuid4()
        
        # Mock database query result
        mock_result = Mock()
        mock_folder = Mock()
        mock_folder.id = folder_id
        mock_result.scalar_one_or_none.return_value = mock_folder
        mock_db_session.execute.return_value = mock_result
        
        result = await document_service.validate_folder_access(user_id, folder_id)
        
        assert result == mock_folder
        mock_db_session.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_validate_folder_access_invalid_folder(self, document_service, mock_db_session):
        """Test folder access validation with invalid folder."""
        user_id = uuid.uuid4()
        folder_id = uuid.uuid4()
        
        # Mock database query result (no folder found)
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc_info:
            await document_service.validate_folder_access(user_id, folder_id)
        
        assert exc_info.value.status_code == 404
        assert "not found or access denied" in str(exc_info.value.detail)
    
    @patch('app.features.documents.service.s3_client')
    @pytest.mark.asyncio
    async def test_upload_file_success(self, mock_s3_client, document_service, mock_db_session):
        """Test successful file upload."""
        # Setup mocks
        mock_file = AsyncMock()
        mock_file.filename = "test.txt"
        mock_file.size = 1024
        mock_file.content_type = "text/plain"
        mock_file.file = Mock()
        
        mock_s3_client.generate_s3_key.return_value = "test-s3-key"
        mock_s3_client.upload_file = AsyncMock(return_value=True)
        
        # Mock database operations
        mock_db_session.add = Mock()
        mock_db_session.commit = AsyncMock()
        
        # Mock refresh to populate timestamp fields
        async def mock_refresh(document):
            from datetime import datetime
            document.created_at = datetime.now()
            document.updated_at = datetime.now()
            document.chunk_count = 0
            document.total_tokens = 0
        
        mock_db_session.refresh = AsyncMock(side_effect=mock_refresh)
        
        user_id = uuid.uuid4()
        
        # Execute
        result = await document_service.upload_file(user_id, mock_file)
        
        # Assertions
        assert isinstance(result, DocumentResponse)
        mock_s3_client.upload_file.assert_called_once()
        mock_db_session.add.assert_called_once()
        mock_db_session.commit.assert_called_once()
    
    @patch('app.features.documents.service.s3_client')
    @pytest.mark.asyncio
    async def test_upload_file_s3_failure(self, mock_s3_client, document_service):
        """Test file upload with S3 failure."""
        # Setup mocks
        mock_file = AsyncMock()
        mock_file.filename = "test.txt"
        mock_file.size = 1024
        mock_file.content_type = "text/plain"
        mock_file.file = Mock()
        
        mock_s3_client.generate_s3_key.return_value = "test-s3-key"
        mock_s3_client.upload_file = AsyncMock(return_value=False)  # S3 upload fails
        
        user_id = uuid.uuid4()
        
        # Execute and assert
        with pytest.raises(HTTPException) as exc_info:
            await document_service.upload_file(user_id, mock_file)
        
        assert exc_info.value.status_code == 500
        assert "Failed to upload file to storage" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_document_success(self, document_service, mock_db_session, sample_document):
        """Test successful document retrieval."""
        user_id = sample_document.user_id
        document_id = sample_document.id
        
        # Mock database query result
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_document
        mock_db_session.execute.return_value = mock_result
        
        result = await document_service.get_document(user_id, document_id)
        
        assert isinstance(result, DocumentResponse)
        assert result.id == document_id
        assert result.name == sample_document.name
    
    @pytest.mark.asyncio
    async def test_get_document_not_found(self, document_service, mock_db_session):
        """Test document retrieval when document not found."""
        user_id = uuid.uuid4()
        document_id = uuid.uuid4()
        
        # Mock database query result (no document found)
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        mock_db_session.execute.return_value = mock_result
        
        with pytest.raises(HTTPException) as exc_info:
            await document_service.get_document(user_id, document_id)
        
        assert exc_info.value.status_code == 404
        assert "not found or access denied" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_get_user_documents_empty(self, document_service, mock_db_session):
        """Test getting user documents when none exist."""
        user_id = uuid.uuid4()
        
        # Mock database query results
        mock_count_result = Mock()
        mock_count_result.scalars.return_value.all.return_value = []
        
        mock_docs_result = Mock()
        mock_docs_result.scalars.return_value.all.return_value = []
        
        mock_db_session.execute.side_effect = [mock_count_result, mock_docs_result]
        
        result = await document_service.get_user_documents(user_id)
        
        assert result.total == 0
        assert len(result.documents) == 0
        assert result.page == 1
        assert result.page_size == 50
    
    @pytest.mark.asyncio
    async def test_get_user_documents_with_pagination(self, document_service, mock_db_session, sample_document):
        """Test getting user documents with pagination."""
        user_id = sample_document.user_id
        
        # Mock database query results
        mock_count_result = Mock()
        mock_count_result.scalars.return_value.all.return_value = [sample_document]
        
        mock_docs_result = Mock()
        mock_docs_result.scalars.return_value.all.return_value = [sample_document]
        
        mock_db_session.execute.side_effect = [mock_count_result, mock_docs_result]
        
        result = await document_service.get_user_documents(user_id, page=1, page_size=10)
        
        assert result.total == 1
        assert len(result.documents) == 1
        assert result.page == 1
        assert result.page_size == 10
    
    @patch('app.features.documents.service.s3_client')
    @pytest.mark.asyncio
    async def test_generate_download_url_success(self, mock_s3_client, document_service, mock_db_session, sample_document):
        """Test successful download URL generation."""
        user_id = sample_document.user_id
        document_id = sample_document.id
        
        # Mock database query result
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_document
        mock_db_session.execute.return_value = mock_result
        
        # Mock S3 client
        mock_s3_client.generate_presigned_download_url = AsyncMock(return_value="https://test-download-url.com")
        
        result = await document_service.generate_download_url(user_id, document_id)
        
        assert result.download_url == "https://test-download-url.com"
        assert result.filename == sample_document.original_name
        assert result.expires_in == 3600
    
    @patch('app.features.documents.service.s3_client')
    @pytest.mark.asyncio
    async def test_delete_document_success(self, mock_s3_client, document_service, mock_db_session, sample_document):
        """Test successful document deletion."""
        user_id = sample_document.user_id
        document_id = sample_document.id
        
        # Mock database query result
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_document
        mock_db_session.execute.return_value = mock_result
        
        # Mock S3 client
        mock_s3_client.delete_file = AsyncMock(return_value=True)
        
        # Mock database operations
        mock_db_session.delete = AsyncMock()
        mock_db_session.commit = AsyncMock()
        
        result = await document_service.delete_document(user_id, document_id)
        
        assert result is True
        mock_s3_client.delete_file.assert_called_once_with(sample_document.s3_key)
        mock_db_session.delete.assert_called_once()
        mock_db_session.commit.assert_called_once()