"""
Property-based testing framework setup validation.

This module contains basic tests to validate that the Hypothesis framework
is properly configured and working with our test generators.
"""
import pytest
from hypothesis import given, assume
from hypothesis import strategies as st

from tests.generators import (
    user_data,
    document_data,
    folder_data,
    search_history_data,
    registration_data,
    login_data,
    file_upload_data,
    search_request_data,
    folder_creation_data
)
from tests.property_test_config import (
    property_test_settings,
    get_property_test_tag,
    auth_property_test
)


@pytest.mark.property
class TestFrameworkSetup:
    """Test class to validate property-based testing framework setup."""
    
    @given(user_data())
    @property_test_settings
    def test_user_data_generator(self, user_data_dict):
        """Test that user data generator produces valid data structures."""
        # Validate required fields
        assert "id" in user_data_dict
        assert "email" in user_data_dict
        assert "username" in user_data_dict
        assert "hashed_password" in user_data_dict
        assert "is_active" in user_data_dict
        assert "is_superuser" in user_data_dict
        assert "created_at" in user_data_dict
        assert "updated_at" in user_data_dict
        
        # Validate data types
        assert isinstance(user_data_dict["email"], str)
        assert isinstance(user_data_dict["username"], str)
        assert isinstance(user_data_dict["hashed_password"], str)
        assert isinstance(user_data_dict["is_active"], bool)
        assert isinstance(user_data_dict["is_superuser"], bool)
        
        # Validate email format (basic check)
        assert "@" in user_data_dict["email"]
        assert "." in user_data_dict["email"]
        
        # Validate username constraints
        assert len(user_data_dict["username"]) >= 3
        assert len(user_data_dict["username"]) <= 30
        
        # Validate password hash length (bcrypt)
        assert len(user_data_dict["hashed_password"]) == 60
    
    @given(document_data())
    @property_test_settings
    def test_document_data_generator(self, document_data_dict):
        """Test that document data generator produces valid data structures."""
        # Validate required fields
        assert "id" in document_data_dict
        assert "user_id" in document_data_dict
        assert "name" in document_data_dict
        assert "original_name" in document_data_dict
        assert "file_type" in document_data_dict
        assert "file_size" in document_data_dict
        assert "s3_key" in document_data_dict
        assert "s3_bucket" in document_data_dict
        assert "status" in document_data_dict
        assert "chunk_count" in document_data_dict
        assert "total_tokens" in document_data_dict
        
        # Validate data types and constraints
        assert isinstance(document_data_dict["name"], str)
        assert len(document_data_dict["name"]) > 0
        assert isinstance(document_data_dict["file_size"], int)
        assert document_data_dict["file_size"] > 0
        assert document_data_dict["status"] in ["pending", "processing", "completed", "failed"]
        assert document_data_dict["chunk_count"] >= 0
        assert document_data_dict["total_tokens"] >= 0
        
        # Validate file type consistency
        assert document_data_dict["file_type"] in ["pdf", "txt", "docx", "csv", "xlsx", "md"]
        if document_data_dict["mime_type"]:
            # Basic mime type validation
            assert "/" in document_data_dict["mime_type"]
    
    @given(folder_data())
    @property_test_settings
    def test_folder_data_generator(self, folder_data_dict):
        """Test that folder data generator produces valid data structures."""
        # Validate required fields
        assert "id" in folder_data_dict
        assert "user_id" in folder_data_dict
        assert "name" in folder_data_dict
        assert "path" in folder_data_dict
        
        # Validate data types and constraints
        assert isinstance(folder_data_dict["name"], str)
        assert len(folder_data_dict["name"]) > 0
        assert isinstance(folder_data_dict["path"], str)
        assert len(folder_data_dict["path"]) > 0
        
        # Validate path consistency
        assert folder_data_dict["name"] in folder_data_dict["path"]
        assert not folder_data_dict["path"].startswith("/")  # No leading slash
        assert not folder_data_dict["path"].endswith("/")    # No trailing slash
    
    @given(search_history_data())
    @property_test_settings
    def test_search_history_data_generator(self, search_data_dict):
        """Test that search history data generator produces valid data structures."""
        # Validate required fields
        assert "id" in search_data_dict
        assert "user_id" in search_data_dict
        assert "query" in search_data_dict
        assert "results_count" in search_data_dict
        
        # Validate data types and constraints
        assert isinstance(search_data_dict["query"], str)
        assert len(search_data_dict["query"]) >= 3
        assert isinstance(search_data_dict["results_count"], int)
        assert search_data_dict["results_count"] >= 0
    
    @given(registration_data())
    @property_test_settings
    def test_registration_data_generator(self, reg_data):
        """Test that registration data generator produces valid data structures."""
        # Validate required fields
        assert "email" in reg_data
        assert "username" in reg_data
        assert "password" in reg_data
        
        # Validate data types and constraints
        assert isinstance(reg_data["email"], str)
        assert "@" in reg_data["email"]
        assert isinstance(reg_data["username"], str)
        assert len(reg_data["username"]) >= 3
        assert isinstance(reg_data["password"], str)
        assert len(reg_data["password"]) >= 8
    
    @given(login_data())
    @property_test_settings
    def test_login_data_generator(self, login_data_dict):
        """Test that login data generator produces valid data structures."""
        # Validate required fields
        assert "email" in login_data_dict
        assert "password" in login_data_dict
        
        # Validate data types
        assert isinstance(login_data_dict["email"], str)
        assert isinstance(login_data_dict["password"], str)
        assert "@" in login_data_dict["email"]
    
    @given(file_upload_data())
    @property_test_settings
    def test_file_upload_data_generator(self, upload_data):
        """Test that file upload data generator produces valid data structures."""
        # Validate required fields
        assert "filename" in upload_data
        assert "content_type" in upload_data
        assert "size" in upload_data
        assert "content" in upload_data
        
        # Validate data types and constraints
        assert isinstance(upload_data["filename"], str)
        assert len(upload_data["filename"]) > 0
        assert isinstance(upload_data["content_type"], str)
        assert "/" in upload_data["content_type"]
        assert isinstance(upload_data["size"], int)
        assert upload_data["size"] > 0
        assert isinstance(upload_data["content"], bytes)
    
    @given(search_request_data())
    @property_test_settings
    def test_search_request_data_generator(self, search_req):
        """Test that search request data generator produces valid data structures."""
        # Validate required fields
        assert "query" in search_req
        assert "limit" in search_req
        
        # Validate data types and constraints
        assert isinstance(search_req["query"], str)
        assert len(search_req["query"]) >= 3
        assert isinstance(search_req["limit"], int)
        assert 1 <= search_req["limit"] <= 50
    
    @given(folder_creation_data())
    @property_test_settings
    def test_folder_creation_data_generator(self, folder_create):
        """Test that folder creation data generator produces valid data structures."""
        # Validate required fields
        assert "name" in folder_create
        
        # Validate data types and constraints
        assert isinstance(folder_create["name"], str)
        assert len(folder_create["name"]) > 0
        assert "/" not in folder_create["name"]  # No path separators in folder names
        assert not folder_create["name"].startswith(".")  # No hidden folders
    
    def test_property_test_tag_generation(self):
        """Test that property test tags are generated correctly."""
        tag = get_property_test_tag("rag-document-system", 1, "User Registration and Authentication")
        expected = "Feature: rag-document-system, Property 1: User Registration and Authentication"
        assert tag == expected
    
    @auth_property_test(999, "Framework Setup Test")
    @given(st.integers(min_value=1, max_value=100))
    def test_property_test_decorator(self, value):
        """Test that property test decorators work correctly."""
        # This is a simple test to validate the decorator functionality
        assert isinstance(value, int)
        assert 1 <= value <= 100
        
        # Check that the docstring was updated with the tag
        assert "Feature: rag-document-system, Property 999: Framework Setup Test" in self.test_property_test_decorator.__doc__


@pytest.mark.property
class TestGeneratorConstraints:
    """Test class to validate generator constraints and edge cases."""
    
    @given(user_data())
    @property_test_settings
    def test_user_email_uniqueness_constraint(self, user_data_dict):
        """Test that generated user emails follow valid format constraints."""
        email = user_data_dict["email"]
        
        # Email should have exactly one @ symbol
        assert email.count("@") == 1
        
        # Email should have at least one dot after @
        local, domain = email.split("@")
        assert "." in domain
        assert len(local) > 0
        assert len(domain) > 0
    
    @given(document_data())
    @property_test_settings
    def test_document_file_size_constraints(self, doc_data):
        """Test that document file sizes are within valid ranges."""
        file_size = doc_data["file_size"]
        
        # File size should be positive and within reasonable limits
        assert file_size > 0
        assert file_size <= 100_000_000  # 100MB limit
    
    @given(folder_data())
    @property_test_settings
    def test_folder_path_constraints(self, folder_data_dict):
        """Test that folder paths follow valid format constraints."""
        path = folder_data_dict["path"]
        name = folder_data_dict["name"]
        
        # Path should contain the folder name
        assert name in path
        
        # Path should not have invalid characters
        invalid_chars = ["<", ">", ":", '"', "|", "?", "*"]
        for char in invalid_chars:
            assert char not in path
    
    @given(search_request_data())
    @property_test_settings
    def test_search_query_length_constraints(self, search_data):
        """Test that search queries meet minimum length requirements."""
        query = search_data["query"]
        
        # Query should meet minimum length for meaningful search
        assert len(query.strip()) >= 3
        
        # Limit should be within API constraints
        assert 1 <= search_data["limit"] <= 50