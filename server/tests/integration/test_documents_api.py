"""
Integration tests for document management APIs.
Tests the complete document upload and management workflow.
"""
import pytest
import uuid
import io
from httpx import AsyncClient
from fastapi import status

from app.main import app


@pytest.mark.integration
@pytest.mark.documents
class TestDocumentAPIs:
    """Integration test suite for document management APIs."""
    
    async def test_health_check(self, client):
        """Test health check endpoint."""
        response = await client.get("/health")
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["status"] == "healthy"
        assert "app_name" in data

    @pytest.mark.auth
    async def test_list_documents_empty(self, client, auth_headers):
        """Test listing documents when none exist for user."""
        response = await client.get("/api/v1/documents/", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "documents" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data
        assert isinstance(data["documents"], list)

    @pytest.mark.s3
    async def test_direct_file_upload_txt(self, client, auth_headers, sample_text_file):
        """Test direct file upload with text file."""
        files = {"file": ("test.txt", sample_text_file, "text/plain")}
        data = {"name": "Test Document"}
        
        response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert response.status_code == status.HTTP_200_OK
        
        result = response.json()
        assert "document" in result
        assert "message" in result
        
        document = result["document"]
        assert document["name"] == "Test Document"
        assert document["file_type"] == "txt"
        assert document["status"] == "pending"
        assert document["file_size"] > 0
        
        return document["id"]

    @pytest.mark.s3
    async def test_direct_file_upload_csv(self, client, auth_headers, sample_csv_file):
        """Test direct file upload with CSV file."""
        files = {"file": ("test.csv", sample_csv_file, "text/csv")}
        data = {"name": "Test CSV Document"}
        
        response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert response.status_code == status.HTTP_200_OK
        
        result = response.json()
        document = result["document"]
        assert document["file_type"] == "csv"
        assert document["mime_type"] == "text/csv"

    @pytest.mark.s3
    async def test_presigned_upload_url_generation(self, client, auth_headers):
        """Test presigned upload URL generation."""
        request_data = {
            "filename": "test-document.pdf",
            "content_type": "application/pdf"
        }
        
        response = await client.post(
            "/api/v1/documents/presigned-upload",
            headers=auth_headers,
            json=request_data
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert "document_id" in data
        assert "upload_url" in data
        assert "fields" in data
        assert "expires_in" in data
        
        # Validate document_id is a valid UUID
        document_id = data["document_id"]
        uuid.UUID(document_id)  # Will raise ValueError if invalid
        
        # Validate S3 URL structure
        upload_url = data["upload_url"]
        assert "amazonaws.com" in upload_url

    async def test_get_document_details(self, client, auth_headers, sample_text_file):
        """Test getting document details."""
        # First upload a document
        files = {"file": ("test.txt", sample_text_file, "text/plain")}
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files
        )
        document_id = upload_response.json()["document"]["id"]
        
        # Get document details
        response = await client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        document = response.json()
        assert document["id"] == document_id
        assert document["file_type"] == "txt"
        assert "s3_key" in document
        assert "created_at" in document
        assert "file_size_mb" in document

    async def test_get_document_status(self, client, auth_headers, sample_text_file):
        """Test getting document processing status."""
        # First upload a document
        files = {"file": ("test.txt", sample_text_file, "text/plain")}
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files
        )
        document_id = upload_response.json()["document"]["id"]
        
        # Get document status
        response = await client.get(
            f"/api/v1/documents/{document_id}/status",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        status_data = response.json()
        assert status_data["id"] == document_id
        assert "status" in status_data
        assert "chunk_count" in status_data
        assert "total_tokens" in status_data

    @pytest.mark.s3
    async def test_generate_download_url(self, client, auth_headers, sample_text_file):
        """Test generating download URL."""
        # First upload a document
        files = {"file": ("test.txt", sample_text_file, "text/plain")}
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files
        )
        document_id = upload_response.json()["document"]["id"]
        
        # Generate download URL
        response = await client.get(
            f"/api/v1/documents/{document_id}/download",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        download_data = response.json()
        assert "download_url" in download_data
        assert "expires_in" in download_data
        assert "filename" in download_data
        
        # Validate S3 URL structure
        download_url = download_data["download_url"]
        assert "amazonaws.com" in download_url
        assert "X-Amz-Signature" in download_url

    async def test_list_documents_with_pagination(self, client, auth_headers):
        """Test document listing with pagination."""
        response = await client.get(
            "/api/v1/documents/?page=1&page_size=2",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        data = response.json()
        assert data["page"] == 1
        assert data["page_size"] == 2
        assert len(data["documents"]) <= 2

    async def test_file_type_validation_presigned(self, client, auth_headers):
        """Test file type validation for presigned upload."""
        request_data = {
            "filename": "invalid-file.exe",
            "content_type": "application/octet-stream"
        }
        
        response = await client.post(
            "/api/v1/documents/presigned-upload",
            headers=auth_headers,
            json=request_data
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        error_data = response.json()
        assert "detail" in error_data
        assert any("not supported" in str(detail) for detail in error_data["detail"])

    async def test_file_type_validation_direct_upload(self, client, auth_headers, invalid_file):
        """Test file type validation for direct upload."""
        files = {"file": ("test.exe", invalid_file, "application/octet-stream")}
        
        response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        
        error_data = response.json()
        assert "not supported" in error_data["detail"]

    @pytest.mark.auth
    async def test_unauthorized_access(self, client):
        """Test that endpoints require authentication."""
        # Test without auth headers
        response = await client.get("/api/v1/documents/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    async def test_document_not_found(self, client, auth_headers):
        """Test accessing non-existent document."""
        fake_id = str(uuid.uuid4())
        response = await client.get(
            f"/api/v1/documents/{fake_id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_404_NOT_FOUND

    async def test_invalid_document_id_format(self, client, auth_headers):
        """Test invalid document ID format."""
        response = await client.get(
            "/api/v1/documents/invalid-uuid",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    @pytest.mark.s3
    async def test_delete_document(self, client, auth_headers, sample_text_file):
        """Test document deletion."""
        # First upload a document
        files = {"file": ("test.txt", sample_text_file, "text/plain")}
        upload_response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files
        )
        document_id = upload_response.json()["document"]["id"]
        
        # Delete the document
        response = await client.delete(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers
        )
        assert response.status_code == status.HTTP_200_OK
        
        delete_data = response.json()
        assert delete_data["deleted_document_id"] == document_id
        assert "successfully" in delete_data["message"]
        
        # Verify document is deleted
        get_response = await client.get(
            f"/api/v1/documents/{document_id}",
            headers=auth_headers
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    async def test_supported_file_types(self, client, auth_headers):
        """Test all supported file types."""
        supported_types = [
            ("test.txt", "text/plain"),
            ("test.md", "text/markdown"),
            ("test.csv", "text/csv"),
            ("test.pdf", "application/pdf"),
            ("test.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
            ("test.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
        ]
        
        for filename, content_type in supported_types:
            request_data = {
                "filename": filename,
                "content_type": content_type
            }
            
            response = await client.post(
                "/api/v1/documents/presigned-upload",
                headers=auth_headers,
                json=request_data
            )
            assert response.status_code == status.HTTP_200_OK, f"Failed for {filename}"

    @pytest.mark.s3
    async def test_s3_key_structure(self, client, auth_headers, sample_text_file):
        """Test that S3 keys follow the expected structure."""
        files = {"file": ("test.txt", sample_text_file, "text/plain")}
        response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files
        )
        
        document = response.json()["document"]
        s3_key = document["s3_key"]
        
        # Validate S3 key structure: users/{user_id}/documents/{doc_id}/{filename}
        parts = s3_key.split("/")
        assert len(parts) == 4
        assert parts[0] == "users"
        assert parts[2] == "documents"
        assert parts[3] == "test.txt"
        
        # Validate UUIDs
        uuid.UUID(parts[1])  # user_id
        uuid.UUID(document["id"])  # document_id

    @pytest.mark.slow
    async def test_large_file_upload(self, client, auth_headers, large_text_file):
        """Test uploading a larger file."""
        files = {"file": ("large-test.txt", large_text_file, "text/plain")}
        data = {"name": "Large Test Document"}
        
        response = await client.post(
            "/api/v1/documents/upload",
            headers=auth_headers,
            files=files,
            data=data
        )
        assert response.status_code == status.HTTP_200_OK
        
        document = response.json()["document"]
        assert document["file_size"] > 10000  # Should be a large file
        assert document["file_size_mb"] > 0.01

    async def test_multiple_file_formats(self, client, auth_headers, sample_text_file, sample_markdown_file, sample_csv_file):
        """Test uploading multiple different file formats."""
        test_files = [
            ("test.txt", sample_text_file, "text/plain"),
            ("test.md", sample_markdown_file, "text/markdown"),
            ("test.csv", sample_csv_file, "text/csv"),
        ]
        
        uploaded_docs = []
        
        for filename, file_obj, content_type in test_files:
            files = {"file": (filename, file_obj, content_type)}
            data = {"name": f"Test {filename.upper()} Document"}
            
            response = await client.post(
                "/api/v1/documents/upload",
                headers=auth_headers,
                files=files,
                data=data
            )
            assert response.status_code == status.HTTP_200_OK
            
            document = response.json()["document"]
            uploaded_docs.append(document)
        
        # Verify all documents were uploaded
        assert len(uploaded_docs) == 3
        
        # Verify different file types
        file_types = [doc["file_type"] for doc in uploaded_docs]
        assert "txt" in file_types
        assert "md" in file_types
        assert "csv" in file_types