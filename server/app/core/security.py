"""
Security utilities for password hashing and JWT token management.
Provides secure password hashing with bcrypt and JWT token generation/validation.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from jwt.exceptions import ExpiredSignatureError, DecodeError, InvalidTokenError
import hashlib
import secrets

from app.core.config import settings


def hash_password(password: str) -> str:
    """
    Hash a password using SHA-256 with salt (temporary implementation).
    
    Args:
        password: Plain text password to hash
        
    Returns:
        Hashed password string
    """
    # Generate a random salt
    salt = secrets.token_hex(16)
    # Create hash with salt
    password_hash = hashlib.sha256((password + salt).encode()).hexdigest()
    # Return salt + hash
    return f"{salt}:{password_hash}"


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        plain_password: Plain text password to verify
        hashed_password: Hashed password to verify against
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        # Split salt and hash
        salt, stored_hash = hashed_password.split(':', 1)
        # Hash the plain password with the stored salt
        password_hash = hashlib.sha256((plain_password + salt).encode()).hexdigest()
        # Compare hashes
        return password_hash == stored_hash
    except ValueError:
        # Invalid hash format
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: Data to encode in the token (typically user ID and email)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    
    to_encode.update({"exp": expire, "type": "access"})
    
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT refresh token.
    
    Args:
        data: Data to encode in the token (typically user ID)
        expires_delta: Optional custom expiration time
        
    Returns:
        Encoded JWT refresh token string
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt


def verify_token(token: str, token_type: str = "access") -> Optional[Dict[str, Any]]:
    """
    Verify and decode a JWT token.
    
    Args:
        token: JWT token string to verify
        token_type: Expected token type ("access" or "refresh")
        
    Returns:
        Decoded token payload if valid, None otherwise
    """
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        
        # Check token type
        if payload.get("type") != token_type:
            return None
            
        return payload
    except ExpiredSignatureError:
        return None
    except (DecodeError, InvalidTokenError):
        return None


def create_token_pair(user_id: str, email: str) -> Dict[str, str]:
    """
    Create both access and refresh tokens for a user.
    
    Args:
        user_id: User's unique identifier
        email: User's email address
        
    Returns:
        Dictionary containing access_token and refresh_token
    """
    access_token_data = {"sub": user_id, "email": email}
    refresh_token_data = {"sub": user_id}
    
    access_token = create_access_token(access_token_data)
    refresh_token = create_refresh_token(refresh_token_data)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }