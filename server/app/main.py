"""
RAG Document Management System - FastAPI Application
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import init_db, close_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    await init_db()
    yield
    # Shutdown
    await close_db()


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="A RAG-based document management system with AI-powered search",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Next.js frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "app_name": settings.app_name,
        "environment": settings.environment,
    }


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "RAG Document Management System API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# API router setup
from app.features.auth.router import router as auth_router
# from app.features.documents.router import router as documents_router
# from app.features.folders.router import router as folders_router
# from app.features.search.router import router as search_router

app.include_router(auth_router, prefix="/api/v1/auth", tags=["authentication"])
# app.include_router(documents_router, prefix="/api/v1/documents", tags=["documents"])
# app.include_router(folders_router, prefix="/api/v1/folders", tags=["folders"])
# app.include_router(search_router, prefix="/api/v1/search", tags=["search"])