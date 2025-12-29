"""
Document upload and management API endpoints.
"""
import uuid
import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.models.user import User
from app.features.documents.service import DocumentService
from app.features.documents.schemas import (
    DocumentUploadRequest,
    DocumentUpdateRequest,
    DocumentUploadResponse,
    DocumentResponse,
    DocumentListResponse,
    PresignedUploadRequest,
    PresignedUploadResponse,
    ConfirmUploadRequest,
    DownloadUrlResponse,
    DocumentStatusResponse,
    DocumentDeleteResponse,
    BulkDeleteRequest,
    BulkDeleteResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    name: Optional[str] = None,
    folder_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Upload a document file directly to the system.
    
    - **file**: The file to upload (required)
    - **name**: Display name for the document (optional, defaults to filename)
    - **folder_id**: UUID of the folder to upload to (optional)
    
    Returns the uploaded document information and triggers background processing.
    """
    try:
        # Parse folder_id if provided
        parsed_folder_id = None
        if folder_id:
            try:
                parsed_folder_id = uuid.UUID(folder_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid folder_id format")
        
        service = DocumentService(db)
        document = await service.upload_file(
            user_id=current_user.id,
            file=file,
            name=name,
            folder_id=parsed_folder_id
        )
        
        return DocumentUploadResponse(
            document=document,
            message="Document uploaded successfully and processing started"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during file upload: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during upload")


@router.post("/presigned-upload", response_model=PresignedUploadResponse)
async def generate_presigned_upload_url(
    request: PresignedUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a presigned URL for direct client-side upload to S3.
    
    This endpoint allows clients to upload files directly to S3 without
    going through the server, which is more efficient for large files.
    
    - **filename**: Original filename with extension (required)
    - **content_type**: MIME type of the file (optional)
    - **folder_id**: UUID of the folder to upload to (optional)
    
    Returns presigned URL and form fields for direct S3 upload.
    """
    try:
        service = DocumentService(db)
        response = await service.generate_presigned_upload_url(
            user_id=current_user.id,
            filename=request.filename,
            content_type=request.content_type,
            folder_id=request.folder_id
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating presigned URL: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{document_id}/confirm", response_model=DocumentResponse)
async def confirm_presigned_upload(
    document_id: uuid.UUID,
    request: ConfirmUploadRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Confirm completion of presigned upload and trigger document processing.
    
    - **document_id**: UUID of the document (from presigned upload response)
    - **file_size**: Actual size of the uploaded file in bytes
    
    This endpoint should be called after successfully uploading to S3 using the presigned URL.
    It updates the document record and triggers background processing.
    """
    try:
        service = DocumentService(db)
        document = await service.confirm_presigned_upload(
            user_id=current_user.id,
            document_id=document_id,
            file_size=request.file_size
        )
        
        return document
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error confirming upload: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    folder_id: Optional[str] = Query(None, description="Filter by folder ID"),
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(50, ge=1, le=100, description="Number of documents per page"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user's documents with optional folder filtering and pagination.
    
    - **folder_id**: UUID of folder to filter by (optional)
    - **page**: Page number starting from 1 (default: 1)
    - **page_size**: Number of documents per page, max 100 (default: 50)
    
    Returns paginated list of user's documents.
    """
    try:
        # Parse folder_id if provided
        parsed_folder_id = None
        if folder_id:
            try:
                parsed_folder_id = uuid.UUID(folder_id)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid folder_id format")
        
        service = DocumentService(db)
        response = await service.get_user_documents(
            user_id=current_user.id,
            folder_id=parsed_folder_id,
            page=page,
            page_size=page_size
        )
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific document.
    
    - **document_id**: UUID of the document
    
    Returns comprehensive document metadata including processing status.
    """
    try:
        service = DocumentService(db)
        document = await service.get_document(
            user_id=current_user.id,
            document_id=document_id
        )
        
        return document
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get document processing status.
    
    - **document_id**: UUID of the document
    
    Returns current processing status, error information, and progress details.
    """
    try:
        service = DocumentService(db)
        status = await service.get_document_status(
            user_id=current_user.id,
            document_id=document_id
        )
        
        return status
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error getting document status: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{document_id}/download", response_model=DownloadUrlResponse)
async def get_download_url(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a secure download URL for a document.
    
    - **document_id**: UUID of the document
    
    Returns a time-limited presigned URL for downloading the document.
    """
    try:
        service = DocumentService(db)
        download_response = await service.generate_download_url(
            user_id=current_user.id,
            document_id=document_id
        )
        
        return download_response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error generating download URL: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: uuid.UUID,
    request: DocumentUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update document metadata.
    
    - **document_id**: UUID of the document
    - **name**: New display name for the document (optional)
    - **folder_id**: New folder ID or null to move to root (optional)
    
    Updates the document's metadata while preserving file content and processing status.
    """
    try:
        service = DocumentService(db)
        document = await service.update_document(
            user_id=current_user.id,
            document_id=document_id,
            name=request.name,
            folder_id=request.folder_id
        )
        
        return document
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error updating document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/bulk", response_model=BulkDeleteResponse)
async def bulk_delete_documents(
    request: BulkDeleteRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete multiple documents and all associated data.
    
    - **document_ids**: List of document UUIDs to delete (max 50)
    
    This will remove all specified documents from storage, database, and vector store.
    The operation cannot be undone. Returns summary of successful and failed deletions.
    """
    try:
        service = DocumentService(db)
        deleted_count, failed_count, failed_document_ids = await service.bulk_delete_documents(
            user_id=current_user.id,
            document_ids=request.document_ids
        )
        
        return BulkDeleteResponse(
            deleted_count=deleted_count,
            failed_count=failed_count,
            failed_documents=failed_document_ids
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during bulk deletion: {e}")
        raise HTTPException(status_code=500, detail="Internal server error during bulk deletion")


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
async def delete_document(
    document_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a document and all associated data.
    
    - **document_id**: UUID of the document
    
    This will remove the document from storage, database, and vector store.
    The operation cannot be undone.
    """
    try:
        service = DocumentService(db)
        success = await service.delete_document(
            user_id=current_user.id,
            document_id=document_id
        )
        
        if success:
            return DocumentDeleteResponse(
                message="Document deleted successfully",
                deleted_document_id=document_id
            )
        else:
            raise HTTPException(status_code=500, detail="Failed to delete document")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")