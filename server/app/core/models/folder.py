"""
Folder model for document organization.
"""
import uuid
from typing import Optional
from sqlalchemy import String, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models.base import UUIDMixin, TimestampMixin


class Folder(Base, UUIDMixin, TimestampMixin):
    """Folder model for organizing documents in a hierarchical structure."""
    
    __tablename__ = "folders"
    __table_args__ = (
        UniqueConstraint("user_id", "parent_id", "name", name="uq_folders_user_parent_name"),
    )
    
    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("folders.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    
    # Folder information
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    path: Mapped[str] = mapped_column(String(1000), nullable=False, index=True)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="folders")
    parent: Mapped[Optional["Folder"]] = relationship(
        "Folder",
        remote_side="Folder.id",
        back_populates="children"
    )
    children: Mapped[list["Folder"]] = relationship(
        "Folder",
        back_populates="parent",
        cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(
        "Document",
        back_populates="folder"
    )
    
    def __repr__(self) -> str:
        return f"<Folder(id={self.id}, name={self.name}, path={self.path})>"