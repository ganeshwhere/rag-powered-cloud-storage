"""
Hypothesis test data generators for property-based testing.

This module provides strategies for generating test data for all models
in the RAG Document Management System.
"""
import uuid
import string
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from hypothesis import strategies as st
from hypothesis.strategies import composite

# Constants for realistic data generation
VALID_EMAIL_DOMAINS = ["example.com", "test.org", "demo.net", "sample.io"]
VALID_FILE_TYPES = ["pdf", "txt", "docx", "csv", "xlsx", "md"]
VALID_MIME_TYPES = {
    "pdf": "application/pdf",
    "txt": "text/plain",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "csv": "text/csv",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "md": "text/markdown"
}
DOCUMENT_STATUSES = ["pending", "processing", "completed", "failed"]
S3_BUCKET_NAMES = ["rag-documents-dev", "rag-documents-prod", "test-bucket"]


# Helper strategy for timezone-aware datetimes
def timezone_aware_datetimes():
    """Generate timezone-aware datetime objects."""
    return st.datetimes(
        min_value=datetime(2020, 1, 1),
        max_value=datetime(2030, 12, 31)
    ).map(lambda dt: dt.replace(tzinfo=timezone.utc))


# Basic data type strategies
@composite
def valid_email(draw):
    """Generate valid email addresses."""
    username = draw(st.text(
        alphabet=string.ascii_lowercase + string.digits + "._-",
        min_size=3,
        max_size=20
    ).filter(lambda x: x[0].isalnum() and x[-1].isalnum()))
    
    domain = draw(st.sampled_from(VALID_EMAIL_DOMAINS))
    return f"{username}@{domain}"


@composite
def valid_username(draw):
    """Generate valid usernames."""
    return draw(st.text(
        alphabet=string.ascii_lowercase + string.digits + "_",
        min_size=3,
        max_size=30
    ).filter(lambda x: x[0].isalnum()))


@composite
def valid_password(draw):
    """Generate valid passwords."""
    return draw(st.text(
        alphabet=string.ascii_letters + string.digits + "!@#$%^&*",
        min_size=8,
        max_size=50
    ))


@composite
def valid_full_name(draw):
    """Generate valid full names."""
    first_name = draw(st.text(
        alphabet=string.ascii_letters + " '-",
        min_size=2,
        max_size=20
    ).filter(lambda x: x.strip() and x[0].isalpha()))
    
    last_name = draw(st.text(
        alphabet=string.ascii_letters + " '-",
        min_size=2,
        max_size=20
    ).filter(lambda x: x.strip() and x[0].isalpha()))
    
    return f"{first_name.strip()} {last_name.strip()}"


@composite
def valid_folder_name(draw):
    """Generate valid folder names."""
    return draw(st.text(
        alphabet=string.ascii_letters + string.digits + " _-()[]",
        min_size=1,
        max_size=100
    ).filter(lambda x: x.strip() and not x.startswith('.') and '/' not in x))


@composite
def valid_document_name(draw):
    """Generate valid document names."""
    base_name = draw(st.text(
        alphabet=string.ascii_letters + string.digits + " _-()[]",
        min_size=1,
        max_size=200
    ).filter(lambda x: x.strip()))
    
    file_type = draw(st.sampled_from(VALID_FILE_TYPES))
    return f"{base_name.strip()}.{file_type}"


@composite
def valid_s3_key(draw):
    """Generate valid S3 object keys."""
    user_id = draw(st.uuids())
    document_id = draw(st.uuids())
    filename = draw(valid_document_name())
    return f"users/{user_id}/documents/{document_id}/{filename}"


@composite
def valid_search_query(draw):
    """Generate valid search queries."""
    # Generate a query that will be at least 3 characters after stripping
    query = draw(st.text(
        alphabet=string.ascii_letters + string.digits + " ?!.,;:-",
        min_size=3,
        max_size=500
    ).filter(lambda x: len(x.strip()) >= 3))
    return query


@composite
def valid_document_content(draw):
    """Generate valid document content for chunks."""
    return draw(st.text(
        alphabet=string.ascii_letters + string.digits + " \n\t.,;:!?-()[]{}\"'",
        min_size=10,
        max_size=5000
    ).filter(lambda x: x.strip()))


# Model-specific strategies
@composite
def user_data(draw, **overrides):
    """Generate User model data."""
    data = {
        "id": draw(st.uuids()),
        "email": draw(valid_email()),
        "username": draw(valid_username()),
        "hashed_password": draw(st.text(min_size=60, max_size=60)),  # bcrypt hash length
        "full_name": draw(st.one_of(st.none(), valid_full_name())),
        "is_active": draw(st.booleans()),
        "is_superuser": draw(st.booleans()),
        "created_at": draw(timezone_aware_datetimes()),
        "updated_at": draw(timezone_aware_datetimes())
    }
    data.update(overrides)
    return data


@composite
def folder_data(draw, user_id: Optional[uuid.UUID] = None, parent_id: Optional[uuid.UUID] = None, **overrides):
    """Generate Folder model data."""
    folder_name = draw(valid_folder_name())
    parent_path = draw(st.text(
        alphabet=string.ascii_letters + string.digits + " _-()[]",
        min_size=0,
        max_size=500
    )) if parent_id else ""
    
    path = f"{parent_path}/{folder_name}".strip("/") if parent_path else folder_name
    
    data = {
        "id": draw(st.uuids()),
        "user_id": user_id or draw(st.uuids()),
        "parent_id": parent_id,
        "name": folder_name,
        "path": path,
        "created_at": draw(timezone_aware_datetimes()),
        "updated_at": draw(timezone_aware_datetimes())
    }
    data.update(overrides)
    return data


@composite
def document_data(draw, user_id: Optional[uuid.UUID] = None, folder_id: Optional[uuid.UUID] = None, **overrides):
    """Generate Document model data."""
    file_type = draw(st.sampled_from(VALID_FILE_TYPES))
    original_name = draw(valid_document_name())
    
    data = {
        "id": draw(st.uuids()),
        "user_id": user_id or draw(st.uuids()),
        "folder_id": folder_id,
        "name": draw(st.text(min_size=1, max_size=255).filter(lambda x: x.strip())),
        "original_name": original_name,
        "file_type": file_type,
        "file_size": draw(st.integers(min_value=1, max_value=100_000_000)),  # 1 byte to 100MB
        "mime_type": VALID_MIME_TYPES.get(file_type),
        "s3_key": draw(valid_s3_key()),
        "s3_bucket": draw(st.sampled_from(S3_BUCKET_NAMES)),
        "status": draw(st.sampled_from(DOCUMENT_STATUSES)),
        "processing_error": draw(st.one_of(st.none(), st.text(max_size=1000))),
        "chunk_count": draw(st.integers(min_value=0, max_value=1000)),
        "total_tokens": draw(st.integers(min_value=0, max_value=100000)),
        "extra_metadata": draw(st.one_of(
            st.none(),
            st.dictionaries(
                keys=st.text(min_size=1, max_size=50),
                values=st.one_of(st.text(), st.integers(), st.booleans(), st.floats()),
                max_size=10
            )
        )),
        "created_at": draw(timezone_aware_datetimes()),
        "updated_at": draw(timezone_aware_datetimes())
    }
    data.update(overrides)
    return data


@composite
def document_chunk_data(draw, document_id: Optional[uuid.UUID] = None, **overrides):
    """Generate DocumentChunk model data."""
    data = {
        "id": draw(st.uuids()),
        "document_id": document_id or draw(st.uuids()),
        "chunk_index": draw(st.integers(min_value=0, max_value=999)),
        "content": draw(valid_document_content()),
        "vector_id": draw(st.one_of(st.none(), st.text(min_size=10, max_size=100))),
        "token_count": draw(st.one_of(st.none(), st.integers(min_value=1, max_value=5000))),
        "extra_metadata": draw(st.one_of(
            st.none(),
            st.dictionaries(
                keys=st.text(min_size=1, max_size=50),
                values=st.one_of(st.text(), st.integers(), st.booleans(), st.floats()),
                max_size=5
            )
        )),
        "created_at": draw(timezone_aware_datetimes()),
        "updated_at": draw(timezone_aware_datetimes())
    }
    data.update(overrides)
    return data


@composite
def search_history_data(draw, user_id: Optional[uuid.UUID] = None, **overrides):
    """Generate SearchHistory model data."""
    data = {
        "id": draw(st.uuids()),
        "user_id": user_id or draw(st.uuids()),
        "query": draw(valid_search_query()),
        "results_count": draw(st.integers(min_value=0, max_value=100)),
        "created_at": draw(timezone_aware_datetimes()),
        "updated_at": draw(timezone_aware_datetimes())
    }
    data.update(overrides)
    return data


# Registration and login data strategies
@composite
def registration_data(draw, **overrides):
    """Generate user registration data."""
    data = {
        "email": draw(valid_email()),
        "username": draw(valid_username()),
        "password": draw(valid_password()),
        "full_name": draw(st.one_of(st.none(), valid_full_name()))
    }
    data.update(overrides)
    return data


@composite
def login_data(draw, **overrides):
    """Generate user login data."""
    data = {
        "email": draw(valid_email()),
        "password": draw(valid_password())
    }
    data.update(overrides)
    return data


# File upload data strategies
@composite
def file_upload_data(draw, **overrides):
    """Generate file upload data."""
    file_type = draw(st.sampled_from(VALID_FILE_TYPES))
    data = {
        "filename": draw(valid_document_name()),
        "content_type": VALID_MIME_TYPES.get(file_type, "application/octet-stream"),
        "size": draw(st.integers(min_value=1, max_value=100_000_000)),
        "content": draw(st.binary(min_size=1, max_size=10000))
    }
    data.update(overrides)
    return data


# Search request data strategies
@composite
def search_request_data(draw, **overrides):
    """Generate search request data."""
    data = {
        "query": draw(valid_search_query()),
        "limit": draw(st.integers(min_value=1, max_value=50)),
        "folder_id": draw(st.one_of(st.none(), st.uuids()))
    }
    data.update(overrides)
    return data


# Folder creation data strategies
@composite
def folder_creation_data(draw, **overrides):
    """Generate folder creation data."""
    data = {
        "name": draw(valid_folder_name()),
        "parent_id": draw(st.one_of(st.none(), st.uuids()))
    }
    data.update(overrides)
    return data