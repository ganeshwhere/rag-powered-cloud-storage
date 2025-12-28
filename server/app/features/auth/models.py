"""
Authentication models.
Re-exports the User model from core models for feature-based organization.
"""
from app.core.models.user import User

__all__ = ["User"]