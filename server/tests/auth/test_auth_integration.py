#!/usr/bin/env python3
"""
Integration test script to verify authentication system is working.
"""
import asyncio
import pytest

from app.core.security import hash_password, verify_password, create_token_pair, verify_token
from app.core.config import settings


@pytest.mark.asyncio
async def test_authentication_system():
    """Test the authentication system components."""
    print("Testing RAG Document System Authentication")
    print("=" * 50)
    
    # Test 1: Password hashing and verification
    print("\n1. Testing password hashing and verification...")
    test_password = "test_password_123"
    hashed = hash_password(test_password)
    
    print(f"   Original password: {test_password}")
    print(f"   Hashed password: {hashed[:50]}...")
    
    # Verify correct password
    is_valid = verify_password(test_password, hashed)
    print(f"   Correct password verification: {is_valid}")
    assert is_valid is True
    
    # Verify incorrect password
    is_invalid = verify_password("wrong_password", hashed)
    print(f"   Incorrect password verification: {not is_invalid}")
    assert is_invalid is False
    
    # Test 2: JWT token creation and verification
    print("\n2. Testing JWT token creation and verification...")
    user_id = "123e4567-e89b-12d3-a456-426614174000"
    email = "test@example.com"
    
    tokens = create_token_pair(user_id, email)
    print(f"   Access token created: {tokens['access_token'][:50]}...")
    print(f"   Refresh token created: {tokens['refresh_token'][:50]}...")
    print(f"   Token type: {tokens['token_type']}")
    
    # Verify access token
    access_payload = verify_token(tokens['access_token'], 'access')
    print(f"   Access token verification: {access_payload is not None}")
    assert access_payload is not None
    if access_payload:
        print(f"   User ID from token: {access_payload.get('sub')}")
        print(f"   Email from token: {access_payload.get('email')}")
        print(f"   Token type: {access_payload.get('type')}")
        assert access_payload.get('sub') == user_id
        assert access_payload.get('email') == email
        assert access_payload.get('type') == 'access'
    
    # Verify refresh token
    refresh_payload = verify_token(tokens['refresh_token'], 'refresh')
    print(f"   Refresh token verification: {refresh_payload is not None}")
    assert refresh_payload is not None
    if refresh_payload:
        print(f"   User ID from refresh token: {refresh_payload.get('sub')}")
        print(f"   Token type: {refresh_payload.get('type')}")
        assert refresh_payload.get('sub') == user_id
        assert refresh_payload.get('type') == 'refresh'
    
    # Test 3: Configuration
    print("\n3. Testing configuration...")
    print(f"   Secret key configured: {'Yes' if settings.secret_key else 'No'}")
    print(f"   JWT algorithm: {settings.algorithm}")
    print(f"   Access token expiry: {settings.access_token_expire_minutes} minutes")
    print(f"   Refresh token expiry: {settings.refresh_token_expire_days} days")
    print(f"   Database URL: {settings.database_url}")
    
    assert settings.secret_key is not None
    assert len(settings.secret_key) > 0
    assert settings.algorithm == "HS256"
    
    print("\n" + "=" * 50)
    print("Authentication system test completed successfully!")
    return True


if __name__ == "__main__":
    try:
        result = asyncio.run(test_authentication_system())
        if result:
            print("\nAll authentication components are working correctly!")
            sys.exit(0)
        else:
            print("\nSome authentication components failed!")
            sys.exit(1)
    except Exception as e:
        print(f"\nError testing authentication system: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)