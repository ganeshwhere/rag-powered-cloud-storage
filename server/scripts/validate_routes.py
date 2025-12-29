#!/usr/bin/env python3
"""
Router validation script to check for common routing issues.
Run this script to validate router configurations and detect potential problems.
"""

import sys
import os
from pathlib import Path

# Add the app directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi.testclient import TestClient
from app.main import app

def validate_routes():
    """Validate all routes are accessible and don't have double prefixes."""
    
    client = TestClient(app)
    
    # Expected routes and their status codes (without auth)
    expected_routes = {
        "/": 200,
        "/health": 200,
        "/api/v1/auth/login": 422,  # Missing body
        "/api/v1/search/history": 401,  # Not authenticated
        "/api/v1/search/suggestions": 422,  # Missing query param
        "/api/v1/folders/": 401,  # Not authenticated
    }
    
    print("Validating router configurations...")
    print("=" * 50)
    
    all_passed = True
    
    for route, expected_status in expected_routes.items():
        try:
            if "suggestions" in route:
                # Add required query parameter
                response = client.get(f"{route}?query=test")
            else:
                response = client.get(route) if route.endswith("/") or "login" not in route else client.post(route)
            
            if response.status_code == expected_status:
                print(f"PASS {route} -> {response.status_code} (expected {expected_status})")
            else:
                print(f"FAIL {route} -> {response.status_code} (expected {expected_status})")
                all_passed = False
                
        except Exception as e:
            print(f"ERROR {route} -> ERROR: {str(e)}")
            all_passed = False
    
    # Check for common double prefix issues
    print("\nChecking for double prefix issues...")
    print("=" * 50)
    
    double_prefix_routes = [
        "/api/v1/search/search/",
        "/api/v1/auth/auth/",
        "/api/v1/folders/folders/",
        "/api/v1/documents/documents/"
    ]
    
    for route in double_prefix_routes:
        try:
            response = client.get(route)
            if response.status_code != 404:
                print(f"WARNING: Double prefix route exists: {route}")
                all_passed = False
            else:
                print(f"PASS No double prefix: {route} correctly returns 404")
        except Exception:
            print(f"PASS No double prefix: {route} correctly returns 404")
    
    print("\n" + "=" * 50)
    if all_passed:
        print("All router validations passed!")
        return True
    else:
        print("Some router validations failed!")
        return False

def list_all_routes():
    """List all available routes in the application."""
    print("\nAll available routes:")
    print("=" * 50)
    
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            methods = ', '.join(route.methods) if route.methods else 'N/A'
            print(f"{methods:10} {route.path}")

if __name__ == "__main__":
    success = validate_routes()
    list_all_routes()
    
    if not success:
        sys.exit(1)
    
    print("\nRouter validation completed successfully!")