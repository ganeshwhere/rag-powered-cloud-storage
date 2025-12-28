"""
Pydantic schemas for folder management.
"""
import uuid
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, field_validator


class FolderCreateRequest(BaseModel):
    """Schema for folder creation request."""
    
    name: str = Field(..., min_length=1, max_length=255, description="Folder name")
    parent_id: Optional[uuid.UUID] = Field(None, description="Parent folder ID")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError("Folder name cannot be empty")
        
        # Check for invalid characters
        invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
        if any(char in v for char in invalid_chars):
            raise ValueError(f"Folder name cannot contain: {', '.join(invalid_chars)}")
        
        return v.strip()
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class FolderUpdateRequest(BaseModel):
    """Schema for folder update request."""
    
    name: Optional[str] = Field(None, min_length=1, max_length=255, description="New folder name")
    parent_id: Optional[uuid.UUID] = Field(None, description="New parent folder ID")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if v is not None:
            if not v or not v.strip():
                raise ValueError("Folder name cannot be empty")
            
            # Check for invalid characters
            invalid_chars = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
            if any(char in v for char in invalid_chars):
                raise ValueError(f"Folder name cannot contain: {', '.join(invalid_chars)}")
            
            return v.strip()
        return v
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class FolderResponse(BaseModel):
    """Schema for folder response."""
    
    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    name: str
    path: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: str,
            datetime: lambda v: v.isoformat()
        }


class FolderWithContentsResponse(BaseModel):
    """Schema for folder response with contents."""
    
    id: uuid.UUID
    user_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    name: str
    path: str
    created_at: datetime
    updated_at: datetime
    children: List["FolderResponse"] = Field(default_factory=list, description="Child folders")
    document_count: int = Field(0, description="Number of documents in this folder")
    
    class Config:
        from_attributes = True
        json_encoders = {
            uuid.UUID: str,
            datetime: lambda v: v.isoformat()
        }


class FolderListResponse(BaseModel):
    """Schema for folder list response."""
    
    folders: List[FolderResponse]
    total: int
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class FolderCreateResponse(BaseModel):
    """Schema for folder creation response."""
    
    folder: FolderResponse
    message: str = "Folder created successfully"
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class FolderUpdateResponse(BaseModel):
    """Schema for folder update response."""
    
    folder: FolderResponse
    message: str = "Folder updated successfully"
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class FolderDeleteResponse(BaseModel):
    """Schema for folder deletion response."""
    
    message: str = "Folder deleted successfully"
    deleted_folder_id: uuid.UUID
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class FolderContentsResponse(BaseModel):
    """Schema for folder contents response."""
    
    folder: FolderWithContentsResponse
    
    class Config:
        json_encoders = {
            uuid.UUID: str
        }


class MessageResponse(BaseModel):
    """Schema for simple message responses."""
    
    message: str = Field(..., description="Response message")


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    
    detail: str = Field(..., description="Error detail message")
    error_code: Optional[str] = Field(None, description="Specific error code")