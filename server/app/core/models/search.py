"""
Search history model for tracking user queries.
"""
import uuid
from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.models.base import UUIDMixin, TimestampMixin


class SearchHistory(Base, UUIDMixin, TimestampMixin):
    """Search history model for tracking user search queries."""
    
    __tablename__ = "search_history"
    
    # Foreign key
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Search information
    query: Mapped[str] = mapped_column(String(1000), nullable=False)
    results_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="search_history")
    
    def __repr__(self) -> str:
        return f"<SearchHistory(id={self.id}, user_id={self.user_id}, query={self.query[:50]}...)>"