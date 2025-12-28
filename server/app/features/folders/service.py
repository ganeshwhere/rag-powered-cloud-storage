"""
Folder service layer.
Handles folder CRUD operations, hierarchy management, and path calculations.
"""
from typing import Optional, List
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status, Depends

from app.core.models.folder import Folder
from app.core.models.document import Document
from app.core.database import get_db
from app.features.folders.schemas import (
    FolderCreateRequest,
    FolderUpdateRequest,
    FolderResponse,
    FolderWithContentsResponse
)


class FolderService:
    """Service class for folder operations."""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_folder(self, user_id: uuid.UUID, folder_data: FolderCreateRequest) -> Folder:
        """
        Create a new folder.
        
        Args:
            user_id: ID of the user creating the folder
            folder_data: Folder creation data
            
        Returns:
            Created folder
            
        Raises:
            HTTPException: If parent folder doesn't exist or name conflicts
        """
        # Validate parent folder if specified
        parent_folder = None
        if folder_data.parent_id:
            parent_folder = await self._get_user_folder(user_id, folder_data.parent_id)
            if not parent_folder:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Parent folder not found"
                )
        
        # Check for duplicate name in the same parent
        existing_folder = await self._get_folder_by_name_and_parent(
            user_id, folder_data.name, folder_data.parent_id
        )
        if existing_folder:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A folder with this name already exists in the specified location"
            )
        
        # Calculate path
        if parent_folder:
            path = f"{parent_folder.path}/{folder_data.name}"
        else:
            path = folder_data.name
        
        # Create new folder
        new_folder = Folder(
            user_id=user_id,
            parent_id=folder_data.parent_id,
            name=folder_data.name,
            path=path
        )
        
        try:
            self.db.add(new_folder)
            await self.db.commit()
            await self.db.refresh(new_folder)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A folder with this name already exists in the specified location"
            )
        
        return new_folder
    
    async def get_user_folders(self, user_id: uuid.UUID, parent_id: Optional[uuid.UUID] = None) -> List[Folder]:
        """
        Get folders for a user, optionally filtered by parent.
        
        Args:
            user_id: ID of the user
            parent_id: Optional parent folder ID to filter by
            
        Returns:
            List of folders
        """
        query = select(Folder).where(Folder.user_id == user_id)
        
        if parent_id is not None:
            query = query.where(Folder.parent_id == parent_id)
        else:
            # If parent_id is None, get root folders (parent_id IS NULL)
            query = query.where(Folder.parent_id.is_(None))
        
        query = query.order_by(Folder.name)
        
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_folder_by_id(self, user_id: uuid.UUID, folder_id: uuid.UUID) -> Optional[Folder]:
        """
        Get a specific folder by ID.
        
        Args:
            user_id: ID of the user
            folder_id: ID of the folder
            
        Returns:
            Folder if found, None otherwise
        """
        return await self._get_user_folder(user_id, folder_id)
    
    async def get_folder_with_contents(self, user_id: uuid.UUID, folder_id: uuid.UUID) -> Optional[Folder]:
        """
        Get a folder with its children and document count.
        
        Args:
            user_id: ID of the user
            folder_id: ID of the folder
            
        Returns:
            Folder with loaded children if found, None otherwise
        """
        query = (
            select(Folder)
            .options(selectinload(Folder.children))
            .where(and_(Folder.id == folder_id, Folder.user_id == user_id))
        )
        
        result = await self.db.execute(query)
        folder = result.scalar_one_or_none()
        
        if folder:
            # Get document count for this folder
            doc_count_query = select(func.count(Document.id)).where(Document.folder_id == folder_id)
            doc_count_result = await self.db.execute(doc_count_query)
            folder.document_count = doc_count_result.scalar() or 0
        
        return folder
    
    async def update_folder(self, user_id: uuid.UUID, folder_id: uuid.UUID, folder_data: FolderUpdateRequest) -> Folder:
        """
        Update a folder.
        
        Args:
            user_id: ID of the user
            folder_id: ID of the folder to update
            folder_data: Update data
            
        Returns:
            Updated folder
            
        Raises:
            HTTPException: If folder not found, parent invalid, or name conflicts
        """
        # Get existing folder
        folder = await self._get_user_folder(user_id, folder_id)
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        # Validate parent folder if being changed
        if folder_data.parent_id is not None and folder_data.parent_id != folder.parent_id:
            if folder_data.parent_id == folder_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A folder cannot be its own parent"
                )
            
            # Check if new parent exists
            if folder_data.parent_id:
                parent_folder = await self._get_user_folder(user_id, folder_data.parent_id)
                if not parent_folder:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Parent folder not found"
                    )
                
                # Check for circular reference
                if await self._would_create_circular_reference(folder_id, folder_data.parent_id):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Moving folder would create a circular reference"
                    )
        
        # Check for name conflicts if name is being changed
        new_name = folder_data.name if folder_data.name is not None else folder.name
        new_parent_id = folder_data.parent_id if folder_data.parent_id is not None else folder.parent_id
        
        if folder_data.name is not None or folder_data.parent_id is not None:
            existing_folder = await self._get_folder_by_name_and_parent(
                user_id, new_name, new_parent_id
            )
            if existing_folder and existing_folder.id != folder_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="A folder with this name already exists in the specified location"
                )
        
        # Update folder
        if folder_data.name is not None:
            folder.name = folder_data.name
        
        if folder_data.parent_id is not None:
            folder.parent_id = folder_data.parent_id
        
        # Recalculate path
        await self._update_folder_path(folder)
        
        try:
            await self.db.commit()
            await self.db.refresh(folder)
        except IntegrityError:
            await self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A folder with this name already exists in the specified location"
            )
        
        return folder
    
    async def delete_folder(self, user_id: uuid.UUID, folder_id: uuid.UUID) -> bool:
        """
        Delete a folder and handle contained documents.
        
        Args:
            user_id: ID of the user
            folder_id: ID of the folder to delete
            
        Returns:
            True if deleted successfully
            
        Raises:
            HTTPException: If folder not found
        """
        # Get folder
        folder = await self._get_user_folder(user_id, folder_id)
        if not folder:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Folder not found"
            )
        
        # Move documents to parent folder (or root if no parent)
        await self._move_documents_to_parent(folder_id, folder.parent_id)
        
        # Delete folder (children will be moved to parent due to cascade)
        await self.db.delete(folder)
        await self.db.commit()
        
        return True
    
    async def _get_user_folder(self, user_id: uuid.UUID, folder_id: uuid.UUID) -> Optional[Folder]:
        """Get a folder that belongs to the user."""
        query = select(Folder).where(and_(Folder.id == folder_id, Folder.user_id == user_id))
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _get_folder_by_name_and_parent(
        self, user_id: uuid.UUID, name: str, parent_id: Optional[uuid.UUID]
    ) -> Optional[Folder]:
        """Get a folder by name and parent."""
        query = select(Folder).where(
            and_(
                Folder.user_id == user_id,
                Folder.name == name,
                Folder.parent_id == parent_id if parent_id else Folder.parent_id.is_(None)
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
    
    async def _would_create_circular_reference(self, folder_id: uuid.UUID, new_parent_id: uuid.UUID) -> bool:
        """Check if moving a folder would create a circular reference."""
        current_id = new_parent_id
        
        while current_id:
            if current_id == folder_id:
                return True
            
            # Get parent of current folder
            query = select(Folder.parent_id).where(Folder.id == current_id)
            result = await self.db.execute(query)
            current_id = result.scalar_one_or_none()
        
        return False
    
    async def _update_folder_path(self, folder: Folder) -> None:
        """Update folder path based on parent hierarchy."""
        if folder.parent_id:
            # Get parent folder
            parent_query = select(Folder).where(Folder.id == folder.parent_id)
            parent_result = await self.db.execute(parent_query)
            parent_folder = parent_result.scalar_one_or_none()
            
            if parent_folder:
                folder.path = f"{parent_folder.path}/{folder.name}"
            else:
                folder.path = folder.name
        else:
            folder.path = folder.name
        
        # Update paths of all descendant folders
        await self._update_descendant_paths(folder)
    
    async def _update_descendant_paths(self, folder: Folder) -> None:
        """Recursively update paths of all descendant folders."""
        # Get all direct children
        children_query = select(Folder).where(Folder.parent_id == folder.id)
        children_result = await self.db.execute(children_query)
        children = children_result.scalars().all()
        
        for child in children:
            child.path = f"{folder.path}/{child.name}"
            await self._update_descendant_paths(child)
    
    async def _move_documents_to_parent(self, folder_id: uuid.UUID, parent_id: Optional[uuid.UUID]) -> None:
        """Move all documents from a folder to its parent."""
        # Update all documents in this folder to move to parent
        from sqlalchemy import update
        
        stmt = (
            update(Document)
            .where(Document.folder_id == folder_id)
            .values(folder_id=parent_id)
        )
        
        await self.db.execute(stmt)


def get_folder_service(db: AsyncSession = Depends(get_db)) -> FolderService:
    """Dependency to get folder service instance."""
    return FolderService(db)