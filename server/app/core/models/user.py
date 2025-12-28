"""
User model for authentication and authorization.
"""
from typing import Optional
from sqlalchemy import String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models.base import UUIDMixin, TimestampMixin


class User(Base, UUIDMixin, TimestampMixin):
    """User model for authentication and document ownership."""
    
    __tablename__ = "users"
    
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Relationships
    documents: Mapped[list["Document"]] = relationship(
        "Document", 
        back_populates="user",
        cascade="all, delete-orphan"
    )
    folders: Mapped[list["Folder"]] = relationship(
        "Folder",
        back_populates="user", 
        cascade="all, delete-orphan"
    )
    search_history: Mapped[list["SearchHistory"]] = relationship(
        "SearchHistory",
        back_populates="user",
        cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, username={self.username})>"