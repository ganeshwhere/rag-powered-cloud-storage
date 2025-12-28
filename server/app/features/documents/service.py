"""
Document upload and management service.
"""
import uuid
import logging
from typing import Optional, BinaryIO, Tuple
from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import and_, desc, select

from app.core.models.document import Document
from app.core.models.folder import Folder
from app.core.s3 import s3_client
from app.core.config import settings
from app.features.documents.schemas import (
    DocumentResponse,
    DocumentListResponse,
    PresignedUploadResponse,
    DownloadUrlResponse,
    DocumentStatusResponse
)
from app.workers.tasks import process_document_task, cleanup_document_task

logger = logging.getLogger(__name__)


class DocumentService:
    """Service for document upload and management operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    def validate_file_upload(self, file: UploadFile) -> Tuple[str, str]:
        """
        Validate uploaded file against requirements.
        
        Args:
            file: Uploaded file object
            
        Returns:
            Tuple of (file_type, error_message)
            
        Raises:
            HTTPException: If validation fails
        """
        # Check if file exists
        if not file or not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Extract file extension
        filename = file.filename.lower()
        if '.' not in filename:
            raise HTTPException(
                status_code=400, 
                detail="File must have an extension"
            )
        
        file_type = filename.split('.')[-1]
        
        # Check supported file types
        if file_type not in settings.supported_file_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_type}' not supported. Supported types: {', '.join(settings.supported_file_types)}"
            )
        
        # Check file size
        if hasattr(file, 'size') and file.size:
            max_size = settings.max_file_size_mb * 1024 * 1024
            if file.size > max_size:
                raise HTTPException(
                    status_code=413,
                    detail=f"File size exceeds maximum limit of {settings.max_file_size_mb}MB"
                )
        
        return file_type, ""
    
    async def validate_folder_access(self, user_id: uuid.UUID, folder_id: Optional[uuid.UUID]) -> Optional[Folder]:
        """
        Validate user access to folder.
        
        Args:
            user_id: User ID
            folder_id: Folder ID to validate
            
        Returns:
            Folder object if valid, None if no folder specified
            
        Raises:
            HTTPException: If folder doesn't exist or user doesn't have access
        """
        if not folder_id:
            return None
        
        stmt = select(Folder).where(and_(Folder.id == folder_id, Folder.user_id == user_id))
        result = await self.db.execute(stmt)
        folder = result.scalar_one_or_none()
        
        if not folder:
            raise HTTPException(
                status_code=404,
                detail="Folder not found or access denied"
            )
        
        return folder
    
    async def upload_file(
        self, 
        user_id: uuid.UUID, 
        file: UploadFile,
        name: Optional[str] = None,
        folder_id: Optional[uuid.UUID] = None
    ) -> DocumentResponse:
        """
        Upload file to S3 and create document record.
        
        Args:
            user_id: User ID
            file: Uploaded file
            name: Display name for document
            folder_id: Optional folder ID
            
        Returns:
            Document response
        """
        # Validate file
        file_type, _ = self.validate_file_upload(file)
        
        # Validate folder access
        folder = await self.validate_folder_access(user_id, folder_id)
        
        # Generate document ID and S3 key
        document_id = uuid.uuid4()
        s3_key = s3_client.generate_s3_key(
            str(user_id), 
            str(document_id), 
            file.filename
        )
        
        # Get file size
        file_size = 0
        if hasattr(file, 'size') and file.size:
            file_size = file.size
        else:
            # Read file to get size
            content = await file.read()
            file_size = len(content)
            # Reset file pointer
            await file.seek(0)
        
        # Upload to S3
        success = await s3_client.upload_file(
            file.file,
            s3_key,
            file.content_type
        )
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to upload file to storage"
            )
        
        # Create document record
        document = Document(
            id=document_id,
            user_id=user_id,
            folder_id=folder_id,
            name=name or file.filename,
            original_name=file.filename,
            file_type=file_type,
            file_size=file_size,
            mime_type=file.content_type,
            s3_key=s3_key,
            s3_bucket=settings.s3_bucket_name,
            status="pending"
        )
        
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        
        logger.info(f"Document uploaded successfully: {document.id}")
        
        # Trigger background processing task
        try:
            process_document_task.delay(str(document.id))
            logger.info(f"Queued processing task for document: {document.id}")
        except Exception as e:
            logger.error(f"Failed to queue processing task for document {document.id}: {str(e)}")
            # Don't fail the upload if task queueing fails
        
        return DocumentResponse.model_validate(document)
    
    async def generate_presigned_upload_url(
        self,
        user_id: uuid.UUID,
        filename: str,
        content_type: Optional[str] = None,
        folder_id: Optional[uuid.UUID] = None
    ) -> PresignedUploadResponse:
        """
        Generate presigned URL for direct S3 upload.
        
        Args:
            user_id: User ID
            filename: Original filename
            content_type: MIME type
            folder_id: Optional folder ID
            
        Returns:
            Presigned upload response
        """
        # Validate file type
        if '.' not in filename:
            raise HTTPException(
                status_code=400,
                detail="Filename must have an extension"
            )
        
        file_type = filename.split('.')[-1].lower()
        if file_type not in settings.supported_file_types:
            raise HTTPException(
                status_code=400,
                detail=f"File type '{file_type}' not supported. Supported types: {', '.join(settings.supported_file_types)}"
            )
        
        # Validate folder access
        folder = await self.validate_folder_access(user_id, folder_id)
        
        # Generate document ID and S3 key
        document_id = uuid.uuid4()
        s3_key = s3_client.generate_s3_key(
            str(user_id),
            str(document_id),
            filename
        )
        
        # Generate presigned URL
        presigned_data = await s3_client.generate_presigned_upload_url(
            s3_key,
            content_type
        )
        
        if not presigned_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate upload URL"
            )
        
        # Create document record with pending status
        document = Document(
            id=document_id,
            user_id=user_id,
            folder_id=folder_id,
            name=filename,
            original_name=filename,
            file_type=file_type,
            file_size=0,  # Will be updated after upload
            mime_type=content_type,
            s3_key=s3_key,
            s3_bucket=settings.s3_bucket_name,
            status="pending"
        )
        
        self.db.add(document)
        await self.db.commit()
        
        logger.info(f"Generated presigned upload URL for document: {document_id}")
        
        return PresignedUploadResponse(
            document_id=document_id,
            upload_url=presigned_data['url'],
            fields=presigned_data['fields'],
            expires_in=3600  # 1 hour
        )
    
    async def confirm_presigned_upload(
        self,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        file_size: int
    ) -> DocumentResponse:
        """
        Confirm presigned upload completion and trigger processing.
        
        Args:
            user_id: User ID
            document_id: Document ID
            file_size: Actual file size after upload
            
        Returns:
            Document response
        """
        stmt = select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        # Update file size
        document.file_size = file_size
        await self.db.commit()
        await self.db.refresh(document)
        
        # Trigger background processing task
        try:
            process_document_task.delay(str(document.id))
            logger.info(f"Queued processing task for presigned upload: {document.id}")
        except Exception as e:
            logger.error(f"Failed to queue processing task for document {document.id}: {str(e)}")
        
        return DocumentResponse.model_validate(document)
    
    async def get_user_documents(
        self,
        user_id: uuid.UUID,
        folder_id: Optional[uuid.UUID] = None,
        page: int = 1,
        page_size: int = 50
    ) -> DocumentListResponse:
        """
        Get user's documents with optional folder filtering.
        
        Args:
            user_id: User ID
            folder_id: Optional folder ID to filter by
            page: Page number (1-based)
            page_size: Number of documents per page
            
        Returns:
            Document list response
        """
        # Build query
        stmt = select(Document).where(Document.user_id == user_id)
        
        if folder_id is not None:
            stmt = stmt.where(Document.folder_id == folder_id)
        
        # Get total count
        count_stmt = select(Document).where(Document.user_id == user_id)
        if folder_id is not None:
            count_stmt = count_stmt.where(Document.folder_id == folder_id)
        
        count_result = await self.db.execute(count_stmt)
        total = len(count_result.scalars().all())
        
        # Apply pagination and ordering
        stmt = stmt.order_by(desc(Document.created_at)).offset(
            (page - 1) * page_size
        ).limit(page_size)
        
        result = await self.db.execute(stmt)
        documents = result.scalars().all()
        
        document_responses = [DocumentResponse.model_validate(doc) for doc in documents]
        
        return DocumentListResponse(
            documents=document_responses,
            total=total,
            page=page,
            page_size=page_size
        )
    
    async def get_document(self, user_id: uuid.UUID, document_id: uuid.UUID) -> DocumentResponse:
        """
        Get document by ID with user access validation.
        
        Args:
            user_id: User ID
            document_id: Document ID
            
        Returns:
            Document response
            
        Raises:
            HTTPException: If document not found or access denied
        """
        stmt = select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        return DocumentResponse.model_validate(document)
    
    async def get_document_status(self, user_id: uuid.UUID, document_id: uuid.UUID) -> DocumentStatusResponse:
        """
        Get document processing status.
        
        Args:
            user_id: User ID
            document_id: Document ID
            
        Returns:
            Document status response
        """
        stmt = select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        return DocumentStatusResponse.model_validate(document)
    
    async def generate_download_url(
        self, 
        user_id: uuid.UUID, 
        document_id: uuid.UUID
    ) -> DownloadUrlResponse:
        """
        Generate presigned download URL for document.
        
        Args:
            user_id: User ID
            document_id: Document ID
            
        Returns:
            Download URL response
        """
        stmt = select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        # Generate presigned download URL
        download_url = await s3_client.generate_presigned_download_url(document.s3_key)
        
        if not download_url:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate download URL"
            )
        
        return DownloadUrlResponse(
            download_url=download_url,
            expires_in=3600,  # 1 hour
            filename=document.original_name
        )
    
    async def update_document(
        self, 
        user_id: uuid.UUID, 
        document_id: uuid.UUID,
        name: Optional[str] = None,
        folder_id: Optional[uuid.UUID] = None
    ) -> DocumentResponse:
        """
        Update document metadata.
        
        Args:
            user_id: User ID
            document_id: Document ID
            name: New display name (optional)
            folder_id: New folder ID (optional, None to move to root)
            
        Returns:
            Updated document response
            
        Raises:
            HTTPException: If document not found or access denied
        """
        stmt = select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        # Validate folder access if folder_id is provided
        if folder_id is not None:
            await self.validate_folder_access(user_id, folder_id)
        
        # Update fields if provided
        if name is not None:
            if not name.strip():
                raise HTTPException(
                    status_code=400,
                    detail="Document name cannot be empty"
                )
            document.name = name.strip()
        
        if folder_id is not None:
            document.folder_id = folder_id
        
        await self.db.commit()
        await self.db.refresh(document)
        
        logger.info(f"Document updated successfully: {document_id}")
        
        return DocumentResponse.model_validate(document)
    
    async def delete_document(self, user_id: uuid.UUID, document_id: uuid.UUID) -> bool:
        """
        Delete document and associated data.
        
        Args:
            user_id: User ID
            document_id: Document ID
            
        Returns:
            True if deletion successful
            
        Raises:
            HTTPException: If document not found or access denied
        """
        stmt = select(Document).where(
            and_(Document.id == document_id, Document.user_id == user_id)
        )
        result = await self.db.execute(stmt)
        document = result.scalar_one_or_none()
        
        if not document:
            raise HTTPException(
                status_code=404,
                detail="Document not found or access denied"
            )
        
        # Delete from S3
        s3_success = await s3_client.delete_file(document.s3_key)
        if not s3_success:
            logger.warning(f"Failed to delete S3 file: {document.s3_key}")
        
        # Delete from database (cascades to chunks)
        await self.db.delete(document)
        await self.db.commit()
        
        logger.info(f"Document deleted successfully: {document_id}")
        
        # Trigger cleanup task for vector store
        try:
            cleanup_document_task.delay(str(document_id))
            logger.info(f"Queued cleanup task for document: {document_id}")
        except Exception as e:
            logger.error(f"Failed to queue cleanup task for document {document_id}: {str(e)}")
            # Don't fail the deletion if cleanup task queueing fails
        
    async def bulk_delete_documents(
        self, 
        user_id: uuid.UUID, 
        document_ids: list[uuid.UUID]
    ) -> tuple[int, int, list[uuid.UUID]]:
        """
        Delete multiple documents and associated data.
        
        Args:
            user_id: User ID
            document_ids: List of document IDs to delete
            
        Returns:
            Tuple of (deleted_count, failed_count, failed_document_ids)
        """
        deleted_count = 0
        failed_count = 0
        failed_document_ids = []
        
        for document_id in document_ids:
            try:
                success = await self.delete_document(user_id, document_id)
                if success:
                    deleted_count += 1
                else:
                    failed_count += 1
                    failed_document_ids.append(document_id)
            except HTTPException as e:
                # Document not found or access denied
                failed_count += 1
                failed_document_ids.append(document_id)
                logger.warning(f"Failed to delete document {document_id}: {e.detail}")
            except Exception as e:
                # Unexpected error
                failed_count += 1
                failed_document_ids.append(document_id)
                logger.error(f"Unexpected error deleting document {document_id}: {str(e)}")
        
        logger.info(f"Bulk deletion completed: {deleted_count} deleted, {failed_count} failed")
        
        return deleted_count, failed_count, failed_document_ids