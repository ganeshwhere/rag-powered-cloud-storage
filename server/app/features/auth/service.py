"""
Authentication service layer.
Handles user registration, login, token refresh, and user management operations.
"""
from typing import Optional, Tuple
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status, Depends

from app.core.models.user import User
from app.core.security import hash_password, verify_password, create_token_pair
from app.core.dependencies import verify_refresh_token
from app.core.database import get_db
from app.core.config import settings
from app.features.auth.schemas import (
    UserRegistrationRequest,
    UserLoginRequest,
    TokenRefreshRequest,
    UserResponse,
    TokenResponse
)


class AuthService:
    """Service class for authentication operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def register_user(self, user_data: UserRegistrationRequest) -> Tuple[User, dict]:
        """
        Register a new user.
        
        Args:
            user_data: User registration data
            
        Returns:
            Tuple of (created user, token pair)
            
        Raises:
            HTTPException: If email or username already exists
        """
        # Check if user already exists
        existing_user = await self._get_user_by_email_or_username(
            user_data.email, user_data.username
        )
        if existing_user:
            if existing_user.email == user_data.email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Username already taken"
                )
        
        # Create new user
        hashed_password = hash_password(user_data.password)
        new_user = User(
            email=user_data.email,
            username=user_data.username,
            hashed_password=hashed_password,
            full_name=user_data.full_name,
            is_active=True,
            is_superuser=False
        )
        
        try:
            self.db.add(new_user)
            await self.db.commit()
            await self.db.refresh(new_user)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email or username already exists"
            )
        
        # Generate tokens
        tokens = create_token_pair(str(new_user.id), new_user.email)
        
        return new_user, tokens
    
    async def authenticate_user(self, login_data: UserLoginRequest) -> Tuple[User, dict]:
        """
        Authenticate a user and generate tokens.
        
        Args:
            login_data: User login credentials
            
        Returns:
            Tuple of (authenticated user, token pair)
            
        Raises:
            HTTPException: If credentials are invalid
        """
        # Get user by email
        user = await self._get_user_by_email(login_data.email)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Verify password
        if not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Check if user is active
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Account is inactive"
            )
        
        # Generate tokens
        tokens = create_token_pair(str(user.id), user.email)
        
        return user, tokens
    
    async def refresh_tokens(self, refresh_data: TokenRefreshRequest) -> dict:
        """
        Refresh access and refresh tokens.
        
        Args:
            refresh_data: Refresh token request data
            
        Returns:
            New token pair
            
        Raises:
            HTTPException: If refresh token is invalid
        """
        # Verify refresh token
        user_id_str = verify_refresh_token(refresh_data.refresh_token)
        if not user_id_str:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        try:
            user_id = uuid.UUID(user_id_str)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )
        
        # Get user from database
        user = await self._get_user_by_id(user_id)
        if not user or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Generate new tokens
        tokens = create_token_pair(str(user.id), user.email)
        
        return tokens
    
    async def _get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email address."""
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()
    
    async def _get_user_by_username(self, username: str) -> Optional[User]:
        """Get user by username."""
        result = await self.db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()
    
    async def _get_user_by_email_or_username(self, email: str, username: str) -> Optional[User]:
        """Get user by email or username."""
        result = await self.db.execute(
            select(User).where((User.email == email) | (User.username == username))
        )
        return result.scalar_one_or_none()
    
    async def _get_user_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Get user by ID."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()


def get_auth_service(db: AsyncSession = Depends(get_db)) -> AuthService:
    """Dependency to get auth service instance."""
    return AuthService(db)