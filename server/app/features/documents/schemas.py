"""
Pydantic schemas for document upload and management.
"""
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, computed_field

from app.core.config import settings


class DocumentUploadRequest(BaseModel):
    """Schema for document upload request."""
    
    name: Optional[str] = Field(None, description="Display name for the document")
    folder_id: Optional[uuid.UUID] = Field(None, description="Folder ID to upload to")
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class PresignedUploadRequest(BaseModel):
    """Schema for presigned upload URL request."""
    
    filename: str = Field(..., description="Original filename")
    content_type: Optional[str] = Field(None, description="MIME type of the file")
    folder_id: Optional[uuid.UUID] = Field(None, description="Folder ID to upload to")
    
    @field_validator('filename')
    @classmethod
    def validate_filename(cls, v):
        if not v or not v.strip():
            raise ValueError("Filename cannot be empty")
        
        # Extract file extension
        if '.' not in v:
            raise ValueError("Filename must have an extension")
        
        file_ext = v.split('.')[-1].lower()
        if file_ext not in settings.supported_file_types:
            raise ValueError(f"File type '{file_ext}' is not supported. Supported types: {', '.join(settings.supported_file_types)}")
        
        return v.strip()
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class PresignedUploadResponse(BaseModel):
    """Schema for presigned upload URL response."""
    
    document_id: uuid.UUID = Field(..., description="Document ID for tracking")
    upload_url: str = Field(..., description="Presigned upload URL")
    fields: Dict[str, str] = Field(..., description="Form fields for upload")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class DocumentResponse(BaseModel):
    """Schema for document response."""
    
    id: uuid.UUID
    user_id: uuid.UUID
    folder_id: Optional[uuid.UUID] = None
    name: str
    original_name: str
    file_type: str
    file_size: int
    mime_type: Optional[str] = None
    s3_key: str
    s3_bucket: str
    status: str
    processing_error: Optional[str] = None
    chunk_count: int
    total_tokens: int
    extra_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    
    @computed_field
    @property
    def file_size_mb(self) -> float:
        return round(self.file_size / (1024 * 1024), 2)
    
    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: str,
            datetime: lambda v: v.isoformat()
        }


class DocumentListResponse(BaseModel):
    """Schema for document list response."""
    
    documents: list[DocumentResponse]
    total: int
    page: int
    page_size: int
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class DocumentStatusResponse(BaseModel):
    """Schema for document processing status response."""
    
    id: uuid.UUID
    status: str
    processing_error: Optional[str] = None
    chunk_count: int
    total_tokens: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: str,
            datetime: lambda v: v.isoformat()
        }


class DocumentUploadResponse(BaseModel):
    """Schema for successful document upload response."""
    
    document: DocumentResponse
    message: str = "Document uploaded successfully"
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class DownloadUrlResponse(BaseModel):
    """Schema for download URL response."""
    
    download_url: str = Field(..., description="Presigned download URL")
    expires_in: int = Field(..., description="URL expiration time in seconds")
    filename: str = Field(..., description="Original filename")
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class DocumentDeleteResponse(BaseModel):
    """Schema for document deletion response."""
    
    message: str = "Document deleted successfully"
    deleted_document_id: uuid.UUID
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class UploadValidationError(BaseModel):
    """Schema for upload validation errors."""
    
    error: str
    details: Optional[Dict[str, Any]] = None
    supported_types: list[str] = Field(default_factory=lambda: settings.supported_file_types)
    max_size_mb: int = Field(default_factory=lambda: settings.max_file_size_mb)
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }