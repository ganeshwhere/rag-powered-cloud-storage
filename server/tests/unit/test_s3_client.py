"""
Unit tests for S3Client.
Tests S3 integration functionality in isolation.
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock
from botocore.exceptions import ClientError, NoCredentialsError
import io

from app.core.s3 import S3Client


@pytest.mark.unit
@pytest.mark.s3
class TestS3Client:
    """Unit tests for S3Client class."""
    
    @pytest.fixture
    def mock_boto3_client(self):
        """Mock boto3 S3 client."""
        with patch('app.core.s3.boto3.client') as mock_client:
            yield mock_client.return_value
    
    @pytest.fixture
    def s3_client(self, mock_boto3_client):
        """Create S3Client instance with mocked boto3 client."""
        with patch('app.core.s3.settings') as mock_settings:
            mock_settings.aws_access_key_id = "test-key"
            mock_settings.aws_secret_access_key = "test-secret"
            mock_settings.aws_region = "us-east-1"
            mock_settings.s3_bucket_name = "test-bucket"
            mock_settings.max_file_size_mb = 100
            
            client = S3Client()
            client.s3_client = mock_boto3_client
            return client
    
    def test_generate_s3_key(self, s3_client):
        """Test S3 key generation."""
        user_id = "user-123"
        document_id = "doc-456"
        filename = "test file.txt"
        
        result = s3_client.generate_s3_key(user_id, document_id, filename)
        
        expected = "users/user-123/documents/doc-456/test_file.txt"
        assert result == expected
    
    def test_generate_s3_key_special_characters(self, s3_client):
        """Test S3 key generation with special characters in filename."""
        user_id = "user-123"
        document_id = "doc-456"
        filename = "test/file with spaces.txt"
        
        result = s3_client.generate_s3_key(user_id, document_id, filename)
        
        expected = "users/user-123/documents/doc-456/test_file_with_spaces.txt"
        assert result == expected
    
    @pytest.mark.asyncio
    async def test_upload_file_success(self, s3_client, mock_boto3_client):
        """Test successful file upload."""
        file_obj = io.BytesIO(b"test content")
        s3_key = "test/key.txt"
        content_type = "text/plain"
        
        mock_boto3_client.upload_fileobj.return_value = None
        
        result = await s3_client.upload_file(file_obj, s3_key, content_type)
        
        assert result is True
        mock_boto3_client.upload_fileobj.assert_called_once()
        
        # Check the call arguments
        call_args = mock_boto3_client.upload_fileobj.call_args
        assert call_args[0][0] == file_obj  # file_obj
        assert call_args[0][1] == "test-bucket"  # bucket
        assert call_args[0][2] == s3_key  # key
        
        # Check ExtraArgs
        extra_args = call_args[1]['ExtraArgs']
        assert extra_args['ContentType'] == content_type
        assert 'Metadata' in extra_args
    
    @pytest.mark.asyncio
    async def test_upload_file_client_error(self, s3_client, mock_boto3_client):
        """Test file upload with client error."""
        file_obj = io.BytesIO(b"test content")
        s3_key = "test/key.txt"
        
        mock_boto3_client.upload_fileobj.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}},
            'upload_fileobj'
        )
        
        result = await s3_client.upload_file(file_obj, s3_key)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_download_file_success(self, s3_client, mock_boto3_client):
        """Test successful file download."""
        s3_key = "test/key.txt"
        expected_content = b"test file content"
        
        # Mock the response
        mock_response = {
            'Body': Mock()
        }
        mock_response['Body'].read.return_value = expected_content
        mock_boto3_client.get_object.return_value = mock_response
        
        result = await s3_client.download_file(s3_key)
        
        assert result == expected_content
        mock_boto3_client.get_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=s3_key
        )
    
    @pytest.mark.asyncio
    async def test_download_file_not_found(self, s3_client, mock_boto3_client):
        """Test file download when file not found."""
        s3_key = "test/nonexistent.txt"
        
        mock_boto3_client.get_object.side_effect = ClientError(
            {'Error': {'Code': 'NoSuchKey', 'Message': 'The specified key does not exist.'}},
            'get_object'
        )
        
        result = await s3_client.download_file(s3_key)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_delete_file_success(self, s3_client, mock_boto3_client):
        """Test successful file deletion."""
        s3_key = "test/key.txt"
        
        mock_boto3_client.delete_object.return_value = None
        
        result = await s3_client.delete_file(s3_key)
        
        assert result is True
        mock_boto3_client.delete_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=s3_key
        )
    
    @pytest.mark.asyncio
    async def test_delete_file_error(self, s3_client, mock_boto3_client):
        """Test file deletion with error."""
        s3_key = "test/key.txt"
        
        mock_boto3_client.delete_object.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}},
            'delete_object'
        )
        
        result = await s3_client.delete_file(s3_key)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_generate_presigned_upload_url_success(self, s3_client, mock_boto3_client):
        """Test successful presigned upload URL generation."""
        s3_key = "test/key.txt"
        content_type = "text/plain"
        
        expected_response = {
            'url': 'https://test-bucket.s3.amazonaws.com/',
            'fields': {
                'key': s3_key,
                'Content-Type': content_type,
                'policy': 'encoded-policy',
                'x-amz-signature': 'signature'
            }
        }
        
        mock_boto3_client.generate_presigned_post.return_value = expected_response
        
        result = await s3_client.generate_presigned_upload_url(s3_key, content_type)
        
        assert result == expected_response
        mock_boto3_client.generate_presigned_post.assert_called_once()
        
        # Check call arguments
        call_args = mock_boto3_client.generate_presigned_post.call_args
        assert call_args[1]['Bucket'] == "test-bucket"
        assert call_args[1]['Key'] == s3_key
        assert call_args[1]['Fields']['Content-Type'] == content_type
    
    @pytest.mark.asyncio
    async def test_generate_presigned_upload_url_error(self, s3_client, mock_boto3_client):
        """Test presigned upload URL generation with error."""
        s3_key = "test/key.txt"
        
        mock_boto3_client.generate_presigned_post.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}},
            'generate_presigned_post'
        )
        
        result = await s3_client.generate_presigned_upload_url(s3_key)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_generate_presigned_download_url_success(self, s3_client, mock_boto3_client):
        """Test successful presigned download URL generation."""
        s3_key = "test/key.txt"
        expected_url = "https://test-bucket.s3.amazonaws.com/test/key.txt?signature=abc123"
        
        mock_boto3_client.generate_presigned_url.return_value = expected_url
        
        result = await s3_client.generate_presigned_download_url(s3_key)
        
        assert result == expected_url
        mock_boto3_client.generate_presigned_url.assert_called_once_with(
            'get_object',
            Params={
                'Bucket': "test-bucket",
                'Key': s3_key
            },
            ExpiresIn=3600
        )
    
    @pytest.mark.asyncio
    async def test_generate_presigned_download_url_error(self, s3_client, mock_boto3_client):
        """Test presigned download URL generation with error."""
        s3_key = "test/key.txt"
        
        mock_boto3_client.generate_presigned_url.side_effect = ClientError(
            {'Error': {'Code': 'AccessDenied', 'Message': 'Access Denied'}},
            'generate_presigned_url'
        )
        
        result = await s3_client.generate_presigned_download_url(s3_key)
        
        assert result is None
    
    @pytest.mark.asyncio
    async def test_file_exists_true(self, s3_client, mock_boto3_client):
        """Test file existence check when file exists."""
        s3_key = "test/key.txt"
        
        mock_boto3_client.head_object.return_value = {
            'ContentLength': 1024,
            'ContentType': 'text/plain'
        }
        
        result = await s3_client.file_exists(s3_key)
        
        assert result is True
        mock_boto3_client.head_object.assert_called_once_with(
            Bucket="test-bucket",
            Key=s3_key
        )
    
    @pytest.mark.asyncio
    async def test_file_exists_false(self, s3_client, mock_boto3_client):
        """Test file existence check when file doesn't exist."""
        s3_key = "test/nonexistent.txt"
        
        mock_boto3_client.head_object.side_effect = ClientError(
            {'Error': {'Code': '404', 'Message': 'Not Found'}},
            'head_object'
        )
        
        result = await s3_client.file_exists(s3_key)
        
        assert result is False
    
    @pytest.mark.asyncio
    async def test_get_file_metadata_success(self, s3_client, mock_boto3_client):
        """Test successful file metadata retrieval."""
        s3_key = "test/key.txt"
        
        mock_response = {
            'ContentLength': 1024,
            'ContentType': 'text/plain',
            'LastModified': '2023-01-01T00:00:00Z',
            'ETag': '"abc123"',
            'Metadata': {'custom': 'value'}
        }
        
        mock_boto3_client.head_object.return_value = mock_response
        
        result = await s3_client.get_file_metadata(s3_key)
        
        assert result['size'] == 1024
        assert result['content_type'] == 'text/plain'
        assert result['etag'] == '"abc123"'
        assert result['metadata']['custom'] == 'value'
    
    @pytest.mark.asyncio
    async def test_get_file_metadata_not_found(self, s3_client, mock_boto3_client):
        """Test file metadata retrieval when file not found."""
        s3_key = "test/nonexistent.txt"
        
        mock_boto3_client.head_object.side_effect = ClientError(
            {'Error': {'Code': '404', 'Message': 'Not Found'}},
            'head_object'
        )
        
        result = await s3_client.get_file_metadata(s3_key)
        
        assert result is None
    
    def test_s3_client_initialization_with_credentials(self):
        """Test S3Client initialization with explicit credentials."""
        with patch('app.core.s3.boto3.client') as mock_boto3, \
             patch('app.core.s3.settings') as mock_settings:
            
            mock_settings.aws_access_key_id = "test-key"
            mock_settings.aws_secret_access_key = "test-secret"
            mock_settings.aws_region = "us-east-1"
            mock_settings.s3_bucket_name = "test-bucket"
            
            S3Client()
            
            mock_boto3.assert_called_once()
            call_kwargs = mock_boto3.call_args[1]
            assert call_kwargs['aws_access_key_id'] == "test-key"
            assert call_kwargs['aws_secret_access_key'] == "test-secret"
    
    def test_s3_client_initialization_no_credentials(self):
        """Test S3Client initialization without explicit credentials."""
        with patch('app.core.s3.boto3.client') as mock_boto3, \
             patch('app.core.s3.settings') as mock_settings:
            
            mock_settings.aws_access_key_id = None
            mock_settings.aws_secret_access_key = None
            mock_settings.aws_region = "us-east-1"
            mock_settings.s3_bucket_name = "test-bucket"
            
            S3Client()
            
            mock_boto3.assert_called_once()
            # Should not include credentials in call
            call_kwargs = mock_boto3.call_args[1]
            assert 'aws_access_key_id' not in call_kwargs
            assert 'aws_secret_access_key' not in call_kwargs
    
    def test_s3_client_initialization_no_credentials_error(self):
        """Test S3Client initialization with NoCredentialsError."""
        with patch('app.core.s3.boto3.client') as mock_boto3, \
             patch('app.core.s3.settings') as mock_settings:
            
            mock_settings.aws_access_key_id = None
            mock_settings.aws_secret_access_key = None
            mock_boto3.side_effect = NoCredentialsError()
            
            with pytest.raises(NoCredentialsError):
                S3Client()