"""
Pytest configuration and shared fixtures for RAG Document Management System tests.
"""
import pytest
import asyncio
import uuid
import io
from typing import AsyncGenerator, Dict, Any
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.main import app
from app.core.database import get_db, Base
from app.core.config import settings


# Test database configuration
TEST_DATABASE_URL = settings.database_url.replace("/rag_documents", "/rag_documents_test")


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Create test database if it doesn't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    await engine.dispose()


@pytest.fixture(scope="session")
async def test_session_factory(test_engine):
    """Create test session factory."""
    return async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


@pytest.fixture
async def db_session(test_session_factory) -> AsyncGenerator[AsyncSession, None]:
    """Create a test database session."""
    async with test_session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(db_session) -> AsyncGenerator[AsyncClient, None]:
    """Create test client with database override."""
    
    async def override_get_db():
        yield db_session
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db_session) -> Dict[str, Any]:
    """Create a test user."""
    from app.core.models.user import User
    from app.core.security import get_password_hash
    
    user_data = {
        "id": uuid.uuid4(),
        "email": "test@example.com",
        "username": "testuser",
        "hashed_password": get_password_hash("testpassword123"),
        "full_name": "Test User",
        "is_active": True,
    }
    
    user = User(**user_data)
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "username": user.username,
        "password": "testpassword123",
        "full_name": user.full_name,
    }


@pytest.fixture
async def auth_headers(client, test_user) -> Dict[str, str]:
    """Get authentication headers for test user."""
    login_data = {
        "email": test_user["email"],
        "password": test_user["password"]
    }
    
    response = await client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    
    token_data = response.json()
    access_token = token_data["tokens"]["access_token"]
    
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
def sample_text_file() -> io.BytesIO:
    """Create a sample text file for testing."""
    content = "This is a test document for API testing.\nIt contains multiple lines.\nAnd some test content."
    return io.BytesIO(content.encode('utf-8'))


@pytest.fixture
def sample_markdown_file() -> io.BytesIO:
    """Create a sample markdown file for testing."""
    content = """# Test Markdown Document

This is a **test markdown** document for API testing.

## Features
- File upload testing
- S3 integration testing
- Document management testing

### Code Example
```python
def hello_world():
    print("Hello, World!")
```

> This is a blockquote for testing.
"""
    return io.BytesIO(content.encode('utf-8'))


@pytest.fixture
def sample_csv_file() -> io.BytesIO:
    """Create a sample CSV file for testing."""
    content = """name,age,city,occupation
John Doe,30,New York,Engineer
Jane Smith,25,Los Angeles,Designer
Bob Johnson,35,Chicago,Manager
Alice Brown,28,Houston,Developer
Charlie Wilson,32,Phoenix,Analyst"""
    return io.BytesIO(content.encode('utf-8'))


@pytest.fixture
def large_text_file() -> io.BytesIO:
    """Create a larger text file for testing."""
    content = "This is a test line.\n" * 1000  # ~20KB file
    return io.BytesIO(content.encode('utf-8'))


@pytest.fixture
def invalid_file() -> io.BytesIO:
    """Create an invalid file type for testing."""
    content = b"This is fake executable content"
    return io.BytesIO(content)


# Test data fixtures
@pytest.fixture
def sample_document_data() -> Dict[str, Any]:
    """Sample document data for testing."""
    return {
        "name": "Test Document",
        "original_name": "test-document.txt",
        "file_type": "txt",
        "file_size": 1024,
        "mime_type": "text/plain",
    }


@pytest.fixture
def sample_folder_data() -> Dict[str, Any]:
    """Sample folder data for testing."""
    return {
        "name": "Test Folder",
        "path": "/Test Folder",
    }


# Cleanup fixtures
@pytest.fixture(autouse=True)
async def cleanup_test_data(db_session):
    """Cleanup test data after each test."""
    yield
    
    # Clean up test documents and related data
    await db_session.execute(text("DELETE FROM document_chunks"))
    await db_session.execute(text("DELETE FROM documents"))
    await db_session.execute(text("DELETE FROM folders"))
    await db_session.execute(text("DELETE FROM search_history"))
    await db_session.commit()


# Pytest configuration
def pytest_configure(config):
    """Configure pytest."""
    config.addinivalue_line(
        "markers", "integration: mark test as integration test"
    )
    config.addinivalue_line(
        "markers", "unit: mark test as unit test"
    )
    config.addinivalue_line(
        "markers", "slow: mark test as slow running"
    )


# Async test configuration
@pytest.fixture(scope="session")
def anyio_backend():
    """Configure async test backend."""
    return "asyncio"