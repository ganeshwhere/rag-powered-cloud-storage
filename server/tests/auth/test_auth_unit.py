#!/usr/bin/env python3
"""
Unit tests for authentication system components.
Tests core authentication functionality without database dependencies.
"""
import pytest
from datetime import datetime, timedelta, timezone

from app.core.security import (
    hash_password, 
    verify_password, 
    create_access_token, 
    create_refresh_token, 
    verify_token, 
    create_token_pair
)
from app.core.config import settings


@pytest.mark.asyncio
async def test_password_hashing():
    """Test password hashing and verification."""
    password = "test_password_123"
    
    # Hash the password
    hashed = hash_password(password)
    
    # Verify correct password
    assert verify_password(password, hashed) is True
    
    # Verify incorrect password
    assert verify_password("wrong_password", hashed) is False
    
    # Verify different passwords produce different hashes
    hashed2 = hash_password(password)
    assert hashed != hashed2  # Different salts should produce different hashes


@pytest.mark.asyncio
async def test_access_token_creation_and_verification():
    """Test JWT access token creation and verification."""
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    email = "test@example.com"
    
    # Create access token
    token_data = {"sub": user_id, "email": email}
    token = create_access_token(token_data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Verify token
    payload = verify_token(token, "access")
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["email"] == email
    assert payload["type"] == "access"
    assert "exp" in payload


@pytest.mark.asyncio
async def test_refresh_token_creation_and_verification():
    """Test JWT refresh token creation and verification."""
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    
    # Create refresh token
    token_data = {"sub": user_id}
    token = create_refresh_token(token_data)
    
    assert token is not None
    assert isinstance(token, str)
    assert len(token) > 0
    
    # Verify token
    payload = verify_token(token, "refresh")
    assert payload is not None
    assert payload["sub"] == user_id
    assert payload["type"] == "refresh"
    assert "exp" in payload


@pytest.mark.asyncio
async def test_token_pair_creation():
    """Test creating both access and refresh tokens."""
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    email = "test@example.com"
    
    tokens = create_token_pair(user_id, email)
    
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert "token_type" in tokens
    assert tokens["token_type"] == "bearer"
    
    # Verify access token
    access_payload = verify_token(tokens["access_token"], "access")
    assert access_payload is not None
    assert access_payload["sub"] == user_id
    assert access_payload["email"] == email
    assert access_payload["type"] == "access"
    
    # Verify refresh token
    refresh_payload = verify_token(tokens["refresh_token"], "refresh")
    assert refresh_payload is not None
    assert refresh_payload["sub"] == user_id
    assert refresh_payload["type"] == "refresh"


@pytest.mark.asyncio
async def test_token_expiration():
    """Test token expiration handling."""
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    email = "test@example.com"
    
    # Create token with very short expiration
    token_data = {"sub": user_id, "email": email}
    expired_token = create_access_token(token_data, expires_delta=timedelta(seconds=-1))
    
    # Verify expired token returns None
    payload = verify_token(expired_token, "access")
    assert payload is None


@pytest.mark.asyncio
async def test_invalid_token_verification():
    """Test verification of invalid tokens."""
    # Test with invalid token string
    assert verify_token("invalid_token", "access") is None
    
    # Test with wrong token type
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    token_data = {"sub": user_id}
    access_token = create_access_token(token_data)
    
    # Try to verify access token as refresh token
    assert verify_token(access_token, "refresh") is None


@pytest.mark.asyncio
async def test_configuration_values():
    """Test that configuration values are properly set."""
    assert settings.secret_key is not None
    assert len(settings.secret_key) > 0
    assert settings.algorithm == "HS256"
    assert settings.access_token_expire_minutes > 0
    assert settings.refresh_token_expire_days > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])