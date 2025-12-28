"""
SQLAlchemy database configuration with async support.
Provides database session management and connection handling.
"""
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData

from app.core.config import settings


# Convert sync PostgreSQL URL to async
def get_async_database_url(sync_url: str) -> str:
    """Convert synchronous database URL to asynchronous."""
    if sync_url.startswith("postgresql://"):
        return sync_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return sync_url


# Database engine
engine = create_async_engine(
    get_async_database_url(settings.database_url),
    echo=settings.debug,
    future=True,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# Base class for all models
class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(column_0_label)s",
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s"
        }
    )


# Dependency to get database session
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


# Database initialization
async def init_db() -> None:
    """Initialize database tables."""
    # Import all models to ensure they are registered
    from app.core.models.user import User  # noqa
    from app.core.models.document import Document, DocumentChunk  # noqa
    from app.core.models.folder import Folder  # noqa
    from app.core.models.search import SearchHistory  # noqa
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# Database cleanup
async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()