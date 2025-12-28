# RAG Document Management System - Server API

FastAPI-based backend with JWT authentication.

## Setup

### Prerequisites
- Python 3.9+
- PostgreSQL 15+
- Redis 7+

### Installation

1. Start database services:
   ```bash
   docker-compose up -d postgres redis
   ```

2. Install dependencies:
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   ```

4. Run migrations:
   ```bash
   alembic upgrade head
   ```

5. Start server:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

API available at: `http://localhost:8000`

## API Documentation

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI Schema: `http://localhost:8000/openapi.json`

## Authentication APIs

All authentication endpoints are prefixed with `/api/v1/auth`

### POST /api/v1/auth/register

Register a new user account.

**Request:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123",
  "full_name": "John Doe"
}
```

**Response (201):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2025-12-28T09:30:00.000Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

### POST /api/v1/auth/login

Authenticate user with email and password.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "username": "johndoe",
    "full_name": "John Doe",
    "is_active": true,
    "created_at": "2025-12-28T09:30:00.000Z"
  },
  "tokens": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "expires_in": 1800
  }
}
```

### POST /api/v1/auth/refresh

Generate new tokens using refresh token.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### GET /api/v1/auth/me

Get current user information. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "username": "johndoe",
  "full_name": "John Doe",
  "is_active": true,
  "created_at": "2025-12-28T09:30:00.000Z"
}
```

### POST /api/v1/auth/logout

Logout current user. Requires authentication.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

## Folder Management APIs

All folder endpoints are prefixed with `/api/v1/folders` and require authentication.

**Headers for all folder endpoints:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### POST /api/v1/folders

Create a new folder.

**Request:**
```json
{
  "name": "My Documents",
  "parent_id": null
}
```

**Request (with parent):**
```json
{
  "name": "Invoices",
  "parent_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Response (201):**
```json
{
  "folder": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "parent_id": null,
    "name": "My Documents",
    "path": "My Documents",
    "created_at": "2025-12-28T10:00:00.000Z",
    "updated_at": "2025-12-28T10:00:00.000Z"
  },
  "message": "Folder created successfully"
}
```

### GET /api/v1/folders

List folders. Optionally filter by parent folder.

**Query Parameters:**
- `parent_id` (optional): UUID of parent folder. If not provided, returns root folders.

**Request:**
```
GET /api/v1/folders
GET /api/v1/folders?parent_id=456e7890-e89b-12d3-a456-426614174001
```

**Response (200):**
```json
{
  "folders": [
    {
      "id": "456e7890-e89b-12d3-a456-426614174001",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "parent_id": null,
      "name": "My Documents",
      "path": "My Documents",
      "created_at": "2025-12-28T10:00:00.000Z",
      "updated_at": "2025-12-28T10:00:00.000Z"
    },
    {
      "id": "789e0123-e89b-12d3-a456-426614174002",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "parent_id": null,
      "name": "Projects",
      "path": "Projects",
      "created_at": "2025-12-28T10:05:00.000Z",
      "updated_at": "2025-12-28T10:05:00.000Z"
    }
  ],
  "total": 2
}
```

### GET /api/v1/folders/{folder_id}

Get folder details.

**Response (200):**
```json
{
  "id": "456e7890-e89b-12d3-a456-426614174001",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "parent_id": null,
  "name": "My Documents",
  "path": "My Documents",
  "created_at": "2025-12-28T10:00:00.000Z",
  "updated_at": "2025-12-28T10:00:00.000Z"
}
```

### GET /api/v1/folders/{folder_id}/contents

Get folder contents including child folders and document count.

**Response (200):**
```json
{
  "folder": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "parent_id": null,
    "name": "My Documents",
    "path": "My Documents",
    "created_at": "2025-12-28T10:00:00.000Z",
    "updated_at": "2025-12-28T10:00:00.000Z",
    "children": [
      {
        "id": "abc1234-e89b-12d3-a456-426614174003",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "parent_id": "456e7890-e89b-12d3-a456-426614174001",
        "name": "Invoices",
        "path": "My Documents/Invoices",
        "created_at": "2025-12-28T10:10:00.000Z",
        "updated_at": "2025-12-28T10:10:00.000Z"
      }
    ],
    "document_count": 5
  }
}
```

### PATCH /api/v1/folders/{folder_id}

Update folder name or move to different parent.

**Request (rename):**
```json
{
  "name": "Important Documents"
}
```

**Request (move to different parent):**
```json
{
  "parent_id": "789e0123-e89b-12d3-a456-426614174002"
}
```

**Request (rename and move):**
```json
{
  "name": "Archive",
  "parent_id": "789e0123-e89b-12d3-a456-426614174002"
}
```

**Response (200):**
```json
{
  "folder": {
    "id": "456e7890-e89b-12d3-a456-426614174001",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "parent_id": "789e0123-e89b-12d3-a456-426614174002",
    "name": "Archive",
    "path": "Projects/Archive",
    "created_at": "2025-12-28T10:00:00.000Z",
    "updated_at": "2025-12-28T10:15:00.000Z"
  },
  "message": "Folder updated successfully"
}
```

### DELETE /api/v1/folders/{folder_id}

Delete folder. Documents in the folder are moved to the parent folder (or root if no parent).

**Response (200):**
```json
{
  "message": "Folder deleted successfully",
  "deleted_folder_id": "456e7890-e89b-12d3-a456-426614174001"
}
```

## Document Management APIs

All document endpoints are prefixed with `/api/v1/documents` and require authentication.

**Headers for all document endpoints:**
```
Authorization: Bearer <access_token>
Content-Type: application/json (except for file uploads)
```

### POST /api/v1/documents/upload

Upload a document file directly to the system.

**Request (multipart/form-data):**
```
file: <file_data> (required)
name: "My Document" (optional - defaults to filename)
folder_id: "456e7890-e89b-12d3-a456-426614174001" (optional)
```

**Response (201):**
```json
{
  "document": {
    "id": "doc123-e89b-12d3-a456-426614174000",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "folder_id": "456e7890-e89b-12d3-a456-426614174001",
    "name": "My Document",
    "original_name": "document.pdf",
    "file_type": "pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "status": "pending",
    "chunk_count": 0,
    "total_tokens": 0,
    "created_at": "2025-12-28T11:00:00.000Z",
    "updated_at": "2025-12-28T11:00:00.000Z"
  },
  "message": "Document uploaded successfully and processing started"
}
```

### POST /api/v1/documents/presigned-upload

Generate a presigned URL for direct client-side upload to S3.

**Request:**
```json
{
  "filename": "document.pdf",
  "content_type": "application/pdf",
  "folder_id": "456e7890-e89b-12d3-a456-426614174001"
}
```

**Response (200):**
```json
{
  "upload_url": "https://s3.amazonaws.com/bucket/...",
  "form_fields": {
    "key": "users/123e4567/documents/doc123/document.pdf",
    "policy": "eyJleHBpcmF0aW9uIjoi...",
    "x-amz-algorithm": "AWS4-HMAC-SHA256",
    "x-amz-credential": "...",
    "x-amz-date": "20251228T110000Z",
    "x-amz-signature": "..."
  },
  "document_id": "doc123-e89b-12d3-a456-426614174000",
  "expires_in": 3600
}
```

### GET /api/v1/documents

List user's documents with optional folder filtering and pagination.

**Query Parameters:**
- `folder_id` (optional): UUID of folder to filter by
- `page` (optional): Page number starting from 1 (default: 1)
- `page_size` (optional): Number of documents per page, max 100 (default: 50)

**Request:**
```
GET /api/v1/documents
GET /api/v1/documents?folder_id=456e7890-e89b-12d3-a456-426614174001&page=1&page_size=20
```

**Response (200):**
```json
{
  "documents": [
    {
      "id": "doc123-e89b-12d3-a456-426614174000",
      "user_id": "123e4567-e89b-12d3-a456-426614174000",
      "folder_id": "456e7890-e89b-12d3-a456-426614174001",
      "name": "My Document",
      "original_name": "document.pdf",
      "file_type": "pdf",
      "file_size": 1024000,
      "mime_type": "application/pdf",
      "status": "completed",
      "chunk_count": 15,
      "total_tokens": 2500,
      "created_at": "2025-12-28T11:00:00.000Z",
      "updated_at": "2025-12-28T11:05:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

### GET /api/v1/documents/{document_id}

Get detailed information about a specific document.

**Response (200):**
```json
{
  "id": "doc123-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "folder_id": "456e7890-e89b-12d3-a456-426614174001",
  "name": "My Document",
  "original_name": "document.pdf",
  "file_type": "pdf",
  "file_size": 1024000,
  "mime_type": "application/pdf",
  "status": "completed",
  "processing_error": null,
  "chunk_count": 15,
  "total_tokens": 2500,
  "metadata": {
    "pages": 10,
    "language": "en"
  },
  "created_at": "2025-12-28T11:00:00.000Z",
  "updated_at": "2025-12-28T11:05:00.000Z"
}
```

### GET /api/v1/documents/{document_id}/status

Get document processing status.

**Response (200):**
```json
{
  "document_id": "doc123-e89b-12d3-a456-426614174000",
  "status": "completed",
  "processing_error": null,
  "chunk_count": 15,
  "total_tokens": 2500,
  "progress": {
    "stage": "completed",
    "percentage": 100
  },
  "updated_at": "2025-12-28T11:05:00.000Z"
}
```

### GET /api/v1/documents/{document_id}/download

Generate a secure download URL for a document.

**Response (200):**
```json
{
  "download_url": "https://s3.amazonaws.com/bucket/presigned-download-url",
  "expires_in": 3600,
  "filename": "document.pdf"
}
```

### PATCH /api/v1/documents/{document_id}

Update document metadata.

**Request:**
```json
{
  "name": "Updated Document Name",
  "folder_id": "789e0123-e89b-12d3-a456-426614174002"
}
```

**Response (200):**
```json
{
  "id": "doc123-e89b-12d3-a456-426614174000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "folder_id": "789e0123-e89b-12d3-a456-426614174002",
  "name": "Updated Document Name",
  "original_name": "document.pdf",
  "file_type": "pdf",
  "file_size": 1024000,
  "mime_type": "application/pdf",
  "status": "completed",
  "chunk_count": 15,
  "total_tokens": 2500,
  "created_at": "2025-12-28T11:00:00.000Z",
  "updated_at": "2025-12-28T11:10:00.000Z"
}
```

### DELETE /api/v1/documents/{document_id}

Delete a document and all associated data.

**Response (200):**
```json
{
  "message": "Document deleted successfully",
  "deleted_document_id": "doc123-e89b-12d3-a456-426614174000"
}
```

### DELETE /api/v1/documents/bulk

Delete multiple documents and all associated data.

**Request:**
```json
{
  "document_ids": [
    "doc123-e89b-12d3-a456-426614174000",
    "doc456-e89b-12d3-a456-426614174001"
  ]
}
```

**Response (200):**
```json
{
  "deleted_count": 2,
  "failed_count": 0,
  "failed_documents": []
}
```

## Search APIs

All search endpoints are prefixed with `/api/v1/search` and require authentication.

**Headers for all search endpoints:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### POST /api/v1/search

Perform RAG-based search on user documents.

**Request:**
```json
{
  "query": "What are the key findings in the research documents?",
  "document_ids": ["doc123-e89b-12d3-a456-426614174000"],
  "max_results": 5,
  "min_score": 0.7
}
```

**Response (200) - With Results:**
```json
{
  "query": "What are the key findings in the research documents?",
  "answer": "Based on the research documents, the key findings include: 1) Significant improvement in user engagement, 2) Cost reduction of 25%, 3) Enhanced system performance.",
  "sources": [
    {
      "document_id": "doc123-e89b-12d3-a456-426614174000",
      "document_name": "Research Report Q4",
      "chunk_id": "chunk_1",
      "content": "The research shows significant improvement in user engagement...",
      "score": 0.95,
      "page": 3
    }
  ],
  "total_sources": 1,
  "search_time_ms": 250,
  "cached": false
}
```

**Response (200) - No Results:**
```json
{
  "query": "What are the key findings in the research documents?",
  "message": "No relevant documents found for your query. Try using different keywords or check if you have uploaded relevant documents.",
  "suggestions": [
    "Try broader search terms",
    "Check document processing status",
    "Upload more relevant documents"
  ]
}
```

### GET /api/v1/search/history

Get user's search history with pagination.

**Query Parameters:**
- `page` (optional): Page number starting from 1 (default: 1)
- `per_page` (optional): Number of items per page, max 100 (default: 20)

**Request:**
```
GET /api/v1/search/history?page=1&per_page=10
```

**Response (200):**
```json
{
  "history": [
    {
      "id": "search123-e89b-12d3-a456-426614174000",
      "query": "What are the key findings in the research documents?",
      "results_count": 5,
      "created_at": "2025-12-28T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 10
}
```

### DELETE /api/v1/search/cache

Clear user's search cache.

**Response (200):**
```json
{
  "message": "Search cache cleared successfully"
}
```

### GET /api/v1/search/suggestions

Get search suggestions based on partial query.

**Query Parameters:**
- `query` (required): Partial search query (1-100 characters)

**Request:**
```
GET /api/v1/search/suggestions?query=research find
```

**Response (200):**
```json
{
  "query": "research find",
  "suggestions": [
    "research findings",
    "research methodology",
    "research results",
    "research analysis"
  ]
}
```

## System APIs

### GET /health

System health check.

**Response (200):**
```json
{
  "status": "healthy",
  "app_name": "RAG Powered Cloud Storage",
  "environment": "development"
}
```

### GET /

API information.

**Response (200):**
```json
{
  "message": "RAG Document Management System API",
  "version": "1.0.0",
  "docs": "/docs",
  "health": "/health"
}
```

## Configuration

### Environment Variables

The system requires several environment variables to be configured. Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

**Required Configuration:**

- **Database**: `DATABASE_URL` - PostgreSQL connection string
- **Redis**: `REDIS_URL` - Redis connection string for caching and task queue
- **JWT**: `SECRET_KEY` - Secret key for JWT token signing
- **AWS S3**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET_NAME`
- **OpenAI**: `OPENAI_API_KEY` - For embeddings and text generation
- **Pinecone**: `PINECONE_API_KEY`, `PINECONE_INDEX_NAME` - Vector database

**Optional Configuration:**

- `MAX_FILE_SIZE_MB` - Maximum file upload size (default: 100MB)
- `SUPPORTED_FILE_TYPES` - Allowed file extensions (default: pdf, docx, txt, csv, xlsx, md)
- `CHUNK_SIZE` - Text chunk size for processing (default: 1000)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - JWT token expiration (default: 30 minutes)

### Supported File Types

The system supports the following file types for upload and processing:

- **PDF** (`.pdf`) - Portable Document Format
- **Word Documents** (`.docx`) - Microsoft Word documents
- **Text Files** (`.txt`) - Plain text files
- **CSV Files** (`.csv`) - Comma-separated values
- **Excel Files** (`.xlsx`) - Microsoft Excel spreadsheets
- **Markdown** (`.md`) - Markdown formatted text

### File Size Limits

- **Maximum file size**: 100MB (configurable via `MAX_FILE_SIZE_MB`)
- **Recommended size**: Under 50MB for optimal processing performance
- **Minimum size**: No minimum limit

## Background Processing

The system uses Celery for background document processing:

### Processing Pipeline

1. **File Upload** - Document uploaded to S3
2. **Text Extraction** - Content extracted using Unstructured.io
3. **Text Chunking** - Content split into manageable chunks
4. **Embedding Generation** - OpenAI embeddings created for each chunk
5. **Vector Storage** - Embeddings stored in Pinecone
6. **Status Update** - Document marked as "completed" or "failed"

### Processing Status

Documents have the following status values:

- `pending` - Uploaded, waiting for processing
- `processing` - Currently being processed
- `completed` - Successfully processed and searchable
- `failed` - Processing failed (check `processing_error` field)

### Celery Workers

Start Celery workers for background processing:

```bash
# Start worker for document processing
celery -A app.workers.celery_app worker --loglevel=info --queues=document_processing

# Start worker for general tasks
celery -A app.workers.celery_app worker --loglevel=info --queues=default

# Monitor tasks
celery -A app.workers.celery_app flower
```

## Rate Limiting and Pagination

### Pagination

List endpoints support pagination with the following parameters:

- `page` - Page number (1-based, default: 1)
- `page_size` or `per_page` - Items per page (default varies by endpoint)
- Maximum page size: 100 items

**Pagination Response Format:**
```json
{
  "items": [...],
  "total": 150,
  "page": 1,
  "page_size": 50,
  "total_pages": 3
}
```

### File Upload Limits

- **Concurrent uploads**: 5 per user
- **Daily upload limit**: 1000 files per user
- **Storage quota**: 10GB per user (configurable)

### Search Limits

- **Query length**: 3-500 characters
- **Results per search**: Maximum 20 results
- **Search history**: Last 1000 searches per user
- **Cache duration**: 30 minutes for search results

## Testing Examples

### cURL Examples

#### Authentication
```bash
# Register
curl -X POST "http://localhost:8000/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "username": "testuser", "password": "testpass123", "full_name": "Test User"}'

# Login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpass123"}'

# Get user info
curl -X GET "http://localhost:8000/api/v1/auth/me" \
  -H "Authorization: Bearer <access_token>"
```

#### Folder Management
```bash
# Create root folder
curl -X POST "http://localhost:8000/api/v1/folders" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Documents", "parent_id": null}'

# Create subfolder
curl -X POST "http://localhost:8000/api/v1/folders" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Invoices", "parent_id": "456e7890-e89b-12d3-a456-426614174001"}'

# List root folders
curl -X GET "http://localhost:8000/api/v1/folders" \
  -H "Authorization: Bearer <access_token>"

# List folders in specific parent
curl -X GET "http://localhost:8000/api/v1/folders?parent_id=456e7890-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <access_token>"

# Get folder details
curl -X GET "http://localhost:8000/api/v1/folders/456e7890-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <access_token>"

# Get folder contents
curl -X GET "http://localhost:8000/api/v1/folders/456e7890-e89b-12d3-a456-426614174001/contents" \
  -H "Authorization: Bearer <access_token>"

# Rename folder
curl -X PATCH "http://localhost:8000/api/v1/folders/456e7890-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Important Documents"}'

# Move folder to different parent
curl -X PATCH "http://localhost:8000/api/v1/folders/456e7890-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"parent_id": "789e0123-e89b-12d3-a456-426614174002"}'

# Delete folder
curl -X DELETE "http://localhost:8000/api/v1/folders/456e7890-e89b-12d3-a456-426614174001" \
  -H "Authorization: Bearer <access_token>"
```

#### Document Management
```bash
# Upload document directly
curl -X POST "http://localhost:8000/api/v1/documents/upload" \
  -H "Authorization: Bearer <access_token>" \
  -F "file=@document.pdf" \
  -F "name=My Important Document" \
  -F "folder_id=456e7890-e89b-12d3-a456-426614174001"

# Generate presigned upload URL
curl -X POST "http://localhost:8000/api/v1/documents/presigned-upload" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"filename": "document.pdf", "content_type": "application/pdf", "folder_id": "456e7890-e89b-12d3-a456-426614174001"}'

# List documents
curl -X GET "http://localhost:8000/api/v1/documents" \
  -H "Authorization: Bearer <access_token>"

# List documents in specific folder with pagination
curl -X GET "http://localhost:8000/api/v1/documents?folder_id=456e7890-e89b-12d3-a456-426614174001&page=1&page_size=20" \
  -H "Authorization: Bearer <access_token>"

# Get document details
curl -X GET "http://localhost:8000/api/v1/documents/doc123-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <access_token>"

# Get document processing status
curl -X GET "http://localhost:8000/api/v1/documents/doc123-e89b-12d3-a456-426614174000/status" \
  -H "Authorization: Bearer <access_token>"

# Get document download URL
curl -X GET "http://localhost:8000/api/v1/documents/doc123-e89b-12d3-a456-426614174000/download" \
  -H "Authorization: Bearer <access_token>"

# Update document metadata
curl -X PATCH "http://localhost:8000/api/v1/documents/doc123-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Document Name", "folder_id": "789e0123-e89b-12d3-a456-426614174002"}'

# Delete single document
curl -X DELETE "http://localhost:8000/api/v1/documents/doc123-e89b-12d3-a456-426614174000" \
  -H "Authorization: Bearer <access_token>"

# Bulk delete documents
curl -X DELETE "http://localhost:8000/api/v1/documents/bulk" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"document_ids": ["doc123-e89b-12d3-a456-426614174000", "doc456-e89b-12d3-a456-426614174001"]}'
```

#### Search
```bash
# Search documents
curl -X POST "http://localhost:8000/api/v1/search" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "What are the key findings in the research documents?", "max_results": 5}'

# Search with document filter
curl -X POST "http://localhost:8000/api/v1/search" \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "financial analysis", "document_ids": ["doc123-e89b-12d3-a456-426614174000"], "min_score": 0.7}'

# Get search history
curl -X GET "http://localhost:8000/api/v1/search/history?page=1&per_page=10" \
  -H "Authorization: Bearer <access_token>"

# Clear search cache
curl -X DELETE "http://localhost:8000/api/v1/search/cache" \
  -H "Authorization: Bearer <access_token>"

# Get search suggestions
curl -X GET "http://localhost:8000/api/v1/search/suggestions?query=research%20find" \
  -H "Authorization: Bearer <access_token>"
```

### Sample Folder Hierarchy

Here's an example of how folders might be organized:

```
📁 My Documents (root)
├── 📁 Invoices
│   ├── 📄 invoice-2024-001.pdf
│   └── 📄 invoice-2024-002.pdf
├── 📁 Contracts
│   ├── 📄 service-agreement.docx
│   └── 📄 nda-template.pdf
└── 📄 readme.txt

📁 Projects (root)
├── 📁 Project Alpha
│   ├── 📄 requirements.md
│   └── 📄 design-doc.pdf
└── 📁 Archive
    └── 📄 old-project.zip
```

### Error Responses

#### Folder Name Conflicts (400)
```json
{
  "detail": "A folder with this name already exists in the specified location"
}
```

#### Parent Folder Not Found (404)
```json
{
  "detail": "Parent folder not found"
}
```

#### Folder Not Found (404)
```json
{
  "detail": "Folder not found"
}
```

#### Circular Reference Prevention (400)
```json
{
  "detail": "Moving folder would create a circular reference"
}
```

#### Invalid Folder Name (422)
```json
{
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "Folder name cannot contain: /, \\, :, *, ?, \", <, >, |",
      "type": "value_error"
    }
  ]
}
```

#### Document Upload Errors

#### File Too Large (413)
```json
{
  "detail": "File size exceeds maximum limit of 100MB"
}
```

#### Unsupported File Type (400)
```json
{
  "detail": "File type 'exe' is not supported. Supported types: pdf, docx, txt, csv, xlsx, md"
}
```

#### Document Not Found (404)
```json
{
  "detail": "Document not found"
}
```

#### Document Processing Failed (422)
```json
{
  "detail": "Document processing failed: Unable to extract text from file"
}
```

#### Search Errors

#### Search Query Too Short (400)
```json
{
  "detail": "Search query must be at least 3 characters long"
}
```

#### Search Service Unavailable (503)
```json
{
  "detail": "Search service is temporarily unavailable. Please try again later."
}
```

#### No Search Results (200)
```json
{
  "query": "nonexistent topic",
  "message": "No relevant documents found for your query. Try using different keywords or check if you have uploaded relevant documents.",
  "suggestions": [
    "Try broader search terms",
    "Check document processing status",
    "Upload more relevant documents"
  ]
}
```

## Troubleshooting

### Common Issues

#### Document Processing Stuck in "pending"
- Check Celery workers are running: `celery -A app.workers.celery_app inspect active`
- Verify Redis connection: `redis-cli ping`
- Check worker logs for errors

#### Search Returns No Results
- Verify documents are in "completed" status
- Check Pinecone index exists and has vectors
- Ensure OpenAI API key is valid
- Try broader search terms

#### File Upload Fails
- Check file size is under 100MB limit
- Verify file type is supported
- Ensure S3 credentials are correct
- Check S3 bucket permissions

#### Authentication Issues
- Verify JWT secret key is set
- Check token expiration times
- Ensure user account is active
- Validate token format in Authorization header

### Health Checks

Monitor system health using these endpoints:

```bash
# API health
curl http://localhost:8000/health

# Database connectivity
curl http://localhost:8000/api/v1/auth/me -H "Authorization: Bearer <token>"

# Search functionality
curl -X POST http://localhost:8000/api/v1/search \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}'
```

### Logs

Check application logs for detailed error information:

```bash
# Application logs
tail -f logs/app.log

# Celery worker logs
tail -f logs/celery.log

# Database logs (PostgreSQL)
tail -f /var/log/postgresql/postgresql.log
```