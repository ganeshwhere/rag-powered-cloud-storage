"""
Authentication API endpoints.
Provides REST API endpoints for user registration, login, token refresh, and user management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.config import settings
from app.features.auth.service import get_auth_service, AuthService
from app.features.auth.schemas import (
    UserRegistrationRequest,
    UserLoginRequest,
    TokenRefreshRequest,
    UserRegistrationResponse,
    UserLoginResponse,
    TokenResponse,
    UserResponse,
    MessageResponse,
    ErrorResponse
)
from app.core.models.user import User


router = APIRouter()


@router.post(
    "/register",
    response_model=UserRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
    description="Create a new user account with email, username, and password",
    responses={
        201: {"description": "User successfully registered"},
        400: {"model": ErrorResponse, "description": "Email or username already exists"},
        422: {"description": "Validation error"}
    }
)
async def register(
    user_data: UserRegistrationRequest,
    auth_service: AuthService = Depends(get_auth_service)
) -> UserRegistrationResponse:
    """
    Register a new user account.
    
    Creates a new user with the provided information and returns
    the user details along with authentication tokens.
    """
    user, tokens = await auth_service.register_user(user_data)
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at.isoformat()
    )
    
    token_response = TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        expires_in=settings.access_token_expire_minutes * 60
    )
    
    return UserRegistrationResponse(user=user_response, tokens=token_response)


@router.post(
    "/login",
    response_model=UserLoginResponse,
    summary="User login",
    description="Authenticate user with email and password",
    responses={
        200: {"description": "Login successful"},
        401: {"model": ErrorResponse, "description": "Invalid credentials or inactive account"},
        422: {"description": "Validation error"}
    }
)
async def login(
    login_data: UserLoginRequest,
    auth_service: AuthService = Depends(get_auth_service)
) -> UserLoginResponse:
    """
    Authenticate user and return tokens.
    
    Validates user credentials and returns user information
    along with access and refresh tokens.
    """
    user, tokens = await auth_service.authenticate_user(login_data)
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        username=user.username,
        full_name=user.full_name,
        is_active=user.is_active,
        created_at=user.created_at.isoformat()
    )
    
    token_response = TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        expires_in=settings.access_token_expire_minutes * 60
    )
    
    return UserLoginResponse(user=user_response, tokens=token_response)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
    description="Generate new access and refresh tokens using a valid refresh token",
    responses={
        200: {"description": "Tokens refreshed successfully"},
        401: {"model": ErrorResponse, "description": "Invalid refresh token"},
        422: {"description": "Validation error"}
    }
)
async def refresh_token(
    refresh_data: TokenRefreshRequest,
    auth_service: AuthService = Depends(get_auth_service)
) -> TokenResponse:
    """
    Refresh authentication tokens.
    
    Uses a valid refresh token to generate new access and refresh tokens.
    """
    tokens = await auth_service.refresh_tokens(refresh_data)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        token_type=tokens["token_type"],
        expires_in=settings.access_token_expire_minutes * 60
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user",
    description="Get information about the currently authenticated user",
    responses={
        200: {"description": "Current user information"},
        401: {"model": ErrorResponse, "description": "Authentication required"}
    }
)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
) -> UserResponse:
    """
    Get current authenticated user information.
    
    Returns detailed information about the currently authenticated user.
    """
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        is_active=current_user.is_active,
        created_at=current_user.created_at.isoformat()
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="User logout",
    description="Logout the current user (client should discard tokens)",
    responses={
        200: {"description": "Logout successful"},
        401: {"model": ErrorResponse, "description": "Authentication required"}
    }
)
async def logout(
    current_user: User = Depends(get_current_active_user)
) -> MessageResponse:
    """
    Logout current user.
    
    Note: This is a client-side logout. The client should discard
    the access and refresh tokens. For server-side token invalidation,
    a token blacklist would need to be implemented.
    """
    return MessageResponse(message="Successfully logged out")