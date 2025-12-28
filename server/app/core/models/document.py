"""
Document and DocumentChunk models for file storage and processing.
"""
import uuid
from typing import Optional, Any
from sqlalchemy import String, Integer, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models.base import UUIDMixin, TimestampMixin


class Document(Base, UUIDMixin, TimestampMixin):
    """Document model for uploaded files and their metadata."""
    
    __tablename__ = "documents"
    
    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), 
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    folder_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    
    # File information
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    # Storage information
    s3_key: Mapped[str] = mapped_column(String(500), unique=True, nullable=False)
    s3_bucket: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Processing information
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False)
    processing_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Additional metadata
    extra_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="documents")
    folder: Mapped[Optional["Folder"]] = relationship("Folder", back_populates="documents")
    chunks: Mapped[list["DocumentChunk"]] = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<Document(id={self.id}, name={self.name}, status={self.status})>"


class DocumentChunk(Base, UUIDMixin, TimestampMixin):
    """Document chunk model for processed text segments."""
    
    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_document_chunks_document_chunk"),
    )
    
    # Foreign key
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Chunk information
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    vector_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, nullable=True)
    token_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Additional metadata
    extra_metadata: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, nullable=True)
    
    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="chunks")
    
    def __repr__(self) -> str:
        return f"<DocumentChunk(id={self.id}, document_id={self.document_id}, chunk_index={self.chunk_index})>"