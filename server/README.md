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

## Authentication

### JWT Tokens
- Access Token: 30 minutes validity
- Refresh Token: 7 days validity
- Header format: `Authorization: Bearer <token>`

### Password Security
- SHA-256 with random salt
- Minimum 8 characters

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