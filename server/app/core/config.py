"""
Application configuration using Pydantic Settings.
Supports environment variable configuration for all system parameters.
"""
from typing import Optional
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings with environment variable support."""
    
    # Application
    app_name: str = Field(default="RAG Powered Cloud Storage", description="Application name")
    environment: str = Field(default="development", description="Environment (development, production)")
    debug: bool = Field(default=True, description="Debug mode")
    
    # Database
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/rag_documents",
        description="PostgreSQL database URL"
    )
    
    # Redis
    redis_url: str = Field(
        default="redis://localhost:6379",
        description="Redis URL for caching and message queue"
    )
    
    # JWT Authentication
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT token signing"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(default=30, description="Access token expiration in minutes")
    refresh_token_expire_days: int = Field(default=7, description="Refresh token expiration in days")
    
    # AWS S3
    aws_access_key_id: Optional[str] = Field(default=None, description="AWS access key ID")
    aws_secret_access_key: Optional[str] = Field(default=None, description="AWS secret access key")
    aws_region: str = Field(default="us-east-1", description="AWS region")
    s3_bucket_name: str = Field(default="rag-documents", description="S3 bucket name for file storage")
    
    # OpenAI
    openai_api_key: Optional[str] = Field(default=None, description="OpenAI API key")
    openai_model: str = Field(default="gpt-4-turbo-preview", description="OpenAI model for text generation")
    embedding_model: str = Field(default="text-embedding-3-small", description="OpenAI embedding model")
    
    # Pinecone
    pinecone_api_key: Optional[str] = Field(default=None, description="Pinecone API key")
    pinecone_environment: str = Field(default="us-east-1-aws", description="Pinecone environment")
    pinecone_index_name: str = Field(default="rag-documents", description="Pinecone index name")
    
    # Document Processing
    max_file_size_mb: int = Field(default=100, description="Maximum file size in MB")
    chunk_size: int = Field(default=1000, description="Text chunk size for processing")
    chunk_overlap: int = Field(default=200, description="Text chunk overlap")
    supported_file_types: list[str] = Field(
        default=["pdf", "docx", "txt", "csv", "xlsx", "md"],
        description="Supported file types for upload"
    )
    
    @field_validator('supported_file_types', mode='before')
    @classmethod
    def parse_supported_file_types(cls, v):
        if isinstance(v, str):
            return [item.strip() for item in v.split(',')]
        return v
    
    # Celery
    celery_broker_url: Optional[str] = Field(default=None, description="Celery broker URL (defaults to redis_url)")
    celery_result_backend: Optional[str] = Field(default=None, description="Celery result backend (defaults to redis_url)")
    celery_task_retry_max: int = Field(default=3, description="Maximum task retry attempts")
    celery_task_retry_delay: int = Field(default=60, description="Task retry delay in seconds")
    
    # Cache
    cache_ttl_seconds: int = Field(default=3600, description="Default cache TTL in seconds")
    search_cache_ttl_seconds: int = Field(default=1800, description="Search result cache TTL in seconds")
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()