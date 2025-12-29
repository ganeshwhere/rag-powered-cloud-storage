"""
Folder management API endpoints.
Provides REST API endpoints for folder CRUD operations and content listing.
"""
from typing import Optional, List
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_active_user
from app.core.models.user import User
from app.features.folders.service import get_folder_service, FolderService
from app.features.folders.schemas import (
    FolderCreateRequest,
    FolderUpdateRequest,
    FolderResponse,
    FolderWithContentsResponse,
    FolderListResponse,
    FolderCreateResponse,
    FolderUpdateResponse,
    FolderDeleteResponse,
    FolderContentsResponse,
    MessageResponse,
    ErrorResponse
)


# IMPORTANT: Do not add prefix here to avoid double prefixes
# The prefix is added in main.py: app.include_router(folders_router, prefix="/api/v1/folders")
# This creates the final URL: /api/v1/folders/
router = APIRouter()


@router.post(
    "/",
    response_model=FolderCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new folder",
    description="Create a new folder in the user's document library",
    responses={
        201: {"description": "Folder successfully created"},
        400: {"model": ErrorResponse, "description": "Folder name conflict or invalid parent"},
        404: {"model": ErrorResponse, "description": "Parent folder not found"},
        422: {"description": "Validation error"}
    }
)
async def create_folder(
    folder_data: FolderCreateRequest,
    current_user: User = Depends(get_current_active_user),
    folder_service: FolderService = Depends(get_folder_service)
) -> FolderCreateResponse:
    """
    Create a new folder.
    
    Creates a new folder with the specified name and optional parent folder.
    Folder names must be unique within the same parent directory.
    """
    folder = await folder_service.create_folder(current_user.id, folder_data)
    
    folder_response = FolderResponse(
        id=folder.id,
        user_id=folder.user_id,
        parent_id=folder.parent_id,
        name=folder.name,
        path=folder.path,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )
    
    return FolderCreateResponse(folder=folder_response)


@router.get(
    "/",
    response_model=FolderListResponse,
    summary="List folders",
    description="Get a list of folders, optionally filtered by parent folder",
    responses={
        200: {"description": "List of folders"},
        401: {"model": ErrorResponse, "description": "Authentication required"}
    }
)
async def list_folders(
    parent_id: Optional[uuid.UUID] = Query(None, description="Parent folder ID to filter by"),
    current_user: User = Depends(get_current_active_user),
    folder_service: FolderService = Depends(get_folder_service)
) -> FolderListResponse:
    """
    List user's folders.
    
    Returns a list of folders owned by the current user.
    If parent_id is provided, only returns folders within that parent.
    If parent_id is None, returns root-level folders.
    """
    folders = await folder_service.get_user_folders(current_user.id, parent_id)
    
    folder_responses = [
        FolderResponse(
            id=folder.id,
            user_id=folder.user_id,
            parent_id=folder.parent_id,
            name=folder.name,
            path=folder.path,
            created_at=folder.created_at,
            updated_at=folder.updated_at
        )
        for folder in folders
    ]
    
    return FolderListResponse(folders=folder_responses, total=len(folder_responses))


@router.get(
    "/{folder_id}",
    response_model=FolderResponse,
    summary="Get folder details",
    description="Get details of a specific folder",
    responses={
        200: {"description": "Folder details"},
        404: {"model": ErrorResponse, "description": "Folder not found"},
        401: {"model": ErrorResponse, "description": "Authentication required"}
    }
)
async def get_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    folder_service: FolderService = Depends(get_folder_service)
) -> FolderResponse:
    """
    Get folder details.
    
    Returns detailed information about a specific folder.
    """
    folder = await folder_service.get_folder_by_id(current_user.id, folder_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    return FolderResponse(
        id=folder.id,
        user_id=folder.user_id,
        parent_id=folder.parent_id,
        name=folder.name,
        path=folder.path,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )


@router.get(
    "/{folder_id}/contents",
    response_model=FolderContentsResponse,
    summary="Get folder contents",
    description="Get folder details with its children and document count",
    responses={
        200: {"description": "Folder contents"},
        404: {"model": ErrorResponse, "description": "Folder not found"},
        401: {"model": ErrorResponse, "description": "Authentication required"}
    }
)
async def get_folder_contents(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    folder_service: FolderService = Depends(get_folder_service)
) -> FolderContentsResponse:
    """
    Get folder contents.
    
    Returns folder details along with its child folders and document count.
    """
    folder = await folder_service.get_folder_with_contents(current_user.id, folder_id)
    if not folder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Folder not found"
        )
    
    # Convert children to response format
    children_responses = [
        FolderResponse(
            id=child.id,
            user_id=child.user_id,
            parent_id=child.parent_id,
            name=child.name,
            path=child.path,
            created_at=child.created_at,
            updated_at=child.updated_at
        )
        for child in folder.children
    ]
    
    folder_with_contents = FolderWithContentsResponse(
        id=folder.id,
        user_id=folder.user_id,
        parent_id=folder.parent_id,
        name=folder.name,
        path=folder.path,
        created_at=folder.created_at,
        updated_at=folder.updated_at,
        children=children_responses,
        document_count=getattr(folder, 'document_count', 0)
    )
    
    return FolderContentsResponse(folder=folder_with_contents)


@router.patch(
    "/{folder_id}",
    response_model=FolderUpdateResponse,
    summary="Update folder",
    description="Update folder name or move to different parent",
    responses={
        200: {"description": "Folder successfully updated"},
        400: {"model": ErrorResponse, "description": "Invalid update data or name conflict"},
        404: {"model": ErrorResponse, "description": "Folder or parent folder not found"},
        422: {"description": "Validation error"}
    }
)
async def update_folder(
    folder_id: uuid.UUID,
    folder_data: FolderUpdateRequest,
    current_user: User = Depends(get_current_active_user),
    folder_service: FolderService = Depends(get_folder_service)
) -> FolderUpdateResponse:
    """
    Update folder.
    
    Updates folder name and/or moves it to a different parent folder.
    Folder names must remain unique within the same parent directory.
    """
    folder = await folder_service.update_folder(current_user.id, folder_id, folder_data)
    
    folder_response = FolderResponse(
        id=folder.id,
        user_id=folder.user_id,
        parent_id=folder.parent_id,
        name=folder.name,
        path=folder.path,
        created_at=folder.created_at,
        updated_at=folder.updated_at
    )
    
    return FolderUpdateResponse(folder=folder_response)


@router.delete(
    "/{folder_id}",
    response_model=FolderDeleteResponse,
    summary="Delete folder",
    description="Delete a folder and move its contents to parent folder",
    responses={
        200: {"description": "Folder successfully deleted"},
        404: {"model": ErrorResponse, "description": "Folder not found"},
        401: {"model": ErrorResponse, "description": "Authentication required"}
    }
)
async def delete_folder(
    folder_id: uuid.UUID,
    current_user: User = Depends(get_current_active_user),
    folder_service: FolderService = Depends(get_folder_service)
) -> FolderDeleteResponse:
    """
    Delete folder.
    
    Deletes the specified folder and moves any contained documents
    to the parent folder (or root if no parent). Child folders are
    also moved to the parent folder.
    """
    await folder_service.delete_folder(current_user.id, folder_id)
    
    return FolderDeleteResponse(
        message="Folder deleted successfully",
        deleted_folder_id=folder_id
    )