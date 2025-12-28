"""
Celery tasks for background processing.
"""
import logging
from typing import Optional
from uuid import UUID
from celery import Task
from sqlalchemy.orm import Session
from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.core.models.document import Document, DocumentChunk
from app.core.processors.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)


class DatabaseTask(Task):
    """Base task class that provides database session management."""
    
    _db: Optional[Session] = None
    
    @property
    def db(self) -> Session:
        """Get database session for the task."""
        if self._db is None:
            self._db = SessionLocal()
        return self._db
    
    def after_return(self, status, retval, task_id, args, kwargs, einfo):
        """Clean up database session after task completion."""
        if self._db is not None:
            try:
                self._db.close()
            except Exception as e:
                logger.error(f"Error closing database session: {e}")
            finally:
                self._db = None


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 3, "countdown": 60},
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def process_document_task(self, document_id: str) -> dict:
    """
    Process a document: extract text, create chunks, generate embeddings, and store in vector database.
    
    Args:
        document_id: UUID string of the document to process
        
    Returns:
        dict: Processing result with status and metadata
    """
    try:
        # Convert string to UUID
        doc_uuid = UUID(document_id)
        
        # Get document from database
        document = self.db.query(Document).filter(Document.id == doc_uuid).first()
        if not document:
            raise ValueError(f"Document with ID {document_id} not found")
        
        # Update status to processing
        document.status = "processing"
        self.db.commit()
        
        logger.info(f"Starting processing for document {document_id} ({document.original_name})")
        
        # Initialize document processor
        processor = DocumentProcessor()
        
        # Process document and generate embeddings
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            processing_result = loop.run_until_complete(
                processor.process_and_store_embeddings(
                    s3_key=document.s3_key,
                    s3_bucket=document.s3_bucket,
                    file_type=document.file_type,
                    original_name=document.original_name,
                    document_id=document_id,
                    user_id=str(document.user_id)
                )
            )
        finally:
            loop.close()
        
        # Store chunks in database
        chunks_data = processing_result["chunks"]
        vector_ids = processing_result["vector_ids"]
        
        # Delete existing chunks (in case of reprocessing)
        self.db.query(DocumentChunk).filter(DocumentChunk.document_id == doc_uuid).delete()
        
        # Create new chunks
        for i, (chunk_text, vector_id) in enumerate(zip(chunks_data, vector_ids)):
            chunk = DocumentChunk(
                document_id=doc_uuid,
                chunk_index=i,
                content=chunk_text,
                vector_id=vector_id,
                token_count=processor._count_tokens(chunk_text)
            )
            self.db.add(chunk)
        
        # Update document with processing results
        document.status = "completed"
        document.chunk_count = processing_result["chunk_count"]
        document.total_tokens = processing_result["total_tokens"]
        document.processing_error = None
        
        # Commit all changes
        self.db.commit()
        
        logger.info(f"Successfully processed document {document_id}: {document.chunk_count} chunks, {document.total_tokens} tokens")
        
        return {
            "status": "success",
            "document_id": document_id,
            "chunk_count": document.chunk_count,
            "total_tokens": document.total_tokens,
            "embeddings_count": processing_result["embeddings_count"]
        }
        
    except Exception as e:
        logger.error(f"Error processing document {document_id}: {str(e)}")
        
        # Update document status to failed
        try:
            doc_uuid = UUID(document_id)
            document = self.db.query(Document).filter(Document.id == doc_uuid).first()
            if document:
                document.status = "failed"
                document.processing_error = str(e)
                self.db.commit()
        except Exception as db_error:
            logger.error(f"Error updating document status: {str(db_error)}")
        
        # Re-raise the exception to trigger Celery retry
        raise


@celery_app.task(bind=True, base=DatabaseTask)
def health_check_task(self) -> dict:
    """
    Health check task to verify Celery worker is functioning.
    
    Returns:
        dict: Health check result
    """
    try:
        # Test database connection
        self.db.execute("SELECT 1")
        
        return {
            "status": "healthy",
            "worker_id": self.request.id,
            "timestamp": self.request.eta or "now"
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "worker_id": self.request.id
        }


@celery_app.task(
    bind=True,
    base=DatabaseTask,
    autoretry_for=(Exception,),
    retry_kwargs={"max_retries": 2, "countdown": 30},
)
def cleanup_document_task(self, document_id: str) -> dict:
    """
    Clean up document data from vector store when a document is deleted.
    
    Args:
        document_id: UUID string of the document to clean up
        
    Returns:
        dict: Cleanup result
    """
    try:
        logger.info(f"Starting cleanup for document {document_id}")
        
        # Initialize document processor for vector store access
        processor = DocumentProcessor()
        
        # Delete embeddings from vector store
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            success = loop.run_until_complete(
                processor.delete_document_from_vector_store(document_id)
            )
        finally:
            loop.close()
        
        if success:
            logger.info(f"Successfully cleaned up document {document_id}")
            return {
                "status": "success",
                "document_id": document_id,
                "message": "Document cleanup completed"
            }
        else:
            logger.warning(f"Partial cleanup for document {document_id}")
            return {
                "status": "partial",
                "document_id": document_id,
                "message": "Some cleanup operations may have failed"
            }
        
    except Exception as e:
        logger.error(f"Error cleaning up document {document_id}: {str(e)}")
        raise